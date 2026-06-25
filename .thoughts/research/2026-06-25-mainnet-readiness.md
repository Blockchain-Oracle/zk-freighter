# Reality Research: Mainnet Readiness

## Scope

Check whether ZK Fighter can safely move from testnet evidence to mainnet testing for XLM, USDC, CCTP bridge arrival, and shielded pool actions. This is a fact pass, not approval to spend or deploy mainnet funds.

## Sources Checked

- Local code:
  - `packages/core/src/networks.ts`
  - `packages/core/src/cctp-bridge.ts`
  - `packages/core/src/cctp-stellar.ts`
  - `packages/core/src/xlm-shield.ts`
  - `README.md`
- Existing repo evidence:
  - `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`
  - `.thoughts/research/spikes-log.md`
- Official docs:
  - Circle CCTP Stellar contracts: https://developers.circle.com/cctp/references/stellar-contracts
  - Circle CCTP supported chains/domains: https://developers.circle.com/cctp/concepts/supported-chains-and-domains
  - Circle CCTP EVM contract addresses: https://developers.circle.com/cctp/references/contract-addresses
  - Circle USDC contract addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses
  - Circle Mint supported chains/currencies: https://developers.circle.com/circle-mint/references/supported-chains-and-currencies
  - Stellar networks: https://developers.stellar.org/docs/networks
  - Stellar RPC providers: https://developers.stellar.org/docs/data/apis/rpc/providers
  - Stellar lumens/minimum balance: https://developers.stellar.org/docs/learn/fundamentals/lumens
  - Stellar trustlines/SAC: https://developers.stellar.org/docs/build/guides/basics/verify-trustlines
- Context7:
  - `npx ctx7@latest library "Circle CCTP" "Circle CCTP V2 mainnet Ethereum to Stellar USDC domains contracts Iris API mainnet"` failed with `fetch failed`.
  - `npx ctx7@latest library "Stellar CLI" "Stellar CLI mainnet network configuration mainnet RPC contract id asset USDC SAC"` failed with `fetch failed`.
- Local read-only commands:
  - `stellar --version`
  - `stellar network info --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015'`
  - `stellar network health --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015'`
  - `stellar contract id asset --asset native --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015'`
  - `stellar contract id asset --asset USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015'`
  - `stellar contract info interface --contract-id CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75 --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015' --output json-formatted`
  - `stellar contract info interface --contract-id CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015' --output json-formatted`
  - `curl https://horizon.stellar.org/accounts/GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`

## Verified Facts

### Mainnet network and assets

- Stellar mainnet passphrase is `Public Global Stellar Network ; September 2015`.
- Local Stellar CLI is installed:
  - `stellar 27.0.0`
  - `stellar-xdr 27.0.0`
- `https://mainnet.sorobanrpc.com` responded healthy during this pass.
- Mainnet network info reported:
  - Network ID `7ac33997544e3175d266bd022439b22cdb16508c01163f26e5cb2a3e1045a979`
  - Protocol version `26`
  - Latest ledger observed by health check: `63190521`
