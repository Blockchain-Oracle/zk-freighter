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
    contract, contractclient, contracterror, contractimpl, contracttype, symbol_short, Address,
    Bytes, BytesN, Env,
};

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
}

/// Cross-contract view of the verifier registry.
#[contractclient(name = "VerifierClient")]
pub trait VerifierInterface {
    fn verify_proof(env: Env, circuit_type: CircuitType, public_inputs: Bytes, proof: Bytes) -> bool;
}

// register public-input layout: y_x | y_y | pvk_x | pvk_y | addr_f, 32 bytes each.
const FIELD: u32 = 32;
const REGISTER_PUBLIC_INPUTS_LEN: u32 = 5 * FIELD;

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

        let state = AccountState { spending_key, viewing_public_key, auditor_id };
        env.storage().persistent().set(&DataKey::Account(account.clone()), &state);
        env.events().publish((symbol_short!("register"), account), auditor_id);
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
}

mod test;
