#![no_std]
//! Confidential Token (ZK Fighter, Track B).
//!
//! A SEP-41-shaped wrapper whose amounts and balances are confidential: per-account
//! state is stored as Pedersen commitments, and every state-changing op is gated by
//! an UltraHonk proof verified through a separate verifier-registry contract. This
//! contract is authored by ZK Fighter from the OpenZeppelin/SDF Confidential Tokens
//! design (no upstream token example exists); the `CircuitType` ordinals and the
//! verifier's VK layout are the cross-language contract with the circuits.
//!
//! Testnet-only (the UltraHonk verifier backend is an unaudited dev preview).

use soroban_sdk::{
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, token,
    Address, Bytes, BytesN, Env,
};
use stellar_contract_utils::crypto::grumpkin::{Grumpkin, Point};

/// Fixed on-chain circuit identifiers — MUST match the verifier registry + circuits.
#[contracttype]
#[derive(Clone, Copy, PartialEq, Eq)]
pub enum CircuitType {
    Register = 0,
    Withdraw = 1,
    Transfer = 2,
    SpenderTransfer = 3,
    SetSpender = 4,
    RevokeSpender = 5,
}

#[contracterror]
#[derive(Clone, Copy, PartialEq, Eq, Debug)]
#[repr(u32)]
pub enum Error {
    NotConfigured = 1,
    ContractFieldNotSet = 2,
    InvalidProof = 3,
    AddrFMismatch = 4,
    BadPublicInputs = 5,
    AlreadyRegistered = 6,
    NegativeAmount = 7,
    AccountNotRegistered = 8,
    NonCanonicalEncoding = 9,
    ContractFieldAlreadySet = 10,
}

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    /// addr_f = Poseidon2(ADDRESS, lo, hi) of THIS contract — binds every proof to
    /// this instance. Set once post-deploy by the admin (computed off-chain).
    ContractField,
    Account(Address),
}

/// Immutable wiring set at construction.
#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub admin: Address,
    pub verifier: Address,
    pub auditor_registry: Address,
    pub underlying: Address,
}

/// Per-account confidential identity (set at register).
#[contracttype]
#[derive(Clone)]
pub struct AccountState {
    /// Spending public key Y = sk*H (Grumpkin affine, x||y, 64 bytes).
    pub spending_key: BytesN<64>,
    /// Public viewing key PVK = vk*H (Grumpkin affine, x||y, 64 bytes).
    pub viewing_public_key: BytesN<64>,
    pub auditor_id: u32,
    /// Spendable balance commitment C_spend = v*G + r*H (Pedersen point).
    pub spendable_balance: Point,
    /// Receiving balance commitment — incoming deposits/transfers accumulate here
    /// until the owner merges them (griefing isolation).
    pub receiving_balance: Point,
}

/// Prover-supplied outputs of a confidential transfer (DESIGN §7.6). The
/// contract treats these as opaque commitments/ciphertexts: the circuit proves
/// they are well-formed, the contract only reconstructs the public-input blob
/// and applies the resulting state deltas. Points are 64-byte Grumpkin affine
/// encodings; the rest are 32-byte BN254 field representatives.
#[contracttype]
#[derive(Clone)]
pub struct TransferPayload {
    /// Sender's new spendable commitment C_spend' (replaces the old one).
    pub c_spend_new: BytesN<64>,
    /// Transfer commitment C_tx added to the recipient's receiving balance.
    pub c_tx: BytesN<64>,
    /// Ephemeral key R_e for recipient/auditor ECDH.
    pub r_e: BytesN<64>,
    pub v_tilde: BytesN<32>,
    pub b_tilde: BytesN<32>,
    pub sigma: BytesN<32>,
    pub v_aud_r: BytesN<32>,
    pub r_aud_r: BytesN<32>,
    pub v_aud_s: BytesN<32>,
    pub b_aud_s: BytesN<32>,
}

/// Cross-contract view of the verifier registry.
#[contractclient(name = "VerifierClient")]
pub trait VerifierInterface {
    fn verify_proof(env: Env, circuit_type: CircuitType, public_inputs: Bytes, proof: Bytes) -> bool;
}

