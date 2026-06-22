# Stories: ZK Fighter product MVP

## Traceability

Source spec: `.thoughts/specs/2026-06-22-zk-fighter-product-spec.md`.

| Story | Spec Requirements | Acceptance Criteria |
|---|---|---|
| S1. Create or import seed-backed wallet | R1, R7, R12 | A1, A7 |
| S2. See network and balance reality | R5, R6, R7, R12 | A1, A2, A4, A10 |
| S3. Share private receive code | R3, R4, R12 | A5 |
| S4. Opt into public discovery | R4, R12 | A5 |
| S5. Shield XLM | R5, R6, R7, R12 | A2, A3 |
| S6. Send XLM privately | R3, R5, R12 | A2, A3, A5 |
| S7. Unshield XLM | R5, R6, R7, R12 | A2, A3 |
| S8. Configure and prove USDC pool | R5, R6, R7 | A1, A4 |
| S9. Shield, send, and unshield USDC | R5, R6, R12 | A3, A4 |
| S10. Handle USDC trustline failure safely | R6, R12 | A4 |
| S11. Show load-bearing ZK proof behavior | R5, R12 | A3 |
| S12. Export user-held disclosure artifact | R10, R12 | A8 |
| S13. Enable optional passkey | R2, R12 | A7 |
| S14. Bridge Sepolia USDC then shield | R8, R12 | A6 |
| S15. Keep atomic bridge-and-shield experimental | R9, R12 | A6 |
| S16. Keep mainnet gated but possible | R7, R12 | A1, A10 |
| S17. Prove extension feasibility before claiming it | R2, R11 | A9 |

## Story 1: Create or import seed-backed wallet

As a new ZK Fighter user,
I want to create or import a seed-backed wallet,
so that my private receive identity and spend authority are recoverable from the seed phrase.

### Acceptance Criteria

- The user can create a new seed-backed wallet.
- The user can import an existing seed phrase.
- The app explains that the seed phrase is the only guaranteed recovery path.
- The app does not present passkey as a replacement for the seed phrase.
- The same seed derives the same private receive identity after reload/import.

### Scenarios

```gherkin
Given I create a new wallet
When the app derives my private receive identity
And I reload or re-import the same seed phrase
Then the derived private receive identity is identical
```

```gherkin
Given I am onboarding
When I reach recovery copy
Then the app warns that losing the seed can permanently lose access
And it does not mention support-controlled recovery
```

### Notes

- Do not add recovery secrets.
- Do not make passkey mandatory.
- The deterministic derivation proof remains a Phase-0 validation gate before funds depend on it.

## Story 2: See network and balance reality

As a wallet user,
I want to see which network and balance type I am using,
so that I do not confuse public Stellar funds with shielded pool funds.

### Acceptance Criteria

- Testnet/mainnet mode is visible.
- Public and shielded balances are distinct enough to avoid confusion.
- Unsupported mainnet features are disabled or gated until deployed and tested.
- Network config uses verified SAC IDs and explicit RPC/passphrase records.
- Mainnet does not depend on the local Stellar CLI's broken built-in mainnet RPC entry.

### Scenarios

```gherkin
Given I switch from testnet to mainnet
When a pool is not deployed on mainnet
Then the relevant shielded action is disabled or clearly gated
And the app does not show fake balances or fake transaction links
```

### Notes

- Network state is product behavior, not just developer config.
- This story is not a general-purpose public-wallet portfolio.

## Story 3: Share private receive code

As a recipient,
I want to copy or show a private receive code,
so that another ZK Fighter user can send to me privately without me publishing anything on-chain.

### Acceptance Criteria

- The receive surface shows a bundled private receive code containing public note key and public encryption key material.
- The receive code is copyable.
- The receive code can be displayed as QR.
- The app explains that the code lets someone pay the user privately inside the pool.
- The app does not imply the code reveals private spend keys, seed phrase, funds, or note plaintext.

### Scenarios

