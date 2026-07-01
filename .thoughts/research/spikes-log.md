# Spikes Log

Real milestone evidence for ZK Fighter. Secrets must be redacted. Do not record fake transaction hashes, fake balances, mocked proof success, or mocked bridge state as product evidence.

## 2026-06-22 — Phase 0 tooling and workspace foundation

- **Phase:** Phase 0 — Repository foundation and evidence harness.
- **Kind:** tooling.
- **Network:** Stellar testnet read-only check.
- **Summary:** Created pnpm workspace foundation with `apps/web` and `packages/core`; added typed network/asset/evidence/result shapes; added root quality scripts and docs consistency check.
- **Commands to verify:**
  - `pnpm lint`
  - `pnpm typecheck`
  - `pnpm test`
  - `pnpm build`
  - `stellar --version`
  - `stellar network info --network testnet`
- **Transaction hashes:** none. Phase 0 does not submit transactions.
- **Secrets:** none used.
- **Notes:**
  - No wallet funds flow is implemented in Phase 0.
  - No contracts were deployed.
  - No mocked proof, balance, bridge state, or transaction hash is used as product evidence.

## 2026-06-22 — Phase 2 Nethermind prover artifact checkpoint

- **Phase:** Phase 2 — Nethermind prover facade and XLM proof benchmark.
- **Kind:** proof-benchmark.
- **Network:** Stellar testnet target artifacts.
- **Summary:** Added a project-owned prover readiness facade that checks the real Nethermind browser/WASM artifact paths for `policy_tx_2_2`; no proof-shaped object is produced unless the real worker path is present.
- **Commands to verify:**
  - `cargo build -p circuits`
  - `pnpm test`
  - `pnpm build`
  - `pnpm prover:stage`
- **Transaction hashes:** none. Phase 2 does not submit transactions.
- **Secrets:** none used.
- **Notes:**
  - Present reference assets: `policy_tx_2_2_proving_key.bin`, `policy_tx_2_2_vk.json`, and `policy_tx_2_2_vk_soroban.bin`.
  - Generated reference assets were absent before the local circuits build: `policy_tx_2_2.wasm` and `policy_tx_2_2.r1cs`.
  - The current Vite app does not yet package Nethermind's Rust/Trunk worker; the UI reports missing worker/circuit assets as blockers instead of claiming proof success.
  - Local `cargo build -p circuits` entered dependency/git fetch work but produced no `target/circuits-artifacts` files before the hung PTY was interrupted.
  - `pnpm prover:stage` correctly failed because `dist/js/prover-worker.js`, `dist/js/web.js`, release `policy_tx_2_2.wasm`, and release `policy_tx_2_2.r1cs` are missing.
  - Browser smoke against `http://localhost:5173/` showed the Phase 2 panel, `Not generated` proof status, and missing artifact blockers with Vite HTML fallback detection.
  - Follow-up build audit is documented in `.thoughts/research/2026-06-22-nethermind-prover-build-blocker.md`.
  - Exact blocker at this checkpoint: Cargo could not fully hydrate the pinned Wasmer git source (`763e9f2800644f51ce27f6f5c1752776da16ddd1`) in this PTY; sparse local patching bypassed the first missing-object error but still produced no circuit artifacts.
  - Superseded by the 2026-06-23 runtime checkpoint below, which cleared artifact generation and browser runtime initialization.
  - No mocked proof success, fake proof bytes, fake balance, bridge state, or transaction hash is used as product evidence.

## 2026-06-23 — Phase 2 Nethermind prover runtime checkpoint

- **Phase:** Phase 2 — Nethermind prover facade and XLM proof benchmark.
- **Kind:** proof-runtime packaging.
- **Network:** Stellar testnet runtime config; no transaction submitted.
- **Summary:** Cleared the local Nethermind artifact build blocker, staged the real browser JS/WASM runtime and circuit artifacts into ZK Fighter, and verified the staged reference WebClient initializes in Chrome.
- **Commands / paths verified:**
  - `cargo --config /tmp/wasmer-patch-zkf.toml build -p circuits --release --offline`
  - `PUBLIC_URL=/ CARGO_REGISTRIES_CRATES_IO_PROTOCOL=sparse trunk build --dist dist --release --public-url /`
  - `pnpm prover:stage`
  - Browser smoke at `http://localhost:5173/`
- **Generated artifact hashes:**
  - `policy_tx_2_2.wasm`: `6356b72f8623d1a33d30bd7dc37f5a0baf70d116dbb64f85e1e1a25ec305e6d1`
  - `policy_tx_2_2.r1cs`: `a8cee4bd7ca39dd60dcefc73b4c1568247724511a5dd6023e8438d54262c729e`
  - `selectiveDisclosure_1.wasm`: `f2468df7b9a28582e0e8f5301d483c3349574334b43ded5220084100e0c09aaf`
  - `selectiveDisclosure_1.r1cs`: `e83f0d99277e77283514e0690d94805ca6ffc65792c59e8f795be4ed31788667`
- **Browser smoke results:**
  - ZK Fighter readiness panel returned `ready`.
  - Readiness duration was about `837.7 ms`.
  - Heap signal was about `46,253,332` bytes.
  - Proof status remained `Not generated`.
  - Direct prover worker startup raised no browser errors.
  - `mainThread(new Config('https://soroban-testnet.stellar.org/'))` initialized with exported WebClient present and embedded contract config network `testnet`.
  - Storage worker initialized and migrated local OPFS SQLite state.
  - Prover worker fetched the policy and selective-disclosure circuit files from `/circuits/...`.
- **Dry deposit proof-attempt results:**
  - ZK Fighter called Nethermind's exported WebClient `executeDeposit` path from the Phase 2 panel.
  - Test account: `GDOFWY6Z6O3BZDR5KSWTAQV7DH2544CNFCB7LWM2Q5AR7PVHTZXK4SWZ`.
  - Worker privacy keys and ASP secret were derived from the Phase 1 key-derivation signature and stored in Nethermind worker storage.
  - The submit callback was configured to reject if reached; it was not reached.
  - Result: `blocked`.
  - Proof status: `Not generated`.
  - Observed blocker: ASP membership/indexer precondition stopped before proving; latest observed sync gap was `3,235,953` ledgers.
  - Last observed statuses: fetching on-chain state, loading local keys, fetching ASP non-membership proof, building witness inputs.
- **Transaction hashes:** none. This checkpoint does not submit transactions.
- **Secrets:** none used.
- **Notes:**
  - Homebrew LLVM was required because Apple clang could not compile `sqlite-wasm-rs` for `wasm32-unknown-unknown`.
  - The staged runtime uses root public paths (`/js`, `/circuits`, `/circuit_keys`) because the reference worker was compiled with `PUBLIC_URL=/`.
  - This proves artifact generation, packaging, worker loading, WebClient initialization, and a faithful pre-proof deposit attempt through the exported WebClient path. It does not prove a transaction proof was generated or accepted.
  - Next required gate before proof generation: register the derived note public key with the ASP membership tree, let the indexer catch up, then rerun the dry deposit attempt.
  - No mocked proof success, fake proof bytes, fake balance, bridge state, or transaction hash is used as product evidence.

## 2026-06-23 06:04 UTC — Phase 2 ASP membership and dry proof checkpoint

- **Phase:** Phase 2 — Nethermind prover facade and XLM proof benchmark.
- **Kind:** ASP membership + dry proof generation.
- **Network:** Stellar testnet.
- **ASP membership contract:** `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`.
- **XLM pool contract:** `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`.
- **Held browser wallet public key:** `GD354U6FAJVAZGW5GEFDKPCGWVU6VVRQJH7PYK6I5UJXP2STG2H6G5TO`.
- **ASP insert signer:** `GDLPSR6ZOCUJQ6PYZEMGRBCRPXH5KGCQDKVTZEJSIQ7F3IYWOIDKGH5A` (`zkf-asp-20260623060302`, local throwaway testnet identity).
- **ASP leaf inserted:** `9201402971012396815571584921033334461610140673955557127578577337093194546094`.
- **ASP leaf index:** `10`.
- **Post-insert ASP root:** `17541172829364580632852183637710099501222069136566839344254749804000683228715`.
- **Transaction hash:** `deea0e2918719319e5f54bf60c929c62f8006f13fa2b6f5b4af3169b94f0d757`.
- **Explorer:** `https://stellar.expert/explorer/testnet/tx/deea0e2918719319e5f54bf60c929c62f8006f13fa2b6f5b4af3169b94f0d757`.
- **Commands / paths verified:**
  - `stellar keys generate zkf-asp-20260623060302 --network testnet --fund`
  - `stellar contract invoke --id CBULZZIA...BTKN --source-account zkf-asp-20260623060302 --network testnet --send=no -- insert_leaf --leaf 920140...46094`
  - `stellar contract invoke --id CBULZZIA...BTKN --source-account zkf-asp-20260623060302 --network testnet --send=yes -- insert_leaf --leaf 920140...46094`
  - Browser smoke at `http://localhost:5173/`: create wallet, run ASP preflight, submit ASP membership from CLI, rerun dry deposit proof attempt.
- **Browser ASP preflight result:**
  - ASP insert mode: `Permissionless`.
  - Runtime leaf check: matched Nethermind `deriveAspUserLeaf`.
  - Membership inclusion was not claimed by preflight; the contract exposes root/event state, not a direct contains-leaf read.
  - No preflight transaction was submitted from the browser.
- **Dry deposit proof-attempt result after ASP insert:**
  - Status label: `proof generation observed`.
  - Duration: about `5,477 ms`.
  - Observed statuses: fetching on-chain state, fetching ASP non-membership proof, building witness inputs, `Proving...`, `Simulating transaction...`.
  - Submit callback was not reached in this run.
  - No pool transaction hash exists.
- **Transaction hashes:** ASP membership insert only. No shield/deposit/private-send/unshield transaction was submitted.
- **Secrets:** no seed phrase or secret key recorded. Local throwaway testnet identity was removed from Stellar CLI config after the transaction.
- **Notes:**
  - This clears the prior fresh-identity ASP membership blocker for the held smoke wallet.
  - This is the first observed real Nethermind proof-generation path in ZK Fighter.
  - It does not prove on-chain proof acceptance, shield success, private send, or unshield.
  - Next gate: use a funded ZK Fighter wallet account and controlled submit path to perform a real XLM shield transaction, then record the pool transaction hash and balance/event evidence.

## 2026-06-23 08:47 UTC — Phase 3 ASP readiness for user-reported test wallet

- **Phase:** Phase 3 — XLM shield, private send, and unshield on testnet.
- **Kind:** ASP membership readiness + testnet account funding.
- **Network:** Stellar testnet.
- **Reported wallet public key:** `GDXU3EB7PKOLUVE7JGYNNNK2UX6DZGUMTBSJW437C6DJQ4K6NLA5AWDA`.
- **ASP membership contract:** `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`.
- **XLM pool contract:** `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`.
- **ASP insert signer:** `GDDKMDYHMFZVRCBMGV6MNGMY35WZ2IJVYJF62Z2UJLSB6TN6LRM6DQVD` (`zkf-asp-202606230847`, local throwaway testnet identity).
- **ASP leaf inserted:** `6808109168475276732396589994667337059194633730234405232957072244168534586001`.
- **ASP leaf index:** `11`.
- **Post-insert ASP root:** `11083932282497200444012294703009726120371902616281314691269696488443961882202`.
- **ASP insert transaction hash:** `776d9f32896dc4116c4a9d18892ebf141405bb06768781ca7761e108dc92f463`.
- **ASP insert explorer:** `https://stellar.expert/explorer/testnet/tx/776d9f32896dc4116c4a9d18892ebf141405bb06768781ca7761e108dc92f463`.
- **Friendbot funding transaction hash:** `23bd66727f1f38f42dd9177080c4262d50a66c04cea92e448ceb7ccbd7de4448`.
- **Friendbot explorer:** `https://stellar.expert/explorer/testnet/tx/23bd66727f1f38f42dd9177080c4262d50a66c04cea92e448ceb7ccbd7de4448`.
- **Funding result:** Horizon confirmed native XLM balance `10000.0000000` for `GDXU3EB7PKOLUVE7JGYNNNK2UX6DZGUMTBSJW437C6DJQ4K6NLA5AWDA`.
- **Commands / paths verified:**
  - `stellar keys generate zkf-asp-202606230847 --network testnet --fund --overwrite`
  - `stellar contract invoke --id CBULZZIA...BTKN --source-account zkf-asp-202606230847 --network testnet --send=no -- insert_leaf --leaf 680810...86001`
  - `stellar contract invoke --id CBULZZIA...BTKN --source-account zkf-asp-202606230847 --network testnet --send=yes -- insert_leaf --leaf 680810...86001`
  - `curl "https://friendbot.stellar.org?addr=GDXU3...AWDA"`
  - `curl https://horizon-testnet.stellar.org/accounts/GDXU3...AWDA`
- **User-reported browser blocker before insert:**
  - Dry proof and real shield attempts stopped before proof generation.
  - Console logs repeatedly reported `asp membership check is not fully synced` and `the account GDXU3...AWDA should register within ASP`.
  - No pool transaction hash existed before this checkpoint.
- **Transaction hashes:** ASP membership insert and Friendbot funding only. No shield/deposit/private-send/unshield transaction was submitted.
- **Secrets:** no seed phrase or secret key recorded. The local throwaway testnet identity was removed from Stellar CLI config after the transaction.
- **Notes:**
  - This checkpoint clears the ASP membership insert and public account funding prerequisites for the reported test wallet.
  - The user still needs to rerun the dashboard flow after Nethermind's local/indexer state observes the new ASP event.
  - This is not a successful shield proof or pool deposit. No XLM shield/private-send/unshield hash exists yet.

## 2026-06-23 08:56 UTC — Phase 3 first real XLM shield smoke

- **Phase:** Phase 3 — XLM shield, private send, and unshield on testnet.
- **Kind:** real XLM shield submit from the ZK Fighter web UI.
- **Network:** Stellar testnet.
- **Throwaway ZK Fighter wallet public key:** `GBVJ27WUO3L6UKCPMIEZ6VVKJSBKYMCWXODPGEQAYGTCDMPGE6OYAZHH`.
- **XLM pool contract:** `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`.
- **ASP membership contract:** `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`.
- **ASP insert signer:** `GCSYR3IXR5IQJOGMOFBS2IZBVXYBX2A55TWYT7BO744LRNGERM4IBSUO` (`zkf-asp-smoke-202606230853`, local throwaway testnet identity).
- **ASP leaf inserted:** `13680419941236661287245061722764916181053098667794902112074009750448281745660`.
- **ASP leaf index:** `12`.
- **Post-insert ASP root:** `21343012188280598029329147603072008171434794687586911972679513516401145344822`.
- **ASP insert transaction hash:** `f4519fb02c97888fade2408b1a47d08c853ef84a37f262a4bc7751d134a6cc02`.
- **ASP insert explorer:** `https://stellar.expert/explorer/testnet/tx/f4519fb02c97888fade2408b1a47d08c853ef84a37f262a4bc7751d134a6cc02`.
- **Friendbot funding transaction hash:** `5ac919de20bb82e445b24095eb42dc2cd40a132c35959b14982ef288f7af62fd`.
- **Friendbot explorer:** `https://stellar.expert/explorer/testnet/tx/5ac919de20bb82e445b24095eb42dc2cd40a132c35959b14982ef288f7af62fd`.
- **XLM shield transaction hash:** `251e53680d5c5829745fc04e0e42797b692173bc66305d280a7b645ec0ce7d47`.
- **XLM shield explorer:** `https://stellar.expert/explorer/testnet/tx/251e53680d5c5829745fc04e0e42797b692173bc66305d280a7b645ec0ce7d47`.
- **Shield amount:** `0.1 XLM` (`1,000,000` stroops).
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3238230`.
  - created at: `2026-06-23T08:55:40Z`.
  - source account: `GBVJ27WUO3L6UKCPMIEZ6VVKJSBKYMCWXODPGEQAYGTCDMPGE6OYAZHH`.
  - fee charged: `145217` stroops.
  - operation count: `1`.
- **Balance notes:**
  - Before shield: Friendbot funded native XLM balance `10000.0000000`.
  - After shield: Horizon reported native XLM balance `9999.8854783`.
  - Difference matches public deposit amount plus Soroban fee.
- **Browser UI evidence:**
  - Chrome-controlled ZK Fighter app imported a throwaway seed-backed wallet.
  - Real shield panel displayed `Submitted`.
  - Proof status displayed `Generated`.
  - Transaction status displayed `Confirmed`.
  - Last observed UI stages included `Simulating transaction...`, `Submitting...`, `Signing transaction envelope`, `Submitting transaction`, and `Confirming transaction`.
- **Commands / paths verified:**
  - `pnpm dlx tsx ...` to generate a throwaway ZK Fighter seed wallet and derive its ASP leaf.
  - Browser UI import/create vault path at `http://localhost:5173/`.
  - `stellar keys generate zkf-asp-smoke-202606230853 --network testnet --fund --overwrite`
  - `stellar contract invoke --id CBULZZIA...BTKN --source-account zkf-asp-smoke-202606230853 --network testnet --send=no -- insert_leaf --leaf 136804...45660`
  - `stellar contract invoke --id CBULZZIA...BTKN --source-account zkf-asp-smoke-202606230853 --network testnet --send=yes -- insert_leaf --leaf 136804...45660`
  - Browser UI `Submit 0.1 testnet XLM shield`.
  - `curl https://horizon-testnet.stellar.org/transactions/251e...7d47`
  - `curl https://horizon-testnet.stellar.org/accounts/GBVJ...YZHH`
- **Secrets:** no seed phrase or secret key recorded. Local throwaway testnet CLI identity was removed after the ASP insert. The browser smoke wallet is testnet-only and throwaway.
- **Notes:**
  - This proves real browser-side Nethermind proof generation plus seed-wallet Soroban signing/submission for an XLM shield/deposit.
  - This is not the full Phase 3 loop yet: private send/event scan/trial-decrypt and unshield still need real evidence.

## 2026-06-23 10:19 UTC - Phase 3 complete XLM shield, private send, unshield, and tampered proof rejection

- **Phase:** Phase 3 - XLM shield, private send, and unshield on testnet.
- **Kind:** full real browser loop using the ZK Fighter web UI plus Horizon verification.
- **Network:** Stellar testnet.
- **Throwaway ZK Fighter wallet public key:** `GBN4NAZQ7VN3NBGFJ4R5J7ZUJSYW6LSQYS73SXJHKUVE45HUAOKGIWDY`.
- **XLM pool contract:** `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`.
- **ASP membership contract:** `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`.
- **ASP insert signer alias:** `zkf-asp-phase3-202606231054` local throwaway testnet identity.
- **ASP leaf inserted:** `16356319402511338125779401358746723436565897291218676456479751912627406272983`.
- **ASP leaf hex:** `0x242959454dd4f3d043913b61c09a49b069d8408a31db32b6bd000a2337ca79d7`.
- **ASP leaf index:** `13`.
- **Post-insert ASP root:** `2449534210780668928432504863140833149535704957288566898767663832102981601450`.
- **ASP insert transaction hash:** `f081ac87acfe46887788256b68f7df4bc806631e57e41185e8f2e50a14cc91f1`.
- **ASP insert explorer:** `https://stellar.expert/explorer/testnet/tx/f081ac87acfe46887788256b68f7df4bc806631e57e41185e8f2e50a14cc91f1`.
- **Friendbot funding transaction hash:** `34b29d3362f34ff7f4217c664ca3d4742483cafd25d533dda44eb7b495eebf97`.
- **Friendbot explorer:** `https://stellar.expert/explorer/testnet/tx/34b29d3362f34ff7f4217c664ca3d4742483cafd25d533dda44eb7b495eebf97`.
- **Funding result:** Horizon confirmed native XLM balance `10000.0000000` before the loop.

### Successful shield

