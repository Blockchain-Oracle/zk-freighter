# Mainnet feasibility + testnet/mainnet config-toggle architecture

## Scope

Facts-only documentation of CURRENT REALITY (as of 2026-06-21) for whether this
project can DEMO on Stellar **mainnet (public network)** with network reduced to a
pure CONFIG switch (RPC url, network passphrase, contract IDs) so testnet↔mainnet
needs no code change. Five verification targets, taken from the founder's POV (he
wants a mainnet demo if feasible; do NOT reintroduce private-USDC positioning,
dual wallets, or recovery-secret assumptions — none are relevant here):

1. Are the ZK host functions (BN254 / Poseidon2) live on Stellar MAINNET, not just
   testnet?
2. Is the Nethermind privacy pool deployed on mainnet anywhere? If not, what would
   deploying our own pool + verifier + ASP to mainnet require, and the real-money /
   unaudited risk?
3. Is real USDC available on Stellar MAINNET, and is Circle CCTP live on Stellar
   MAINNET (not just sandbox/testnet)?
4. Cost in real XLM to deploy + operate on mainnet.
5. The standard network-as-config pattern in Stellar apps (Freighter /
   `@stellar/stellar-sdk` / Stellar CLI parameterizing networkPassphrase + RPC +
   contract IDs per network).

NOT in scope: solution design, "we should", architecture recommendations. Inferences
and unverifiable items are labeled.

## Verified Facts

### 1. ZK host functions (BN254 + Poseidon2) ARE live on Stellar MAINNET

- The privacy-pool contracts depend on TWO Soroban host-function families, confirmed
  in the cloned repo:
  - **BN254**: `env.crypto().bn254()` with `g1_mul`, `g1_add`, `pairing_check`
    (`reference/stellar-private-payments/contracts/circom-groth16-verifier/src/lib.rs:99`
    and the verify body lines 99-138).
  - **Poseidon2**: `env.crypto_hazmat().poseidon2_permutation(...)`
    (`reference/stellar-private-payments/contracts/soroban-utils/src/poseidon2.rs:25,37,78,92`),
    enabled via `soroban-sdk = { version = "26", features = ["hazmat"] }`
    (`reference/stellar-private-payments/Cargo.toml`).
- These two primitives are **Protocol 25 ("X-Ray")** features, NOT Protocol 23:
  - **CAP-0074** = host functions for BN254 elliptic-curve operations.
  - **CAP-0075** = Poseidon/Poseidon2 permutation primitives.
  Source: stellar.org "Announcing Stellar X-Ray, Protocol 25" — X-Ray "proposes
  native support for two important primitives: BN254 … and Poseidon."
- **Protocol 25 activated on Stellar MAINNET on/around 2026-01-23** (mainnet vote
  2026-01-22). Source: stellar.org X-Ray announcement (testnet vote 2026-01-07,
  mainnet vote 2026-01-22) + multiple news confirmations that v25 went live on
  mainnet late January 2026.
- **Current mainnet protocol is even newer: Protocol 26, deployed 2026-05-06.**
  Testnet is on Protocol 27 (release candidate, 2026-06-18). Source:
  developers.stellar.org/docs/networks/software-versions. Because Protocol 26 > 25,
  the BN254 + Poseidon2 host functions introduced in P25 are present on mainnet today.
- NET: The ZK host functions this codebase requires are live on **both** testnet and
  mainnet as of 2026-06-21. No protocol-gap blocks a mainnet demo.

### 2. Privacy-pool mainnet deployment status + what mainnet deploy requires

- **The Nethermind `stellar-private-payments` repo ships a TESTNET deployment only.**
  `reference/stellar-private-payments/deployments/` contains a `testnet/` directory;
  `deployments/testnet/deployments.json` lists testnet addresses (pool
  `CDQRXOD6…2PZF`, verifier `CBJFCMPU…5MSZ`, asp_membership `CBULZZIA…BTKN`,
  asp_non_membership `CDREZXZI…K3O3`, native-XLM token SAC
  `CDLZFC3S…CYSC`, deployer/admin `GDF4BXPQ…QORC`). **No `mainnet/` deployment
  directory and no mainnet addresses exist in the repo.**