```gherkin
Given I have never opted into public discovery
When I copy my private receive code
And another user sends to that code
Then I can receive privately inside the pool
And no public discovery/register event is required
```

### Notes

- Exact encoding/prefix remains an open product decision.
- Primary UX should say "private receive code," not "registry."

## Story 4: Opt into public discovery

As a recipient who wants easier incoming payments,
I want to optionally publish my private receive code for discovery,
so that senders can find my private receive identity from my public Stellar identity.

### Acceptance Criteria

- Publishing is opt-in and never automatic during wallet creation.
- The app explains the privacy trade-off before publishing.
- Copy states that publishing does not expose private keys or funds.
- Copy also states that publishing creates a public on-chain link from public Stellar identity to private receive identity.
- The user can still use direct private receive code sharing without publishing.

### Scenarios

```gherkin
Given I am about to publish my private receive identity
When the confirmation screen appears
Then it states the public-link trade-off
And I must explicitly confirm before anything is submitted on-chain
```

### Notes

- Preferred copy direction: "Make my private code discoverable."
- Exact label remains a founder/product copy decision.

## Story 5: Shield XLM

As a wallet user with public testnet XLM,
I want to shield XLM into the privacy pool,
so that I can later send shielded XLM privately.

### Acceptance Criteria

- The app uses the deployed testnet XLM pool from verified research/config.
- The user sees that shield/deposit is public.
- The app generates a real client-side proof and submits a real Stellar transaction.
- Evidence includes transaction hash, explorer link, and before/after balance notes.
- Proof generation/submission progress is visible.

### Scenarios

```gherkin
Given I have public testnet XLM
When I shield an allowed amount
Then a real Stellar transaction is submitted to the XLM pool
And the shielded balance updates from real pool events
```

### Notes

- No mocked proof, mocked balance, or fake transaction hash in the judged path.

## Story 6: Send XLM privately

As a shielded XLM sender,
I want to send XLM to another user's private receive code,
so that the transfer occurs inside the privacy pool without exposing the sender-recipient relationship on-chain.

### Acceptance Criteria

- The sender can paste or scan a private receive code.
- The app generates and submits the required privacy-pool transaction.
- Recipient can scan/trial-decrypt pool events and see the received spendable note.
- Activity shows a private send without over-revealing details.
- Failed proof, ASP, sync, and submission errors are surfaced honestly.

### Scenarios

```gherkin
Given Alice has shielded XLM
And Bob gives Alice a private receive code
When Alice sends shielded XLM to Bob
Then Bob can discover a spendable private note
And the public chain does not reveal Alice-to-Bob as a normal public payment
```

### Notes

- This is the heart of the product demo.
- The UI must still be honest that shield/unshield edges are public.

## Story 7: Unshield XLM

As a shielded XLM holder,
I want to unshield XLM to a public Stellar address,
so that I can move funds back to normal public Stellar usage.

### Acceptance Criteria

- The app labels unshield/withdraw as public.
- The user enters or confirms the public Stellar destination.
- A real proof is generated and accepted by the contract.
- A real withdrawal transaction lands on testnet.
- Evidence includes hash, explorer link, and balance notes.

### Scenarios

```gherkin
Given I have spendable shielded XLM
When I unshield to a public Stellar address
Then the public destination receives XLM
And the app shows that this boundary action is public
```

### Notes

- Do not describe unshield as private.

## Story 8: Configure and prove USDC pool

As the builder of ZK Fighter,
I want USDC to use its own real privacy pool,
so that USDC shielding is not a UI-only copy of the XLM path.

### Acceptance Criteria

- Testnet USDC SAC ID is the verified ID from the CLI research.
- A real testnet USDC pool is deployed or located and added to config.
- The USDC pool is separate from the XLM pool.
- Deposit/withdraw paths use USDC's SAC and issuer correctly.
- Pool IDs and deployment evidence are recorded before product claims.

### Scenarios

```gherkin
Given the app is configured for testnet
When USDC is selected
Then transactions route to the USDC pool
And not to the XLM pool
```