- **XLM shield transaction hash:** `59d6f3965cde372d9b6b53d23b6ba44343a6a6a42e70ce37c76a6fa320fa7458`.
- **XLM shield explorer:** `https://stellar.expert/explorer/testnet/tx/59d6f3965cde372d9b6b53d23b6ba44343a6a6a42e70ce37c76a6fa320fa7458`.
- **Shield amount:** `0.1 XLM` (`1,000,000` stroops).
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3239083`.
  - created at: `2026-06-23T10:06:50Z`.
  - source account: `GBN4NAZQ7VN3NBGFJ4R5J7ZUJSYW6LSQYS73SXJHKUVE45HUAOKGIWDY`.
  - fee charged: `142772` stroops.
  - operation count: `1`.
- **Note scan after refresh:** one unspent `0.1 XLM` note at ledger `3239083`, commitment preview `0x2648053e...ecda5a3b`.

### Successful private send

- **Private send transaction hash:** `0ec6a6632b06e33fb0893358e6a20a17725a177f917fcbcb300c9dc009649565`.
- **Private send explorer:** `https://stellar.expert/explorer/testnet/tx/0ec6a6632b06e33fb0893358e6a20a17725a177f917fcbcb300c9dc009649565`.
- **Private send amount:** `0.05 XLM` (`500,000` stroops).
- **Recipient path:** raw `zkf1...` private receive code from the same throwaway wallet. This was a self-send smoke to exercise receive-code parsing, proof generation, submission, and note discovery without introducing a second seed in this checkpoint.
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3239096`.
  - created at: `2026-06-23T10:07:55Z`.
  - source account: `GBN4NAZQ7VN3NBGFJ4R5J7ZUJSYW6LSQYS73SXJHKUVE45HUAOKGIWDY`.
  - fee charged: `141839` stroops.
  - operation count: `1`.
- **Note scan after refresh:** original `0.1 XLM` note was spent; two `0.05 XLM` unspent notes appeared at ledger `3239096`, commitment previews `0x27791e4f...7a0c1e0f` and `0x1d8a46c8...9237ce91`.

### Successful unshield

- **Unshield transaction hash:** `3957048706c8cae1da066b82e48bb80725e4b09eb141661ed5dd8865b6a1fa12`.
- **Unshield explorer:** `https://stellar.expert/explorer/testnet/tx/3957048706c8cae1da066b82e48bb80725e4b09eb141661ed5dd8865b6a1fa12`.
- **Unshield amount:** `0.05 XLM` (`500,000` stroops).
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3239108`.
  - created at: `2026-06-23T10:08:55Z`.
  - source account: `GBN4NAZQ7VN3NBGFJ4R5J7ZUJSYW6LSQYS73SXJHKUVE45HUAOKGIWDY`.
  - fee charged: `148038` stroops.
  - operation count: `1`.
- **Note scan after refresh:** one `0.05 XLM` note was spent and one `0.05 XLM` note remained unspent.
- **Public balance after successful loop:** Horizon reported native XLM balance `9999.9067351`.
- **Balance note:** starting `10000.0000000` minus `0.1 XLM` shield plus `0.05 XLM` unshield minus fees `0.0142772`, `0.0141839`, and `0.0148038` equals `9999.9067351`.

### Tampered proof rejection

- **Initial tamper attempt failure mode:** the first tamper helper mutated an XDR byte array copy without replacing the serialized `a` field in the proof map. That produced a still-valid withdraw transaction and was accepted on-chain.
- **Unexpected accepted transaction from helper bug:** `c99bcdec8ffad119d3801ee7065d9698b3330ebcfe19b39c902ed71b083448c8`.
- **Unexpected accepted explorer:** `https://stellar.expert/explorer/testnet/tx/c99bcdec8ffad119d3801ee7065d9698b3330ebcfe19b39c902ed71b083448c8`.
- **Accepted helper-bug transaction verification:**
  - `successful: true`.
  - ledger: `3239199`.
  - created at: `2026-06-23T10:16:31Z`.
  - fee charged: `148170` stroops.
  - operation count: `1`.
  - effect: validly withdrew `0.01 XLM`, leaving an unspent shielded note of `0.04 XLM`.
- **Fix applied:** replace the proof map `a` value with a new `ScVal.scvBytes(...)` value after flipping the first byte, instead of mutating the copied byte array.
- **Corrected tampered proof transaction hash:** `af8f45d20e0048c4f9d88a572b87eecd3e4095385d555d1f4968a71b3e6fa4ce`.
- **Corrected tampered proof explorer:** `https://stellar.expert/explorer/testnet/tx/af8f45d20e0048c4f9d88a572b87eecd3e4095385d555d1f4968a71b3e6fa4ce`.
- **Corrected tampered proof verification:**
  - `successful: false`.
  - ledger: `3239228`.
  - created at: `2026-06-23T10:18:56Z`.
  - source account: `GBN4NAZQ7VN3NBGFJ4R5J7ZUJSYW6LSQYS73SXJHKUVE45HUAOKGIWDY`.
  - fee charged: `105916` stroops.
  - operation count: `1`.
- **UI evidence after corrected tamper:** status displayed `rejected`, submit reached `Yes`, and rejection observed.
- **Note scan after corrected rejection:** unspent shielded balance remained `0.04 XLM`; the rejected transaction did not spend the note.
- **Final public balance after rejected-tx fee:** Horizon reported native XLM balance `9999.8913265`.

- **Browser UI evidence:**
  - Clean test origin used: `http://127.0.0.1:5174/`.
  - ZK Fighter app imported a throwaway seed-backed wallet.
  - Real shield, private send, unshield, refresh-note-scan, and tampered-proof panels were exercised through Chrome-controlled UI.
- **Commands / paths verified:**
  - `pnpm --filter @zk-fighter/web dev --host 127.0.0.1 --port 5174`.
  - Chrome-controlled browser smoke at `http://127.0.0.1:5174/`.
  - `stellar keys generate zkf-asp-phase3-202606231054 --network testnet --fund --overwrite`.
  - `stellar contract invoke --id CBULZZIA...BTKN --source-account zkf-asp-phase3-202606231054 --network testnet --send=yes -- insert_leaf --leaf 163563...72983`.
  - Browser UI shield, private-send, unshield, and tampered-proof controls.
  - Horizon transaction reads for all submitted transaction hashes above.
- **Secrets:** no seed phrase or secret key recorded. The temporary seed file was deleted. The local throwaway Stellar CLI identity was removed after ASP insertion.
- **Notes:**
  - This checkpoint proves the XLM Phase 3 browser path end to end on testnet: public shield/deposit, shielded transfer, public unshield/withdraw, and rejected malformed proof.
  - The private-send checkpoint was a self-send to the wallet's own raw `zkf1...` code. A two-wallet Alice/Bob smoke can be added later for UX confidence, but the engine path and note discovery were exercised here.

## 2026-06-23 10:45 UTC - Phase 3 Alice-to-Bob XLM shielded transfer hardening

- **Phase:** Phase 3 hardening - direct private receive-code transfer between two ZK Fighter identities.
- **Kind:** real browser transfer from Alice's existing shielded note to Bob's separate throwaway wallet.
- **Network:** Stellar testnet.
- **Alice public Stellar account:** `GBN4NAZQ7VN3NBGFJ4R5J7ZUJSYW6LSQYS73SXJHKUVE45HUAOKGIWDY`.
- **Bob public Stellar account:** `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
- **Bob receive code:** raw `zkf1...` direct-code path used; full code intentionally not logged.
- **XLM pool contract:** `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`.
- **Browser setup:**
  - Alice used the existing clean origin `http://127.0.0.1:5174/`.
  - Bob used a separate clean origin `http://localhost:5174/` to avoid overwriting Alice's local vault.
  - Bob was not publicly funded. Receiving and discovering a shielded note did not require Bob to submit a transaction.

### Failed closed preflight

- **Attempt:** Alice private send form was first filled with a mistyped Bob receive code.
- **Observed result:** UI returned `Invalid private receive code: invalid-format`.
- **Submit reached:** no.
- **Transaction hash:** none.
- **Reason logged:** malformed `zkf1...` receive codes fail closed before proof generation or chain submission.

### Alice-to-Bob transfer 1

- **Private send transaction hash:** `15d831e448aaf9d66a0dcdac3f9978f8c28fa4d2c38767dbc5b71b2434a0c768`.
- **Private send explorer:** `https://stellar.expert/explorer/testnet/tx/15d831e448aaf9d66a0dcdac3f9978f8c28fa4d2c38767dbc5b71b2434a0c768`.
- **Amount:** `0.02 XLM` (`200,000` stroops).
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3239449`.
  - created at: `2026-06-23T10:37:22Z`.
  - source account: `GBN4NAZQ7VN3NBGFJ4R5J7ZUJSYW6LSQYS73SXJHKUVE45HUAOKGIWDY`.
  - fee charged: `136373` stroops.
  - operation count: `1`.
- **Indexer note:** Bob was imported after this first transfer. An initial Bob refresh returned `0 XLM`; after the next live transfer and processor run, Bob discovered this historical `0.02 XLM` note.
- **Bob note discovery:** `0.02 XLM` unspent note at ledger `3239449`, commitment preview `0x274134aa...7a8cfed3`.

### Alice-to-Bob transfer 2 while Bob was online

- **Private send transaction hash:** `0dd5be0c4d31f49a44ee5c16416da5a9dbb451d159d3774950fd09f19c26aeec`.
- **Private send explorer:** `https://stellar.expert/explorer/testnet/tx/0dd5be0c4d31f49a44ee5c16416da5a9dbb451d159d3774950fd09f19c26aeec`.
- **Amount:** `0.01 XLM` (`100,000` stroops).
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3239514`.
  - created at: `2026-06-23T10:42:48Z`.
  - source account: `GBN4NAZQ7VN3NBGFJ4R5J7ZUJSYW6LSQYS73SXJHKUVE45HUAOKGIWDY`.
  - fee charged: `139553` stroops.
  - operation count: `1`.
- **Bob note discovery:** Bob's UI showed `Unspent seen: 0.03 XLM` with:
  - `0.01 XLM` unspent at ledger `3239514`, commitment preview `0x15e18122...88799c51`.
  - `0.02 XLM` unspent at ledger `3239449`, commitment preview `0x274134aa...7a8cfed3`.
- **Alice note discovery after refresh:** Alice's UI showed `Unspent seen: 0.01 XLM` with one change note at ledger `3239514`, commitment preview `0x1ffdf6f1...493c3a3a`; Alice's `0.02 XLM` note from ledger `3239449` was marked spent.
- **Alice public balance after transfer 2:** Horizon reported native XLM balance `9999.8637339`.

- **Commands / paths verified:**
  - Browser-controlled Alice UI at `http://127.0.0.1:5174/`.
  - Browser-controlled Bob UI at `http://localhost:5174/`.
  - `pnpm dlx tsx --eval ...` generated the throwaway Bob identity and receive code locally.
  - `curl https://horizon-testnet.stellar.org/transactions/15d831...c768`.
  - `curl https://horizon-testnet.stellar.org/transactions/0dd5be...aeec`.
  - `curl https://horizon-testnet.stellar.org/accounts/GBN4...GIWDY`.
- **Secrets:** no seed phrase, vault password, private key, key-derivation signature, or full receive code recorded.
- **Notes:**
  - This closes the earlier self-send caveat: direct private send to a separate Bob identity succeeded and Bob independently discovered the shielded notes.
  - Event/indexer timing matters. A newly imported recipient may require a later processor run or refresh before older commitments appear.

## 2026-06-23 10:52 UTC - Phase 4 USDC pool deployment

- **Phase:** Phase 4 - USDC pool and USDC private loop.
- **Kind:** deploy a real testnet USDC pool instance using the proven Nethermind pool WASM.
- **Network:** Stellar testnet.
- **USDC issuer:** `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- **USDC SAC:** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- **New USDC pool contract:** `CBDHVGWV7ZZAG5QH5TDI6PKR7X3F3PQNWPQWWGHFRR6ZHYTR4OA3VN3K`.
- **Pool deployer/admin:** `GD7BWAZKCMSDMI23KY3CZWRMJ26THV3NS3AJ7O7OKDIXLTRKF4PO4VO4` (`zkf-usdc-pool-202606231150`, local throwaway testnet identity).
- **Reused verifier:** `CBJFCMPURNJM67NOBQTMGPMHYIEQQJ2QHVNXX2RDFUW2PU67HI7X5MSZ`.
- **Reused ASP membership:** `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`.
- **Reused ASP non-membership:** `CDREZXZILERCSD7VMS4SKVRQY4FNIYJCTYA2AY4TKFRV6Y3L3M2OK3O3`.
- **Fetched pool WASM source:** existing deployed XLM pool `CDQRXOD6VHFR5W34HMDLQNROGXA64DPI6BCU6M5JVA2GARDVHAMS2PZF`.
- **Fetched pool WASM SHA-256:** `a2ddfd6fcb5e8d9ed4329c911b4e7b6a57217f2ca61e61a8e785b39b06f473d4`.
- **Constructor args:**
  - token: `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
  - maximum deposit amount: `1000000000` raw units.
  - levels: `8`.
- **Deployment transaction hash:** `595d7618d8b3e382352d362dc071e05ab7ddb22a00b52ba124914a200fa60a7b`.
- **Deployment explorer:** `https://stellar.expert/explorer/testnet/tx/595d7618d8b3e382352d362dc071e05ab7ddb22a00b52ba124914a200fa60a7b`.
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3239599`.
  - created at: `2026-06-23T10:49:53Z`.
  - source account: `GD7BWAZKCMSDMI23KY3CZWRMJ26THV3NS3AJ7O7OKDIXLTRKF4PO4VO4`.
  - fee charged: `1140843` stroops.
  - operation count: `1`.
- **Read-only checks:**
  - `stellar contract id asset --asset USDC:GBBD47IF... --network testnet` returned `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
  - `stellar contract info interface --contract-id CBIEL...DAMA --network testnet` exposed `trust`, `authorized`, `balance`, `transfer`, `decimals`, and `symbol`.
  - `decimals` returned `7`.
  - `symbol` returned `"USDC"`.
  - `stellar contract info interface --contract-id CBDHVG...VN3K --network testnet` matched the Nethermind pool interface.
  - `get_root` returned `11095627874297306182376029332709185052812444271679323433770968369044736864771`.
- **Code follow-up:** `packages/core/src/networks.ts` now enables the testnet USDC shielded pool with this pool ID. Mainnet USDC remains gated pending deployment.
- **Secrets:** no secret key recorded. The local throwaway deployer identity should be removed once Phase 4 no longer needs admin access.
- **Notes:**
  - This proves the USDC pool exists. It does not yet prove a USDC shield/private-send/unshield loop.
  - The reference workspace pool build failed locally because Cargo could not resolve a pinned `wasmer` git object. To avoid editing the reference repo, the deployed XLM pool WASM was fetched from testnet and reused for the USDC constructor.

## 2026-06-23 11:10 UTC - Phase 4 USDC funding readiness and faucet blocker

- **Phase:** Phase 4 - USDC pool and USDC private loop.
- **Kind:** prepare a throwaway wallet for public USDC before shield.
- **Network:** Stellar testnet.
- **Wallet public account:** `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
- **USDC issuer:** `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- **USDC SAC:** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- **Friendbot funding transaction hash:** `d49da9edac2b797b2ab09310d846debbd2df4e0cf5618ab167e4650a7cd89022`.
- **Friendbot explorer:** `https://stellar.expert/explorer/testnet/tx/d49da9edac2b797b2ab09310d846debbd2df4e0cf5618ab167e4650a7cd89022`.
- **Friendbot Horizon verification:**
  - `successful: true`.
  - ledger: `3239791`.
  - created at: `2026-06-23T11:05:55Z`.
  - fee charged: `100` stroops.
  - operation count: `1`.
- **USDC trustline transaction hash:** `0081b04fb5a016453c9aa4fa77b73d9e3c3bb539f19afbff25cc67523620a4be`.
- **USDC trustline explorer:** `https://stellar.expert/explorer/testnet/tx/0081b04fb5a016453c9aa4fa77b73d9e3c3bb539f19afbff25cc67523620a4be`.
- **USDC trustline Horizon verification:**
  - `successful: true`.
  - ledger: `3239816`.
  - created at: `2026-06-23T11:08:00Z`.
  - source account: `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
  - fee charged: `100` stroops.
  - operation count: `1`.
- **Account balance after trustline:**
  - native XLM: `9999.9999900`.
  - USDC trustline exists and is authorized.
  - USDC balance: `0.0000000`.
- **Circle faucet attempt:**
  - Page: `https://faucet.circle.com/`.
  - Asset selected: `USDC`.
  - Network selected: `Stellar Testnet`.
  - Destination: `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
  - Result: blocked by reCAPTCHA with page copy: "We detect unusual traffic from your request. Please verify that you are not a bot and submit again."
  - No USDC faucet transaction was observed.
- **Code readiness in this checkpoint:**
  - `packages/core/src/networks.ts` includes the testnet USDC pool ID and leaves mainnet gated.
  - Core shield/private helpers accept an asset code and route USDC through the USDC pool.
  - Web UI renders separate XLM and USDC shield/private loop panels.
- **Quality gates after code changes:**
  - `pnpm lint` passed, including docs consistency, file-size check, and secret scan.
  - `pnpm typecheck` passed.
  - `pnpm test` passed: 11 core test files, 37 tests.
  - `pnpm build` passed with the existing Vite chunk-size warning.
- **Secrets:** no seed phrase, vault password, private key, or full receive code recorded. The local `zkf-usdc-pool-202606231150` deployer identity was removed from Stellar CLI config after deployment.
- **Stop condition:** the real USDC shield/private-send/unshield loop is blocked only by public testnet USDC funding. Once the faucet CAPTCHA is solved or USDC is otherwise sent to this account, rerun the app USDC shield path.

## 2026-06-23 12:59 UTC - Phase 4 real USDC shield confirmed

- **Phase:** Phase 4 - USDC pool and USDC private loop.
- **Kind:** real public testnet USDC shield into a fresh Nethermind privacy pool.
- **Network:** Stellar testnet.
- **Wallet public account:** `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
- **USDC issuer:** `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- **USDC SAC:** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- **User funding transaction:** `05e1cbc8023054e397ba6e73f37752cab534c7f2b84d553bc631bbf20d75710a`.
- **Balance before shield:**
  - USDC: `20.0000000`.
  - native XLM: `9999.9999900`.

### Failed old-stack attempt

- **Old USDC pool:** `CBDHVGWV7ZZAG5QH5TDI6PKR7X3F3PQNWPQWWGHFRR6ZHYTR4OA3VN3K`.
- **Old ASP membership:** `CBULZZIAHWL33XD5OBL2LBPYSFBYCNCOCIJITGJ74OSRRA7IZKIUBTKN`.
- **Bob ASP leaf inserted into old ASP:** `8a79aaf131f4bd1796c083503abf26e6801c0eeb6c5e982bfd3812773651845c`.
- **Observed blocker:** fresh browser state could not reconstruct the old ASP tree because public RPC event retention no longer exposed index `0`; replay started at index `1`, while Bob's inserted leaf was index `14`.
- **Result:** shield stopped before proof generation with an ASP membership/indexer precondition error. No transaction was submitted.

### Fresh stack used for confirmed shield

- **Fresh deployer/admin:** `GBP4JZ5EMKSYQNHEOY2T6JM756APBDAWP6I7IQCU2XRD54OUKBYUCDW7`.
- **Fresh ASP membership:** `CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP`.
- **Fresh ASP non-membership:** `CCJNSJRX2HZLFPL6ADNER36VAFUS3SYP7BW7JPKATKDM4JRDA5OE3PHD`.
- **Fresh verifier:** `CCRXNJKLJS7UY276YALPCN7JRVLUARIGKOHCPMOS7AZLYO5Z2VFXD73D`.
- **Fresh XLM pool:** `CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY`, deployment ledger `3241020`.
- **Fresh USDC pool:** `CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY`, deployment ledger `3241021`.
- **Permissionless ASP insert transaction:** `e5c5ae682a471f42fb4d12adafbe70314793bea3e04a82bc7b1c4a8ef1f5ac37`.
- **Bob ASP leaf:** `10573321450513361284041827649225801402517647375459866982405821517015036818270`.
- **Bob fresh ASP leaf insert transaction:** `c145737efec1b7e818896710a4a34bae10df95c8d9556824189962aa8e805188`.
- **Bob fresh ASP leaf index:** `0`.
- **Bob fresh ASP root after insert:** `2896462784886852176625131125059393097742292578277441866516956324995263707338`.

### Runtime/app fixes before successful retry

- **Stale pool config fixed:** `packages/core/src/networks.ts` was updated from the old XLM/USDC pool IDs to the fresh XLM pool `CBQ46IL6...Z5SMY` and fresh USDC pool `CCY6R2...OHKY`.
- **Tests updated:** pool ID assertions in core tests now cover the fresh USDC pool.
- **Mac deploy script compatibility:** `reference/stellar-private-payments/deployments/scripts/deploy.sh` was patched to avoid Bash `mapfile`, which is not available in macOS Bash 3.
- **Browser prover timeout fixed:** the local Nethermind browser runtime worker ping timeout was raised from `5,000 ms` to `60,000 ms`; transaction prover request timeout was raised from `20,000 ms` to `30 minutes`.
- **Restaged artifact hashes after timeout patch:**
  - `apps/web/public/js/web_bg.wasm`: `506b33a0fc05997612eebdaf03da96f9863e17f06e295c37c689d16f8b884445`.
  - `apps/web/public/js/prover-worker.js`: `ff6ea03af52ab3e2de38244edf4f051953010b045c2c28b6ecaa962d2a55cd29`.
  - `apps/web/public/js/prover-worker_bg.wasm`: `d061e592213f6a9aa4681eb5120ca7410b9e76251a858a79883ebe73d202f492`.
  - `apps/web/public/js/storage-worker.js`: `8ae8485bc4a459499eef9a40c50afa5e6e6412263115050531850b721c77b7db`.
  - `apps/web/public/js/storage-worker_bg.wasm`: `f3ffa6f30d40ec845ae88607b2c29ab879c33e00070ecf70bdcd18af69b1c0d2`.

### Confirmed USDC shield

- **Browser origin used:** `http://127.0.0.1:5179/`.
- **ASP preflight before shield:**
  - ASP contract: `CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP`.
  - insert mode: permissionless.
  - runtime match: matches Nethermind.
  - transaction: not submitted during preflight.
