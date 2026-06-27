#![cfg(test)]

use soroban_sdk::{testutils::Address as _, Address, Env};

use crate::{ConfidentialToken, ConfidentialTokenClient};

fn setup(env: &Env) -> (ConfidentialTokenClient<'_>, Address, Address) {
    let admin = Address::generate(env);
    let verifier = Address::generate(env);
    let auditor_registry = Address::generate(env);
    let underlying = Address::generate(env);
    let id = env.register(
        ConfidentialToken,
        (admin.clone(), verifier.clone(), auditor_registry, underlying),
    );
    (ConfidentialTokenClient::new(env, &id), admin, verifier)
}

#[test]
fn constructor_stores_config() {
    let env = Env::default();
    let (client, admin, verifier) = setup(&env);
    let config = client.config();
    assert_eq!(config.admin, admin);
    assert_eq!(config.verifier, verifier);
}

#[test]
fn unregistered_account_has_no_state() {
    let env = Env::default();
    let (client, _admin, _verifier) = setup(&env);
    let account = Address::generate(&env);
    assert!(!client.is_registered(&account));
    assert!(client.account(&account).is_none());
}
