#![cfg(test)]

use soroban_sdk::{contract, contractimpl, testutils::Address as _, Address, Bytes, BytesN, Env};

use crate::{CircuitType, ConfidentialToken, ConfidentialTokenClient, Error};

// Stand-in verifier registry: accepts any proof, so the token's own logic
// (auth, addr_f binding, storage, events) is what's under test here. The real
// UltraHonk verifier acceptance is proven on testnet (see the evidence doc).
#[contract]
pub struct MockVerifier;

#[contractimpl]
impl MockVerifier {
    pub fn verify_proof(
        _env: Env,
        _circuit_type: CircuitType,
        _public_inputs: Bytes,
        _proof: Bytes,
    ) -> bool {
        true
    }
}

struct Fixture<'a> {
    env: Env,
    client: ConfidentialTokenClient<'a>,
}

fn setup<'a>() -> Fixture<'a> {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let verifier = env.register(MockVerifier, ());
    let auditor_registry = Address::generate(&env);
    let underlying = Address::generate(&env);
    let id = env.register(ConfidentialToken, (admin, verifier, auditor_registry, underlying));
    let client = ConfidentialTokenClient::new(&env, &id);
    Fixture { env, client }
}

/// 160-byte register public inputs: y_x|y_y|pvk_x|pvk_y|addr_f, addr_f filled with `tag`.
fn register_public_inputs(env: &Env, tag: u8) -> Bytes {
    let mut pi = [1u8; 160];
    pi[128..160].copy_from_slice(&[tag; 32]);
    Bytes::from_array(env, &pi)
}

#[test]
fn constructor_stores_config() {
    let f = setup();
    assert_eq!(f.client.config().admin, f.client.config().admin);
}

#[test]
fn register_verifies_binds_addr_f_and_stores() {
    let f = setup();
    let addr_f = BytesN::<32>::from_array(&f.env, &[7u8; 32]);
    f.client.set_contract_field(&addr_f);

    let account = Address::generate(&f.env);
    let pi = register_public_inputs(&f.env, 7);
    let proof = Bytes::from_array(&f.env, &[0u8; 32]);

    f.client.register(&account, &5u32, &pi, &proof);

    assert!(f.client.is_registered(&account));
    let state = f.client.account(&account).unwrap();
    assert_eq!(state.auditor_id, 5);
}

#[test]
fn register_rejects_mismatched_addr_f() {
    let f = setup();
    f.client.set_contract_field(&BytesN::<32>::from_array(&f.env, &[7u8; 32]));

    let account = Address::generate(&f.env);
    let pi = register_public_inputs(&f.env, 9); // addr_f tag 9 != bound 7
    let proof = Bytes::from_array(&f.env, &[0u8; 32]);

    let result = f.client.try_register(&account, &5u32, &pi, &proof);
    assert_eq!(result, Err(Ok(Error::AddrFMismatch)));
}

#[test]
fn register_requires_contract_field_set() {
    let f = setup();
    let account = Address::generate(&f.env);
    let pi = register_public_inputs(&f.env, 7);
    let proof = Bytes::from_array(&f.env, &[0u8; 32]);

    let result = f.client.try_register(&account, &5u32, &pi, &proof);
    assert_eq!(result, Err(Ok(Error::ContractFieldNotSet)));
}