- **Shielded amount:** `1 USDC`.
- **USDC pool:** `CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY`.
- **Shield transaction hash:** `8800355227878c9dc227b6a69972619928421fd478a537bbc65b333929247405`.
- **Shield explorer:** `https://stellar.expert/explorer/testnet/tx/8800355227878c9dc227b6a69972619928421fd478a537bbc65b333929247405`.
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3241138`.
  - created at: `2026-06-23T12:58:18Z`.
  - source account: `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
  - fee charged: `433340` stroops.
  - operation count: `1`.
- **Balance after shield:**
  - USDC: `19.0000000`.
  - native XLM: `9999.9566560`.
- **Wallet note discovery after refresh:** USDC panel showed `Unspent seen: 1 USDC`, with `1 USDC` unspent at ledger `3241138`.
- **Quality gates after fixes:**
  - `pnpm lint` passed, including docs consistency, file-size check, and secret scan.
  - `pnpm typecheck` passed.
  - `pnpm test` passed: 11 core test files, 37 tests; web had no tests.
  - `pnpm build` passed with the existing Vite chunk-size warning.
- **Local key cleanup:** the throwaway `zkf-fresh-open-deploy-20260623124758` Stellar CLI key alias was removed after the confirmed shield.
- **Secrets:** no seed phrase, vault password, private key, key-derivation signature, or full receive code recorded.
- **Follow-up:** continue Phase 4 by proving USDC private send and USDC unshield from this discovered note.

## 2026-06-23 13:24 UTC - Phase 4 real USDC private send and unshield confirmed

- **Phase:** Phase 4 - USDC pool and USDC private loop.
- **Kind:** real USDC shielded transfer, recipient note discovery, and public USDC unshield.
- **Network:** Stellar testnet.
- **Sender / unshield recipient public account:** `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
- **USDC issuer:** `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.
- **USDC SAC:** `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`.
- **USDC pool:** `CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY`.
- **Starting private state:** sender had one `1 USDC` shielded note from ledger `3241138`.

### Note refresh/indexing fix

- **Observed issue:** after the private send transaction, sender change-note discovery worked, but the separate recipient wallet initially showed `Unspent seen: 0 USDC`.
- **Cause:** `loadXlmShieldedNotes` read already-indexed local notes only. A newly created recipient wallet might not have processed the latest pool events yet.
- **Fix:** exposed the reference runtime's existing indexer as `syncPoolEvents()`, added a storage-worker `ProcessPending` request, and made `loadXlmShieldedNotes` call `syncPoolEvents()` before `getUserNotes()` when the runtime exposes it.
- **Private action wrapper timeout:** increased to `30 minutes` and changed timeout copy from XLM-specific to asset-neutral.
- **Restaged artifact hashes after sync fix:**
  - `apps/web/public/js/web_bg.wasm`: `ed59a8d76c59c98066f6cdb1485d810abedbcccc63e8b63c45971e745105071e`.
  - `apps/web/public/js/prover-worker.js`: `9c7f286bbda3fbfa976fb85df93853d89abdf3b660bc19a93bb905e67ff51c1f`.
  - `apps/web/public/js/prover-worker_bg.wasm`: `bb8bc1673a25dc2de4f9d9cf8d1d05fb3921646bf689de60e179f698f24fe2a2`.
  - `apps/web/public/js/storage-worker.js`: `845538e858ab181af654436a7c3705133936a93957a26bd33802d35b6ae69edb`.
  - `apps/web/public/js/storage-worker_bg.wasm`: `4dad41caa8fc839b7ac0e240492bb5a0337a58b2c004ee87832ffe349b4aefb6`.

### Confirmed USDC shielded transfer

- **Amount:** `0.5 USDC`.
- **Recipient:** separate browser wallet created for this test; full private receive code intentionally not recorded.
- **Private send transaction hash:** `3f20d183abccd9ddb0c7bfd437c5151772268a48eed1d28e3e023c5b422ce698`.
- **Private send explorer:** `https://stellar.expert/explorer/testnet/tx/3f20d183abccd9ddb0c7bfd437c5151772268a48eed1d28e3e023c5b422ce698`.
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3241336`.
  - created at: `2026-06-23T13:14:50Z`.
  - source account: `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
  - fee charged: `162311` stroops.
  - operation count: `1`.
- **Sender note state after send:**
  - `1 USDC` note from ledger `3241138` marked spent.
  - `0.5 USDC` change note unspent at ledger `3241336`, commitment preview `0x112432b8...4260aee7`.
- **Recipient note discovery after sync-enabled refresh:**
  - UI showed `Unspent seen: 0.5 USDC`.
  - `0.5 USDC` unspent at ledger `3241336`, commitment preview `0x0a828c13...1e5215cd`.

### Confirmed USDC unshield

- **Amount:** `0.5 USDC`.
- **Public destination:** `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
- **Public USDC balance before unshield:** `19.0000000`.
- **Unshield transaction hash:** `9042a1e9936751c95e2578d96bb278098bdc43e28a73563b492a5b622cd413ed`.
- **Unshield explorer:** `https://stellar.expert/explorer/testnet/tx/9042a1e9936751c95e2578d96bb278098bdc43e28a73563b492a5b622cd413ed`.
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3241437`.
  - created at: `2026-06-23T13:23:15Z`.
  - source account: `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
  - fee charged: `171936` stroops.
  - operation count: `1`.
- **Public USDC balance after unshield:** `19.5000000`.
- **Sender note state after unshield:** UI showed `Unspent seen: 0 USDC`; both sender-side USDC notes were marked spent.
- **Quality gates after fixes:**
  - `pnpm lint` passed, including docs consistency, file-size check, and secret scan.
  - `pnpm typecheck` passed.
  - `pnpm test` passed: 11 core test files, 38 tests; web had no tests.
  - `pnpm build` passed with the existing Vite chunk-size warning.
- **Secrets:** no seed phrase, vault password, private key, key-derivation signature, or full receive code recorded.
- **Follow-up:** Phase 4 now has real evidence for USDC shield, shielded transfer, recipient discovery, and unshield. Next phase can move to polishing the demo flow/evidence display or the bridge scope.

## 2026-06-23 14:05 UTC - Nethermind event-fetch console noise cleanup

- **Phase:** Phase 4 cleanup before moving to the next phase.
- **Kind:** browser/runtime debugging; no new transaction submitted.
- **Network:** Stellar testnet.
- **Observed issue:** Chrome console history contained repeated Nethermind logs:
  - `[EVENTS] round failed: network error: error sending request`
  - Source: `app/crates/platforms/web/src/events.rs:143`.
- **Fresh reproduction evidence:**
  - Locked wallet: no Nethermind runtime loaded, no event-fetch requests.
  - Unlocked idle wallet: no event-fetch requests.
  - USDC `Refresh notes`: runtime started cleanly; Stellar RPC POSTs to `https://soroban-testnet.stellar.org/` returned `200`; CORS preflights returned `204`.
  - 35-second background watch after runtime start: repeated Stellar RPC POSTs returned `200`; no fresh `[EVENTS] round failed` logs.
- **Root cause found:** Nethermind `mainThread()` always started a permanent background event listener. ZK Fighter also performs explicit app-managed sync through `syncPoolEvents()` before note reads, so the app had redundant event polling after a runtime action.
- **Fix:** kept Nethermind's default behavior available, but added a `background_events` config flag and made ZK Fighter pass `false` from `loadNethermindWebClient`. ZK Fighter now uses explicit sync instead of a hidden permanent poller.
- **Regression coverage:** added a core test proving `loadNethermindWebClient('testnet')` constructs Nethermind config with `backgroundEvents: false`.
- **Post-fix browser verification:**
  - Hard reloaded the app with cache disabled.
  - USDC `Refresh notes` still completed and displayed indexed notes.
  - Explicit sync produced `8` successful Stellar RPC responses and `0` request failures.
  - A following `15` second quiet window produced `0` additional Stellar RPC calls.
  - Fresh console events showed `[MAIN THREAD] background event listener disabled`.
  - Fresh console events did not show `[EVENTS] listening` or `[EVENTS] round failed`.
- **Build note:** direct Trunk rebuild first failed because Apple clang cannot compile `sqlite-wasm-rs` for `wasm32-unknown-unknown`; rerun succeeded with Homebrew LLVM:
  - `CC_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/clang`
  - `CXX_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/clang++`
- **Restaged artifact hashes after cleanup:**
  - `apps/web/public/js/web.js`: `e017a342240df6709d914e2b3ad911d41dd81054dcd692a0f88d616a8ff07c3d`.
  - `apps/web/public/js/web_bg.wasm`: `15a9c74f68202841dbd7344271f8caf76e3d2e792c59697b6727b139b0980f8d`.
  - `apps/web/public/js/prover-worker.js`: `3f46e41245ba6c983299be7fc998bd819597cabc9e9b5478a82b953797d51596`.
  - `apps/web/public/js/prover-worker_bg.wasm`: `9ee90256eb7fd295f12c3f46b74b4707a09c625c3a9c478e1736ce9a3e156e80`.
  - `apps/web/public/js/storage-worker.js`: `0aa2ddde0189eba0dca6e238a470e9a9b763831c1606674113f41fbf9488d4d8`.
  - `apps/web/public/js/storage-worker_bg.wasm`: `e3d05a279f93e37586d27a79c6ab047790e5a834d3a36c607fac5dd38d47fd83`.
- **Secrets:** no seed phrase, vault password, private key, key-derivation signature, or full receive code recorded.

## 2026-06-23 19:33 UTC - Phase 5 optional public discovery confirmed

- **Phase:** Phase 5 - optional public discovery.
- **Kind:** real testnet public-key registration and lookup.
- **Network:** Stellar testnet.
- **Public account:** `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
- **Privacy boundary:** direct private receive-code sharing remains the default. Publishing discovery is optional and creates a public link between the Stellar account and the private receive public keys.
- **XLM pool:** `CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY`.
- **USDC pool:** `CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY`.

### Confirmed public discovery publish

- **XLM public discovery transaction hash:** `b5d76b943568e3abddfde4451ec329bbe60692815a1decb5cf4a6e7e218322d2`.
- **XLM public discovery explorer:** `https://stellar.expert/explorer/testnet/tx/b5d76b943568e3abddfde4451ec329bbe60692815a1decb5cf4a6e7e218322d2`.
- **XLM Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3245812`.
  - created at: `2026-06-23T19:28:20Z`.
  - source account: `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
  - fee charged: `7180` stroops.
  - operation count: `1`.
  - operation type: `invoke_host_function`.
- **USDC public discovery transaction hash:** `b8090c219292b98a07f2523a901695131f50bb80cfb0312886715355b6fbc60a`.
- **USDC public discovery explorer:** `https://stellar.expert/explorer/testnet/tx/b8090c219292b98a07f2523a901695131f50bb80cfb0312886715355b6fbc60a`.
- **USDC Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3245813`.
  - created at: `2026-06-23T19:28:25Z`.
  - source account: `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
  - fee charged: `7180` stroops.
  - operation count: `1`.
  - operation type: `invoke_host_function`.
- **Browser result:** UI reported `Published to 2 pools` and displayed explorer links for both transactions.
- **Network result:** browser/CDP monitor recorded no failed network requests during publish or lookup.

### Confirmed public discovery lookup

- **Lookup input:** public Stellar address `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
- **Lookup result:** UI reported `Found from ledger 3245813`.
- **Receive-code handling:** UI reconstructed and displayed a truncated raw `zkf1...` receive code from the published keys; full receive code intentionally not recorded.
- **Balance notes:**
  - Public discovery moves no USDC and creates no shielded note.
  - Current Horizon account balances after publishing: `19.5000000 USDC`, `9999.9217953 XLM`.
  - Native XLM changed only by transaction fees shown above; a separate before-balance snapshot was not captured for this non-funds-moving publish.
- **Secrets:** no seed phrase, vault password, private key, key-derivation signature, or full receive code recorded.

## 2026-06-23 20:30 UTC - Phase 6 user-held disclosure artifact verified

- **Phase:** Phase 6 - user-held disclosure artifact.
- **Kind:** real browser-generated Nethermind selective-disclosure receipt, wrapped in a ZK Fighter artifact and verified through the Nethermind verifier path.
- **Network:** Stellar testnet.
- **Public account:** `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
- **XLM pool:** `CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY`.
- **Verifier key posture:** `selectiveDisclosure_1` is accepted for testnet/off-chain disclosure only. Its key provenance is local/testnet, not a trusted mainnet ceremony.
- **Pinned disclosure VK hash:** `0xe8c9879c1239deeaab3cda366419e3536a6f66502f88c3eec09da1e52843e5af`.

### Runtime/indexer fix before disclosure proof

- **Observed issue:** real XLM shield and disclosure proof generation could wait indefinitely on `SyncRequired` after Phase 4 disabled Nethermind's background event listener.
- **Cause:** explicit app-managed sync existed for note refresh, but Nethermind transaction/disclosure retry loops did not process pending pool events when the storage worker reported `SyncRequired`.
- **Fix:** kept background events disabled, exposed the existing platform client pending-event processor internally, and called explicit pool sync from both:
  - `reference/stellar-private-payments/app/crates/platforms/web/src/client/transact.rs`.
  - `reference/stellar-private-payments/app/crates/platforms/web/src/client/mod.rs` disclosure retry path.
- **Rebuild:** `make release` completed with Homebrew LLVM for `wasm32-unknown-unknown`; `pnpm prover:stage` restaged the rebuilt browser assets.

### XLM shield setup for a real note

- **Purpose:** create a real unspent XLM note to disclose.
- **Amount:** `0.1 XLM`.
- **Shield transaction hash:** `b37bd7d5efaacc1df793a77a7323ed26f66454ecea1ce448e9af765f5b9e1dd9`.
- **Explorer:** `https://stellar.expert/explorer/testnet/tx/b37bd7d5efaacc1df793a77a7323ed26f66454ecea1ce448e9af765f5b9e1dd9`.
- **Horizon transaction verification:**
  - `successful: true`.
  - ledger: `3246462`.
  - created at: `2026-06-23T20:22:34Z`.
  - source account: `GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP`.
  - fee charged: `476769` stroops.
  - operation count: `1`.
  - operation type: `invoke_host_function`.
- **Browser proof status:** XLM shield UI reported proof generated and transaction confirmed.
- **Selected disclosure note:** `0.1 XLM`, ledger `3246462`, commitment preview `0x08f0c083f378...f6047b3f37cd`.

### Disclosure generation and verification

- **Generated artifact:** browser UI reported `generated · 2,319 ms`.
- **Artifact kind/version:** `zk-fighter-disclosure-artifact`, version `1`.
- **Artifact storage:** full artifact JSON intentionally not recorded in this log.
- **Verifier result:** browser UI reported `Fully verified`.
- **Verifier checks:**
  - proof: `pass`.
  - context: `pass`.
  - known root: `pass`.
  - read-only/no spend authority: `pass`.
- **Reviewer copy:** UI states that ZK Fighter cannot disclose for the user, reviewers get read-only verification, and owner-supplied activity labels are distinct from proof/context/root verification.
- **Viewing key:** full viewing-key export remains intentionally disabled; scoped receipts are the MVP path.

### Staged artifact hashes after sync fix

- `apps/web/public/js/web.js`: `ca71705ca77eb699fd40a9db5ad79c288738959f108a538aa64633f73a2dc08a`.
- `apps/web/public/js/web_bg.wasm`: `102c1f642275eb2d0c0ce80e5e7fa43a4c39dc7a1d4742d9f867e01321e226dd`.
- `apps/web/public/js/prover-worker.js`: `3f46e41245ba6c983299be7fc998bd819597cabc9e9b5478a82b953797d51596`.
- `apps/web/public/js/prover-worker_bg.wasm`: `e6dbf11cfdb8e3c4f74e0c44fc084def307ef6e0fc680feb390f08e0548c55c4`.
- `apps/web/public/js/storage-worker.js`: `0aa2ddde0189eba0dca6e238a470e9a9b763831c1606674113f41fbf9488d4d8`.
- `apps/web/public/js/storage-worker_bg.wasm`: `7f1143542150a23e36d034fb430c152659c11786016c71e8dbfa0b3920d25a2e`.
- `apps/web/public/circuits/selectiveDisclosure_1.wasm`: `f2468df7b9a28582e0e8f5301d483c3349574334b43ded5220084100e0c09aaf`.
- `apps/web/public/circuits/selectiveDisclosure_1.r1cs`: `e83f0d99277e77283514e0690d94805ca6ffc65792c59e8f795be4ed31788667`.

### Quality gates and browser smoke

- `pnpm lint` passed, including docs consistency, file-size check, and secret scan.
- `pnpm typecheck` passed.
- `pnpm test` first hit a transient full-suite timeout in `public-discovery.test.ts`; the isolated test passed, a full core verbose run passed, and the exact root `pnpm test` rerun passed: 14 core test files, 47 tests; web had no tests.
- `pnpm build` passed with the existing Vite large-chunk warning.
- `cargo fmt --all --check` passed in `reference/stellar-private-payments`; output included the reference repo's existing stable-rustfmt warnings for nightly-only rustfmt options.
- Isolated system-Chrome smoke at `1280x900` and `393x852` rendered the disclosure panel, showed the reviewer copy, had no horizontal overflow, and recorded no console errors or failed requests.
- **Secrets:** no seed phrase, vault password, private key, key-derivation signature, full receive code, full disclosure artifact, or disclosure receipt JSON recorded.

