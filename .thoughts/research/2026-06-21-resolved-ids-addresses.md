# Concrete contract ids / addresses (testnet + mainnet)

Resolution brief for the four "unknowns" the founder flagged. Every id below carries a primary-source citation (Circle/Stellar official docs, the canonical GitHub repos, or the cloned reference repos).

Update 2026-06-22: Stellar CLI `27.0.0` is installed locally and the deterministic SAC derivations below have now been run. See `.thoughts/research/2026-06-22-stellar-cli-sac-verification.md`.

Date: 2026-06-21. Network = Stellar **public/mainnet** passphrase `Public Global Stellar Network ; September 2015`; testnet passphrase `Test SDF Network ; September 2015`.

---

## Resolved

### Q1 — Testnet USDC issuer + the USDC SAC contract id on testnet

**Status: CONFIRMED (issuer) + CONFIRMED (testnet SAC, Circle repo + Stellar CLI derivation + RPC interface fetch).**

- **Testnet USDC issuer:** `USDC-GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`
  - Source: Circle, developers.circle.com/stablecoins/usdc-contract-addresses (Stellar Testnet entry). Mirrored in prior research `file:/Users/abu/dev/hackathon/stellar-zk-wallet/.thoughts/research/2026-06-21-usdc-and-assets.md` §D.
- **Testnet USDC Stellar Asset Contract (SAC) id:** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`
  - Source (PRIMARY, Circle-authored): `file:/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-cctp/examples/.env.example:53` (`STELLAR_USDC_ADDRESS=CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`). This is the official `circlefin/stellar-cctp` example config, i.e. the SAC Circle itself uses for testnet CCTP.
  - **Derivation (how to reproduce):** `stellar contract id asset --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet`. The SAC address is a deterministic function of (asset code:issuer, network passphrase) — CAP-46-6. CLI syntax source: developers.stellar.org/docs/tools/cli/cookbook/deploy-stellar-asset-contract (also in usdc-and-assets.md §B).
  - **2026-06-22 verification:** `stellar contract id asset --asset USDC:GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5 --network testnet` returned `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`; `stellar contract info interface --contract-id CBIELTK6Y... --network testnet` returned the token interface.

### Q2 — Mainnet USDC issuer + its mainnet SAC contract id

**Status: CONFIRMED (issuer) + CONFIRMED (mainnet SAC via Stellar CLI derivation + RPC interface fetch).**

- **Mainnet USDC issuer:** `USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` — matches the founder's expected value exactly.
  - Source: Circle, developers.circle.com/stablecoins/usdc-contract-addresses (Stellar Mainnet entry; WebFetch 2026-06-21 returned exactly `"USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN"`). Also in usdc-and-assets.md §D.
- **Mainnet USDC SAC contract id:** `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`. Circle does not publish the C-address directly; the Circle USDC-contract-addresses page lists only the issuer (G...) for both mainnet and testnet. The SAC id is deterministic from (USDC:issuer, mainnet passphrase), and was derived locally with Stellar CLI on 2026-06-22.
  - Source confirming Circle omits it: WebFetch developers.circle.com/stablecoins/usdc-contract-addresses (2026-06-21): "Only the issuer is listed … No Stellar Asset Contract (SAC) with a C... strkey identifier is provided." Same omission confirmed on the CCTP Stellar contracts reference page (developers.circle.com/cctp/references/stellar-contracts): "The page does not list a USDC SAC … identifier for mainnet."
  - **2026-06-22 verification:** `stellar contract id asset --asset USDC:GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN --network mainnet` returned `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`; `stellar contract info interface --contract-id CCW67... --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015'` returned the token interface.

### Q3 — Mainnet Circle CCTP V2 Stellar contracts + PRODUCTION Iris URL

**Status: CONFIRMED — all three mainnet Stellar contracts are LIVE and documented by Circle; production Iris URL confirmed.**

Stellar CCTP **mainnet** contract ids (Circle docs, developers.circle.com/cctp/references/stellar-contracts, WebFetch 2026-06-21):
- **TokenMessengerMinter (V2 — consolidates TokenMessengerV2 burn+send and TokenMinterV2 receive+mint):** `CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL`
- **MessageTransmitter (V2):** `CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV`
- **CctpForwarder:** `CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T`