- The README marks the whole repo **WIP / unaudited reference implementation**
  (prior research `2026-06-21-nethermind-privacy-pool.md`, README.md:14-17). UNKNOWN
  whether any third party deployed it to mainnet (not found; see Unknowns).
- **The deploy tooling already supports a `mainnet` network as a pure argument** —
  no code change needed to target mainnet, only a configured network + funded key:
  - `deployments/scripts/deploy.sh` takes `<network>` as its first positional arg
    "Network name from Stellar CLI config (e.g. testnet, futurenet)"
    (deploy.sh:18-23) and passes it through to every `stellar contract build/deploy`
    / `stellar contract id asset` / `stellar ledger latest` call
    (deploy.sh:120,147,159,191-193). It has an explicit mainnet guard: `if [[
    "$NETWORK" == "mainnet" && "$YES" != "true" ]]; then die "mainnet requires
    --yes"; fi` (deploy.sh:108-110).
  - A mainnet run would deploy 4 contracts (asp-membership, asp-non-membership,
    circom-groth16-verifier, pool) and write `deployments/mainnet/deployments.json`
    (deploy.sh:237-318).
- **Required inputs to deploy to mainnet** (from deploy.sh:96-123,156-183):
  - `stellar` CLI with a `mainnet` network configured and a **funded mainnet key/
    identity** as `--deployer` (real XLM, see §4).
  - `--asp-levels`, `--pool-levels`, `--max-deposit` (all required).
  - A verification key embedded into the verifier WASM via `--vk-file` /`--vk-json`
    (deploy.sh:104-110,163-173) — the testnet ceremony VK
    `deployments/testnet/circuit_keys/policy_tx_2_2_vk.json` exists in-repo and is
    reusable (the proving/verification keys are network-independent;
    `2026-06-21-nethermind-privacy-pool.md` "policy_tx_2_2 keys came from a trusted
    ceremony").
  - Pool token spec: default = native XLM SAC (resolved by `stellar contract id
    asset --asset native --network mainnet`, deploy.sh:120); or
    `--pool classic:USDC:<mainnet-issuer>:<SAC_ID>` for a USDC pool.
  - Post-deploy: the ASP-membership tree must be populated (admin-signed
    `insert_leaf`) for any policy-gated transact to verify
    (`2026-06-21-nethermind-privacy-pool.md`).
- **Real-money / unaudited risk (facts, not judgment):**
  - The contracts are self-described **unaudited WIP** (README.md:14-17). On mainnet
    any deposited XLM/USDC is real value subject to whatever bugs exist.
  - **7-day RPC event-retention limit**: the client reconstructs the commitment tree,
    nullifier set, and ASP state from Soroban RPC `getEvents`, and "RPC nodes only
    store events for a small retention window (7 days)… the demo will not work for
    users onboarded after 7 days of contract deployment" unless a bootnode is run
    (README.md:116; `2026-06-21-nethermind-privacy-pool.md`). This is identical on
    mainnet and testnet; it bounds the usable demo window.
  - If the browser-local OPFS SQLite DB is cleared, the app-derived note/encryption
    keys and notes are permanently lost — on mainnet that means lost real funds
    (README.md:119; prior research).
  - Mainnet deploy is irreversible spend of real XLM (deploy + storage rent, §4).

### 3. USDC on mainnet + Circle CCTP on mainnet — BOTH live

- **Real USDC IS issued natively on Stellar MAINNET.** Mainnet issuer:
  `USDC-GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` (Circle docs,
  recorded in prior research `2026-06-21-usdc-and-assets.md:65`, source
  developers.circle.com/stablecoins/usdc-contract-addresses). Stellar USDC = 7
  decimals (prior research). It is exposed to contracts as a SAC like any classic
  asset; the pool's generic `TokenClient` can point at the USDC SAC by passing its
  contract id as `--token` / `--pool classic:USDC:<issuer>:<SAC_ID>` (no pool code
  change — `2026-06-21-usdc-and-assets.md` §E).
- **Circle CCTP V2 IS LIVE on Stellar MAINNET as of ~2026-05-19/20.** Stellar is
  CCTP **domain 27** on mainnet; USDC can move natively between Stellar and 15+
  chains (Ethereum, Solana, Base, etc.) without wrapped tokens. Sources: Stellar
  Development Foundation announcement (launch 2026-05-19), BanklessTimes
  "Circle Deploys CCTP on Stellar" (2026-05-20), Crowdfund Insider / Blockonomi
  (CCTP live on Stellar, USDC across 23 blockchains), 2026-05.
- The CCTP reference integration (`circlefin/stellar-cctp`) was studied for **testnet**
  in prior research (`2026-06-21-cctp-bridge.md`); it confirms the on-chain call
  shapes (`deposit_for_burn`, `mint_and_forward`, `receive_message`) and that Stellar
  domain = 27. Switching that integration testnet→mainnet is env reconfiguration
  (RPC, passphrase, contract IDs, Iris URL) per its env-driven `config.ts`
  (`2026-06-21-cctp-bridge.md` Inferences). The **mainnet** Stellar CCTP contract
  addresses + production Iris URL (`iris-api.circle.com`) were explicitly OUT of scope
  in that prior pass and are NOT yet captured here (see Unknowns).
- Note: Circle's EVM smart-contracts page does not list Stellar in its mainnet table
  because Stellar is non-EVM (listed under a separate "Stellar Contracts" reference);
  absence from the EVM table is not evidence CCTP is missing on Stellar mainnet.
  Source: developers.circle.com/cctp/evm-smart-contracts (21 EVM mainnet chains
  enumerated; Stellar referenced separately).

### 4. Cost in real XLM to deploy + operate on mainnet

- Mainnet fees are real XLM. Soroban prices CPU instructions, memory, ledger reads/
  writes, transmission bytes, and **storage rent** independently. Source:
  soroban.stellar.org fees-and-metering; stellar.org/soroban.
- Per-transaction order of magnitude (profiling, secondary source cheesecakelabs.com):
  across 119 ledger-modifying txns the **average minimum resource fee ≈ 261,052
  stroops = 0.0261 XLM (~$0.0029 at $0.11/XLM)**, max ≈ $0.0092. Typical token
  transfers settle for "fractions of a cent." (Secondary source; order-of-magnitude
  only, not the privacy-pool's heavier ZK-verify txns — see Unknowns.)
- **Deploy = upload WASM (install) + instantiate.** Two-step install/deploy lets the
  WASM be uploaded once and instantiated by hash; cheaper for multiple instances of
  the same code. Source: developers.stellar.org CLI deploy docs; soroban-examples.
  The privacy-pool deploy uploads 4 distinct WASMs and instantiates 4 contracts
  (deploy.sh), so 4 install+deploy txns plus constructor invocations.
- **Account + storage minimums (real XLM, mainnet):**
  - Base reserve 0.5 XLM; account min balance = 2 × base reserve = **1 XLM** plus
    0.5 XLM per additional subentry/trustline. Source: freighter constants
    `BASE_RESERVE = 0.5`, `BASE_RESERVE_MIN_COUNT = 2`
    (`reference/freighter/@shared/constants/stellar.ts:73-74`); developers.stellar.org.
  - A non-native asset (e.g. a USDC pool) needs a **trustline (0.5 XLM each)**; as of
    Protocol 26 contracts can create trustlines via the SAC `trust` function
    (`2026-06-21-usdc-and-assets.md` §C).
  - Soroban contract storage requires ongoing **rent**; persistent entries must be
    kept alive or they archive. Source: soroban fees-and-metering.
- No published single "total to deploy this stack to mainnet" figure was found
  (UNKNOWN — depends on WASM sizes, Merkle levels, and rent horizon). Magnitude is
  small per-tx, but **mainnet needs a genuinely funded XLM account** (no friendbot on
  mainnet — see §5), versus testnet's free 10,000-XLM friendbot.

### 5. Network-as-config pattern in Stellar apps (RPC + passphrase + contract IDs)

The standard pattern across Freighter, `@stellar/stellar-sdk`, and the Stellar CLI is
a per-network record of **{networkPassphrase, RPC url, Horizon url}** plus an app-level
map of **contract IDs per network**, selected at runtime by a single network key.

- **Canonical mainnet vs testnet constants** (verbatim):
  - Mainnet passphrase: `"Public Global Stellar Network ; September 2015"`
    (developers.stellar.org/docs/networks; matches `Networks.PUBLIC` from
    `stellar-sdk`, used in `reference/freighter/@shared/constants/stellar.ts:46`).
  - Testnet passphrase: `"Test SDF Network ; September 2015"`
    (developers.stellar.org; `Networks.TESTNET`).
  - Testnet Horizon `https://horizon-testnet.stellar.org`; testnet Soroban RPC
    `https://soroban-testnet.stellar.org`; friendbot `https://friendbot.stellar.org`.
  - **Mainnet has NO single official public Horizon/Soroban-RPC URL and NO
    friendbot** — apps must supply a (often third-party) mainnet RPC/Horizon endpoint.
    Source: developers.stellar.org/docs/networks (mainnet "third-party providers
    only"; "Friendbot: Not available for Mainnet").
- **Freighter's reference shape** (`reference/freighter/@shared/constants/stellar.ts`):
  - `enum NETWORKS { PUBLIC, TESTNET, FUTURENET }` and parallel `NETWORK_URLS`,
    `SOROBAN_RPC_URLS`, `FRIENDBOT_URLS` keyed by that enum (lines 9-30).
  - A `NetworkDetails` interface `{ network, networkName, networkUrl,
    networkPassphrase, friendbotUrl?, sorobanRpcUrl? }` (lines 32-40) with one
    constant per network: `MAINNET_NETWORK_DETAILS`, `TESTNET_NETWORK_DETAILS`,
    `FUTURENET_NETWORK_DETAILS` (lines 42-66). `DEFAULT_NETWORKS = [MAINNET, TESTNET]`
    (lines 68-71).
  - RPC URL is selected purely by switching on `networkDetails.network`
    (`@shared/helpers/soroban/sorobanRpcUrl.ts`).
  - The Horizon `Server` is built from `(networkUrl, networkPassphrase)`
    (`@shared/api/helpers/stellarSdkServer.ts:35-41`); `networkPassphrase` is threaded
    into SDK selection/signing (`@shared/helpers/stellar.ts:19-23`). So switching
    networks = swapping the `NetworkDetails` record; no code path hardcodes a network.
- **Privacy-pool app already models per-network contract IDs as data, not code.**
  The Rust/WASM client reads a `deployments/<network>/deployments.json` describing
  `{network, verifier, asp_membership, asp_non_membership, pools:[{poolContractId,
  tokenContractId, deploymentLedger, asset}]}` (deploy.sh writes it;
  `app/crates/core/types` consumes `AssetDescriptor`/`PoolConfigEntry` —
  `2026-06-21-nethermind-privacy-pool.md`). A mainnet toggle = pointing the app at a
  `deployments/mainnet/deployments.json` + a mainnet RPC/passphrase. `deploymentLedger`
  is the cold-start event-replay anchor per network.
- **Stellar CLI parameterizes network identically.** `stellar network add <name>
  --network-passphrase "<passphrase>" --rpc-url <url>`, then `stellar network use
  <name>` or `export STELLAR_NETWORK=<name>`; every `stellar contract deploy/invoke`
  takes `--network <name>`. Config lives in `$XDG_CONFIG_HOME/stellar` (or
  `~/.config/stellar`). The deploy.sh script consumes exactly this (`<network>` arg →
  `--network "$NETWORK"`). Source: developers.stellar.org/docs/tools/cli/stellar-cli;
  dev.to "RPC for Soroban mainnet."
- **Signing edge is network-parameterized too:** wallet signing takes the
  `networkPassphrase` per call (Freighter `signTransaction`/`signMessage`/
  `signAuthEntry`, prior research), so changing networks does not change the
  agent/app code — it changes the passphrase passed to the signer.

### Honest read on a mainnet demo for this hackathon (facts assembled)

- **Technically unblocked:** all three external dependencies are live on mainnet —
  BN254 + Poseidon2 host functions (Protocol 25, mainnet since ~2026-01-23; mainnet
  now on Protocol 26), native USDC (mainnet issuer `GA5ZSEJY…KZVN`), and Circle CCTP
  V2 (Stellar mainnet domain 27, live since ~2026-05-19). The deploy tooling and the
  app both already treat network as config (deploy.sh `<network>` arg + per-network
  `deployments.json` + Freighter `NetworkDetails`).
- **Real-cost / real-risk facts that bound it:** mainnet needs a genuinely funded XLM
  account (no friendbot; deploy + rent are real spend, per-tx tiny but non-zero), the
  contracts are unaudited WIP holding real value, and the 7-day RPC event-retention
  limit applies on mainnet exactly as on testnet (bounds the demo window unless a
  bootnode is run). The minimal mainnet footprint observed in the tooling = 4 contract
  deploys (asp-membership, asp-non-membership, verifier, pool) sharing one VK, one
  funded mainnet deployer key, a mainnet RPC endpoint, and a populated ASP-membership
  tree; optionally a USDC pool (`--pool classic:USDC:<mainnet-issuer>:<SAC_ID>`) and/or
  CCTP for cross-chain USDC in. (Stated as observed footprint, not a recommendation.)

## Direct answers to the founder's questions

1. **ZK host functions live on mainnet?** YES. BN254 (CAP-0074) + Poseidon2
   (CAP-0075) shipped in Protocol 25 (X-Ray), which activated on Stellar **mainnet**
   ~2026-01-23; mainnet is now on Protocol 26 (2026-05-06), so both are live on
   mainnet today, not just testnet. (Note: they are P25 features, NOT P23 as the
   founder's question phrasing suggested — P23 was "Whisk," Sept 2025.)
2. **Nethermind pool on mainnet anywhere?** Not in the repo — it ships testnet-only
   (`deployments/testnet/…`, no `mainnet/`); whether a third party deployed it to
   mainnet is UNKNOWN/not found. Deploying our own to mainnet requires: a funded
   mainnet XLM deployer key, a mainnet-configured `stellar` CLI, `deploy.sh mainnet
   --yes …` with `--asp-levels/--pool-levels/--max-deposit` and the (reusable testnet
   ceremony) VK, then populating the ASP-membership tree. Real-money/unaudited risk:
   contracts are self-labeled unaudited WIP holding real value; the 7-day event-
   retention window limits the usable window; a cleared browser DB loses real funds.
3. **Real USDC + CCTP on mainnet?** YES to both. Native USDC issuer on Stellar
   mainnet = `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN` (7 dp). Circle
   CCTP V2 is live on Stellar mainnet as domain 27 since ~2026-05-19 (SDF/Circle
   announcements). (Mainnet Stellar CCTP contract addresses + prod Iris URL not yet
   captured — Unknowns.)
4. **Mainnet cost?** Real XLM, small per-tx (avg min resource fee ~0.026 XLM /
   ~$0.003; transfers "fractions of a cent"), but: deploy = ~4 install+deploy txns +
   constructors; account min balance 1 XLM (2×0.5 reserve) +0.5 XLM per trustline; +
   ongoing Soroban storage rent; **no friendbot on mainnet** so a real funded account
   is mandatory. No single published "total to deploy this whole stack" figure found.
5. **Network-as-config pattern?** Standard and already present: a per-network record
   `{networkPassphrase, networkUrl/RPC, sorobanRpcUrl}` selected by one network key
   (Freighter `NetworkDetails` / `NETWORKS` enum), an app map of contract IDs per
   network (the pool app's `deployments/<network>/deployments.json`), and Stellar CLI
   `network add/use` + `--network`. Mainnet passphrase verbatim: `"Public Global
   Stellar Network ; September 2015"`. Toggling = swap the record + IDs + RPC; signing
   takes the passphrase per call, so no code path changes between testnet and mainnet.

## Unknowns

- Whether ANY party has deployed the Nethermind privacy pool (or a fork) to Stellar
  **mainnet**. Repo ships testnet-only; not found via search (not exhaustively
  searched).
- **Mainnet** Stellar CCTP V2 contract addresses (TokenMessengerMinterV2,
  MessageTransmitterV2, CctpForwarder) and the production Iris URL
  (`iris-api.circle.com`) — prior CCTP research was testnet/sandbox only and these
  were explicitly out of scope; not captured here. Confirm at
  developers.circle.com/cctp (Stellar Contracts reference) before any mainnet CCTP run.
- The deterministic **mainnet USDC SAC contract id** (from `stellar contract id asset
  --asset USDC:GA5ZSEJY…KZVN --network mainnet`) — not queried on-chain here.
- Real **mainnet resource fee for the heavy ZK-verify `transact`** txn (BN254
  pairing_check is CPU-heavy); the ~0.026 XLM figure is from generic ledger-modifying
  txns, not this contract. No benchmark read; would require simulating on mainnet.
- Total all-in XLM to deploy the 4-contract stack + rent horizon on mainnet — no
  published figure; depends on WASM sizes, Merkle `levels`, and chosen rent TTL.
- Whether a USDC pool contract needs an explicit `trust` call before holding USDC on
  mainnet, or whether the SAC auto-creates the balance entry on first transfer
  (flagged in prior USDC research; not resolved).
- An official single mainnet public Soroban-RPC/Horizon URL — docs say third-party
  providers only; which provider/endpoint to use for the demo is a config choice not
  fixed by primary docs.

## Sources

- `reference/stellar-private-payments/contracts/circom-groth16-verifier/src/lib.rs:99-138`
  — `env.crypto().bn254()` g1_mul/g1_add/pairing_check (BN254 host fn dependency).
- `reference/stellar-private-payments/contracts/soroban-utils/src/poseidon2.rs:25,37,78,92`
  + `Cargo.toml` (`soroban-sdk = "26"`, feature `hazmat`) — Poseidon2 host fn dependency.
- `reference/stellar-private-payments/deployments/scripts/deploy.sh:18-23,96-123,108-110,156-318`
  — network-as-arg deploy, mainnet `--yes` guard, required flags, 4-contract deploy,
  per-network `deployments.json` output.
- `reference/stellar-private-payments/deployments/testnet/deployments.json` — testnet
  addresses; absence of a `mainnet/` dir = testnet-only in repo.
- `reference/freighter/@shared/constants/stellar.ts:9-74` — `NETWORKS` enum,
  per-network URL/passphrase records, `MAINNET_NETWORK_DETAILS`, base reserve 0.5 ×2.
- `reference/freighter/@shared/helpers/soroban/sorobanRpcUrl.ts` +
  `@shared/api/helpers/stellarSdkServer.ts:35-41` + `@shared/helpers/stellar.ts:19-23`
  — RPC/Horizon/signer selected by network record, no hardcoded network.
- developers.stellar.org/docs/networks/software-versions — mainnet = Protocol 26
  (2026-05-06); testnet = Protocol 27 (2026-06-18); P25 superseded but its features
  persist.
- stellar.org/blog/developers/announcing-stellar-x-ray-protocol-25 — X-Ray = BN254
  (CAP-0074) + Poseidon (CAP-0075); testnet vote 2026-01-07, mainnet vote 2026-01-22.
- WebSearch (multiple, incl. mexc/ainvest) — Protocol 25 activated on mainnet ~2026-01-23.
- developers.stellar.org/docs/networks — mainnet passphrase `"Public Global Stellar
  Network ; September 2015"`; mainnet has no official RPC/Horizon, no friendbot.
- developers.stellar.org/docs/tools/cli/stellar-cli + dev.to "RPC for Soroban mainnet"
  — `stellar network add/use … --network-passphrase --rpc-url`, `--network` per command.
- stellar.org/blog/foundation-news/circle-cctp-v2-is-coming-to-stellar +
  banklesstimes.com / crowdfundinsider.com / blockonomi.com (2026-05) — CCTP V2 live on
  Stellar mainnet, domain 27, ~2026-05-19/20.
- developers.circle.com/cctp/evm-smart-contracts — 21 EVM mainnet chains; Stellar
  referenced separately as non-EVM (not in EVM table).
- `.thoughts/research/2026-06-21-usdc-and-assets.md` (mainnet USDC issuer
  `GA5ZSEJY…KZVN`, SAC model, trustlines) — prior primary research.
- `.thoughts/research/2026-06-21-cctp-bridge.md` (CCTP call shapes, Stellar domain 27,
  testnet addrs; mainnet out of scope there) — prior primary research.
- `.thoughts/research/2026-06-21-nethermind-privacy-pool.md` (unaudited WIP, 7-day
  retention, OPFS key loss, single-asset pool, reusable ceremony VK) — prior research.
- soroban.stellar.org fees-and-metering + cheesecakelabs.com profiling — Soroban fee
  model + ~0.026 XLM avg min resource fee (secondary, order-of-magnitude).