## 2026-06-23 20:53 UTC - Phase 7 optional passkey implementation and matrix

- **Phase:** Phase 7 - optional passkey.
- **Kind:** local wallet security implementation and browser/device support matrix; no chain transaction.
- **Scope:** passkey is an optional PRF-derived local unlock envelope over the existing seed-backed vault. It is not passkey-only recovery, not a Stellar smart-account signer, and not a replacement for the seed phrase.
- **Recovery posture:** seed phrase remains the only guaranteed recovery path; password unlock remains available when passkey is enabled or fails.

### Implemented behavior

- Added a separate `zk-fighter:passkey-envelope:v1` local-storage record.
- Passkey setup calls real WebAuthn `navigator.credentials.create()` with the `prf` extension.
- If create-time PRF output is absent, setup attempts a follow-up `navigator.credentials.get()` with `prf.evalByCredential`.
- PRF output is stretched with Web Crypto HKDF and used as an AES-GCM key to encrypt the seed phrase into the passkey envelope.
- Passkey unlock calls `navigator.credentials.get()` with the saved credential ID and PRF salt, decrypts the envelope, validates the seed phrase, and derives the existing seed-backed identity.
- Unsupported PRF, cancelled ceremonies, invalid WebAuthn origins, corrupt envelopes, and mismatched PRF output fail closed.
- UI copy states passkey unlock is optional convenience; seed phrase remains recovery; unsupported/different credentials fail closed.

### Browser/device support matrix

| Target | Origin | Result | Notes |
|---|---|---|---|
| System Google Chrome via Playwright smoke | `http://localhost:5179/` | WebAuthn API available; platform authenticator reported available | Browser support panel rendered; no console errors or failed requests. This does not prove PRF until a real ceremony succeeds. |
| System Google Chrome via Playwright smoke | `http://127.0.0.1:5179/` | WebAuthn create probe failed with `SecurityError: This is an invalid domain.` | Use `localhost` or HTTPS for passkey testing. Code maps this to a closed `webauthn-unavailable` error. |
| Chrome DevTools virtual authenticator | `http://localhost:5179/` | Credential creation works, but PRF reports `enabled: false` | UI showed `This passkey does not expose the PRF needed for ZK Fighter unlock.` No passkey envelope was stored. |
| Real platform passkey / phone | not run | Not claimed | Requires user-approved OS/browser passkey prompt. Do not claim phone/passkey support in demo until this row is completed. |

### Verification

- Focused passkey tests passed: `packages/core/src/passkey.test.ts`, 7 tests.
- `pnpm lint` passed, including docs consistency, file-size check, and secret scan.
- `pnpm typecheck` passed.
- `pnpm test` passed: 15 core test files, 54 tests; web had no tests.
- `pnpm build` passed with the existing Vite large-chunk warning.
- Chrome UI smoke rendered passkey panel, seed-recovery copy, mismatch copy, locked-screen password fallback, and mobile layout without horizontal overflow.
- Chrome virtual-authenticator unsupported-PRF smoke recorded no console errors/warnings and no failed requests; no passkey envelope was stored.
- **Secrets:** no seed phrase, vault password, private key, PRF output, passkey credential ID, passkey envelope, or full receive code recorded.

## 2026-06-23 21:30 UTC - Phase 8 CCTP bridge implementation/readiness

- **Phase:** Phase 8 - CCTP bridge then shield.
- **Kind:** implementation readiness and local browser smoke; no chain transaction submitted in this entry.
- **Network posture:** testnet only for bridge-to-shield. Mainnet remains gated because no mainnet ZK Fighter USDC privacy pool is deployed.
- **Current CCTP config used by code:**
  - Stellar domain: `27`.
  - Ethereum Sepolia source domain: `0`.
  - Ethereum Sepolia USDC: `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238`.
  - Ethereum Sepolia TokenMessengerV2: `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`.
  - Stellar testnet TokenMessengerMinter: `CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP`.
  - Stellar testnet MessageTransmitter: `CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY`.
  - Stellar testnet CctpForwarder: `CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ`.
  - Iris sandbox: `https://iris-api-sandbox.circle.com`.
- **Implementation evidence:**
  - Core bridge runner encodes `approve` and `depositForBurnWithHook`, sets both CCTP `mintRecipient` and `destinationCaller` to the Stellar `CctpForwarder`, polls Iris `/v2/messages/{sourceDomain}?transactionHash=...`, and submits Stellar `mint_and_forward`.
  - Web bridge panel shows the bridge as public, streams progress from approval/burn/attestation/mint, renders approval/burn/mint explorer links when real hashes exist, and enables the separate USDC shield only after public Stellar USDC arrival is reported.
  - Failed reports preserve any already-submitted approval/burn hashes so a later Iris or Stellar failure does not hide recovery/evidence references.
  - Ethereum wallet adapter re-checks Sepolia before each `eth_sendTransaction` and includes `chainId`.
- **Chrome smoke:** local app at `http://localhost:5175/` rendered the bridge panel with Ethereum Sepolia, Stellar Testnet, Iris sandbox, and the Stellar forwarder. The shield button remained disabled before bridge completion. No app console errors were observed.
- **Quality gates:** `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build` passed after the Phase 8 implementation. Build still emitted the existing Vite large-chunk warning.
- **No evidence created yet:**
  - No Ethereum approval transaction hash.
  - No Ethereum CCTP burn transaction hash.
  - No Iris attestation reference from a live burn.
  - No Stellar mint/forward transaction hash.
  - No public USDC balance proof from a bridge arrival.
  - No separate post-bridge USDC shield transaction hash.
- **Blocker for Phase 8 acceptance:** a real funded Ethereum Sepolia signing session is still required. The source wallet must have Sepolia ETH for gas and Sepolia USDC, and the ZK Fighter Stellar testnet account must be able to receive USDC before running the bridge.

## 2026-06-23 21:42 UTC - Phase 8 CCTP bridge browser approval attempt

- **Phase:** Phase 8 - CCTP bridge then shield.
- **Kind:** real browser attempt against the local app; no chain transaction hash returned.
- **App origin:** `http://localhost:5175/`.
- **Observed path:**
  - Local ZK Fighter wallet unlocked.
  - Bridge panel rendered with Ethereum Sepolia -> Stellar Testnet, Iris sandbox, and the Stellar CCTP forwarder.
  - Starting the bridge opened a MetaMask notification page, confirming the app reached the injected Ethereum wallet path.
  - Browser automation policy blocked direct control of the `chrome-extension://...` MetaMask notification page.
  - After reload, the app reached `Running · Submitting Ethereum USDC approval`.
  - Watched for 60 seconds; no approval transaction hash, burn transaction hash, Iris attestation, or Stellar mint hash appeared.
- **UI fix made from the attempt:** the bridge panel now surfaces wallet/approval progress instead of appearing frozen while waiting for Ethereum wallet action.
- **Quality checks after the UI fix:**
  - `pnpm --filter @zk-fighter/web lint` passed.
  - `pnpm --filter @zk-fighter/web typecheck` passed.
- **Current blocker:** a human must approve or reject the MetaMask Sepolia transaction prompt, or provide an alternate controlled Sepolia signer. Until an approval hash exists, Phase 8 acceptance remains open.
- **Secrets:** no Ethereum private key, seed phrase, vault secret, or full receive code recorded.

## 2026-06-23 22:57 UTC - Phase 8 CCTP bridge acceptance

- **Phase:** Phase 8 - CCTP bridge then shield.
- **Kind:** real funded Sepolia -> Stellar testnet bridge, followed by separate real USDC shield/deposit.
- **App origin:** `http://localhost:5175/`.
- **Destination Stellar testnet account:** `GB4PZPDDY7EB4FF6RYAJYBRG6JZ3AA2JUQKE577VVUFJRHASVHIMCCBH`.
- **Public-boundary posture:** Ethereum approval, Ethereum burn, Circle Iris attestation, Stellar mint/forward, ASP insertion, and USDC shield/deposit are public testnet actions. No private-transfer claim is made for the bridge leg.

### Bridge evidence

- **Ethereum Sepolia USDC approval:** `0xb36509d192cf20d7c8dfd60e66044e603af7ae3c09b4118f3be0e0a437fb210e`
  - Explorer: `https://sepolia.etherscan.io/tx/0xb36509d192cf20d7c8dfd60e66044e603af7ae3c09b4118f3be0e0a437fb210e`
- **Ethereum Sepolia CCTP burn:** `0x526f2961da88156fef643e630b92df7a2b35be96e22a6c810927f200f405798f`
  - Explorer: `https://sepolia.etherscan.io/tx/0x526f2961da88156fef643e630b92df7a2b35be96e22a6c810927f200f405798f`
- **Circle Iris sandbox attestation:** complete.
  - Endpoint checked: `https://iris-api-sandbox.circle.com/v2/messages/0?transactionHash=0x526f2961da88156fef643e630b92df7a2b35be96e22a6c810927f200f405798f`
  - `eventNonce`: `0x9e614414d627f63ef264ddb54fcbe17318ea8c16670cdbf8bbe4f690256504e7`
  - `cctpVersion`: `2`
  - `amount`: `1000000` atomic USDC
  - `finalityThresholdExecuted`: `2000`
- **Stellar testnet account funding:** `824dd4d60dbf0a48fc1a620c387a643edb86fc258515090479339a7d5220439e`
  - Explorer: `https://stellar.expert/explorer/testnet/tx/824dd4d60dbf0a48fc1a620c387a643edb86fc258515090479339a7d5220439e`
- **Stellar testnet USDC trustline:** `c99dd78ed13226065a27088ae3b62b37f03a944169e509375c71a6267506efca`
  - Explorer: `https://stellar.expert/explorer/testnet/tx/c99dd78ed13226065a27088ae3b62b37f03a944169e509375c71a6267506efca`
- **Stellar testnet CCTP `mint_and_forward`:** `3af0d0be38b048db1009a59c521ddf191a8c02a5b68047620f27d38949158790`
  - Explorer: `https://stellar.expert/explorer/testnet/tx/3af0d0be38b048db1009a59c521ddf191a8c02a5b68047620f27d38949158790`
- **Public USDC balance proof after mint/before shield:** Horizon account response showed `USDC` balance `1.0000000` from issuer `GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5`.

### Shield evidence

- **ASP membership insertion:** `b42049373d26d0f1120c3c339cae5de5a8870511710ae10625124aee18776a64`
  - ASP contract: `CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP`
  - Explorer: `https://stellar.expert/explorer/testnet/tx/b42049373d26d0f1120c3c339cae5de5a8870511710ae10625124aee18776a64`
- **Separate USDC shield/deposit:** `30dd198bebec377e4589240073fd22d6eb7f5041de0753ddc8f9e856be6b911d`
  - USDC pool: `CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY`
  - Explorer: `https://stellar.expert/explorer/testnet/tx/30dd198bebec377e4589240073fd22d6eb7f5041de0753ddc8f9e856be6b911d`
  - Browser UI reported: proof generated, transaction confirmed.
- **Public USDC balance proof after shield:** Horizon account response showed `USDC` balance `0.0000000`; native XLM balance `9999.9651591`.

### Fixes made during acceptance

- Added CCTP resume from a public burn hash so a page reload during Iris finality does not require a duplicate Ethereum burn.
- Added Stellar testnet destination preparation for CCTP mint/forward: Friendbot funding for missing testnet accounts and signed USDC `changeTrust` before `mint_and_forward`.
- Added an explicit ASP `insert_leaf` action for the permissionless deployed ASP membership contract, because key registration alone does not insert ASP membership.
- Tightened CCTP mint simulation error formatting so the UI no longer dumps giant raw simulation objects.

### Verification

- Focused tests passed for CCTP resume, Stellar destination readiness, ASP insertion blockers, and network config.
- `pnpm --filter @zk-fighter/core typecheck` passed.
- `pnpm --filter @zk-fighter/web typecheck` passed.
- `pnpm --filter @zk-fighter/web lint` passed.
- `pnpm files:check` passed.
- `pnpm docs:check` passed.
- `pnpm secrets:check` passed.
- **Secrets:** no Ethereum private key, Stellar secret key, seed phrase, vault password, key-derivation signature, raw private receive code, or proof witness recorded.

## 2026-06-24 10:27 UTC - Phase 11 WXT extension Chrome runtime smoke

- **Phase:** Phase 11 - WXT extension surface.
- **Kind:** real local Chrome-for-Testing extension runtime check; no chain transaction.
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension output:** `apps/extension/.output/chrome-mv3`.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Why Chrome for Testing:** system Google Chrome `147.0.7727.138` did not load the unpacked extension from command-line flags in the automation harness; Chrome for Testing is the browser used for this automated extension runtime gate.

### Runtime evidence

Command:

- `pnpm extension:runtime`

Result:

```json
{
  "ok": true,
  "extensionId": "ieibjeodkebelbkkdgnmbalcpmphcfkh",
  "chrome": "Chrome/150.0.7871.24",
  "popup": "rendered",
  "sidePanel": "rendered",
  "offscreen": "not-generated",
  "nethermindModule": {
    "runtime": "nethermind-browser-wasm",
    "elapsedMs": 13,
    "proofGenerated": false
  },
  "contentScript": "status-ok-and-signing-rejected"
}
```

### What passed

- WXT `chrome-mv3` build loaded as an unpacked extension in a temporary Chrome-for-Testing profile.
- Popup rendered the Phase 11 readiness UI.
- Side panel rendered the Phase 11 readiness UI.
- Background service worker coordinated offscreen document creation/status.
- Offscreen document initialized the Nethermind browser/WASM module from extension origin.
- Content script answered the status probe on a local HTTP page.
- Content script rejected non-status signing requests with a disabled/in-progress error.

### Still not claimed

- No extension proof generation.
- No passkey ceremony in extension runtime.
- No Freighter-compatible provider or dApp signing compatibility.
- No Chrome Web Store install/package review.

### Verification

- `pnpm --filter @zk-fighter/extension typecheck` passed.
- `pnpm --filter @zk-fighter/extension build` passed.
- `pnpm extension:runtime` passed.
- **Secrets:** no seed phrase, vault password, private key, receive code, proof witness, or browser profile data recorded.

## 2026-06-24 10:01 UTC - Phase 11 WXT extension deep proof runtime acceptance

- **Phase:** Phase 11 - WXT extension surface.
- **Kind:** real local Chrome-for-Testing extension runtime check with testnet Friendbot funding, ASP membership insertion, and dry proof generation.
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension output:** `apps/extension/.output/chrome-mv3`.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Ephemeral public account:** `GCETJEC6HNDOZFFMOGEP6QPY6SOLXP6QVSSMPVYADYJEINR76TV2ZKUL`.
- **Secret posture:** the ephemeral seed phrase was generated inside the extension offscreen document and was not printed, logged, or passed back to Node.

### Testnet setup evidence

- **Friendbot funding transaction:** `7a863b870e2339d9580b8a0b08acc4fe56326f82c84f44519ebe9ce6741d084e`
  - Explorer: `https://stellar.expert/explorer/testnet/tx/7a863b870e2339d9580b8a0b08acc4fe56326f82c84f44519ebe9ce6741d084e`
- **ASP membership insertion:** `20acd7465c4fa640a41876e03c5fc5334e5ba777a749aace48f83898c2034b6f`
  - ASP contract: `CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP`
  - Explorer: `https://stellar.expert/explorer/testnet/tx/20acd7465c4fa640a41876e03c5fc5334e5ba777a749aace48f83898c2034b6f`

### Runtime proof evidence

Command:

- `pnpm extension:runtime:deep`

Result:

```json
{
  "ok": true,
  "extensionId": "ieibjeodkebelbkkdgnmbalcpmphcfkh",
  "friendbot": {
    "hash": "7a863b870e2339d9580b8a0b08acc4fe56326f82c84f44519ebe9ce6741d084e",
    "successful": true
  },
  "userAddress": "GCETJEC6HNDOZFFMOGEP6QPY6SOLXP6QVSSMPVYADYJEINR76TV2ZKUL",
  "aspInsert": {
    "status": "submitted",
    "contractId": "CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP",
    "txHash": "20acd7465c4fa640a41876e03c5fc5334e5ba777a749aace48f83898c2034b6f"
  },
  "dryProofAttempt": {
    "status": "proof-generated",
    "durationMs": 8503,
    "poolContractId": "CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY",
    "proofGenerated": true,
    "submitReached": true
  }
}
```

### What passed

- Temporary Chrome-for-Testing profile loaded the unpacked WXT MV3 extension.
- Extension offscreen document held an ephemeral seed-backed identity without exposing its mnemonic.
- Friendbot funded the public testnet account.
- Extension offscreen runtime submitted ASP `insert_leaf` and observed confirmation.
- Nethermind dry XLM deposit path reached `Proving…`, then `Simulating transaction…`, then the dry-run submit callback.
- No deposit transaction was submitted by the dry proof harness.

### Still not claimed

- No extension passkey ceremony.
- No Freighter-compatible provider or dApp signing compatibility.
- No Chrome Web Store install/package review.

### Verification

- `pnpm --filter @zk-fighter/extension typecheck` passed.
- `pnpm --filter @zk-fighter/extension build` passed.
- `pnpm extension:runtime:deep` passed.
- **Secrets:** no seed phrase, vault password, private key, receive code, proof witness, or browser profile data recorded.

## 2026-06-24 12:44 UTC - Extension public dApp wallet signing acceptance

> **Superseded product direction:** this entry remains local feasibility evidence only. Abu later chose not to make ZK Fighter a general public dApp signing wallet.

- **Phase:** Phase 11 follow-up - Extension Public dApp Wallet Mode.
- **Kind:** local Chrome-for-Testing runtime check; no chain transaction submitted.
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension output:** `apps/extension/.output/chrome-mv3`.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Throwaway public key:** `GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX`.
- **Secret posture:** the harness used the public BIP39 test mnemonic `abandon ... about` and a throwaway password only for local runtime verification. No real user secret or funded account was used.

### Commands

- `pnpm typecheck` passed.
- `pnpm --filter @zk-fighter/extension build` passed.
- `pnpm extension:dapp` passed.
- `pnpm extension:dapp:sign` passed.

### Runtime evidence

`pnpm extension:dapp`:

```json
{
  "ok": true,
  "extensionId": "ieibjeodkebelbkkdgnmbalcpmphcfkh",
  "chrome": "Chrome/150.0.7871.24",
  "dappBridge": {
    "connection": "ready",
    "publicKey": "empty-before-access",
    "requestAccess": "disabled-before-vault",
    "signTransaction": "disabled-before-vault"
  }
}
```

`pnpm extension:dapp:sign`:

```json
{
  "ok": true,
  "extensionId": "ieibjeodkebelbkkdgnmbalcpmphcfkh",
  "chrome": "Chrome/150.0.7871.24",
  "publicKey": "GB3JDWCQJCWMJ3IILWIGDTQJJC5567PGVEVXSCVPEQOTDN64VJBDQBYX",
  "signedXdrVerified": true
}
```

### What passed

- Freighter-style connection and testnet network details returned from the extension.
- No-wallet dApp access/signing failed closed.
- Disabled mode and locked vault states failed closed.
- Approved local dApp received the seed-derived public Stellar address.
- Approved local dApp received a real signed Stellar transaction XDR.
- The signed XDR verified locally against the derived public Stellar key.
- Wrong network, wrong signer, and malformed XDR rejected before signing.

### Still not claimed

- No submitted dApp transaction hash; this was a local signing proof only.
- No Wallets Kit detection/branding proof.
- No Soroban auth-entry signing.
- No SEP-0053 message signing.
- No coexistence proof with Freighter installed.
- No Chrome Web Store install/package review.