/// Cross-contract view of the auditor registry — resolves an `auditor_id` to the
/// auditor's Grumpkin public key `K_aud` (x||y, 64 bytes), consumed as a circuit
/// public input for sender-/recipient-auditor ECDH visibility.
#[contractclient(name = "AuditorClient")]
pub trait AuditorInterface {
    fn get_key(env: Env, auditor_id: u32) -> BytesN<64>;
}

// register public-input layout: y_x | y_y | pvk_x | pvk_y | addr_f, 32 bytes each.
const FIELD: u32 = 32;
const REGISTER_PUBLIC_INPUTS_LEN: u32 = 5 * FIELD;
// withdraw public-input layout (DESIGN §7.5, 15 fields × 32 bytes):
//   C_spend | Y | addr_f | K_aud_s | a | C_spend' | sigma | b_tilde | R_e | b_aud_s
const WITHDRAW_PUBLIC_INPUTS_LEN: u32 = 15 * FIELD;
// transfer public-input layout (DESIGN §7.6, 24 fields × 32 bytes):
//   C_spend_A | Y_A | PVK_B | addr_f | K_aud_r | K_aud_s | C_spend' | C_tx |
//   R_e | v_tilde | b_tilde | sigma | v_aud_r | r_aud_r | v_aud_s | b_aud_s
const TRANSFER_PUBLIC_INPUTS_LEN: u32 = 24 * FIELD;

// Persistent-storage TTL for account entries. Every read/write bumps the entry
// ~30 days forward so an in-use confidential balance (and its underlying reserve)
// can never be archived out from under its owner.
const DAY_IN_LEDGERS: u32 = 17280;
const ACCOUNT_EXTEND_AMOUNT: u32 = 30 * DAY_IN_LEDGERS;
const ACCOUNT_TTL_THRESHOLD: u32 = ACCOUNT_EXTEND_AMOUNT - DAY_IN_LEDGERS;

#[contract]
pub struct ConfidentialToken;

#[contractimpl]
impl ConfidentialToken {
    pub fn __constructor(
        env: Env,
        admin: Address,
        verifier: Address,
        auditor_registry: Address,
        underlying: Address,
    ) {
        let config = Config { admin, verifier, auditor_registry, underlying };
        env.storage().instance().set(&DataKey::Config, &config);
    }

    /// One-time admin binding of this contract's `addr_f` (the off-chain
    /// Poseidon2(ADDRESS, lo, hi) of the deployed address). Required before register.
    pub fn set_contract_field(env: Env, addr_f: BytesN<32>) -> Result<(), Error> {
        Self::config_or_err(&env)?.admin.require_auth();
        // Single-shot: addr_f is the cross-instance proof-replay binding and is
        // baked into every registered account's vk derivation. Overwriting it
        // would silently invalidate every existing account, so refuse a second set.
        if env.storage().instance().has(&DataKey::ContractField) {
            return Err(Error::ContractFieldAlreadySet);
        }
        env.storage().instance().set(&DataKey::ContractField, &addr_f);
        Ok(())
    }

    /// Register a confidential account: the prover proves Y=sk*H, vk=Poseidon2(.,sk,addr_f),
    /// PVK=vk*H; we bind addr_f to this contract, verify the proof, and store the keys.
    pub fn register(
        env: Env,
        account: Address,
        auditor_id: u32,
        public_inputs: Bytes,
        proof: Bytes,
    ) -> Result<(), Error> {
        account.require_auth();
        if public_inputs.len() != REGISTER_PUBLIC_INPUTS_LEN {
            return Err(Error::BadPublicInputs);
        }
        if env.storage().persistent().has(&DataKey::Account(account.clone())) {
            return Err(Error::AlreadyRegistered);
        }
        let config = Self::config_or_err(&env)?;
        let bound: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::ContractField)
            .ok_or(Error::ContractFieldNotSet)?;

        // addr_f (public input #5) MUST equal this contract's bound field — this is
        // what stops a proof minted for another token instance being replayed here.
        let proof_addr_f: BytesN<32> = public_inputs
            .slice(4 * FIELD..REGISTER_PUBLIC_INPUTS_LEN)
            .try_into()
            .map_err(|_| Error::BadPublicInputs)?;
        if proof_addr_f != bound {
            return Err(Error::AddrFMismatch);
        }

