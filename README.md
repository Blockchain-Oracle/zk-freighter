<p align="center">
  <img src="https://raw.githubusercontent.com/Blockchain-Oracle/zk-freighter/main/assets/logo.png" width="112" alt="ZK Freighter" />
</p>

<h1 align="center">ZK Freighter</h1>

<p align="center"><b>A privacy-by-default, self-custody wallet for shielded XLM and USDC payments on Stellar.</b></p>

<p align="center">
  <a href="https://app.zkfreighter.app">Web wallet</a> ·
  <a href="https://m.zkfreighter.app">Mobile app</a> ·
  <a href="https://zkfreighter.app">Website</a> ·
  <a href="https://docs.zkfreighter.app">Docs</a> ·
  <a href="https://github.com/Blockchain-Oracle/zk-freighter">Source</a>
</p>

<p align="center">
  <img src="https://raw.githubusercontent.com/Blockchain-Oracle/zk-freighter/main/assets/zkf-home.png" alt="ZK Freighter across web, extension, and mobile" width="960" />
</p>

Hold it. Send it. Nobody sees it. Zero-knowledge proofs are generated on your own device (~6s in the browser), verified on-chain by Soroban contracts, and your shielded balances, amounts, and counterparties stay inside the pool. The public moments are named every time: **shield-in (deposit)**, **unshield-out (withdraw)**, and **bridge arrivals** are visible on Stellar — everything between them is a shielded transfer.

> ⚠️ **Unaudited hackathon software** built on research/reference implementations (Stellar Hacks: Real-World ZK). Testnet is the recommended surface. Do not use for real funds.

This is not a general public-purpose wallet, not an "anonymous" or "untraceable" system, and not a mixer. It is a shielded-transfer wallet with honest boundaries and user-held compliance disclosure.

## Live deployments

| Surface | URL |
|---|---|
| Product site | <https://zkfreighter.app> |
| Web wallet (desktop) | <https://app.zkfreighter.app> |
| Mobile web app (any phone) | <https://m.zkfreighter.app> |
| Documentation | <https://docs.zkfreighter.app> |
| Source code | <https://github.com/Blockchain-Oracle/zk-freighter> |
| Funding API — testnet faucet | <https://api.zkfreighter.app> (`GET /v1/funding/status`) |
| Bootnode — testnet event index | <https://bootnode.zkfreighter.app> (RPC at `/rpc`, `GET /health`) |
| Bootnode — mainnet event index | <https://mainnet-bootnode.zkfreighter.app> (RPC at `/rpc`, `GET /health`) |

The hosted web wallet is built against these endpoints (`VITE_ZKF_TESTNET_FUNDING_API_URL`, `VITE_ZKF_TESTNET_BOOTNODE_URL`, `VITE_ZKF_MAINNET_BOOTNODE_URL`). Local builds fall back to public Stellar RPC and localhost services, so nothing below requires the hosted stack.
 
## Install