## 2026-06-24 16:25 UTC - Extension QuickShield direction and dApp signing lockdown

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** product posture correction and local runtime gate update.
- **Network:** no new chain transaction submitted in this entry.
- **Decision:** ZK Fighter extension is not a Freighter replacement. External public-key access and arbitrary dApp signing are disabled. Internal signing remains available only for ZK Fighter-owned shield, unshield, bridge, and pool actions.

### Code posture

- Removed active `pnpm extension:dapp:sign` script.
- Kept `pnpm extension:dapp` as a detection/network/fail-closed runtime gate.
- Extension side panel now focuses on vault unlock, public deposit plumbing, private `zkf1...` receive code, QuickShield, and web bridge handoff.
- QuickShield submits through the extension offscreen runtime instead of the MV3 background worker.
- Bridge opens the existing web bridge flow with public destination/network context and optional burn-hash resume context.

### Still not claimed

- No external public dApp address provider.
- No external transaction/auth/message signer.
- No Wallets Kit compatibility.
- No extension-native Ethereum bridge provider.
- No new shield transaction hash from this posture update until the updated Chrome runtime gates are run.

## 2026-06-24 16:43 UTC - Extension QuickShield lockdown runtime gates

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** Chrome-for-Testing runtime checks after external dApp signing lockdown.
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Network:** Stellar testnet for Friendbot + ASP insert; local Chrome runtime for extension checks.
- **Secret posture:** the deep proof harness used an ephemeral generated seed in the extension offscreen document. No mnemonic, secret key, vault password, proof witness, or browser profile data was recorded.

### Commands

- `pnpm extension:runtime` passed.
- `pnpm extension:dapp` passed.
- `pnpm extension:runtime:deep` initially hit a Friendbot fetch timeout, then passed on retry.

### Runtime evidence

`pnpm extension:dapp` proved:

```json
{
  "ok": true,
  "dappBridge": {
    "connection": "ready",
    "publicKey": "empty-before-access",
    "requestAccess": "disabled-before-and-after-vault",
    "signTransaction": "disabled-locked-unlocked-and-stale-permission"
  }
}
```

`pnpm extension:runtime:deep` proved:

```json
{
  "ok": true,
  "friendbot": {
    "hash": "95d4a030ab30ceb3dc267a616a38d84d8c178ee372d7fc8099fd29e9a975fa56",
    "successful": true
  },
  "userAddress": "GAFU6WFWTRPHWOK2IFXZPRW6M6YFFJ3VMIT5YG2ZGRYJRZQGEMBYPQBE",
  "aspInsert": {
    "status": "submitted",
    "contractId": "CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP",
    "txHash": "f18a1e7666ef827da5636d810ba26afc4d3808bf8d56a6b2249cbe7b2aaaec17"
  },
  "dryProofAttempt": {
    "status": "proof-generated",
    "poolContractId": "CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY",
    "proofGenerated": true,
    "submitReached": true
  }
}
```

### What passed

- Popup and side panel rendered the extension companion surface.
- Offscreen document loaded the Nethermind browser/WASM runtime.
- Short dry proof smoke reported ASP/indexer blocker honestly instead of claiming success.
- dApp detection/network details responded, while external public-key access and signing stayed disabled before vault, after vault, while locked, and with stale permission records.
- Deep runtime inserted an ASP membership leaf on Stellar testnet and generated a dry XLM deposit proof in extension offscreen runtime.

### Still not claimed

- No real QuickShield deposit transaction hash from the extension UI yet.
- No external public dApp address provider or signer.
- No Wallets Kit compatibility.
- No extension-native Ethereum bridge provider.
- No Chrome Web Store install/package review.

## 2026-06-24 18:59 UTC - Extension signing dead-code cleanup and rerun

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** code cleanup, doc consistency, Chrome runtime rerun.
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Network:** Stellar testnet for Friendbot + ASP insert; local Chrome runtime for extension checks.
- **Secret posture:** the deep proof harness used an ephemeral generated seed in the extension offscreen document. No mnemonic, secret key, vault password, proof witness, or browser profile data was recorded.

### Cleanup evidence

- Removed unused public dApp permission/signing core module and test.
- Removed unused extension approval queue.
- Removed active extension approval/revoke/enable runtime commands.
- Removed stale generated `dist` artifacts for the deleted module.
- Kept only the fail-closed dApp detection/network probe used by `pnpm extension:dapp`.

### Commands

- `pnpm lint` passed.
- `pnpm typecheck` passed.
- `pnpm test` passed.
- `pnpm build` passed.
- `pnpm extension:runtime` passed.
- `pnpm extension:dapp` passed.
- `pnpm extension:runtime:deep` passed.

### Runtime evidence

`pnpm extension:dapp` proved:

```json
{
  "ok": true,
  "dappBridge": {
    "connection": "ready",
    "publicKey": "empty-before-access",
    "requestAccess": "disabled-before-and-after-vault",
    "signTransaction": "disabled-locked-unlocked-and-stale-permission"
  }
}
```

`pnpm extension:runtime:deep` proved:

```json
{
  "ok": true,
  "friendbot": {
    "hash": "bffbc950248c178f2546cbd71239c373538a09baac5bc88937a869fdd10e63d2",
    "successful": true
  },
  "userAddress": "GDOMN4QUGOIBL77UGPQNZ4ZCSQ7X37TOCHG3GEYDX4ZBL6QC6HILZMZB",
  "aspInsert": {
    "status": "submitted",
    "contractId": "CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP",
    "txHash": "b350e2d5230488d7628e5e164c642b1820fc36d5c037fa84b8849a4c8c3300d7",
    "explorerUrl": "https://stellar.expert/explorer/testnet/tx/b350e2d5230488d7628e5e164c642b1820fc36d5c037fa84b8849a4c8c3300d7"
  },
  "dryProofAttempt": {
    "status": "proof-generated",
    "poolContractId": "CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY",
    "proofGenerated": true,
    "submitReached": true
  }
}
```

### Still not claimed

- No real QuickShield deposit transaction hash from the extension UI yet.
- No external public dApp address provider or signer.
- No Wallets Kit compatibility.
- No extension-native Ethereum bridge provider.
- No Chrome Web Store install/package review.

## 2026-06-24 19:18 UTC - Extension QuickShield XLM runtime submit

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** Chrome-for-Testing runtime check for real extension QuickShield submit.
- **Command:** `pnpm extension:quickshield`
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Network:** Stellar testnet.
- **Asset:** XLM.
- **Secret posture:** the harness generated a throwaway seed phrase locally, imported it into an encrypted extension vault in a temporary browser profile, and did not print or store the seed phrase, secret key, vault password, proof witness, or browser profile data.

### Runtime evidence

```json
{
  "ok": true,
  "asset": "XLM",
  "userAddress": "GAQMOLRAGW4RHHDXKYUXKJXSVGEAXJWOKTWAZSQA6AG2NSHGMFGJY5W2",
  "friendbot": {
    "hash": "8e843e09f495d76d8b5f4ec447e06385d2e0e06560f989ee7cec415671f66539",
    "successful": true
  },
  "access": {
    "status": "submitted",
    "contractId": "CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP",
    "txHash": "a63a093009bb9cf337a96f52ceb4e823461e292f035691211bc6994a5f08de90",
    "explorerUrl": "https://stellar.expert/explorer/testnet/tx/a63a093009bb9cf337a96f52ceb4e823461e292f035691211bc6994a5f08de90"
  },
  "quickShield": {
    "status": "submitted",
    "poolContractId": "CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY",
    "txHash": "a66314255cb75f9e15ca6bd5641ec1eeeb6a9419baa1b84890d7003ae78e135b",
    "explorerUrl": "https://stellar.expert/explorer/testnet/tx/a66314255cb75f9e15ca6bd5641ec1eeeb6a9419baa1b84890d7003ae78e135b",
    "proofGenerated": true,
    "submitReached": true,
    "transactionSubmitted": true,
    "signedAuthEntryCount": 0,
    "durationMs": 15569
  },
  "attempts": 1
}
```

### What passed

- The side-panel/runtime import path created a real encrypted extension vault for a throwaway seed-backed wallet.
- Friendbot funded the extension-derived public Stellar address.
- The extension offscreen ASP setup path submitted a public setup transaction.
- The extension offscreen QuickShield path generated a real proof and submitted a public XLM shield/deposit transaction.
- No external dApp public-key access or signing was enabled.

### Still not claimed

- No extension USDC QuickShield runtime hash yet.
- No extension bridge handoff runtime proof yet.
- No external public dApp address provider or signer.
- No Wallets Kit compatibility.
- No extension-native Ethereum bridge provider.
- No Chrome Web Store install/package review.

## 2026-06-24 19:28 UTC - Extension bridge handoff runtime proof

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** Chrome-for-Testing runtime check for extension bridge handoff.
- **Command:** `pnpm extension:bridge`
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Network:** local Chrome runtime; no chain transaction submitted in this entry.
- **Secret posture:** the harness generated a throwaway seed phrase locally, imported it into an encrypted extension vault in a temporary browser profile, and did not print or store the seed phrase, secret key, vault password, or browser profile data.

### Runtime evidence

```json
{
  "ok": true,
  "publicKey": "GBR3PRKDGEJOF4GBYMFAS2UYUORVCMUH3HY2ZI6WHXQAKZ4VCZ7PIAOO",
  "returnedUrl": "http://localhost:5173/?zkfAction=bridge&network=testnet&destination=GBR3PRKDGEJOF4GBYMFAS2UYUORVCMUH3HY2ZI6WHXQAKZ4VCZ7PIAOO&resumeBurnHash=0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc",
  "openedTabUrl": "http://localhost:5173/?zkfAction=bridge&network=testnet&destination=GBR3PRKDGEJOF4GBYMFAS2UYUORVCMUH3HY2ZI6WHXQAKZ4VCZ7PIAOO&resumeBurnHash=0xcccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc"
}
```

### What passed

- The extension bridge handoff action required an unlocked extension vault.
- The returned handoff URL contained `zkfAction=bridge`, `network=testnet`, the extension-derived public Stellar destination, and the resume burn hash.
- Chrome opened a real tab at that same web bridge URL.
- No injected Ethereum provider was assumed inside the extension page.

### Still not claimed

- No extension-native Ethereum bridge provider.
- No extension-native CCTP burn/approval prompt.
- No external public dApp address provider or signer.
- No Wallets Kit compatibility.
- No Chrome Web Store install/package review.

## 2026-06-24 20:19 UTC - Extension QuickShield USDC receive setup and funding wait

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** Chrome-for-Testing runtime check for extension USDC receive/trustline preparation before QuickShield.
- **Command:** `ZKF_QUICKSHIELD_ASSET=USDC ZKF_QUICKSHIELD_USDC_WAIT_MS=1440000 pnpm extension:quickshield`
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Network:** Stellar testnet.
- **Asset:** USDC.
- **Prepared public account:** `GABY6AAACU24J3N7MXEL4GD3J4WC54BTGWQOF3Q22ST2K4Y7LLK3GCE4`.
- **Secret posture:** the harness generated a throwaway seed phrase locally, imported it into an encrypted extension vault in a temporary browser profile, and did not print or store the seed phrase, secret key, vault password, proof witness, or browser profile data.

### Runtime evidence

```json
{
  "account": "GABY6AAACU24J3N7MXEL4GD3J4WC54BTGWQOF3Q22ST2K4Y7LLK3GCE4",
  "friendbotTx": "cda3ca38cab02f75631fa34e0e9f5645d72d0cd4b5da0589d107d68fa29484e1",
  "trustlineTx": "258d671b27b36196d6b0d31a94a686bb07251ea2ceba5db654879383d7555adc",
  "usdcIssuer": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "usdcBalance": "0.0000000"
}
```

### What passed

- The extension runtime imported a throwaway seed-backed vault and derived the public Stellar account.
- Friendbot funded the public account for reserve XLM.
- The new internal extension USDC receive preparation action created a public USDC trustline.
- Horizon confirmed the account has the USDC trustline.
- External dApp public-key access and signing stayed disabled.

### Current blocker

- The harness timed out waiting for at least `1.0000000` testnet USDC on `GABY6AAACU24J3N7MXEL4GD3J4WC54BTGWQOF3Q22ST2K4Y7LLK3GCE4`.
- Final observed USDC balance was `0.0000000`.
- No extension USDC QuickShield submit hash is claimed yet. The next evidence target is a real USDC shield/deposit transaction after the prepared public account is funded.

## 2026-06-24 20:31 UTC - Extension offscreen deep proof rerun after USDC prep patch

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** Chrome-for-Testing deep extension runtime proof gate after USDC prep/runtime cleanup.
- **Command:** `pnpm extension:runtime:deep`
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Network:** Stellar testnet.
- **Secret posture:** the harness generated a throwaway seed phrase locally and did not print or store the seed phrase, secret key, vault password, or proof witness.

### Runtime evidence

```json
{
  "ok": true,
  "friendbot": {
    "hash": "02522ebbdbaccf3cbc76b431e710f205fb4081affde9ffd37688bfc814c8b224",
    "successful": true
  },
  "userAddress": "GDNZGFM6QYZAYO7ZKQ74ZTY46LJPJDDRRTRI5CSUGVD5QLGFQAPMHQ7P",
  "aspInsert": {
    "status": "submitted",
    "contractId": "CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP",
    "txHash": "a54ce115d167c00620b21d4cbb84f89cb078d4884cb0adf428a5808ff6741568"
  },
  "dryProofAttempt": {
    "status": "proof-generated",
    "poolContractId": "CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY",
    "proofGenerated": true,
    "submitReached": true
  }
}
```

## 2026-06-25 07:28 UTC - Extension QuickShield USDC funding wait rerun

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** Chrome-for-Testing runtime check for extension USDC receive/trustline preparation before QuickShield.
- **Command:** `pnpm extension:quickshield:usdc`
- **Network:** Stellar testnet.
- **Asset:** USDC.
- **Prepared public account:** `GAZWHZPJOJYSN3XVSXING7G6DVNELFLZFNPGWNJDBEQI2I6QMUUAZ6E3`.
- **Secret posture:** the harness generated a throwaway seed phrase locally, imported it into an encrypted extension vault in a temporary browser profile, and did not print or store the seed phrase, secret key, vault password, proof witness, or browser profile data. The temporary profile was discarded after timeout.

### Runtime evidence

```json
{
  "account": "GAZWHZPJOJYSN3XVSXING7G6DVNELFLZFNPGWNJDBEQI2I6QMUUAZ6E3",
  "friendbotTx": "5f16ed6e04611fb28dc8807c85787d5ca9987d4d2e41d9fe5459995aca21006e",
  "trustlineTx": "278bbae81c28c71bc211e2972eff79017c2d699ba048951833be26c6b17beef4",
  "usdcIssuer": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "usdcBalance": "0.0000000"
}
```

### What passed

- The extension runtime imported a throwaway seed-backed vault and derived the public Stellar account.
- Friendbot funded the public account for reserve XLM.
- The internal extension USDC receive preparation action created a public USDC trustline.
- Horizon confirmed the account has the USDC trustline and no USDC balance.

### Current blocker

- The harness timed out waiting for at least `1.0000000` testnet USDC on `GAZWHZPJOJYSN3XVSXING7G6DVNELFLZFNPGWNJDBEQI2I6QMUUAZ6E3`.
- Final observed USDC balance was `0.0000000`.
- Do not fund this timed-out address now; the temporary profile was discarded. Rerun `pnpm extension:quickshield:usdc` and fund the freshly printed address while the harness is alive.

## 2026-06-25 07:58 UTC - Persistent local testnet USDC funder setup

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** Reusable local testnet USDC funding wallet for extension harnesses.
- **Command:** `pnpm testnet-usdc-funder:setup`, then `pnpm extension:quickshield:usdc`
- **Network:** Stellar testnet.
- **Asset:** USDC.
- **Reusable funder public account:** `GAH5VPZPGG5QCNTZEYFK6KHXTBELEQ3BYGZAIP4FRNKVZ7LIHY7S7UIJ`.
- **Local wallet path:** `/Users/abu/.config/zk-fighter/testnet-usdc-funder.json`.
- **Secret posture:** the Stellar testnet secret for this reusable funder is stored outside the repo with local file permissions; it is not printed and is not scanned into source control. Use it only for testnet funding automation.

### Runtime evidence

```json
{
  "account": "GAH5VPZPGG5QCNTZEYFK6KHXTBELEQ3BYGZAIP4FRNKVZ7LIHY7S7UIJ",
  "friendbotTx": "a70e2af9fe83b19a3f1cf4f0fb468e101d9560f8d99a0f6d6166e6c72d3b44e1",
  "trustlineTx": "9865511b6e57101563dc1ab574cc997ea8559210cf5718a39d11a8f003a9cbf8",
  "usdcIssuer": "GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5",
  "usdcBalance": "0.0000000"
}
```

### What passed

- The reusable local funder account was created and Friendbot-funded for XLM reserve.
- The reusable funder created a public USDC trustline.
- `pnpm extension:quickshield:usdc` now waits on this reusable funder and will auto-transfer USDC into the fresh extension harness address once the funder has enough balance.
- Main gates passed after the funder code was added: `pnpm lint`, `pnpm typecheck`, `pnpm test`, and `pnpm build`.

### Current blocker

- The reusable funder timed out with `0.0000000` testnet USDC.
- Fund `GAH5VPZPGG5QCNTZEYFK6KHXTBELEQ3BYGZAIP4FRNKVZ7LIHY7S7UIJ` with Stellar testnet USDC once, then rerun `pnpm extension:quickshield:usdc`.

## 2026-06-25 08:59 UTC - Extension QuickShield USDC runtime submit

- **Phase:** Phase 11 follow-up - Extension QuickShield and bridge companion.
- **Kind:** Chrome-for-Testing runtime check for real extension USDC QuickShield submit.
- **Command:** `pnpm extension:quickshield:usdc`
- **Browser:** Chrome for Testing `150.0.7871.24`, temporary profile.
- **Extension ID in temporary profile:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **Network:** Stellar testnet.
- **Asset:** USDC.
- **Reusable funder:** `GAH5VPZPGG5QCNTZEYFK6KHXTBELEQ3BYGZAIP4FRNKVZ7LIHY7S7UIJ`.
- **Extension harness account:** `GBKZBDQE43NMIFDW4B7C4NQCN2JPXQEDM5XNBLL7UTSAZE5Q3ATE5SZV`.
- **Secret posture:** the harness generated a throwaway extension seed phrase locally, imported it into an encrypted extension vault in a temporary browser profile, and did not print or store the seed phrase, secret key, vault password, proof witness, or browser profile data. The reusable funder secret remains outside the repo at `/Users/abu/.config/zk-fighter/testnet-usdc-funder.json`.

### Runtime evidence

```json
{
  "ok": true,
  "asset": "USDC",
  "userAddress": "GBKZBDQE43NMIFDW4B7C4NQCN2JPXQEDM5XNBLL7UTSAZE5Q3ATE5SZV",
  "friendbot": {
    "hash": "7138cb24534a47ff8e6605347e2a6e469b8ecb058f0b0a30e162d18ea3ce8de1",
    "successful": true
  },
  "usdcReceive": {
    "status": "created",
    "txHash": "a493a22cf25d7d823c8be8e003b4f2a451a8f49ceed01c5891ed80cab4eed38e"
  },
  "usdcFunding": {
    "status": "sent",
    "funderPublicKey": "GAH5VPZPGG5QCNTZEYFK6KHXTBELEQ3BYGZAIP4FRNKVZ7LIHY7S7UIJ",
    "destination": "GBKZBDQE43NMIFDW4B7C4NQCN2JPXQEDM5XNBLL7UTSAZE5Q3ATE5SZV",
    "amount": "1.0000000 USDC",
    "txHash": "b8b17c66909ad24d6986408badacfc6986051c281a44a54e9c30d1e4243098cf"
  },
  "access": {
    "status": "submitted",
    "contractId": "CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP",
    "txHash": "4fdc92e9df466d506a3e0c0237f2fd87eddbe65a788a260efaed78b8511b2cfa"
  },
  "quickShield": {
    "status": "submitted",
    "poolContractId": "CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY",
    "txHash": "0bc63cf0b7212d961d880acae3a3b72ae939e2a0fdf65c538b828684f6010e17",
    "proofGenerated": true,
    "submitReached": true,
    "transactionSubmitted": true,
    "durationMs": 19356
  },
  "attempts": 1
}
```