        let verifier = VerifierClient::new(&env, &config.verifier);
        if !verifier.verify_proof(&CircuitType::Register, &public_inputs, &proof) {
            return Err(Error::InvalidProof);
        }

        let spending_key: BytesN<64> = public_inputs
            .slice(0..2 * FIELD)
            .try_into()
            .map_err(|_| Error::BadPublicInputs)?;
        let viewing_public_key: BytesN<64> = public_inputs
            .slice(2 * FIELD..4 * FIELD)
            .try_into()
            .map_err(|_| Error::BadPublicInputs)?;

        let state = AccountState {
            spending_key,
            viewing_public_key,
            auditor_id,
            spendable_balance: Grumpkin::identity(&env),
            receiving_balance: Grumpkin::identity(&env),
        };
        Self::save_account(&env, &account, &state);
        env.events().publish((symbol_short!("register"), account), auditor_id);
        Ok(())
    }

    /// Public → confidential. The amount is public (this is the deposit boundary):
    /// pull the underlying SAC in, then homomorphically add `amount·G` to the
    /// recipient's receiving balance. No ZK proof — confidentiality starts at merge.
    pub fn deposit(env: Env, from: Address, to: Address, amount: i128) -> Result<(), Error> {
        from.require_auth();
        if amount < 0 {
            return Err(Error::NegativeAmount);
        }
        let config = Self::config_or_err(&env)?;
        let mut data = Self::load_account(&env, &to)?;

        // Public boundary: move real tokens in. A failed transfer reverts the whole op.
        token::TokenClient::new(&env, &config.underlying)
            .transfer(&from, &env.current_contract_address(), &amount);

        let c_dep = Grumpkin::mul(&env, &Grumpkin::generator(&env), amount as u128);
        data.receiving_balance = Grumpkin::add(&env, &data.receiving_balance, &c_dep);
        Self::save_account(&env, &to, &data);
        env.events().publish((symbol_short!("deposit"), from, to), amount);
        Ok(())
    }

    /// Fold the receiving balance into the spendable balance (proof-less, owner-authed,
    /// non-frontrunnable). Makes received funds spendable.
    pub fn merge(env: Env, account: Address) -> Result<(), Error> {
        account.require_auth();
        let mut data = Self::load_account(&env, &account)?;
        data.spendable_balance = Grumpkin::add(&env, &data.spendable_balance, &data.receiving_balance);
        data.receiving_balance = Grumpkin::identity(&env);
        Self::save_account(&env, &account, &data);
        env.events().publish((symbol_short!("merge"), account), ());
        Ok(())
    }

    /// Confidential → public (the unshield boundary). `amount` is public: the
    /// prover proves they own `C_spend = v·G + r·H`, that `0 ≤ amount ≤ v < 2^127`,
    /// and supplies the new spendable commitment `C_spend' = (v − amount)·G + r'·H`
    /// plus the auditor-visibility ciphertexts. We reconstruct the circuit's
    /// 15-field public-input blob from stored state + the auditor key + the
    /// prover outputs, verify the proof, overwrite the spendable balance, then
    /// move `amount` real underlying tokens out to `to`.
    #[allow(clippy::too_many_arguments)]
    pub fn withdraw(
        env: Env,
        from: Address,
        to: Address,
        amount: i128,
        c_spend_new: BytesN<64>,
        sigma: BytesN<32>,
        b_tilde: BytesN<32>,
        r_e: BytesN<64>,
        b_aud_s: BytesN<32>,
        proof: Bytes,
    ) -> Result<(), Error> {
        from.require_auth();
        if amount < 0 {
            return Err(Error::NegativeAmount);
        }
        let config = Self::config_or_err(&env)?;
        let account = Self::load_account(&env, &from)?;
        let addr_f: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::ContractField)
            .ok_or(Error::ContractFieldNotSet)?;

        // Prover-supplied values cross the trust boundary — reject any non-canonical
        // BN254 representative before it reaches the verifier (stored state and the
        // registered auditor key are already canonical by construction).
        if !Grumpkin::is_canonical_point(&c_spend_new)
            || !Grumpkin::is_canonical_point(&r_e)
            || !Grumpkin::is_canonical_field(&sigma)
            || !Grumpkin::is_canonical_field(&b_tilde)
            || !Grumpkin::is_canonical_field(&b_aud_s)
        {
            return Err(Error::NonCanonicalEncoding);
        }

        let k_aud_s = AuditorClient::new(&env, &config.auditor_registry).get_key(&account.auditor_id);

        // PI order (DESIGN §7.5): C_spend | Y | addr_f | K_aud_s | a |
        //                         C_spend' | sigma | b_tilde | R_e | b_aud_s
        let mut pi = Bytes::new(&env);
        pi.append(&Bytes::from(&account.spendable_balance));
        pi.append(&Bytes::from(&account.spending_key));
        pi.append(&Bytes::from(&addr_f));
        pi.append(&Bytes::from(&k_aud_s));
        pi.append(&amount_to_field(&env, amount));
        pi.append(&Bytes::from(&c_spend_new));
        pi.append(&Bytes::from(&sigma));
        pi.append(&Bytes::from(&b_tilde));
        pi.append(&Bytes::from(&r_e));
        pi.append(&Bytes::from(&b_aud_s));
        debug_assert_eq!(pi.len(), WITHDRAW_PUBLIC_INPUTS_LEN);

        let verifier = VerifierClient::new(&env, &config.verifier);
        if !verifier.verify_proof(&CircuitType::Withdraw, &pi, &proof) {
            return Err(Error::InvalidProof);
        }

        // Proof accepted: commit the new spendable balance, then cross the public
        // boundary. A failed token transfer reverts the whole op.
        let mut data = account;
        data.spendable_balance = c_spend_new;
        Self::save_account(&env, &from, &data);

        token::TokenClient::new(&env, &config.underlying)
            .transfer(&env.current_contract_address(), &to, &amount);

        env.events().publish((symbol_short!("withdraw"), from, to), amount);
        Ok(())
    }

    /// Confidential → confidential transfer (no public boundary, no amount).
    /// The sender proves they own `C_spend_A`, that the transferred value is in
    /// range, and supplies the new spendable commitment plus the recipient's
    /// transfer commitment `C_tx` and the recipient-/auditor-visibility
    /// ciphertexts. We rebuild the 24-field public-input blob (DESIGN §7.6) from
    /// both accounts' stored state + both auditor keys + the prover outputs,
    /// verify the proof, overwrite the sender's spendable balance, and add
    /// `C_tx` to the recipient's receiving balance (folded in later via merge).
    pub fn transfer(
        env: Env,
        from: Address,
        to: Address,
        payload: TransferPayload,
        proof: Bytes,
    ) -> Result<(), Error> {
        from.require_auth();
        let config = Self::config_or_err(&env)?;
        let mut sender = Self::load_account(&env, &from)?;
        // Read-only snapshot for public-input assembly (PVK_B, auditor_id). The
        // receiving-balance credit is applied to a FRESH re-read below, so a
        // self-transfer (from == to) composes on top of the sender write instead
        // of clobbering it with this stale copy.
        let recipient = Self::load_account(&env, &to)?;
        let addr_f: BytesN<32> = env
            .storage()
            .instance()
            .get(&DataKey::ContractField)
            .ok_or(Error::ContractFieldNotSet)?;

        // Prover-supplied values cross the trust boundary — reject non-canonical
        // BN254 representatives before they reach the verifier.
        if !Grumpkin::is_canonical_point(&payload.c_spend_new)
            || !Grumpkin::is_canonical_point(&payload.c_tx)
            || !Grumpkin::is_canonical_point(&payload.r_e)
            || !Grumpkin::is_canonical_field(&payload.v_tilde)
            || !Grumpkin::is_canonical_field(&payload.b_tilde)
            || !Grumpkin::is_canonical_field(&payload.sigma)
            || !Grumpkin::is_canonical_field(&payload.v_aud_r)
            || !Grumpkin::is_canonical_field(&payload.r_aud_r)
            || !Grumpkin::is_canonical_field(&payload.v_aud_s)
            || !Grumpkin::is_canonical_field(&payload.b_aud_s)
        {
            return Err(Error::NonCanonicalEncoding);
        }

        let auditor = AuditorClient::new(&env, &config.auditor_registry);
        let k_aud_r = auditor.get_key(&recipient.auditor_id);
        let k_aud_s = auditor.get_key(&sender.auditor_id);

        // PI order (DESIGN §7.6): C_spend_A | Y_A | PVK_B | addr_f | K_aud_r |
        //   K_aud_s | C_spend' | C_tx | R_e | v_tilde | b_tilde | sigma |
        //   v_aud_r | r_aud_r | v_aud_s | b_aud_s
        let mut pi = Bytes::new(&env);
        pi.append(&Bytes::from(&sender.spendable_balance));
        pi.append(&Bytes::from(&sender.spending_key));
        pi.append(&Bytes::from(&recipient.viewing_public_key));
        pi.append(&Bytes::from(&addr_f));
        pi.append(&Bytes::from(&k_aud_r));
        pi.append(&Bytes::from(&k_aud_s));
        pi.append(&Bytes::from(&payload.c_spend_new));
        pi.append(&Bytes::from(&payload.c_tx));
        pi.append(&Bytes::from(&payload.r_e));
        pi.append(&Bytes::from(&payload.v_tilde));
        pi.append(&Bytes::from(&payload.b_tilde));
        pi.append(&Bytes::from(&payload.sigma));
        pi.append(&Bytes::from(&payload.v_aud_r));
        pi.append(&Bytes::from(&payload.r_aud_r));
        pi.append(&Bytes::from(&payload.v_aud_s));
        pi.append(&Bytes::from(&payload.b_aud_s));
        debug_assert_eq!(pi.len(), TRANSFER_PUBLIC_INPUTS_LEN);

        let verifier = VerifierClient::new(&env, &config.verifier);
        if !verifier.verify_proof(&CircuitType::Transfer, &pi, &proof) {
            return Err(Error::InvalidProof);
        }

        sender.spendable_balance = payload.c_spend_new;
        Self::save_account(&env, &from, &sender);
        // Re-read the recipient AFTER the sender write so a self-transfer sees the
        // committed debit; for distinct accounts this is the same value as above.
        let mut credited = Self::load_account(&env, &to)?;
        credited.receiving_balance =
            Grumpkin::add(&env, &credited.receiving_balance, &payload.c_tx);
        Self::save_account(&env, &to, &credited);

        // Emit the recipient-channel ciphertext so the recipient can scan, recompute
        // the shared secret s = ecdh(vk_B, R_e), and recover (v_tx, r_tx) to open C_tx.
        env.events().publish(
            (symbol_short!("transfer"), from, to),
            (payload.r_e, payload.v_tilde, payload.sigma),
        );
        Ok(())
    }

    pub fn config(env: Env) -> Config {
        env.storage().instance().get(&DataKey::Config).unwrap()
    }

    pub fn is_registered(env: Env, account: Address) -> bool {
        env.storage().persistent().has(&DataKey::Account(account))
    }

    pub fn account(env: Env, account: Address) -> Option<AccountState> {
        env.storage().persistent().get(&DataKey::Account(account))
    }

    fn config_or_err(env: &Env) -> Result<Config, Error> {
        env.storage().instance().get(&DataKey::Config).ok_or(Error::NotConfigured)
    }

    /// Load a registered account, extending its persistent TTL on the way out.
    fn load_account(env: &Env, account: &Address) -> Result<AccountState, Error> {
        let key = DataKey::Account(account.clone());
        let state = env
            .storage()
            .persistent()
            .get(&key)
            .ok_or(Error::AccountNotRegistered)?;
        env.storage().persistent().extend_ttl(&key, ACCOUNT_TTL_THRESHOLD, ACCOUNT_EXTEND_AMOUNT);
        Ok(state)
    }

    /// Persist an account and extend its TTL (writes don't auto-extend).
    fn save_account(env: &Env, account: &Address, state: &AccountState) {
        let key = DataKey::Account(account.clone());
        env.storage().persistent().set(&key, state);
        env.storage().persistent().extend_ttl(&key, ACCOUNT_TTL_THRESHOLD, ACCOUNT_EXTEND_AMOUNT);
    }
}

/// Encode a non-negative `i128` as a canonical 32-byte big-endian BN254 field
/// element (left-padded), matching the circuit's `a` public input.
fn amount_to_field(env: &Env, amount: i128) -> Bytes {
    let mut buf = [0u8; 32];
    buf[16..].copy_from_slice(&amount.to_be_bytes());
    Bytes::from_array(env, &buf)
}

mod test;