- Mainnet SAC IDs verified by local CLI:
  - XLM SAC: `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`
  - USDC SAC: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`
- Mainnet USDC issuer in Circle docs and our config:
  - `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`
- The mainnet USDC and XLM SAC interfaces resolve over RPC and expose token functions including `allowance`, `authorized`, `approve`, and `balance`.

### CCTP mainnet

- Circle docs list Stellar as CCTP-supported with domain `27`.
- Circle docs say Stellar CCTP uses `TokenMessengerMinter`, `MessageTransmitter`, and `CctpForwarder`.
- Circle docs list Stellar mainnet CCTP contracts:
  - `TokenMessengerMinter`: `CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL`
  - `MessageTransmitter`: `CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV`
  - `CctpForwarder`: `CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T`
- Circle docs list Ethereum mainnet CCTP V2 contracts:
  - `TokenMessengerV2`: `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`
  - `MessageTransmitterV2`: `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64`
- Circle docs list Ethereum mainnet native USDC:
  - `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48`
- Circle docs list Stellar under Circle Mint supported chains/currencies with API chain code `XLM` and currency code `USD`.
- Circle docs warn mainnet tokens have financial value.

### Current ZK Fighter code state

- `packages/core/src/networks.ts` has mainnet network config, mainnet XLM/USDC SAC IDs, and deployed mainnet XLM/USDC privacy-pool IDs.
- Mainnet XLM pool: `CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE`.
- Mainnet USDC pool: `CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7`.
- Both mainnet XLM and USDC are configured as `shieldedPool: 'enabled'`.
- `packages/core/src/cctp-bridge.ts`, `packages/core/src/cctp-stellar.ts`, `packages/core/src/xlm-shield.ts`, `packages/core/src/xlm-private.ts`, and `packages/core/src/disclosure.ts` now gate by configured/enabled pools instead of hard-coded testnet-only checks.
- Mainnet XLM has accepted extension-runtime evidence for QuickShield, shielded transfer, and unshield/withdraw. Mainnet USDC has accepted extension-runtime QuickShield evidence. Mainnet USDC shielded transfer/unshield and mainnet bridge-to-shield still need their own evidence before being claimed.

### Dedicated mainnet QA address

- A local Stellar CLI identity was generated under the alias `zkf-mainnet-qa`.
- Secret posture:
  - The seed/secret was not printed.
  - The identity is stored outside the repo at `/Users/abu/.config/stellar/identity/zkf-mainnet-qa.toml`.
  - This is an operations/funding QA key, not a ZK Fighter seed-derived app wallet identity.
- Public address:
  - `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`
- The account was initially unfunded during the first readiness pass, then Abu funded it with `10.0000000 XLM`.

### Mainnet funding facts

- There is no mainnet faucet equivalent to testnet Friendbot for real XLM or real USDC.
- Stellar mainnet accounts require XLM to exist and to cover minimum balance and fees.
- Stellar docs state one base reserve is currently `0.5 XLM`, an account minimum is two base reserves (`1 XLM`), and each trustline adds another base reserve (`0.5 XLM`).
- To receive mainnet Stellar USDC in a normal G-address, the account needs to exist and have a USDC trustline first.

### Mainnet public plumbing follow-up

- Abu funded `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM` with `10.0000000 XLM`.
- Mainnet USDC trustline transaction succeeded:
  - `ca4fe0556c8a71c32c4634c3e8ad282a230e71377c6d7771e50daced7aeb4ef7`
- A tiny mainnet Stellar DEX path payment converted `1.0000000 XLM` into `0.1817950 USDC`:
  - `439b8b609c03ab890da55912529b767eeb6974128d9c9afbdf860416f9ecefae`
- Final observed QA balances:
  - XLM: `8.9999800`
  - USDC: `0.1817950`
- This proves public mainnet USDC plumbing only. It still does not prove mainnet CCTP, mainnet shielded pools, or mainnet bridge-to-shield.

### Mainnet privacy-pool deployment follow-up

- Abu approved real mainnet deployment/testing and funded the QA account with the first tranche.
- The first real contract upload attempt targeted `reference/stellar-private-payments/target/stellar/asp_membership.wasm`.
- The transaction simulated and signed locally, but mainnet submission failed before inclusion:
  - Local signed transaction hash: `d73269bbd5d238ab57fb6757dd93ae91f387c9064cd6ee0a2e80dbcb862f431b`
  - Result: `TxInsufficientBalance`
  - No ledger, explorer hash, upload, or contract ID was created.
- Horizon balance after the failed attempt stayed unchanged:
  - XLM: `8.9999800`
  - USDC: `0.1817950`
- Decoded upload estimates for the four required reference WASM artifacts:
  - `asp_membership.wasm`: `24.5974972 XLM`
  - `asp_non_membership.wasm`: `47.5603573 XLM`
  - `circom_groth16_verifier.wasm`: `6.4875743 XLM`
  - `pool.wasm`: `35.6011708 XLM`
  - Total uploads only: `114.2465996 XLM`
- Practical funding target before retry: at least `130 XLM`; `150 XLM` is safer because it leaves room for contract-instance deployments, ASP setup, small shield deposits, failed attempts, and rent variance.
- Abu then topped up the QA account and approved mainnet pool deployment/testing.
- All four reference WASM uploads succeeded on mainnet:
  - `asp_membership.wasm`: `d73269bbd5d238ab57fb6757dd93ae91f387c9064cd6ee0a2e80dbcb862f431b`
  - `asp_non_membership.wasm`: `b98df1c7755c87be4ed7cb7fe189f45318940d4b53693665cfd35e0e7b8a102f`
  - `circom_groth16_verifier.wasm`: `ba498003cd0939218819b3d025318c9cdd0e562e2b10fbb292a8280fc13822b3`
  - `pool.wasm`: `c5ef4c4f67749a28137216451cc5e8f2a9a5801d4f4860f6ff1179316f5d0cf0`
- Mainnet deployments succeeded:
  - ASP membership: `CCYY3LLTVD2UW3Z4QD76PICZNIUH3PXKWJSKJVAENBIYON7QVAQIW5PP`
  - ASP non-membership: `CBCTBWDS5BXW6NW72763DEIOF5PXDI2FBWK6EESJLHLNMXP5BLN4M2TP`
  - Verifier: `CD5CIDDHT56FUWK6SBDTAWIA435GAVOWZ6TISQ4KXJ5WN5FIHV5EXIG6`
  - XLM pool: `CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE`
  - USDC pool: `CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7`
- The mainnet ASP membership contract was switched to permissionless insertion:
  - `2585feaadbaa0b201bf52522bddecdc687b6d3512a9fd6f2a8ac2613484d2e7a`

### Mainnet extension XLM QuickShield follow-up

- The Chrome-for-Testing extension harness used a persistent external smoke wallet:
  - `GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32`
- The extension offscreen Nethermind browser/WASM runtime generated a real mainnet XLM QuickShield proof and submitted:
  - ASP membership insert: `8afa10dbcf6c82ba56f0f0abf96d00e5af55190f9a985aecc52147c34271c3ce`
  - XLM shield/deposit: `269f09422639580ff3b5642b03a02a24c9e20c63dae12507b005352ba4545179`
- The XLM shield/deposit landed in ledger `63191847` and was confirmed successful by Horizon.
- A transient submit hash `9517af6322763e3ee637e6a108357861fcf75af2c4f56ab1b687e7c8fa59f2e8` returned `NOT_FOUND` on direct RPC/Horizon lookup and is not counted as evidence.
- `packages/core/src/soroban-submit.ts` was fixed to retry `TRY_AGAIN_LATER` send responses before confirmation polling.

### Mainnet extension USDC QuickShield follow-up

- The same persistent smoke wallet created a real mainnet USDC trustline, received public USDC from the QA account, inserted ASP membership, generated a USDC QuickShield proof, and submitted the shield/deposit.
- Transactions:
  - XLM top-up for smoke wallet fees/reserve: `6a6d490bd0a9efe70f0156c3d362cea004cf7f6c440c6ea8f538bcba03e8c6d4`
  - Public USDC trustline setup: `1acef069110b3015b72c8ad5df13b9647480e3af952188581921e56cfae555e5`
  - Public USDC funding transfer: `8581307efcb3ad4f1ed9b9789f595cf6c1a44018dc62432d6372b4463adcd658`
  - ASP membership insert: `84c33d8ff7798a5be616b0c402265be9cbd9518674dd75f00443cfdc1e56d65c`
  - USDC shield/deposit: `a3fb0596b7cf5d79f093dcca9ff4faa6c5975499a1d36afdcf1a893f554aedcb`
- The USDC shield/deposit landed in ledger `63191960` and was confirmed successful by Horizon.
- Amount shielded: `0.0100000 USDC`.

### Mainnet extension XLM private-loop follow-up

- The Chrome-for-Testing extension harness used the same persistent smoke wallet and ran:
  - Shielded transfer to its own private receive code: `5a1523cfe48c3cab8adca44ca1d6518585b8d5bfa20afa8e2372f59fdb2548cd`
  - Public unshield/withdraw to the smoke wallet public address: `df5440dd80e45daf7068c66fa225a20f8167c686244ee084268df8db3f4e1a70`
- The shielded transfer landed in ledger `63192150`.
- The unshield/withdraw landed in ledger `63192156`.
- Amounts:
  - Transfer: `0.0100000 XLM`.
  - Unshield/withdraw: `0.0050000 XLM`.
- `packages/core/src/xlm-private.ts` was fixed to call `syncPoolEvents()` before private transfer/withdraw so fresh browser profiles can discover spendable notes.

## Inferences

- Public mainnet XLM funding, USDC trustline creation, and a tiny Stellar DEX XLM-to-USDC path payment are verified.
- Mainnet XLM/USDC privacy-pool contracts are deployed and configured.
- Mainnet XLM QuickShield, XLM shielded transfer, XLM unshield/withdraw, and USDC QuickShield are proven by real extension-runtime proof generation plus accepted mainnet transactions.
- A real mainnet CCTP public bridge from Ethereum mainnet to Stellar mainnet should be feasible with the configured Ethereum mainnet CCTP values, but it is not yet evidenced.
- Mainnet USDC shielded transfer/unshield and bridge-to-shield should remain separate evidence targets, not assumed from the XLM private-loop and QuickShield runs.

## Unknowns And Questions

- Whether to spend additional mainnet USDC/XLM for mainnet bridge-to-shield or USDC shielded transfer/unshield evidence.
- Whether the reference Nethermind browser runtime patch for mainnet deployments should be upstreamed/documented beyond the staged browser WASM artifacts.
- Whether `https://mainnet.sorobanrpc.com` is reliable enough for transaction submission under demo pressure, or whether we should configure a dedicated RPC provider.
- Whether Circle mainnet attestation timing is acceptable for a live demo or should be shown as recorded evidence.

## Not Included

- No mainnet CCTP bridge transaction.
- No mainnet CCTP burn/mint.
- No mainnet USDC shielded transfer claim.
- No mainnet USDC unshield/withdraw claim.