### What passed

- Abu funded the reusable local testnet USDC funder with `20.0000000` Stellar testnet USDC.
- The harness auto-transferred `1.0000000` USDC from the reusable funder into the fresh extension account.
- The extension account created its public USDC trustline and received the real public USDC balance.
- The harness explicitly unlocked the extension vault after the long funding wait to recover from Chrome background in-memory state loss.
- ASP setup submitted on-chain.
- The extension offscreen QuickShield path generated a real USDC proof and submitted a public USDC shield/deposit transaction.
- External dApp public-key access and signing stayed disabled.
- Reusable funder balance after this run: `18.0000000 USDC`.

### Failure fixed during this run

- An earlier funded run sent `1.0000000` USDC to temporary account `GCBEF26GYDS3QEDSCSQP5UAOWASWTQGQTF5CIH3IPM3DZL7A4TI6K4AX` with tx `09e9638c2e1ccb4835863a45c83963fee66e5b9bf8bb42ee7969eaf9077dc74e`, then failed with `Unlock ZK Fighter before shielding`.
- Root cause: Chrome dropped the background runtime's in-memory unlocked mnemonic after the long funding wait.
- Fix: `scripts/check-extension-quickshield.mjs` now explicitly unlocks the stored extension vault after funding waits and again before shield submission.

## 2026-06-25 11:08 UTC - Mainnet public USDC plumbing proof

- **Phase:** Mainnet readiness.
- **Kind:** Real mainnet public-account funding, USDC trustline creation, and tiny XLM-to-USDC path-payment proof.
- **Network:** Stellar mainnet.
- **QA public account:** `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`.
- **Secret posture:** the local Stellar CLI identity alias is `zkf-mainnet-qa`; the seed/secret was not printed and remains outside the repo at `/Users/abu/.config/stellar/identity/zkf-mainnet-qa.toml`.
- **Mainnet USDC issuer:** `GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN`.
- **Mainnet USDC SAC:** `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`.

### Funding verification

- Abu funded the QA account with `10.0000000 XLM`.
- Horizon account lookup confirmed the account exists on mainnet with native balance `10.0000000 XLM` before the trustline transaction.

### USDC trustline

- **Transaction hash:** `ca4fe0556c8a71c32c4634c3e8ad282a230e71377c6d7771e50daced7aeb4ef7`.
- **Explorer:** `https://stellar.expert/explorer/public/tx/ca4fe0556c8a71c32c4634c3e8ad282a230e71377c6d7771e50daced7aeb4ef7`.
- **Ledger:** `63190637`.
- **Result:** successful.
- **Post-trustline balances:**
  - XLM: `9.9999900`.
  - USDC: `0.0000000`, authorized.

### Tiny XLM-to-USDC swap

- **Operation:** `path_payment_strict_send`.
- **Source account:** `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`.
- **Destination account:** `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`.
- **Sent:** `1.0000000 XLM`.
- **Received:** `0.1817950 USDC`.
- **Path used:** `SIG:G...ODSIG` intermediate path from Horizon strict-send quote.
- **Transaction hash:** `439b8b609c03ab890da55912529b767eeb6974128d9c9afbdf860416f9ecefae`.
- **Explorer:** `https://stellar.expert/explorer/public/tx/439b8b609c03ab890da55912529b767eeb6974128d9c9afbdf860416f9ecefae`.
- **Ledger:** `63190644`.
- **Result:** successful.
- **Final balances after swap:**
  - XLM: `8.9999800`.
  - USDC: `0.1817950`.

### What this proves

- ZK Fighter's recorded mainnet USDC issuer/SAC facts are usable against a real funded mainnet account.
- A mainnet account can be funded, configured with a USDC trustline, and receive real USDC via a public Stellar DEX path payment.
- This is public mainnet plumbing only. It does not prove mainnet shielded-pool support, because no mainnet XLM/USDC privacy pool is deployed/configured yet.

### Still not claimed at this timestamp

- No mainnet CCTP bridge transaction.
- No mainnet privacy-pool deployment.
- No mainnet shield/deposit, shielded transfer, or unshield/withdraw.
- No mainnet bridge-to-shield flow.

## 2026-06-25 11:18 UTC - Mainnet privacy-pool deployment funding check

- **Phase:** Mainnet shielded-pool deployment readiness.
- **Kind:** Real mainnet upload attempt plus decoded fee/rent estimates.
- **Network:** Stellar mainnet.
- **QA public account:** `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`.
- **Secret posture:** the local Stellar CLI identity alias is `zkf-mainnet-qa`; the seed/secret was not printed and remains outside the repo at `/Users/abu/.config/stellar/identity/zkf-mainnet-qa.toml`.
- **RPC:** `https://mainnet.sorobanrpc.com`.
- **Network passphrase:** `Public Global Stellar Network ; September 2015`.

### What was attempted

- Tried to upload the reference `asp_membership.wasm` to mainnet with:
  - `stellar contract upload --wasm reference/stellar-private-payments/target/stellar/asp_membership.wasm --source-account zkf-mainnet-qa --rpc-url https://mainnet.sorobanrpc.com --network-passphrase 'Public Global Stellar Network ; September 2015' --cost`
- The transaction simulated and signed locally, then mainnet submission failed before inclusion:
  - **Local signed transaction hash:** `d73269bbd5d238ab57fb6757dd93ae91f387c9064cd6ee0a2e80dbcb862f431b`
  - **Submission result:** `TxInsufficientBalance`
  - **Ledger:** none; not accepted on-chain.
- Horizon balance after the failed attempt stayed unchanged:
  - XLM: `8.9999800`
  - USDC: `0.1817950`

### Artifact hashes and decoded upload estimates

These are upload/install estimates only. They do not include contract-instance deployment, pool setup, ASP insertion, or any shield transaction.

| Artifact | SHA-256 | Fee estimate |
|---|---:|---:|
| `asp_membership.wasm` | `e9efa31e13da7dbd92dabf4cd9d6653be3d48efb83498f1d7209a2d6772e664a` | `245974972` stroops / `24.5974972 XLM` |
| `asp_non_membership.wasm` | `6eb010fb5779d83a858e6fc6a42679936c93e1c6aa243425eb32257231d63b8a` | `475603573` stroops / `47.5603573 XLM` |
| `circom_groth16_verifier.wasm` | `81a63040ecac6ad5c8d8441fe1cbd809184b6e47e4c559bf73d06268b0683c49` | `64875743` stroops / `6.4875743 XLM` |
| `pool.wasm` | `28c2cfaab1506d1d74d883cd1de3527d2d938c9f85ac4a6eacbfa199cc78c674` | `356011708` stroops / `35.6011708 XLM` |

- **Total upload estimate:** `1142465996` stroops / `114.2465996 XLM`.
- **Current funded balance:** `8.9999800 XLM`.
- **Practical funding need:** at least `130 XLM` to cover uploads plus instance deployments and small runtime tests; `150 XLM` gives safer buffer for failed attempts, rent variance, and a tiny shield deposit.

### Conclusion at this timestamp

- Mainnet pool deployment is technically on the right path, but blocked by insufficient funded XLM.
- No mainnet privacy-pool contract was uploaded, deployed, or configured.
- At this timestamp, ZK Fighter had to keep mainnet shielded pools marked `pending-deployment` until funding was topped up, contracts were deployed, and a real mainnet shield test recorded accepted transaction hashes.
- Superseded by the later `2026-06-25 13:05 UTC` entry after Abu topped up the QA account and mainnet deployment/testing succeeded.

## 2026-06-25 13:05 UTC - Mainnet privacy-pool deployment and extension XLM QuickShield

- **Phase:** Mainnet shielded-pool deployment and extension runtime proof.
- **Kind:** Real mainnet WASM uploads, contract deployments, ASP permission toggle, and Chrome-for-Testing extension QuickShield XLM submit.
- **Network:** Stellar mainnet.
- **QA public account:** `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`.
- **Secret posture:** local Stellar CLI identity alias `zkf-mainnet-qa`; secret/seed not printed and stored outside the repo.
- **RPC:** `https://mainnet.sorobanrpc.com`.
- **Network passphrase:** `Public Global Stellar Network ; September 2015`.

### Mainnet WASM uploads

| Artifact | Wasm hash | Transaction | Ledger |
|---|---|---|---:|
| `asp_membership.wasm` | `e9efa31e13da7dbd92dabf4cd9d6653be3d48efb83498f1d7209a2d6772e664a` | `d73269bbd5d238ab57fb6757dd93ae91f387c9064cd6ee0a2e80dbcb862f431b` | `63190905` |
| `asp_non_membership.wasm` | `6eb010fb5779d83a858e6fc6a42679936c93e1c6aa243425eb32257231d63b8a` | `b98df1c7755c87be4ed7cb7fe189f45318940d4b53693665cfd35e0e7b8a102f` | `63190928` |
| `circom_groth16_verifier.wasm` | `81a63040ecac6ad5c8d8441fe1cbd809184b6e47e4c559bf73d06268b0683c49` | `ba498003cd0939218819b3d025318c9cdd0e562e2b10fbb292a8280fc13822b3` | `63190934` |
| `pool.wasm` | `28c2cfaab1506d1d74d883cd1de3527d2d938c9f85ac4a6eacbfa199cc78c674` | `c5ef4c4f67749a28137216451cc5e8f2a9a5801d4f4860f6ff1179316f5d0cf0` | `63190957` |

### Mainnet contract deployments

| Contract | ID | Transaction | Ledger |
|---|---|---|---:|
| ASP membership | `CCYY3LLTVD2UW3Z4QD76PICZNIUH3PXKWJSKJVAENBIYON7QVAQIW5PP` | `6e7038f81c3a6d41c7913c7481f7c7cd9d219e2c48e7320e425edd388f34d907` | `63190988` |
| ASP non-membership | `CBCTBWDS5BXW6NW72763DEIOF5PXDI2FBWK6EESJLHLNMXP5BLN4M2TP` | `0c5267f6b739b516bea2beb098bf1b34de523f48078eaa70196f9db5fd2ad311` | `63191004` |
| Verifier | `CD5CIDDHT56FUWK6SBDTAWIA435GAVOWZ6TISQ4KXJ5WN5FIHV5EXIG6` | `61a8748a56cd2c71080774e5f326f3956d7fb53d978223e69403842b80852b7b` | `63191012` |
| XLM pool | `CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE` | `7b0b89d8bb798c1db85ed3b4727aeca7614adc787eb5e3ff2231cc75116afd10` | `63191069` |
| USDC pool | `CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7` | `78723afbb9bda65e154f53334d8a5441c38de533c0e07f066fa890cb5ea1647f` | `63191078` |

- **XLM pool token SAC:** `CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`.
- **USDC pool token SAC:** `CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`.
- `packages/core/src/networks.ts` now configures both mainnet pool IDs and marks both shielded pools enabled.

### ASP permission fix

- The mainnet ASP membership contract defaulted to admin-only leaf insertion.
- Extension QuickShield needs the same permissionless ASP insertion posture used by the testnet demo path.
- Admin toggle transaction:
  - **Function:** `set_admin_insert_only(false)`.
  - **Transaction hash:** `2585feaadbaa0b201bf52522bddecdc687b6d3512a9fd6f2a8ac2613484d2e7a`.
  - **Explorer:** `https://stellar.expert/explorer/public/tx/2585feaadbaa0b201bf52522bddecdc687b6d3512a9fd6f2a8ac2613484d2e7a`.
  - **Ledger:** `63191800`.
  - **Result:** successful.

### Extension QuickShield XLM mainnet smoke

- **Harness:** `ZKF_QUICKSHIELD_NETWORK=mainnet ZKF_QUICKSHIELD_ASSET=XLM ZKF_QUICKSHIELD_AMOUNT_STROOPS=1000000 ZKF_MAINNET_FUND_STROOPS=50000000 pnpm extension:quickshield`.
- **Extension runtime:** Chrome-for-Testing WXT MV3 extension with offscreen Nethermind browser/WASM prover.
- **Persistent smoke wallet:** `GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32`.
- **Persistent mnemonic storage:** outside repo at `/Users/abu/.config/zk-fighter/mainnet-quickshield-smoke.json`, file mode `0600`.
- **Funding top-up:** `55bd4b75681d09861108c7ced81cf6d7dfee21a45260f3c6188caa4c696b77ab`.
- **ASP membership insert:** `8afa10dbcf6c82ba56f0f0abf96d00e5af55190f9a985aecc52147c34271c3ce`.
- **XLM QuickShield shield/deposit:** `269f09422639580ff3b5642b03a02a24c9e20c63dae12507b005352ba4545179`.
- **Explorer:** `https://stellar.expert/explorer/public/tx/269f09422639580ff3b5642b03a02a24c9e20c63dae12507b005352ba4545179`.
- **Ledger:** `63191847`.
- **Amount:** `0.1000000 XLM`.
- **Proof generated:** yes.
- **Submit reached:** yes.
- **Transaction submitted:** yes.
- **Duration:** `15,735 ms`.
- **Final observed smoke-wallet native balance:** `4.8099393 XLM`.

### Failure fixed during this run

- A first mainnet extension smoke funded a disposable Chrome-profile account, then failed because the bundled Nethermind browser runtime still used testnet deployment constants. That disposable account is not counted as reusable evidence.
- The Nethermind browser WASM artifacts were rebuilt/staged with mainnet deployment selection, then the extension was rebuilt.
- A later submit attempt produced hash `9517af6322763e3ee637e6a108357861fcf75af2c4f56ab1b687e7c8fa59f2e8`, but direct RPC/Horizon lookups returned `NOT_FOUND`; it is not counted as evidence.
- Root cause: `sendTransaction` can return `TRY_AGAIN_LATER` with a hash, and the submit helper treated any hash as accepted.
- Fix: `packages/core/src/soroban-submit.ts` now retries `TRY_AGAIN_LATER` submit responses before confirmation polling, with unit coverage in `packages/core/src/soroban-submit.test.ts`.

### Mainnet claims allowed at this timestamp

- Mainnet XLM/USDC privacy-pool contracts are deployed and configured.
- Mainnet XLM QuickShield has real extension-runtime proof and accepted transaction evidence.
- Mainnet USDC pool is deployed/configured, but a mainnet USDC QuickShield transaction is not yet recorded at this timestamp.
- At this timestamp, mainnet shielded transfer, unshield/withdraw, CCTP bridge-to-shield, and atomic bridge-and-shield were still not claimed.

## 2026-06-25 13:16 UTC - Mainnet extension USDC QuickShield

- **Phase:** Mainnet extension runtime proof.
- **Kind:** Real mainnet USDC trustline setup, funding, ASP insert, and Chrome-for-Testing extension QuickShield USDC submit.
- **Network:** Stellar mainnet.
- **QA public account:** `GB3VMAPRJDHLRG2VKNCUUNOPBKJAAZCELU5TIF4QVPCTMYO5TGECGLVM`.
- **Smoke wallet:** `GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32`.
- **Secret posture:** local QA identity and smoke wallet recovery phrase remained outside the repo.
- **Harness:** `ZKF_QUICKSHIELD_NETWORK=mainnet ZKF_QUICKSHIELD_ASSET=USDC pnpm extension:quickshield`.
- **Amount:** `0.0100000 USDC`.

### Transactions

| Step | Transaction | Ledger | Result |
|---|---|---:|---|
| XLM top-up for smoke wallet fees/reserve | `6a6d490bd0a9efe70f0156c3d362cea004cf7f6c440c6ea8f538bcba03e8c6d4` | `63191954` | successful |
| Public USDC trustline setup | `1acef069110b3015b72c8ad5df13b9647480e3af952188581921e56cfae555e5` | `63191955` | successful |
| Public USDC funding transfer | `8581307efcb3ad4f1ed9b9789f595cf6c1a44018dc62432d6372b4463adcd658` | `63191956` | successful |
| ASP membership insert | `84c33d8ff7798a5be616b0c402265be9cbd9518674dd75f00443cfdc1e56d65c` | `63191957` | successful |
| USDC QuickShield shield/deposit | `a3fb0596b7cf5d79f093dcca9ff4faa6c5975499a1d36afdcf1a893f554aedcb` | `63191960` | successful |

- **USDC pool:** `CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7`.
- **Proof generated:** yes.
- **Submit reached:** yes.
- **Transaction submitted:** yes.
- **Duration:** `17,775 ms`.
- **Final observed smoke-wallet balances:**
  - XLM: `4.9096950`.
  - USDC: `0.0000000` public balance after shielding.
- **Final observed QA balances:**
  - XLM: `76.8320587`.
  - USDC: `0.1717950`.

### Current mainnet claims allowed

- Mainnet XLM and USDC QuickShield both have real extension-runtime proof and accepted mainnet transaction evidence.
- At this timestamp, mainnet shielded transfer, unshield/withdraw, CCTP bridge-to-shield, and atomic bridge-and-shield were still not claimed.

## 2026-06-25 13:35 UTC - Mainnet extension XLM shielded transfer and unshield

- **Phase:** Mainnet private-loop runtime proof.
- **Kind:** Real mainnet shielded XLM transfer and public XLM unshield/withdraw through the Chrome-for-Testing extension offscreen prover.
- **Network:** Stellar mainnet.
- **Smoke wallet:** `GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32`.
- **Secret posture:** smoke wallet recovery phrase remained outside the repo at `/Users/abu/.config/zk-fighter/mainnet-quickshield-smoke.json`.
- **Harness:** `pnpm extension:private-loop:mainnet`.
- **Pool:** `CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE`.

### Transactions

| Step | Amount | Transaction | Ledger | Result |
|---|---:|---|---:|---|
| Shielded XLM transfer to the smoke wallet's own private receive code | `0.0100000 XLM` | `5a1523cfe48c3cab8adca44ca1d6518585b8d5bfa20afa8e2372f59fdb2548cd` | `63192150` | successful |
| Public XLM unshield/withdraw back to the smoke wallet address | `0.0050000 XLM` | `df5440dd80e45daf7068c66fa225a20f8167c686244ee084268df8db3f4e1a70` | `63192156` | successful |

- **Transfer proof generated:** yes.
- **Transfer submit reached:** yes.
- **Transfer duration:** `15,335 ms`.
- **Withdraw proof generated:** yes.
- **Withdraw submit reached:** yes.
- **Withdraw duration:** `14,900 ms`.
- **Final observed smoke-wallet public balances:**
  - XLM: `4.8218337`.
  - USDC: `0.0000000`.

### Failure fixed during this run

- The first private-transfer attempt failed before submit with `no spendable notes`.
- Root cause: the private transfer/withdraw path did not call `syncPoolEvents()` before asking Nethermind for spendable local notes in a fresh Chrome profile.
- Fix: `packages/core/src/xlm-private.ts` now syncs pool events before `executeTransfer` and `executeWithdraw`.
- A later transfer attempt reached submit and got an RPC `ERROR` without an accepted hash. It is not counted as evidence. The submit helper now preserves richer RPC failure details when available.

### Current mainnet claims allowed

- Mainnet XLM has full extension-runtime evidence for QuickShield, shielded transfer, and public unshield/withdraw.
- At this timestamp, mainnet USDC had QuickShield evidence only; mainnet USDC shielded transfer and unshield/withdraw were still not claimed.
- Mainnet CCTP bridge-to-shield and atomic bridge-and-shield are still not claimed.

## 2026-06-25 15:08 UTC - Mainnet extension USDC shielded transfer and unshield

