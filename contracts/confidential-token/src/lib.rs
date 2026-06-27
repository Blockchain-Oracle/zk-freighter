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

use soroban_sdk::{contract, contractclient, contractimpl, contracttype, Address, Bytes, BytesN, Env};

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

#[contracttype]
#[derive(Clone)]
pub enum DataKey {
    Config,
    Account(Address),
}

/// Immutable wiring set at construction.
#[contracttype]
#[derive(Clone)]
pub struct Config {
    pub admin: Address,
    /// UltraHonk verifier registry (holds one VK per `CircuitType`).
    pub verifier: Address,
    /// Auditor registry (Grumpkin public keys per `auditor_id`).
    pub auditor_registry: Address,
    /// The public underlying Stellar asset contract (SAC) this token wraps.
    pub underlying: Address,
}

/// Per-account confidential identity (set at register). Balances live in separate
/// commitment entries added by deposit/transfer in later slices.
#[contracttype]
#[derive(Clone)]
pub struct AccountState {
    /// Spending public key Y = sk*H (Grumpkin affine, x||y, 64 bytes).
    pub spending_key: BytesN<64>,
    /// Public viewing key PVK = vk*H (Grumpkin affine, x||y, 64 bytes).
    pub viewing_public_key: BytesN<64>,
    /// Auditor channel this account is bound to.
    pub auditor_id: u32,
}

/// Cross-contract view of the verifier registry.
#[contractclient(name = "VerifierClient")]
pub trait VerifierInterface {
    fn verify_proof(env: Env, circuit_type: CircuitType, public_inputs: Bytes, proof: Bytes) -> bool;
}

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

    pub fn config(env: Env) -> Config {
        env.storage().instance().get(&DataKey::Config).unwrap()
    }

    pub fn is_registered(env: Env, account: Address) -> bool {
        env.storage().persistent().has(&DataKey::Account(account))
    }

    pub fn account(env: Env, account: Address) -> Option<AccountState> {
        env.storage().persistent().get(&DataKey::Account(account))
    }
}

mod test;