### Notes

- USDC pool deployment is a validation gate, not a design assumption.

## Story 9: Shield, send, and unshield USDC

As a USDC user,
I want to shield, privately send, and unshield USDC,
so that the same private-payment experience works for the stablecoin asset.

### Acceptance Criteria

- A real USDC shield succeeds on testnet.
- A real USDC private send succeeds on testnet.
- A real USDC unshield succeeds on testnet when the recipient can receive USDC.
- Activity and balances identify USDC separately from XLM.
- Evidence includes transaction hashes and explorer links.

### Scenarios

```gherkin
Given I have public testnet USDC
When I shield and privately send USDC
Then the recipient receives a spendable shielded USDC note
And the app records real transaction evidence
```

### Notes

- This story depends on Story 8.

## Story 10: Handle USDC trustline failure safely

As a user withdrawing USDC to a public Stellar address,
I want the app to handle recipient readiness clearly,
so that failed USDC withdrawals do not feel random or technical.

### Acceptance Criteria

- Missing-recipient-trustline behavior is reproduced on testnet.
- The successful trustline-ready path is reproduced on testnet.
- User copy says an address cannot receive USDC yet, rather than exposing raw protocol language as the primary message.
- The app does not lose funds or produce misleading success states on failure.

### Scenarios

```gherkin
Given I try to unshield USDC to a public address that cannot receive USDC
When the transaction would fail due to receive readiness
Then the app blocks or explains the issue before pretending success
And provides a safe next action
```

### Notes

- The low-level concept is trustline/reserve, but primary UX should be plain English.

## Story 11: Show load-bearing ZK proof behavior

As a hackathon judge,
I want to see that ZK is required for state transitions,
so that the product is clearly a real ZK Stellar app, not a normal wallet with privacy copy.

### Acceptance Criteria

- A valid proof generated client-side is accepted on-chain.
- A deliberately tampered proof is rejected on-chain or during faithful simulation.
- The demo can explain why the proof is required.
- The app captures real evidence for accepted and rejected paths.

### Scenarios

```gherkin
Given a valid privacy-pool transaction succeeds
When the proof or public inputs are tampered with
Then the verifier rejects the transaction
And the demo can point to that rejection as evidence
```

### Notes

- This is an acceptance proof, not a normal end-user workflow.

## Story 12: Export user-held disclosure artifact

As a user,
I want to export a read-only disclosure artifact,
so that I can prove selected activity to an auditor without granting spend authority.

### Acceptance Criteria

- The user controls when disclosure is generated/exported.
- The artifact is read-only and cannot spend funds.
- The app does not imply ZK Fighter can disclose on the user's behalf.
- A reviewer can use the artifact to inspect relevant activity.
- Full viewing-key export, if present, has blunt irreversible warnings and is demoted below scoped disclosure.

### Scenarios

```gherkin
Given I need to show one transaction to an auditor
When I generate a scoped disclosure artifact
Then the auditor can verify the disclosed activity
And cannot spend from my wallet
```

### Notes

- Do not build an ASP-operator/admin dashboard for MVP.

## Story 13: Enable optional passkey

As a seed-backed wallet user,
I want to optionally enable passkey convenience,
so that supported devices can unlock or protect local material without replacing my seed recovery.

### Acceptance Criteria

- Seed-only wallet works without passkey.
- Passkey setup is optional.
- PRF-supported paths unlock or derive expected protected material.
- Unsupported or mismatched PRF paths fail closed.
- Target-device PRF matrix is recorded before phone/passkey support is claimed in demo.

### Scenarios

```gherkin
Given I have a working seed-backed wallet
When I enable passkey on a supported device
Then I can use passkey for the supported convenience flow
And the app still tells me the seed is the recovery path
```

```gherkin
Given passkey PRF is unavailable or mismatched
When I try to use passkey
Then the app fails closed
And the seed-backed path remains available
```

### Notes

- Passkey must not become passkey-only recovery.
- Extension passkey ceremonies must happen in a page/tab/side panel, not an action popup.