- **Phase:** Mainnet private-loop runtime proof.
- **Kind:** Real mainnet shielded USDC transfer and public USDC unshield/withdraw through the Chrome-for-Testing extension offscreen prover.
- **Network:** Stellar mainnet.
- **Smoke wallet:** `GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32`.
- **Secret posture:** smoke wallet recovery phrase remained outside the repo at `/Users/abu/.config/zk-fighter/mainnet-quickshield-smoke.json`.
- **Harness:** `ZKF_PRIVATE_LOOP_ASSET=USDC ZKF_PRIVATE_LOOP_TIMEOUT_MS=90000 ZKF_PRIVATE_LOOP_RUNTIME_TIMEOUT_MS=120000 pnpm extension:private-loop:mainnet`.
- **Pool:** `CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7`.

### Transactions

| Step | Amount | Transaction | Ledger | Result |
|---|---:|---|---:|---|
| Shielded USDC transfer to the smoke wallet's own private receive code | `0.0050000 USDC` | `5317b8266ef93b84a6ab9f40eb5b157c5838b6b9a0826d60a6d6daf36a221aa1` | `63193096` | successful |
| Public USDC unshield/withdraw back to the smoke wallet address | `0.0010000 USDC` | `2dd8955cd57aa35b46a0ac944380afb12ac1b82da44f8cf8ab6a9d283064531b` | `63193101` | successful |

- **Transfer proof generated:** yes.
- **Transfer submit reached:** yes.
- **Transfer duration:** `12,464 ms`.
- **Withdraw proof generated:** yes.
- **Withdraw submit reached:** yes.
- **Withdraw duration:** `11,748 ms`.
- **Final observed smoke-wallet public balances:**
  - XLM: `4.7289441`.
  - USDC: `0.0010000`.

### Failure fixed during this run

- The first USDC private-loop harness attempt hung without returning a JSON result and did not submit a new transaction. Horizon account history showed no new smoke-wallet transactions after the prior XLM loop.
- Root cause: the CDP `chrome.runtime.sendMessage(...)` evaluation had no outer timeout, so a stalled extension response could keep Node and Chrome alive indefinitely.
- Fix: `scripts/check-mainnet-private-loop.mjs` now wraps runtime-message evaluation with `ZKF_PRIVATE_LOOP_RUNTIME_TIMEOUT_MS`, defaulting to the private-action timeout plus `60,000 ms`.
- The bounded rerun succeeded and produced the two accepted hashes above.

### Current mainnet claims allowed

- Mainnet XLM and USDC both have full extension-runtime evidence for QuickShield, shielded transfer, and public unshield/withdraw.
- Mainnet CCTP bridge-to-shield and atomic bridge-and-shield are still not claimed.

## 2026-06-25 13:21 UTC - Final extension runtime deep-proof gate rerun

- **Phase:** Verification gate after mainnet QuickShield changes.
- **Kind:** Chrome-for-Testing extension deep runtime proof rerun.
- **Network:** Stellar testnet.
- **Command:** `pnpm extension:runtime:deep`.
- **Friendbot hash:** `03bc614e4788083ab4a0acb3e6361d0f9e90cef9b70a8cf5ad8e42c48c97ee63`.
- **Runtime user address:** `GCCLEOW3BMDNSXXL75VWWBJOQ5CFMIJCQJBKINOZKX2EHZP5EQJRBG6S`.
- **ASP insert:** `be396a79c46b2252ff919050dbd52fc4deb219559f6e0d8f576be8a2eb341fd7`.
- **Dry proof status:** `proof-generated`.
- **Proof duration:** `9,912 ms`.
- **Submit reached:** yes, in dry-proof callback only; no shield/deposit transaction is claimed from this gate.

## 2026-06-25 13:43 UTC - Final extension runtime deep-proof gate rerun

- **Phase:** Verification gate after mainnet private-loop changes.
- **Kind:** Chrome-for-Testing extension deep runtime proof rerun.
- **Network:** Stellar testnet.
- **Command:** `pnpm extension:runtime:deep`.
- **Friendbot hash:** `1ed406f0995ce6768826e3013f950625d73685a41c6159b58d117f86f83f1074`.
- **Runtime user address:** `GBQMJREPOYT2S5DPETVQIWGMOPRLDRXGLSMIZAHLY3ERZMMHCLGHGJHG`.
- **ASP insert:** `b6e76d20fa231f79613034c57d6241154b35d6484d4e4a682ac83b462a4b3a57`.
- **Dry proof status:** `proof-generated`.
- **Proof duration:** `11,355 ms`.
- **Submit reached:** yes, in dry-proof callback only; no shield/deposit transaction is claimed from this gate.

## 2026-06-25 15:13 UTC - Final extension runtime deep-proof gate rerun

- **Phase:** Verification gate after mainnet USDC private-loop changes.
- **Kind:** Chrome-for-Testing extension deep runtime proof rerun.
- **Network:** Stellar testnet.
- **Command:** `pnpm extension:runtime:deep`.
- **Friendbot hash:** `c109f485a395426bf76193d07557ae18d65232120e8a94dd20dfccd8bcdc8c45`.
- **Runtime user address:** `GA3RGU5UNJJKNYYZEFIGU444VGUNLKVNJPGG3VTACOWFAAJMYBMHDJ7V`.
- **ASP insert:** `ed79924a11706bbe5af8694df36bd03400bbe759691325dfd2e9b4ee1b578931`.
- **Dry proof status:** `proof-generated`.
- **Proof duration:** `8,780 ms`.
- **Submit reached:** yes, in dry-proof callback only; no shield/deposit transaction is claimed from this gate.

## 2026-06-25 16:04 UTC - Extension runtime deep-proof gate after multichain bridge source selector

- **Phase:** Verification gate after adding EVM CCTP source-chain selection.
- **Kind:** Chrome-for-Testing extension deep runtime proof rerun.
- **Network:** Stellar testnet.
- **Command:** `pnpm extension:runtime:deep`.
- **Friendbot hash:** `342a01848e1ff8c7103628ec9563e5154f355799ae822d8463c9aadac5750159`.
- **Runtime user address:** `GA3WYMTIQPVPHSCJJZME26MQTF2RCQHH3RMVV6RN64G4PVU6EU2T4DED`.
- **ASP insert:** `fc6efd1da358ac079c66b6bfc29bb521c263f96197e2a085061210d88aba58b5`.
- **Pool:** `CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY`.
- **Dry proof status:** `proof-generated`.
- **Proof duration:** `9,255 ms`.
- **Submit reached:** yes, in dry-proof callback only; no shield/deposit transaction is claimed from this gate.
- **Bridge note:** this verifies the extension runtime after the multichain bridge source-selector implementation. It does not claim a Base, Arbitrum, or OP bridge transaction.

## 2026-06-25 16:22 UTC - Headless multichain CCTP bridge preflight

- **Phase:** Multichain bridge evidence preparation.
- **Kind:** Read-only EVM source funding preflight through the new headless runner. No bridge transaction is claimed from this entry.
- **Commands:**
  - `pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_SOURCE=arbitrum pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_SOURCE=optimism pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_SOURCE=ethereum pnpm cctp:bridge:testnet`
  - `pnpm cctp:bridge:mainnet`
- **Testnet EVM source wallet:** `0x368AbfE2B29ee5Bebf94E6296493DFc9eAe9B74c`.
- **Mainnet Base EVM source wallet:** `0xA7FCf3F915947E7014d794f5494BBa60c28EF98E`.
- **Bridge destination address:** `GD7RLJMFDBT6LCTT5P2QIPQKM2ODT2ZNFSF6XP2JVHAOQBAEXTEX2ILG`.
- **Secret posture:** EVM private keys and the bridge destination mnemonic are stored outside the repo at `/Users/abu/.config/zk-fighter`.
- **Result:** blocked before submission because the EVM source wallets had `0` native gas and `0` USDC.
- **Next real evidence requirement:** fund `0x368AbfE2B29ee5Bebf94E6296493DFc9eAe9B74c` on the selected testnet source with native gas plus Circle faucet USDC, then rerun the matching `pnpm cctp:bridge:testnet` command. The runner will then use the real core CCTP bridge, ASP insert, and USDC shield/deposit paths.

## 2026-06-25 16:55 UTC - Base Sepolia CCTP public bridge leg

- **Phase:** Multichain bridge evidence.
- **Kind:** Real Base Sepolia -> Stellar testnet CCTP V2 public bridge leg through the headless runner. This entry does not claim the separate USDC shield/deposit.
- **Network:** Base Sepolia source, Stellar testnet destination.
- **Source wallet:** `0x368AbfE2B29ee5Bebf94E6296493DFc9eAe9B74c`.
- **Destination wallet:** `GD7RLJMFDBT6LCTT5P2QIPQKM2ODT2ZNFSF6XP2JVHAOQBAEXTEX2ILG`.
- **Secret posture:** EVM private key and destination mnemonic remained outside the repo at `/Users/abu/.config/zk-fighter`.
- **Amount:** `1 USDC`.
- **Max CCTP fee:** `0.000500 USDC`.
- **Runner commands:**
  - `pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_RESUME_APPROVE_HASH=0xd8b1724e3b65a8169b033aba17eb0536babf38fcddad0f9ae78dfe8870681d3e ZKF_CCTP_RESUME_BURN_HASH=0x88028771b02dac65423d638349024930087a7c371c77936b513ddca752f2cd63 pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_SHIELD_ONLY=1 pnpm cctp:bridge:testnet`

### Transactions

| Step | Transaction | Result |
|---|---|---|
| Stellar testnet Friendbot for destination | `a6beb8ad4c42f6d43e1c116be4aecad9471ef6a6a89569e461c48999c4a7d193` | funded destination |
| Stellar testnet USDC trustline | `df536841decac7ae1a67cc9bac064f236f7bc4aac0ff6b2dbe26ad4c4ee23594` | destination USDC-ready |
| Base Sepolia approval before fee fix | `0x242ac1a6b6f47a0697a9a55b5b167236e1c8ee5a1b5d8271f14f9521c8252865` | accepted, but burn preflight failed because allowance covered `amount` only |
| Base Sepolia approval after fee fix | `0xd8b1724e3b65a8169b033aba17eb0536babf38fcddad0f9ae78dfe8870681d3e` | accepted |
| Base Sepolia CCTP burn with Stellar forwarder hook | `0x88028771b02dac65423d638349024930087a7c371c77936b513ddca752f2cd63` | accepted |
| Stellar testnet CCTP mint_and_forward | `08df05fe661f35dcf42c5ab054ae2bd404ed31091a629d963647ca3d5b293e11` | accepted |

- **Circle Iris attestation status:** `complete`.
- **Circle Iris event nonce:** `0x52ed7c34b1c37729d0329bed27f23bcebd64cf260dc3118588cd35e8b2403887`.
- **Failure fixed:** the first Base burn attempt failed before burn submission with `ERC20: transfer amount exceeds allowance`. Root cause was approving only `amount`; CCTP V2 fast-transfer path requires allowance for `amount + maxFee`. Core approval and the runner funding preflight now use `amount + maxFee`.
- **Follow-up:** separate post-bridge USDC shield is now completed through the extension/offscreen runtime. See `2026-06-25 17:17 UTC - Base Sepolia CCTP arrival shield`.

## 2026-06-25 17:17 UTC - Base Sepolia CCTP arrival shield

- **Phase:** Multichain bridge evidence.
- **Kind:** Real post-bridge USDC shield/deposit for the Base Sepolia CCTP arrival, using the extension offscreen Nethermind browser/WASM runtime.
- **Network:** Stellar testnet.
- **Command:** `pnpm cctp:shield:extension`, then `ZKF_CCTP_AMOUNT_ATOMIC=900000 pnpm cctp:shield:extension` after unit conversion correction.
- **Destination wallet:** `GD7RLJMFDBT6LCTT5P2QIPQKM2ODT2ZNFSF6XP2JVHAOQBAEXTEX2ILG`.
- **Source bridge leg:** Base Sepolia burn `0x88028771b02dac65423d638349024930087a7c371c77936b513ddca752f2cd63`, Stellar mint/forward `08df05fe661f35dcf42c5ab054ae2bd404ed31091a629d963647ca3d5b293e11`.
- **Secret posture:** destination mnemonic remained outside the repo at `/Users/abu/.config/zk-fighter/cctp-bridge-destination.json`.
- **Runtime:** Chrome-for-Testing WXT MV3 extension with offscreen Nethermind browser/WASM prover.
- **ASP membership contract:** `CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP`.
- **USDC pool:** `CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY`.

### Transactions

| Step | Transaction | Result |
|---|---|---|
| ASP membership insert for CCTP destination | `5acda595f61470a783f4a32e544f493a81f1988dcc3e1572b86c6484895b2ca4` | successful |
| Initial USDC shield/deposit | `b1e1ca6e81fb34d2d7218099722c0f9b76e3a7a2debf29e90701592da6acd87a` | successful; shielded `0.1 USDC` because the first harness run passed CCTP atomics directly as Stellar stroops |
| ASP membership insert retry during correction run | `4a5930af618344d00f959c4933ce30102cd0ad8ac00e623b9170f789afc8ab1e` | successful |
| Remaining USDC shield/deposit | `6e9369c5c9e0d3d5226f0af63ec75f4ec49176ede1cc7c0f0b19ce004dda215d` | successful; shielded remaining `0.9 USDC` |

### Runtime evidence

- First run:
  - `proofGenerated`: `true`
  - `submitReached`: `true`
  - `transactionSubmitted`: `true`
  - Duration: `15,956 ms`
- Correction run:
  - `cctpAmountAtomic`: `900000`
  - `amountStroops`: `9000000`
  - `proofGenerated`: `true`
  - `submitReached`: `true`
  - `transactionSubmitted`: `true`
  - Duration: `15,692 ms`
- Final Horizon balance for `GD7RLJMFDBT6LCTT5P2QIPQKM2ODT2ZNFSF6XP2JVHAOQBAEXTEX2ILG`:
  - USDC: `0.0000000`
  - XLM: `9999.9318114`

### Fixes made during this checkpoint

- Added `pnpm cctp:shield:extension`, which imports the local CCTP destination wallet into the extension harness and runs ASP insert + USDC QuickShield through Chrome/offscreen Nethermind.
- Fixed misleading ASP error propagation so browser-runtime import failures are not hidden behind `ASP membership contract state could not be read`.
- Fixed CCTP-to-Stellar amount conversion: Circle CCTP USDC atomics use 6 decimals; Stellar asset stroops use 7 decimals, so `1_000_000` CCTP atomic USDC shields as `10_000_000` Stellar stroops.
- Added regression coverage for the conversion in `scripts/cctp-bridge-source-support.test.ts`.

### Claim allowed

- Base Sepolia now has full safe-path evidence: public CCTP bridge arrival followed by separate USDC shield/deposit through ZK Fighter.
- This is not an atomic bridge-and-shield claim.

## 2026-06-25 17:36 UTC - Multichain CCTP read-only preflight

- **Phase:** Multichain bridge evidence.
- **Kind:** Read-only source-chain and Stellar destination readiness preflight. No approval, burn, mint, ASP insert, shield, or mainnet spend was submitted.
- **Command shape:** `ZKF_CCTP_PREFLIGHT_ONLY=1 ZKF_CCTP_SOURCE=<source> pnpm cctp:bridge:<network>`.
- **Destination wallet:** `GD7RLJMFDBT6LCTT5P2QIPQKM2ODT2ZNFSF6XP2JVHAOQBAEXTEX2ILG`.
- **Secret posture:** local EVM keys and destination mnemonic stayed outside the repo under `/Users/abu/.config/zk-fighter`.

### Results

| Route | Source wallet | Result |
|---|---|---|
| Arbitrum Sepolia -> Stellar testnet | `0x368AbfE2B29ee5Bebf94E6296493DFc9eAe9B74c` | gas ready: `0.012 ETH`; source USDC blocked: `0 USDC`; Stellar testnet destination ready with account + USDC trustline |
| OP Sepolia -> Stellar testnet | `0x368AbfE2B29ee5Bebf94E6296493DFc9eAe9B74c` | gas ready: `0.01 ETH`; source USDC blocked: `0 USDC`; Stellar testnet destination ready with account + USDC trustline |
| Base mainnet -> Stellar mainnet | `0xA7FCf3F915947E7014d794f5494BBa60c28EF98E` | source gas blocked: `0 ETH`; source USDC blocked: `0 USDC`; Stellar mainnet destination not funded and has no USDC trustline |
| Arbitrum One -> Stellar mainnet | `0xA7FCf3F915947E7014d794f5494BBa60c28EF98E` | source gas blocked: `0 ETH`; source USDC blocked: `0 USDC`; Stellar mainnet destination not funded and has no USDC trustline |

### Follow-up

- Arbitrum Sepolia and OP Sepolia later received Circle testnet USDC and completed live bridge-to-shield evidence; see the Arbitrum and OP entries below.
- Mainnet bridge-to-shield needs deliberate funding and approval for both the source-chain EVM wallet and the app-derived Stellar CCTP destination before any burn is safe.

### Safety follow-up

- Review found that preflight had to be a stronger no-submit guard. `ZKF_CCTP_PREFLIGHT_ONLY=1` now rejects conflicting submit-capable `ZKF_CCTP_SHIELD_ONLY` or resume flags instead of letting those branches run first.
- Non-preflight mainnet CCTP execution now fails closed unless `ZKF_CCTP_MAINNET_APPROVED=1` is set after explicit approval for the exact run and funding source.

## 2026-06-25 18:03 UTC - Arbitrum Sepolia CCTP bridge-to-shield evidence

- **Phase:** Multichain bridge evidence.
- **Kind:** Real Arbitrum Sepolia -> Stellar testnet CCTP V2 public bridge leg plus separate extension/offscreen USDC shield/deposit.
- **Network:** Arbitrum Sepolia source, Stellar testnet destination.
- **Source wallet:** `0x368AbfE2B29ee5Bebf94E6296493DFc9eAe9B74c`.
- **Destination wallet:** `GD7RLJMFDBT6LCTT5P2QIPQKM2ODT2ZNFSF6XP2JVHAOQBAEXTEX2ILG`.
- **Secret posture:** EVM private key and destination mnemonic remained outside the repo at `/Users/abu/.config/zk-fighter`.
- **Amount:** `1 USDC`.
- **Max CCTP fee:** `0.000500 USDC`.
- **Commands:**
  - `ZKF_CCTP_PREFLIGHT_ONLY=1 ZKF_CCTP_SOURCE=arbitrum pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_SOURCE=arbitrum pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_AMOUNT_ATOMIC=1000000 pnpm cctp:shield:extension`

### Transactions

| Step | Transaction | Result |
|---|---|---|
| Arbitrum Sepolia USDC approval | `0x53d17d1ada27bae89036cce765173984b20e1edc24b5c1e8fa872524e4b210a4` | accepted |
| Arbitrum Sepolia CCTP burn with Stellar forwarder hook | `0xcf0c0e093fc3fc8cfa8310e1b423e400fb157aa263b6d5187488f9d053a2b3a7` | accepted |
| Stellar testnet CCTP mint_and_forward | `730edcfa3b3eddf279f5dc0dd338ef3aa9f96616e0efcbe2f709abefad5e16d1` | accepted |
| ASP membership insert for CCTP destination | `8a13e5a8d91e447f3ee9a8156be5ab33fa0bdb89a6a91ef0be0f4ce8f523d60b` | accepted |
| USDC shield/deposit | `a2aa117ef0973f979cad85b3c4387fd056d99d5f3fe20af8de107a502c924648` | accepted |

- **Circle Iris attestation status:** `complete`.
- **Circle Iris event nonce:** `0x0f2b8a79fb4affefe7cbef4b1344ea19f93ae1a64fbc314f5da4c316217ce2ba`.
- **Node runner blocker after public bridge:** `Cannot find module '/js/web.js' imported from .../packages/core/src/nethermind-runtime.ts`.
- **Shield runtime:** `pnpm cctp:shield:extension` used Chrome-for-Testing WXT MV3 extension with offscreen Nethermind browser/WASM prover.
- **Proof/shield result:** `proofGenerated: true`, `submitReached: true`, `transactionSubmitted: true`, duration `18,602 ms`.
- **Final Horizon balance for destination after shield:** USDC `0.0000000`, XLM `9999.8798219`.

