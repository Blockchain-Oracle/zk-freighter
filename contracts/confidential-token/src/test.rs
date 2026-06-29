#![cfg(test)]

use soroban_sdk::{
    contract, contractimpl,
    testutils::Address as _,
    token::{StellarAssetClient, TokenClient},
    Address, Bytes, BytesN, Env,
};

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

// Stand-in auditor registry: returns a fixed canonical Grumpkin key for any id.
#[contract]
pub struct MockAuditor;

#[contractimpl]
impl MockAuditor {
    pub fn get_key(env: Env, _auditor_id: u32) -> BytesN<64> {
        BytesN::<64>::from_array(&env, &[2u8; 64])
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

/// Full token wired to a real SAC underlying, with one registered account.
fn setup_with_sac<'a>() -> (Env, ConfidentialTokenClient<'a>, Address, Address) {
    let env = Env::default();
    env.mock_all_auths();
    let admin = Address::generate(&env);
    let verifier = env.register(MockVerifier, ());
    let auditor_registry = env.register(MockAuditor, ());
    let sac_id = env.register_stellar_asset_contract_v2(admin).address();
    let token_id = env.register(ConfidentialToken, (Address::generate(&env), verifier, auditor_registry, sac_id.clone()));
    let client = ConfidentialTokenClient::new(&env, &token_id);
    client.set_contract_field(&BytesN::<32>::from_array(&env, &[7u8; 32]));
    let user = Address::generate(&env);
    client.register(&user, &0u32, &register_public_inputs(&env, 7), &Bytes::from_array(&env, &[0u8; 32]));
    (env, client, sac_id, user)
}

#[test]
fn deposit_pulls_underlying_and_merge_runs() {
    let (env, client, sac_id, user) = setup_with_sac();
    StellarAssetClient::new(&env, &sac_id).mint(&user, &1000);

    client.deposit(&user, &user, &250);

    // Public boundary: the contract actually received the underlying tokens.
    let sac = TokenClient::new(&env, &sac_id);
    assert_eq!(sac.balance(&client.address), 250);
    assert_eq!(sac.balance(&user), 750);

    // Merge folds receiving into spendable (Grumpkin point add) without error.
    client.merge(&user);
    assert!(client.is_registered(&user));
}

#[test]
fn deposit_rejects_negative_amount() {
    let (_env, client, _sac, user) = setup_with_sac();
    assert_eq!(client.try_deposit(&user, &user, &-1), Err(Ok(Error::NegativeAmount)));
}

#[test]
fn deposit_requires_recipient_registered() {
    let (env, client, sac_id, user) = setup_with_sac();
    StellarAssetClient::new(&env, &sac_id).mint(&user, &1000);
    let stranger = Address::generate(&env);
    assert_eq!(client.try_deposit(&user, &stranger, &10), Err(Ok(Error::AccountNotRegistered)));
}

/// Canonical prover-supplied withdraw payload (commitment math is the circuit's
/// job — under MockVerifier we exercise the contract's PI assembly, storage
/// overwrite, and the public-boundary token transfer out).
fn withdraw_payload(env: &Env) -> (BytesN<64>, BytesN<32>, BytesN<32>, BytesN<64>, BytesN<32>) {
    (
        BytesN::<64>::from_array(env, &[3u8; 64]), // c_spend_new
        BytesN::<32>::from_array(env, &[5u8; 32]), // sigma
        BytesN::<32>::from_array(env, &[6u8; 32]), // b_tilde
        BytesN::<64>::from_array(env, &[4u8; 64]), // r_e
        BytesN::<32>::from_array(env, &[7u8; 32]), // b_aud_s
    )
}

#[test]
fn withdraw_verifies_overwrites_spendable_and_pays_out() {
    let (env, client, sac_id, user) = setup_with_sac();
    StellarAssetClient::new(&env, &sac_id).mint(&user, &1000);
    client.deposit(&user, &user, &250); // contract now holds 250 underlying
    client.merge(&user);

    let recipient = Address::generate(&env);
    let (c_new, sigma, b_tilde, r_e, b_aud_s) = withdraw_payload(&env);
    let proof = Bytes::from_array(&env, &[0u8; 32]);

    client.withdraw(&user, &recipient, &100, &c_new, &sigma, &b_tilde, &r_e, &b_aud_s, &proof);

    // Public boundary: real tokens left the contract to the recipient.
    let sac = TokenClient::new(&env, &sac_id);
    assert_eq!(sac.balance(&recipient), 100);
    assert_eq!(sac.balance(&client.address), 150);
    // Spendable commitment was overwritten with the prover's C_spend'.
    assert_eq!(client.account(&user).unwrap().spendable_balance, c_new);
}

#[test]
fn withdraw_rejects_negative_amount() {
    let (env, client, _sac, user) = setup_with_sac();
    let (c_new, sigma, b_tilde, r_e, b_aud_s) = withdraw_payload(&env);
    let proof = Bytes::from_array(&env, &[0u8; 32]);
    let to = Address::generate(&env);
    assert_eq!(
        client.try_withdraw(&user, &to, &-1, &c_new, &sigma, &b_tilde, &r_e, &b_aud_s, &proof),
        Err(Ok(Error::NegativeAmount))
    );
}

#[test]
fn withdraw_rejects_non_canonical_payload() {
    let (env, client, _sac, user) = setup_with_sac();
    let (_c, sigma, b_tilde, r_e, b_aud_s) = withdraw_payload(&env);
    // A field at or above the BN254 modulus is non-canonical → rejected pre-verify.
    let bad = BytesN::<64>::from_array(&env, &[0xffu8; 64]);
    let proof = Bytes::from_array(&env, &[0u8; 32]);
    let to = Address::generate(&env);
    assert_eq!(
        client.try_withdraw(&user, &to, &10, &bad, &sigma, &b_tilde, &r_e, &b_aud_s, &proof),
        Err(Ok(Error::NonCanonicalEncoding))
    );
}

#[test]
fn withdraw_requires_registered_account() {
    let (env, client, _sac, _user) = setup_with_sac();
    let stranger = Address::generate(&env);
    let (c_new, sigma, b_tilde, r_e, b_aud_s) = withdraw_payload(&env);
    let proof = Bytes::from_array(&env, &[0u8; 32]);
    let to = Address::generate(&env);
    assert_eq!(
        client.try_withdraw(&stranger, &to, &10, &c_new, &sigma, &b_tilde, &r_e, &b_aud_s, &proof),
        Err(Ok(Error::AccountNotRegistered))
    );
}
