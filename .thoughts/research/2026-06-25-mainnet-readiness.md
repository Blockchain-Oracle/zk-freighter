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

- `packages/core/src/networks.ts` has mainnet network config and mainnet XLM/USDC SAC IDs.
- `packages/core/src/networks.ts` does not have mainnet XLM or USDC privacy-pool IDs.
- Both mainnet XLM and USDC are `shieldedPool: 'pending-deployment'`.
- `packages/core/src/cctp-bridge.ts` blocks bridge-to-shield on any network other than testnet and also blocks if USDC shielding has no pool ID.
- `packages/core/src/cctp-stellar.ts` blocks `submitCctpMintAndForward()` unless `options.network === 'testnet'`.
- `packages/core/src/cctp-stellar.ts` only creates a USDC trustline automatically on testnet; on mainnet it currently returns `ready` without attempting to create a trustline.
- `packages/core/src/xlm-shield.ts` blocks shield submit unless `options.network === 'testnet'`.
- Therefore the current product honestly supports testnet shielded-pool evidence, not mainnet shielded-pool claims.

### Dedicated mainnet QA address

- A local Stellar CLI identity was generated under the alias `zkf-mainnet-qa`.
- Secret posture:
  - The seed/secret was not printed.
  - The identity is stored outside the repo at `/Users/abu/.config/stellar/identity/zkf-mainnet-qa.toml`.
  - This is an operations/funding QA key, not a ZK Fighter seed-derived app wallet identity.
- Public address:
  - `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`
- Horizon currently returns `404 Resource Missing` for this address, so it is not funded/created yet.

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

## Inferences

- Public mainnet XLM funding, USDC trustline creation, and a tiny Stellar DEX XLM-to-USDC path payment are now verified without claiming shielded mainnet support.
- A real mainnet CCTP public bridge from Ethereum mainnet to Stellar mainnet should be feasible after code config is extended with Ethereum mainnet source values and the mainnet-only guards are relaxed for public mint-and-forward.
- A real mainnet bridge-to-shield demo is not currently feasible because no mainnet privacy pool is deployed/configured.
- A real mainnet shield/send/unshield demo requires a separate mainnet pool-deployment phase, real XLM for contract deployment/rent/fees, and a new evidence pass. It should remain opt-in because it uses real funds and unaudited privacy-pool code.

## Unknowns And Questions

- How much real XLM Abu wants to risk for mainnet deployment, if any.
- Whether we should prove only public mainnet USDC arrival before submission, or also attempt mainnet privacy-pool deployment.
- Whether the Nethermind pool WASM and dependency path can be reproduced cleanly for mainnet deployment, or whether we reuse already staged/fetched WASM with clear attribution and evidence.
- Whether `https://mainnet.sorobanrpc.com` is reliable enough for transaction submission under demo pressure, or whether we should configure a dedicated RPC provider.
- Whether Circle mainnet attestation timing is acceptable for a live demo or should be shown as recorded evidence.

## Not Included

- No mainnet spend.
- No mainnet CCTP bridge transaction.
- No mainnet CCTP burn/mint.
- No mainnet privacy-pool deployment.
- No mainnet shielded transfer claim.