Nothing to install to try it — the [web wallet](https://app.zkfreighter.app) runs in any browser. The app-store listings (Chrome Web Store, Edge Add-ons, native iOS) are **submitted and pending review**; you don't have to wait for them — everything is installable now:

- **Desktop:** [app.zkfreighter.app](https://app.zkfreighter.app).
- **Any phone (iPhone + Android), no install:** [m.zkfreighter.app](https://m.zkfreighter.app) — the responsive mobile app; Share → Add to Home Screen.
- **Android native:** [`zk-freighter.apk`](https://github.com/Blockchain-Oracle/zk-freighter/releases/latest/download/zk-freighter.apk) (or scan the QR on [zkfreighter.app](https://zkfreighter.app)); allow "install unknown apps"; [Obtainium](https://github.com/ImranR98/Obtainium) auto-updates it.
- **iPhone native:** in [AltStore](https://altstore.io), add the source `https://zkfreighter.app/altstore.json` and install — or just use the mobile web app above.
- **Browser extension:** [download the zip](https://github.com/Blockchain-Oracle/zk-freighter/releases/latest/download/zk-freighter-extension-chrome.zip) — unzip, `chrome://extensions`, Developer mode, Load unpacked. Store listings land after review.

Every build (Android app, iPhone app, extension) also lives on the [**Releases page**](https://github.com/Blockchain-Oracle/zk-freighter/releases/latest). Full per-platform steps: [docs.zkfreighter.app/docs/install](https://docs.zkfreighter.app/docs/install).

<p align="center">
  <img src="https://raw.githubusercontent.com/Blockchain-Oracle/zk-freighter/main/assets/zkf-install.png" alt="Install ZK Freighter on mobile and browser" width="960" />
</p>

## Quickstart

Prerequisites: **Node 22+** and **pnpm 10** (`corepack enable` or `npm i -g pnpm`). The repo enforces pnpm.

```bash
pnpm install
pnpm build          # builds every workspace
pnpm test           # 265 tests across core, apps, services
```

Run the surfaces:

```bash
pnpm web:dev            # wallet web app → http://127.0.0.1:5173
pnpm landing:dev        # product site  → http://127.0.0.1:5174
pnpm mobile:dev         # mobile surface (Capacitor web build) → :4183
pnpm extension:build    # then load apps/extension/.output/chrome-mv3
                        # as an unpacked extension in chrome://extensions
```

Optional local services (the wallet works against public Stellar RPC without them; they power demo funding and long-range shielded-note history):

```bash
ZKF_TESTNET_FUNDER_SECRET=SA... pnpm funding-api:dev   # testnet faucet, :8787
pnpm bootnode:dev                                      # warmed event indexer/RPC, :8788
```

Each app reads `VITE_ZKF_*` endpoint env vars (see `apps/*/​.env.example`). Networks are a config toggle — testnet ↔ mainnet with no code change.

## Repository layout

```
apps/
  web/          React wallet app (primary surface)
  extension/    WXT MV3 browser extension (popup + side panel, offscreen prover)
  mobile/       Capacitor app (Android/iOS) reusing the same core
  landing/      product site
  bootnode/     warmed pool-event indexer + narrow RPC (Postgres)
  funding-api/  hosted testnet faucet (XLM + USDC, budgeted/cooldowns)
packages/
  core/         all wallet, network, proof, and transaction logic
  ui/           shared design system (tokens, components, theme)
circuits/       Noir circuits for Confidential Token mode
contracts/      Soroban contract for Confidential Token mode (Rust)
docs/           concept docs, glossary, submission package, deploy notes
assets/          logo, screenshots, and rendered architecture diagrams
```

## Architecture

Every app is a thin presentation layer over `@zk-freighter/core`, which owns identity, proving, and transactions:

![ZK Freighter monorepo architecture](https://raw.githubusercontent.com/Blockchain-Oracle/zk-freighter/main/assets/diagrams/architecture-monorepo.png)

### The shielded lifecycle

Proofs are Groth16 (BN254), generated in-browser by a Rust→WASM prover (Nethermind privacy-pool engine), and verified on-chain. Recipients are addressed by a private `zkf1…` receive code (Bech32m), never by their public account:

![Shielded payment lifecycle](https://raw.githubusercontent.com/Blockchain-Oracle/zk-freighter/main/assets/diagrams/shielded-lifecycle.png)

First-time shielding also registers a pool-access leaf with the ASP (association-set) contract — setup, confirmation, and the deposit run as one continuous flow in the UI.

### Extension: proving in an offscreen document

MV3 popups are short-lived, so the heavy WASM prover runs in an offscreen document; the popup stays a fast glance surface:

![Extension offscreen prover architecture](https://raw.githubusercontent.com/Blockchain-Oracle/zk-freighter/main/assets/diagrams/extension-offscreen.png)

### Bridge: USDC in from EVM chains

Circle CCTP V2 moves USDC from Ethereum, Base, Arbitrum, or OP Sepolia to Stellar; the burn is signed by a seed-derived EVM key (no MetaMask needed). Arrival is public; shielding is a separate, explicit step:

![CCTP bridge-then-shield sequence](https://raw.githubusercontent.com/Blockchain-Oracle/zk-freighter/main/assets/diagrams/bridge-cctp.png)

### Auto-shield (optional)

Auto-shield moves your **public balance** into your shielded balance for you. It is off by default (**Settings → Privacy**), and it shields the balance you already have — not only new arrivals — each time the wallet opens or refreshes. The first shield stays manual (it runs the ~90s shield-access setup), then auto-shield is live. Each deposit is a public boundary, capped at the pool's 100-unit limit, keeps a 5 XLM reserve holdback, and stops with an honest banner on any failure. Full behavior: [docs.zkfreighter.app → How it works → Auto-shield](https://docs.zkfreighter.app/docs/how-it-works/auto-shield).

## Two privacy modes

| | Shielded Pools (flagship) | Confidential Tokens (testnet preview) |
|---|---|---|
| Hides | balances, amounts, counterparties (inside the pool) | amounts and balances (addresses stay public) |
| Assets | XLM + USDC | wrapped USDC |
| Proving | Circom/Groth16, Rust→WASM in-browser | Noir + UltraHonk (bb.js) in-browser |
| Networks | testnet + mainnet (deployed) | testnet only, unaudited preview |
| Source | Nethermind privacy-pool engine (reused; credited below) | original Soroban SEP-41 wrapper in `contracts/` + `circuits/` |

Compliance is user-held on both: selective **disclosure receipts** prove ownership of a specific note to an auditor — read-only, no spend authority, nothing uploaded.

## Deployed contracts

All IDs below are the exact values the wallet ships with (`packages/core/src/networks.ts`, `packages/core/src/privacy-contracts.ts`) — click through to the explorer.

### Stellar testnet

| Contract | ID |
|---|---|
| XLM privacy pool | [`CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ`](https://stellar.expert/explorer/testnet/contract/CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ) |
| USDC privacy pool | [`CDKOY3DXCCS3KHBDAE7G2E735YRPDGGAWRKSN25V4VFVKZOMKWXKTCNK`](https://stellar.expert/explorer/testnet/contract/CDKOY3DXCCS3KHBDAE7G2E735YRPDGGAWRKSN25V4VFVKZOMKWXKTCNK) |
| ASP membership (association set) | [`CCXIGPJJY6UHIETXFCIV77HFVJSFS6HAVRSMHJFV6UVENXPJOC2WA3Y2`](https://stellar.expert/explorer/testnet/contract/CCXIGPJJY6UHIETXFCIV77HFVJSFS6HAVRSMHJFV6UVENXPJOC2WA3Y2) |
| Confidential token (wrapped USDC, preview) | [`CBNL4THDSDDZ5OWPVLJPDBQGQ4FDH6LHBBFUBPRDNLUCIV2LKCHEVJ4F`](https://stellar.expert/explorer/testnet/contract/CBNL4THDSDDZ5OWPVLJPDBQGQ4FDH6LHBBFUBPRDNLUCIV2LKCHEVJ4F) |
| Confidential UltraHonk verifier | [`CD5DMFWTPW6SLA5TAUNU2TLAZ2ZFXCKGR2PBS4KHQ4P56EOIASRSTUGG`](https://stellar.expert/explorer/testnet/contract/CD5DMFWTPW6SLA5TAUNU2TLAZ2ZFXCKGR2PBS4KHQ4P56EOIASRSTUGG) |
| Confidential auditor registry | [`CAMO6HGCK3EGQX7IEOAO555MPXNQ6UVFI46Y34CYQRWS4HLXOAQ5SDGO`](https://stellar.expert/explorer/testnet/contract/CAMO6HGCK3EGQX7IEOAO555MPXNQ6UVFI46Y34CYQRWS4HLXOAQ5SDGO) |
| XLM SAC (Stellar asset contract) | [`CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC`](https://stellar.expert/explorer/testnet/contract/CDLZFC3SYJYDZT7K67VZ75HPJVIEUVNIXF47ZG2FB2RMQQVU2HHGCYSC) |
| USDC SAC | [`CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA`](https://stellar.expert/explorer/testnet/contract/CBIELTK6YBZJU5UP2WWQEUCYKLPU6AUNZ2BQ4WWFEIE3USCIHMXQDAMA) |

### Stellar mainnet

| Contract | ID |
|---|---|
| XLM privacy pool | [`CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE`](https://stellar.expert/explorer/public/contract/CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE) |
| USDC privacy pool | [`CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7`](https://stellar.expert/explorer/public/contract/CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7) |
| ASP membership (association set) | [`CCYY3LLTVD2UW3Z4QD76PICZNIUH3PXKWJSKJVAENBIYON7QVAQIW5PP`](https://stellar.expert/explorer/public/contract/CCYY3LLTVD2UW3Z4QD76PICZNIUH3PXKWJSKJVAENBIYON7QVAQIW5PP) |
| XLM SAC | [`CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA`](https://stellar.expert/explorer/public/contract/CAS3J7GYLGXMF6TDJBBYYSE3HQ6BBSMLNUQ34T6TZMYMW2EVH34XOWMA) |
| USDC SAC (Circle USDC) | [`CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75`](https://stellar.expert/explorer/public/contract/CCW67TSZV3SSS2HXMBQ5JFGCKJNXKZM7UQUWUZPUTHXSTZLEO7SJMI75) |

Confidential Token mode is **testnet-only** by design (verifier maturity), so it has no mainnet row.

### CCTP infrastructure the bridge uses

Circle's CCTP contracts on Stellar (testnet / mainnet): token messenger minter [`CDNG7HXA…`](https://stellar.expert/explorer/testnet/contract/CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP) / [`CAE2G5Z7…`](https://stellar.expert/explorer/public/contract/CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL), message transmitter [`CBJ6MTCK…`](https://stellar.expert/explorer/testnet/contract/CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY) / [`CACMENFF…`](https://stellar.expert/explorer/public/contract/CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV), CCTP forwarder [`CA66Q2WF…`](https://stellar.expert/explorer/testnet/contract/CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ) / [`CBZL2IH7…`](https://stellar.expert/explorer/public/contract/CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T). The EVM-side USDC and TokenMessenger addresses for Ethereum, Base, Arbitrum, and OP Sepolia are in `packages/core/src/networks.ts`.

## Evidence

Every claim above is backed by accepted on-chain transactions — every hash below links straight to the right explorer for its network (stellar.expert for Stellar testnet/mainnet; Etherscan/Basescan/Arbiscan/OP Etherscan for the EVM chains).

| Flow | Network | Evidence |
|---|---|---|
| USDC shield | Stellar testnet | [`880035…247405`](https://stellar.expert/explorer/testnet/tx/8800355227878c9dc227b6a69972619928421fd478a537bbc65b333929247405) |
| USDC shielded transfer | Stellar testnet | [`3f20d1…2ce698`](https://stellar.expert/explorer/testnet/tx/3f20d183abccd9ddb0c7bfd437c5151772268a48eed1d28e3e023c5b422ce698) |
| USDC unshield | Stellar testnet | [`9042a1…d413ed`](https://stellar.expert/explorer/testnet/tx/9042a1e9936751c95e2578d96bb278098bdc43e28a73563b492a5b622cd413ed) |
| Sepolia USDC approval | Ethereum Sepolia | [`0xb365…fb210e`](https://sepolia.etherscan.io/tx/0xb36509d192cf20d7c8dfd60e66044e603af7ae3c09b4118f3be0e0a437fb210e) |
| Sepolia CCTP burn | Ethereum Sepolia | [`0x526f…05798f`](https://sepolia.etherscan.io/tx/0x526f2961da88156fef643e630b92df7a2b35be96e22a6c810927f200f405798f) |
| Stellar CCTP mint/forward | Stellar testnet | [`3af0d0…158790`](https://stellar.expert/explorer/testnet/tx/3af0d0be38b048db1009a59c521ddf191a8c02a5b68047620f27d38949158790) |
| ASP membership insert | Stellar testnet | [`b42049…776a64`](https://stellar.expert/explorer/testnet/tx/b42049373d26d0f1120c3c339cae5de5a8870511710ae10625124aee18776a64) |
| Post-bridge USDC shield | Stellar testnet | [`30dd19…6b911d`](https://stellar.expert/explorer/testnet/tx/30dd198bebec377e4589240073fd22d6eb7f5041de0753ddc8f9e856be6b911d) |
| Base Sepolia USDC approval | Base Sepolia | [`0xd8b1…681d3e`](https://sepolia.basescan.org/tx/0xd8b1724e3b65a8169b033aba17eb0536babf38fcddad0f9ae78dfe8870681d3e) |
| Base Sepolia CCTP burn | Base Sepolia | [`0x8802…f2cd63`](https://sepolia.basescan.org/tx/0x88028771b02dac65423d638349024930087a7c371c77936b513ddca752f2cd63) |
| Base Stellar CCTP mint/forward | Stellar testnet | [`08df05…293e11`](https://stellar.expert/explorer/testnet/tx/08df05fe661f35dcf42c5ab054ae2bd404ed31091a629d963647ca3d5b293e11) |
| Base post-bridge USDC shield | Stellar testnet | [`b1e1ca…acd87a`](https://stellar.expert/explorer/testnet/tx/b1e1ca6e81fb34d2d7218099722c0f9b76e3a7a2debf29e90701592da6acd87a) + [`6e9369…da215d`](https://stellar.expert/explorer/testnet/tx/6e9369c5c9e0d3d5226f0af63ec75f4ec49176ede1cc7c0f0b19ce004dda215d) |
| Arbitrum Sepolia USDC approval | Arbitrum Sepolia | [`0x53d1…b210a4`](https://sepolia.arbiscan.io/tx/0x53d17d1ada27bae89036cce765173984b20e1edc24b5c1e8fa872524e4b210a4) |
| Arbitrum Sepolia CCTP burn | Arbitrum Sepolia | [`0xcf0c…a2b3a7`](https://sepolia.arbiscan.io/tx/0xcf0c0e093fc3fc8cfa8310e1b423e400fb157aa263b6d5187488f9d053a2b3a7) |
| Arbitrum Stellar CCTP mint/forward | Stellar testnet | [`730edc…5e16d1`](https://stellar.expert/explorer/testnet/tx/730edcfa3b3eddf279f5dc0dd338ef3aa9f96616e0efcbe2f709abefad5e16d1) |
| Arbitrum ASP membership insert | Stellar testnet | [`8a13e5…23d60b`](https://stellar.expert/explorer/testnet/tx/8a13e5a8d91e447f3ee9a8156be5ab33fa0bdb89a6a91ef0be0f4ce8f523d60b) |
| Arbitrum post-bridge USDC shield | Stellar testnet | [`a2aa11…924648`](https://stellar.expert/explorer/testnet/tx/a2aa117ef0973f979cad85b3c4387fd056d99d5f3fe20af8de107a502c924648) |
| OP Sepolia USDC approval | OP Sepolia | [`0x2e26…2111f4`](https://sepolia-optimism.etherscan.io/tx/0x2e264ca0dbfee0865ae9e32ddd9702693f2b39c37c21804e781d86a96a2111f4) |
| OP Sepolia CCTP burn | OP Sepolia | [`0x817d…2e0a82`](https://sepolia-optimism.etherscan.io/tx/0x817d31c2af0407e35b1279ec731e50ff3665431a444ca5b271e2e3691c2e0a82) |
| OP Stellar CCTP mint/forward | Stellar testnet | [`dc1c3f…9f8b1f`](https://stellar.expert/explorer/testnet/tx/dc1c3f77bacf4da21035c3059dbb5dae81bc9e8f3dfd83477a5c0fe9069f8b1f) |
| OP ASP membership insert | Stellar testnet | [`3fb620…b9958c`](https://stellar.expert/explorer/testnet/tx/3fb620d5ecf5eaa90cdcff3a6b5890b389b2ac79d199c45d36e1e81698b9958c) |
| OP post-bridge USDC shield | Stellar testnet | [`820537…8e1344`](https://stellar.expert/explorer/testnet/tx/8205379a7d00710820b1b7e96a2eac6c4b7816b29185771bd00328abd18e1344) |
| Extension QuickShield XLM setup | Stellar testnet | [`a63a09…08de90`](https://stellar.expert/explorer/testnet/tx/a63a093009bb9cf337a96f52ceb4e823461e292f035691211bc6994a5f08de90) |
| Extension QuickShield XLM shield | Stellar testnet | [`a66314…8e135b`](https://stellar.expert/explorer/testnet/tx/a66314255cb75f9e15ca6bd5641ec1eeeb6a9419baa1b84890d7003ae78e135b) |
| Extension QuickShield USDC receive setup | Stellar testnet | [`258d67…555adc`](https://stellar.expert/explorer/testnet/tx/258d671b27b36196d6b0d31a94a686bb07251ea2ceba5db654879383d7555adc) |
| Reusable extension USDC funder setup | Stellar testnet | [`986551…a9cbf8`](https://stellar.expert/explorer/testnet/tx/9865511b6e57101563dc1ab574cc997ea8559210cf5718a39d11a8f003a9cbf8) |
| Extension QuickShield USDC fund transfer | Stellar testnet | [`b8b17c…3098cf`](https://stellar.expert/explorer/testnet/tx/b8b17c66909ad24d6986408badacfc6986051c281a44a54e9c30d1e4243098cf) |
| Extension QuickShield USDC setup | Stellar testnet | [`4fdc92…1b2cfa`](https://stellar.expert/explorer/testnet/tx/4fdc92e9df466d506a3e0c0237f2fd87eddbe65a788a260efaed78b8511b2cfa) |
| Extension QuickShield USDC shield | Stellar testnet | [`0bc63c…010e17`](https://stellar.expert/explorer/testnet/tx/0bc63cf0b7212d961d880acae3a3b72ae939e2a0fdf65c538b828684f6010e17) |
| Mainnet USDC trustline | Stellar mainnet | [`ca4fe0…eb4ef7`](https://stellar.expert/explorer/public/tx/ca4fe0556c8a71c32c4634c3e8ad282a230e71377c6d7771e50daced7aeb4ef7) |
| Mainnet XLM to USDC path payment | Stellar mainnet | [`439b8b…ecefae`](https://stellar.expert/explorer/public/tx/439b8b609c03ab890da55912529b767eeb6974128d9c9afbdf860416f9ecefae) |
| Mainnet ASP permission toggle | Stellar mainnet | [`2585fe…4d2e7a`](https://stellar.expert/explorer/public/tx/2585feaadbaa0b201bf52522bddecdc687b6d3512a9fd6f2a8ac2613484d2e7a) |
| Mainnet Extension QuickShield XLM setup | Stellar mainnet | [`8afa10…71c3ce`](https://stellar.expert/explorer/public/tx/8afa10dbcf6c82ba56f0f0abf96d00e5af55190f9a985aecc52147c34271c3ce) |
| Mainnet Extension QuickShield XLM shield | Stellar mainnet | [`269f09…545179`](https://stellar.expert/explorer/public/tx/269f09422639580ff3b5642b03a02a24c9e20c63dae12507b005352ba4545179) |
| Mainnet Extension QuickShield USDC receive setup | Stellar mainnet | [`1acef0…e555e5`](https://stellar.expert/explorer/public/tx/1acef069110b3015b72c8ad5df13b9647480e3af952188581921e56cfae555e5) |
| Mainnet Extension QuickShield USDC fund transfer | Stellar mainnet | [`858130…dcd658`](https://stellar.expert/explorer/public/tx/8581307efcb3ad4f1ed9b9789f595cf6c1a44018dc62432d6372b4463adcd658) |
| Mainnet Extension QuickShield USDC setup | Stellar mainnet | [`84c33d…56d65c`](https://stellar.expert/explorer/public/tx/84c33d8ff7798a5be616b0c402265be9cbd9518674dd75f00443cfdc1e56d65c) |
| Mainnet Extension QuickShield USDC shield | Stellar mainnet | [`a3fb05…4aedcb`](https://stellar.expert/explorer/public/tx/a3fb0596b7cf5d79f093dcca9ff4faa6c5975499a1d36afdcf1a893f554aedcb) |
| Mainnet XLM shielded transfer | Stellar mainnet | [`5a1523…2548cd`](https://stellar.expert/explorer/public/tx/5a1523cfe48c3cab8adca44ca1d6518585b8d5bfa20afa8e2372f59fdb2548cd) |
| Mainnet XLM unshield | Stellar mainnet | [`df5440…4e1a70`](https://stellar.expert/explorer/public/tx/df5440dd80e45daf7068c66fa225a20f8167c686244ee084268df8db3f4e1a70) |
| Mainnet USDC shielded transfer | Stellar mainnet | [`5317b8…221aa1`](https://stellar.expert/explorer/public/tx/5317b8266ef93b84a6ab9f40eb5b157c5838b6b9a0826d60a6d6daf36a221aa1) |
| Mainnet USDC unshield | Stellar mainnet | [`2dd895…64531b`](https://stellar.expert/explorer/public/tx/2dd8955cd57aa35b46a0ac944380afb12ac1b82da44f8cf8ab6a9d283064531b) |

Deeper records (explorer links, balances, and the submission audit) live in [`docs/SUBMISSION-PACKAGE.md`](docs/SUBMISSION-PACKAGE.md).

### What we do NOT claim

- Not "anonymous", "fully private", or "untraceable" — shield, unshield, and bridge arrivals are public, and correlation (amounts, timing, pool size) is real.
- Mainnet **bridge-to-shield** has no accepted evidence yet and is not claimed (mainnet QuickShield, shielded transfer, and unshield are proven above).
- Atomic bridge-and-shield is deferred; the proven path is public CCTP arrival, then a separate shield.
- Confidential Token mode is a testnet-only, unaudited preview.
- The extension intentionally **fails closed** for external dApp public-key access and signing — it is a privacy wallet, not a general signer.

## Try it (5 minutes, testnet)

1. `pnpm web:dev`, create a wallet (12-word seed → vault password), note the visible network badge.
2. Add testnet funds (one click — the hosted faucet delivers XLM + USDC and sets up USDC receiving automatically).
3. Shield 1 USDC: setup, pool sync, on-device proof, and submit run as one flow; the deposit is labeled a public boundary.
4. Copy your `zkf1…` receive code, send yourself a shielded transfer, watch the proof generate on-device.
5. Unshield to a public address — the app tells you exactly what becomes visible before you confirm.
6. Open Disclosure to produce a read-only compliance receipt for any note.

## Verification commands

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build   # full gates
pnpm extension:runtime      # extension popup/runtime smoke (Chrome for Testing)
pnpm extension:quickshield  # real funded shield through the extension, end to end
pnpm docs:check             # docs consistency
```

## Credits and licenses

- **Nethermind `stellar-private-payments`** supplies the shielded-pool engine: circuits (Circom/Groth16), browser prover (Rust→WASM), and Soroban pool contracts. Mostly Apache-2.0; `circuits/build.rs` under LGPLv3. ZK Freighter's contribution on this path is the wallet product: multi-surface UX, ASP access orchestration, receive codes, disclosure, bridge-to-shield, and services.
- **Circle `stellar-cctp`** supplies the Stellar CCTP V2 reference (Apache-2.0).
- **OpenZeppelin/SDF Confidential Tokens** preview informs Confidential Token mode (testnet-only).
- Stellar/SDF documentation for Soroban, BN254, Poseidon2, SAC/USDC, and network context.