### Claim allowed

- Arbitrum Sepolia now has full safe-path evidence: public CCTP bridge arrival followed by separate USDC shield/deposit through ZK Fighter.
- This is not an atomic bridge-and-shield claim.

## 2026-06-25 18:43 UTC - OP Sepolia CCTP bridge-to-shield evidence

- **Phase:** Multichain bridge evidence.
- **Kind:** Real OP Sepolia -> Stellar testnet CCTP V2 public bridge leg plus separate extension/offscreen USDC shield/deposit.
- **Network:** OP Sepolia source, Stellar testnet destination.
- **Source wallet:** `0x368AbfE2B29ee5Bebf94E6296493DFc9eAe9B74c`.
- **Destination wallet:** `GD7RLJMFDBT6LCTT5P2QIPQKM2ODT2ZNFSF6XP2JVHAOQBAEXTEX2ILG`.
- **Secret posture:** EVM private key and destination mnemonic remained outside the repo at `/Users/abu/.config/zk-fighter`.
- **Amount:** `1 USDC`.
- **Max CCTP fee:** `0.000500 USDC`.
- **Commands:**
  - `ZKF_CCTP_PREFLIGHT_ONLY=1 ZKF_CCTP_SOURCE=optimism pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_SOURCE=optimism pnpm cctp:bridge:testnet`
  - `ZKF_CCTP_AMOUNT_ATOMIC=1000000 pnpm cctp:shield:extension`

### Failure and fix

- First OP attempt failed before any approval hash:
  - `The amount of gas provided for the transaction exceeds the limit allowed for the block`
  - `Details: intrinsic gas too high`
- Context7 `/wevm/viem` docs confirmed `walletClient.sendTransaction` accepts an explicit `gas` limit and estimates automatically when omitted.
- `scripts/check-cctp-bridge-source.ts` now applies OP-only explicit gas limits for approval and CCTP burn transactions while leaving Base/Arbitrum/Ethereum estimate behavior unchanged.

### Transactions

| Step | Transaction | Result |
|---|---|---|
| OP Sepolia USDC approval | `0x2e264ca0dbfee0865ae9e32ddd9702693f2b39c37c21804e781d86a96a2111f4` | accepted |
| OP Sepolia CCTP burn with Stellar forwarder hook | `0x817d31c2af0407e35b1279ec731e50ff3665431a444ca5b271e2e3691c2e0a82` | accepted |
| Stellar testnet CCTP mint_and_forward | `dc1c3f77bacf4da21035c3059dbb5dae81bc9e8f3dfd83477a5c0fe9069f8b1f` | accepted |
| ASP membership insert for CCTP destination | `3fb620d5ecf5eaa90cdcff3a6b5890b389b2ac79d199c45d36e1e81698b9958c` | accepted |
| USDC shield/deposit | `8205379a7d00710820b1b7e96a2eac6c4b7816b29185771bd00328abd18e1344` | accepted |

- **Circle Iris attestation status:** `complete`.
- **Circle Iris event nonce:** `0xb05d2d74a645aa095b7a271b53cb209fc0a58be0715bacbfa0bc219724f3a46d`.
- **Node runner blocker after public bridge:** `Cannot find module '/js/web.js' imported from .../packages/core/src/nethermind-runtime.ts`.
- **Shield runtime:** `pnpm cctp:shield:extension` used Chrome-for-Testing WXT MV3 extension with offscreen Nethermind browser/WASM prover.
- **Proof/shield result:** `proofGenerated: true`, `submitReached: true`, `transactionSubmitted: true`, duration `14,371 ms`.
- **Final Horizon balance for destination after shield:** USDC `0.0000000`, XLM `9999.7735297`.

### Claim allowed

- OP Sepolia now has full safe-path evidence: public CCTP bridge arrival followed by separate USDC shield/deposit through ZK Fighter.
- This is not an atomic bridge-and-shield claim.

## 2026-06-25 19:58 UTC - Mainnet CCTP destination readiness

- **Phase:** Mainnet bridge readiness.
- **Kind:** Real Stellar mainnet account funding and USDC trustline setup for the app-derived CCTP bridge destination. No EVM approval, burn, CCTP mint, ASP insert, shield, or bridge claim was submitted.
- **Network:** Stellar mainnet.
- **Destination wallet:** `GD7RLJMFDBT6LCTT5P2QIPQKM2ODT2ZNFSF6XP2JVHAOQBAEXTEX2ILG`.
- **Source funder:** local Stellar CLI identity `zkf-mainnet-qa`.
- **Secret posture:** destination mnemonic stayed outside the repo at `/Users/abu/.config/zk-fighter/cctp-bridge-destination.json`; QA identity stayed outside the repo under the local Stellar CLI config.

### Transactions

| Step | Transaction | Result |
|---|---|---|
| Destination account funding | `3b827bfe95cc828beb364873e3d0b52044dfe23a5747531e7d9511bebcc6e356` | accepted; funded with `5.0000000 XLM` |
| Destination USDC trustline | `659c6933ebc91c623a03e846bc1567ca00e054a7a6cbb99058a2dfe4c8911391` | accepted |

### Read-only preflight after setup

| Route | Source wallet | Result |
|---|---|---|
| Base mainnet -> Stellar mainnet | `0xA7FCf3F915947E7014d794f5494BBa60c28EF98E` | destination ready; source gas blocked: `0 ETH`; source USDC blocked: `0 USDC` |
| Arbitrum One -> Stellar mainnet | `0xA7FCf3F915947E7014d794f5494BBa60c28EF98E` | destination ready; source gas blocked: `0 ETH`; source USDC blocked: `0 USDC` |
| OP Mainnet -> Stellar mainnet | `0xA7FCf3F915947E7014d794f5494BBa60c28EF98E` | destination ready; source gas blocked: `0 ETH`; source USDC blocked: `0 USDC` |

### Submit-capable Base mainnet guard check

`ZKF_CCTP_MAINNET_APPROVED=1 ZKF_CCTP_SOURCE=base pnpm cctp:bridge:mainnet` reached the same source-funding guard and submitted no EVM approval, burn, Stellar mint, ASP insert, or shield transaction.

### Follow-up

- Recommended first mainnet bridge route remains Base mainnet because source-chain fees are lower than Ethereum L1.
- To run the mainnet bridge, fund `0xA7FCf3F915947E7014d794f5494BBa60c28EF98E` on Base with source-chain gas and native USDC. Current preflight minimum is `0.00005 ETH` and `1.0005 USDC`; use a buffer before live execution.
- Mainnet CCTP execution remains hard-gated by `ZKF_CCTP_MAINNET_APPROVED=1` for the exact approved route and funding source.

## 2026-06-30 21:10 UTC - Extension confidential offscreen register smoke

- **Phase:** Web + extension friction reset.
- **Kind:** Real WXT MV3 extension offscreen confidential-token register proof and submit smoke.
- **Network:** Stellar testnet.
- **Extension ID:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **User address:** `GCRHPKLZCMJB4RPEYSZXO36JEYQ6CHITPZOKTJVRSOKVGHUU5YYNME26`.
- **Contract ID:** `CBNL4THDSDDZ5OWPVLJPDBQGQ4FDH6LHBBFUBPRDNLUCIV2LKCHEVJ4F`.
- **Secret posture:** test mnemonic/private keys stayed in local smoke-script/runtime storage; no secrets were written to this repo.
- **Command:** `CI=true node scripts/check-extension-confidential.mjs`.

### Transactions

| Step | Transaction | Result |
|---|---|---|
| Testnet account funding | `3b8f2fba6d4dc0093a0bf0c41ec9e872b23d4792d8fad7a51e76d13befbe7a49` | accepted |
| Confidential register | `db86b8d65a05ab8bc1be62e4f5271306f3909914cbf963245432ef9a7ac006d1` | submitted; [stellar.expert](https://stellar.expert/explorer/testnet/tx/db86b8d65a05ab8bc1be62e4f5271306f3909914cbf963245432ef9a7ac006d1) |

### Runtime result

- `provedInOffscreen: true`.
- `registerStatus: submitted`.
- Stages reached: `readiness`, `simulate`, `submit`, `confirm`.
- Blockers: none.

### Re-run after post-review fixes

- **Command:** `CI=true node scripts/check-extension-confidential.mjs`.
- **User address:** `GCKDVD2ETCPMTQCXEBR2ETG6J37I5LGIPW6GALNJI4X5AQRMWYBA6ESN`.
- **Funding transaction:** `cde808bde2184e0495d70a8fcf32a5b9853403752dea9f0bbf22c868312b05d7`.
- **Confidential register transaction:** `cd1055f4dcf162a59fe1357df0684977677a5760cf27a6880417f3ea5203ed43`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/cd1055f4dcf162a59fe1357df0684977677a5760cf27a6880417f3ea5203ed43).
- `provedInOffscreen: true`, `registerStatus: submitted`, blockers: none.

## 2026-06-30 22:25 UTC - Fresh testnet privacy pools for RPC retention recovery

- **Phase:** Web + extension friction reset.
- **Kind:** Fresh Stellar testnet privacy-pool deployment to recover from public RPC event retention drift. This is the demo recovery path; durable production restore still requires a bootnode/archive indexer or archive-capable RPC.
- **Network:** Stellar testnet.
- **Observed public RPC health:** `https://soroban-testnet.stellar.org/` returned `status: healthy`, `latestLedger: 3368735`, `oldestLedger: 3247776`, `ledgerRetentionWindow: 120960`.
- **Reason:** previous testnet pools deployed at ledgers `3241020` and `3241021`, now older than `oldestLedger`, causing `RPC_SYNC_GAP` during shielded balance scans.
- **Fresh deployer/admin:** `GAVLPDUFRIAREMGX4DACLT3QW7A44HAD5YK5HJYQNTXT465SG5KQA3RO` (`zkf-testnet-pool-20260630`, local throwaway testnet identity).
- **Secret posture:** deployer secret stayed in local Stellar CLI config only; no secret key or seed phrase was recorded. After deployment and permissionless ASP setup, `stellar keys rm zkf-testnet-pool-20260630 --force` removed the local throwaway identity.

### Fresh contracts

| Contract | ID |
|---|---|
| ASP membership | `CCXIGPJJY6UHIETXFCIV77HFVJSFS6HAVRSMHJFV6UVENXPJOC2WA3Y2` |
| ASP non-membership | `CBWQ6VUH37U65RDV2FYJFP5CC4MYKRYSPXAROK55RE7WQZG4EMKGSA3F` |
| Groth16 verifier | `CATCUE7DEB72SXACTSFHZF5ITJLKQH6GWI47UPM6SV6LYHFPXASDNLFN` |
| XLM pool | `CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ` |
| USDC pool | `CDKOY3DXCCS3KHBDAE7G2E735YRPDGGAWRKSN25V4VFVKZOMKWXKTCNK` |

### Pool metadata

| Asset | Token/SAC | Deployment ledger | RPC event check |
|---|---|---:|---|
| XLM | `CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC` | `3368685` | `getEvents` from ledger `3368685` accepted |
| USDC | `CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA` | `3368690` | `getEvents` from ledger `3368690` accepted |

### Post-deploy configuration

- ASP `set_admin_insert_only(false)` transaction: `0570c8b99b07f5e5f8c6aeae5a7a58a51e067666b86b5ab2693f47b342c40e14`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/0570c8b99b07f5e5f8c6aeae5a7a58a51e067666b86b5ab2693f47b342c40e14).
- Result: permissionless `insert_leaf` restored for normal wallet onboarding/shield flows.

### Code/runtime updates

- `packages/core/src/networks.ts` now points testnet XLM and USDC to the fresh pool IDs above.
- Core tests that assert configured pool IDs were updated.
- `reference/stellar-private-payments/deployments/testnet/deployments.json` was updated with the fresh contracts and corrected canonical USDC issuer metadata.
- Nethermind browser runtime assets were rebuilt with Homebrew LLVM (`CC=/opt/homebrew/opt/llvm/bin/clang`) after Apple clang failed to compile `sqlite-wasm-rs` for `wasm32-unknown-unknown`.
- Rebuilt Nethermind assets were staged into `apps/web/public`; `apps/web/public/js/web_bg.wasm` now embeds the fresh testnet deployment ledgers `3368685` and `3368690`.

### Remaining product requirement

- Fresh pools are not a durable production restore strategy. Once the public testnet RPC retention window moves past these deployment ledgers, a wallet without local index state will hit the same class of failure again.
- Production-quality shielded balances need a hosted bootnode/archive indexer or an archive-capable RPC for historical `getEvents` back to pool deployment ledgers.

### Runtime smoke after asset-filter fix

- **Command:** `CI=true pnpm extension:quickshield`.
- **Extension ID:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **User address:** `GCZ2KVQC2VZUI6RKMDBZG3W4B5B5O2KE3RS6KHKROIXTG4PBIP35IK25`.
- **Funding transaction:** `0ac8f94aff594b99d0d1defe98390732b1eddd12b2bbf282391e0af8689d7467`.
- **ASP insert transaction:** `6d10ed6e19f8314310a2671cded1d8c8773a9fdb9aead96b3733826c24ea5289`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/6d10ed6e19f8314310a2671cded1d8c8773a9fdb9aead96b3733826c24ea5289).
- **XLM shield transaction:** `885362d7f0aab49b9bd35b477122497537d12653a3ae41fbc399cb56d1d43d92`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/885362d7f0aab49b9bd35b477122497537d12653a3ae41fbc399cb56d1d43d92).
- **Result:** `proofGenerated: true`, `transactionSubmitted: true`, `durationMs: 13135`, attempts `1`.
- **Balance scan result:** `shieldedXlmStroops: 1000000`, `shieldedUsdcStroops: 0`, `noteCount: 1`, `shieldedOk: true`, blockers `[]`.

- **Command:** `CI=true pnpm extension:quickshield:usdc`.
- **Extension ID:** `ieibjeodkebelbkkdgnmbalcpmphcfkh`.
- **User address:** `GBCIIMFQEHOXR4OIO4NUW2X37JAI7RL5UZKWOKRJTP7PAIZPYJJYIECA`.
- **Funding transaction:** `019b44eb61d58c0a2a78f9e5e0723ffeb0b1ec5e5059e884a52e7ec2dca2aac6`.
- **USDC trustline transaction:** `51c52fd102e4e101e83cbb93b1da100795587dafaa1d964baf36c9225fd930f9`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/51c52fd102e4e101e83cbb93b1da100795587dafaa1d964baf36c9225fd930f9).
- **Local USDC funder transaction:** `007c01b0d4390b9e3bb006e50dea7f823e54b9b1b55c592941d12d42f0df5e31`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/007c01b0d4390b9e3bb006e50dea7f823e54b9b1b55c592941d12d42f0df5e31).
- **ASP insert transaction:** `490fa4ac680e0e9ad839d619dfbf2061763cc5a1cb99a111394cbb3a3254b980`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/490fa4ac680e0e9ad839d619dfbf2061763cc5a1cb99a111394cbb3a3254b980).
- **USDC shield transaction:** `632596979d4207c70da0ceb2422ce97bc6d1244b9062d64a30feab066a7fffa9`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/632596979d4207c70da0ceb2422ce97bc6d1244b9062d64a30feab066a7fffa9).
- **Result:** `proofGenerated: true`, `transactionSubmitted: true`, `durationMs: 15904`, attempts `1`.
- **Balance scan result:** `shieldedXlmStroops: 0`, `shieldedUsdcStroops: 10000000`, `noteCount: 1`, `shieldedOk: true`, blockers `[]`.
- **Fix verified:** extension balance reads now use the Nethermind runtime's pool-filtered `getUnspentUserNotes(poolContractId, address)` path. The smoke script fails if the submitted asset leaks into the other shielded asset balance.

## 2026-07-01 — Nethermind storage worker pending-event stall fix

- **Symptom:** Zen/web shield attempts failed before proving with `Storage Worker Communication Error: operation timed out after 60000 ms`.
- **Root cause:** Nethermind `ProcessPending` loops until `process_events` and `process_notes` report no work. Unsupported or unparseable raw contract events were fetched by `get_unprocessed_events`, logged, but never persisted into any processed table. The worker then revisited the same raw rows forever until the 60s request timeout.
- **Fix:** patched `reference/stellar-private-payments` locally so unsupported raw events are preserved in `raw_contract_events`, marked in a new `ignored_contract_events` table, and excluded from future `get_unprocessed_events` scans. Tracked reproducibility patch: `patches/nethermind/ignore-unsupported-events.patch`.
- **Build:** rebuilt Nethermind browser assets with Homebrew LLVM (`CC_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/clang`, `CXX_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/clang++`, `AR_wasm32_unknown_unknown=/opt/homebrew/opt/llvm/bin/llvm-ar`, `make release`) and restaged with `pnpm prover:stage`.
- **Verification:**
  - `cargo test -p state unsupported_raw_events_do_not_block_processing`
  - `CI=true pnpm --filter @zk-fighter/web build`
  - `CI=true pnpm --filter @zk-fighter/extension build:local`
  - `node scripts/check-file-size.mjs`
- **Local runtime:** restarted web dev server on `http://localhost:4173/`; funding API `8787`, testnet bootnode `8788`, and mainnet bootnode `8789` health checks returned `ok`.

## 2026-07-01 — Foreground shield sync no longer waits on full note derivation

- **Symptom:** after the unsupported-event fix, Zen still showed `Deposit failed` with `Storage Worker Communication Error: operation timed out after 60000 ms`; console showed bootnode `getEvents` requests returning 200 and the failure occurring after `Building witness inputs…`.
- **Root cause:** shield/deposit foreground sync called `syncPoolEvents()`, which processed raw ASP/pool events and also derived notes for every known local account. Key derivation also kicked the same full background processor before deposit began. A deposit has no input commitments, so it should not wait behind full note derivation.
- **Fix:** added a raw-event-only storage worker request for proving prerequisites and removed the key-derivation background processor kick. Deposit paths with no input commitments now use raw-event sync; send/unshield paths with input notes still use full note sync. Tracked reproducibility patch: `patches/nethermind/foreground-raw-sync.patch`.
- **Build:** rebuilt Nethermind browser assets with Homebrew LLVM and restaged with `pnpm prover:stage`.
- **Extension cache follow-up:** `quickShieldFlow` now clears balance cache after a submitted shield, and extension balance scans explicitly call `syncBeforeRead` before `getUnspentUserNotes`.
- **Runtime smoke:** `CI=true pnpm extension:quickshield`
  - User address: `GCKSPZRG6UNUSMJ6Q4DK3AJPA4SHY3RIUET3XXLLBUT56OVAAK42DH62`.
  - Funding transaction: `e7c16718d5d42be71a3393e8afd262d8962cb83ebbcc65a0dc76639e4a3b4bbb`.
  - ASP insert transaction: `d011ec602e9a64a70bf3da646e7b09ef142ee97c24debd83c9816d9d204631f9`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/d011ec602e9a64a70bf3da646e7b09ef142ee97c24debd83c9816d9d204631f9).
  - XLM shield transaction: `0673517bef207df4c612fcb033536cd9b854db857d31d67bd55ef1a6f0e8cb08`; [stellar.expert](https://stellar.expert/explorer/testnet/tx/0673517bef207df4c612fcb033536cd9b854db857d31d67bd55ef1a6f0e8cb08).
  - Result: `proofGenerated: true`, `transactionSubmitted: true`, `durationMs: 14393`, attempts `1`.
  - Balance scan result: `shieldedXlmStroops: 1000000`, `shieldedUsdcStroops: 0`, `noteCount: 1`, blockers `[]`.