## Story 14: Bridge Sepolia USDC then shield

As a user with Sepolia USDC,
I want to bridge USDC to Stellar and then shield it,
so that cross-chain inflow lands in the privacy pool through a safe, honest two-step flow.

### Acceptance Criteria

- The bridge leg uses Circle CCTP, not a custom bridge.
- The bridge leg is labeled public.
- The UI shows source approval/burn, Circle attestation, Stellar mint/forward, and shield.
- Evidence includes EVM approval/burn hash, Circle/Iris attestation reference, Stellar mint/forward hash, and final public Stellar USDC balance.
- The user can then shield the bridged USDC with a separate real Stellar transaction.

### Scenarios

```gherkin
Given I have Sepolia USDC
When I bridge into Stellar testnet
Then I see public bridge progress with explorer links
And after public USDC arrives I can shield it in a separate transaction
```

### Notes

- Do not claim stock Circle `CctpForwarder` deposits into the privacy pool.
- If CCTP fails, keep bridge disabled and document the failed gate.

## Story 15: Keep atomic bridge-and-shield experimental

As a product reviewer,
I want atomic bridge-and-shield to be clearly experimental until proven,
so that the product does not overclaim a risky integration.

### Acceptance Criteria

- Atomic mode is not exposed as standard MVP behavior.
- Any atomic adapter must bind CCTP message data to proof/ext data.
- Recovery/revert semantics are defined before user exposure.
- The app does not market atomic bridge-and-shield unless real transactions prove it.

### Scenarios

```gherkin
Given the safe two-step bridge is available
When atomic bridge-and-shield has not passed its adapter tests
Then atomic mode is hidden, disabled, or labeled experimental
And the normal product path remains two-step bridge then shield
```

### Notes

- This story exists to prevent hallucinated bridge claims.

## Story 16: Keep mainnet gated but possible

As the founder,
I want mainnet support to be a config path rather than a rewrite,
so that the project can test or demo mainnet only when explicitly approved and safely funded.

### Acceptance Criteria

- Mainnet config includes explicit RPC, passphrase, verified native SAC, verified USDC SAC, and relevant contract IDs when available.
- Mainnet features are disabled unless pool/contract IDs exist and have been tested.
- Any mainnet demo requires explicit founder approval.
- Mainnet copy mentions real-funds and unaudited risk.
- Mainnet claims include transaction hashes and explorer links.

### Scenarios

```gherkin
Given I toggle to mainnet
When a USDC pool is not deployed in config
Then USDC shielding is disabled or gated
And the app does not imply mainnet USDC privacy is live
```

### Notes

- Testnet is first working network.
- Mainnet readiness is configuration and evidence, not optimism.

## Story 17: Prove extension feasibility before claiming it

As a ZK Fighter user,
I want any extension version to use the same real wallet core,
so that the extension is not a separate fragile demo.

### Acceptance Criteria

- Extension uses shared core logic from the web app.
- WXT is used only after real prover packaging is proven.
- MV3 background service worker coordinates only; it does not generate proofs.
- Proving works in an extension page or offscreen document plus dedicated worker before claims are made.
- A test dapp can detect/network-probe the extension, while external public-key access and signing fail closed unless the product scope changes.

### Scenarios

```gherkin
Given the web privacy loop works
When the extension is introduced
Then it reuses the same core wallet/prover logic
And proof generation does not depend on the MV3 background service worker staying alive
And it does not behave as a general public dApp signing wallet
```

### Notes

- Extension comes after web-core proof.
- If extension constraints are not solved, web remains the judged surface and extension is labeled in-progress.

## Open Questions

- What exact private receive code prefix/encoding should be used?
- What exact opt-in discovery label should be used?
- Should public discovery ship in the first private-send slice or immediately after direct private-code send works?
- What exact demo network posture should the final video use?
- Which mainnet features should be visibly disabled if their mainnet pools/contracts are not deployed by demo time?