Cross-validation: the SAME doc page lists the testnet trio, and those testnet ids match the cloned Circle repo byte-for-byte (`file:.../reference/stellar-cctp/examples/.env.example:47,50,59` → TokenMessengerMinter `CDNG7HXAP…RTHP`, MessageTransmitter `CBJ6MTCKK…AVVJY`, CctpForwarder `CA66Q2WFB…4VSZ`). Because the testnet column is verifiably correct against primary repo source, the mainnet column from the same authored table is treated as confirmed. (Note on naming: Circle labels the Stellar contract `TokenMessengerMinter`; it is the V2 architecture — it explicitly "consolidates the responsibilities of `TokenMessengerV2` and `TokenMinterV2`" per the same page. Stellar CCTP has a single consolidated minter contract, unlike EVM's split TokenMessengerV2 + TokenMinterV2.)

**Production / mainnet Iris attestation API:**
- **Production (mainnet):** `https://iris-api.circle.com`
- Sandbox (testnet): `https://iris-api-sandbox.circle.com`
  - Source: Circle, developers.circle.com/cctp/technical-guide AND the OpenAPI `servers` block on developers.circle.com/api-reference/cctp/all/get-attestation (both WebFetched 2026-06-21; both list the two hosts).
- **V2 attestation endpoint path (chain-agnostic, same on both hosts):** `GET /v2/messages/{sourceDomainId}?transactionHash={burnTxHash}` — confirmed in the reference impl `file:.../reference/stellar-cctp/examples/main.ts:92`. Burn-fee path: `GET /v2/burn/usdc/fees/{sourceDomain}/{destDomain}` (`main.ts:130`). Domain ids: Stellar = **27** (`file:.../reference/stellar-cctp/examples/config.ts:71`), Ethereum mainnet = **0** (Circle docs; same as Sepolia testnet domain).
  - So the only production change vs the testnet reference is `IRIS_API_URL=https://iris-api.circle.com` (the repo default is the sandbox host: `file:.../reference/stellar-cctp/examples/config.ts:24`).

### Q4 — Has anyone deployed the Nethermind privacy pool (or a fork) to Stellar MAINNET?

**Status: CONFIRMED — NO. No mainnet deployment exists (canonical repo or otherwise found).**

- The canonical `NethermindEth/stellar-private-payments` repo (branch `main`) contains, under `deployments/`, ONLY: `legal/`, `scripts/`, `testnet/`. There is NO `mainnet/` or `pubnet/` directory.
  - Source: GitHub API `repos/NethermindEth/stellar-private-payments/contents/deployments?ref=main` (gh, 2026-06-21) → returns exactly `legal`, `scripts`, `testnet`.
- The only on-chain deployment recorded is a single **testnet** pool (native XLM only):
  - pool `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`, token `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`, verifier `CBJFCMPURNJM67NOBQTMGPMHYIEQQJ2QHVNXX2RDFUW2PU67HI7X5MSZ`, asp_membership `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`, asp_non_membership `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`.
  - Source: `file:/Users/abu/dev/hackathon/stellar-zk-wallet/reference/stellar-private-payments/deployments/testnet/deployments.json` (`"network":"testnet"`, one pool, `"asset":{"kind":"native"}`).
- The repo's mainnet references are CODE-PATH only, not a deployment: `deploy.sh` supports `--network mainnet` with a `--yes` guard (`file:.../reference/stellar-private-payments/deployments/scripts/deploy.sh:35,108-109`), and the prover uses a `"mainnet"` blinding-domain-separation string (`file:.../app/crates/core/prover/src/encryption.rs:446`). Neither implies an actual mainnet deployment.
- Public posture: the project is explicitly **proof-of-concept, testnet-only — production use not recommended** (Stellar/Nethermind announcements; nethermindeth.github.io/stellar-private-payments/; corroborated by WebSearch 2026-06-21). No third-party mainnet fork surfaced in GitHub/web search.

---

## UX implication

- **One env switch flips the whole stack testnet→mainnet.** CCTP needs: the three mainnet Stellar contract ids (Q3), `IRIS_API_URL=https://iris-api.circle.com`, mainnet passphrase, a mainnet Soroban RPC, and the mainnet EVM domain (Ethereum mainnet = domain 0). Keep all of these in one config block so users never type a contract id — the wallet picks the network and resolves everything.
- **Never hardcode the USDC SAC without an active-network check.** Circle publishes only the issuer, so the wallet should compute or verify the SAC id from `USDC:issuer` + the active network passphrase (CAP-46-6) at startup and cache it. This is invisible to the user and avoids shipping a wrong/typo'd C... id. The mainnet SAC is now derived and RPC-resolved, but mainnet USDC privacy still requires a deployed mainnet USDC pool.
- **Mainnet privacy-pool flows must be feature-flagged OFF.** There is no mainnet privacy pool — the only live pool is testnet native-XLM. A mainnet "private payment" path would require us (or someone) to deploy the Nethermind pool to mainnet first. Surface privacy features only when a pool address for the active network actually resolves; otherwise the UI should present plain (non-private) USDC/XLM transfers on mainnet and reserve private deposit/withdraw for testnet until a mainnet pool exists.

---

## Completed 2026-06-22 CLI checks

- Mainnet USDC SAC derivation: `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`.
- Testnet USDC SAC derivation: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- Testnet native XLM SAC derivation: `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`.
- Mainnet native XLM SAC derivation: `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`.
- All four returned token interfaces through read-only `stellar contract info interface` calls.

Everything else in this brief (mainnet CCTP V2 contract trio, production Iris URL, no-mainnet-privacy-pool) remains CONFIRMED from primary sources. Remaining open work is not SAC derivation; it is live pool deployment/transaction testing.
