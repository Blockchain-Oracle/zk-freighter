# ZK Fighter Submission Package

## Copy Block

**Project name:** ZK Fighter

**Short description:** A privacy-by-default, self-custody ZK wallet for shielded XLM and USDC transfers on Stellar, with a safe CCTP bridge-then-shield path and an evidence-backed WXT QuickShield extension companion.

**Built for:** Stellar Hacks: Real-World ZK

**Primary demo network:** Stellar testnet and Ethereum Sepolia. Mainnet XLM/USDC QuickShield and private-loop smokes exist as recorded evidence, not the default live demo path.

**Repository focus:** The web app is the safest judged surface. The extension is included as extra runtime evidence for QuickShield and bridge handoff, not as a general dApp signing wallet.

## What We Built

ZK Fighter gives users a seed-backed wallet, encrypted local vault, deterministic private receive code, and shielded transfer UX around the Nethermind Stellar privacy-pool engine. Users can shield public XLM or USDC into a privacy pool, send shielded value, unshield back to a public Stellar address, and export disclosure evidence for compliance.

The bridge flow uses the safe two-step path:

1. Public CCTP bridge from Sepolia USDC to Stellar testnet USDC.
2. Separate Stellar USDC shield/deposit into the privacy pool.

The browser extension is a ZK companion. It can unlock the ZK Fighter wallet, show receive/deposit plumbing, run QuickShield for XLM and USDC with real Chrome runtime evidence, and hand off to the web bridge route. It intentionally does not expose arbitrary public dApp signing.

## Load-Bearing ZK

ZK is not decorative here. The wallet uses the Nethermind privacy-pool circuit and browser prover path to generate Groth16 proofs for shielded pool actions. Stellar/Soroban contracts verify the proof path for the pool. The app also records proof-state evidence, tampered-proof rejection evidence, and public boundary transactions.

## Evidence Digest

| Flow | Network | Evidence |
|---|---|---|
| USDC shield | Stellar testnet | `8800355227878c9dc227b6a69972619928421fd478a537bbc65b333929247405` |
| USDC shielded transfer | Stellar testnet | `3f20d183abccd9ddb0c7bfd437c5151772268a48eed1d28e3e023c5b422ce698` |
| USDC unshield | Stellar testnet | `9042a1e9936751c95e2578d96bb278098bdc43e28a73563b492a5b622cd413ed` |
| Sepolia USDC approval | Ethereum Sepolia | `0xb36509d192cf20d7c8dfd60e66044e603af7ae3c09b4118f3be0e0a437fb210e` |
| Sepolia CCTP burn | Ethereum Sepolia | `0x526f2961da88156fef643e630b92df7a2b35be96e22a6c810927f200f405798f` |
| Stellar CCTP mint/forward | Stellar testnet | `3af0d0be38b048db1009a59c521ddf191a8c02a5b68047620f27d38949158790` |
| ASP membership insert | Stellar testnet | `b42049373d26d0f1120c3c339cae5de5a8870511710ae10625124aee18776a64` |
| Post-bridge USDC shield | Stellar testnet | `30dd198bebec377e4589240073fd22d6eb7f5041de0753ddc8f9e856be6b911d` |
| Extension QuickShield XLM setup | Stellar testnet | `a63a093009bb9cf337a96f52ceb4e823461e292f035691211bc6994a5f08de90` |
| Extension QuickShield XLM shield | Stellar testnet | `a66314255cb75f9e15ca6bd5641ec1eeeb6a9419baa1b84890d7003ae78e135b` |
| Extension QuickShield USDC fund transfer | Stellar testnet | `b8b17c66909ad24d6986408badacfc6986051c281a44a54e9c30d1e4243098cf` |
| Extension QuickShield USDC setup | Stellar testnet | `4fdc92e9df466d506a3e0c0237f2fd87eddbe65a788a260efaed78b8511b2cfa` |
| Extension QuickShield USDC shield | Stellar testnet | `0bc63cf0b7212d961d880acae3a3b72ae939e2a0fdf65c538b828684f6010e17` |
| Mainnet ASP permission toggle | Stellar mainnet | `2585feaadbaa0b201bf52522bddecdc687b6d3512a9fd6f2a8ac2613484d2e7a` |
| Mainnet Extension QuickShield XLM setup | Stellar mainnet | `8afa10dbcf6c82ba56f0f0abf96d00e5af55190f9a985aecc52147c34271c3ce` |
| Mainnet Extension QuickShield XLM shield | Stellar mainnet | `269f09422639580ff3b5642b03a02a24c9e20c63dae12507b005352ba4545179` |
| Mainnet Extension QuickShield USDC receive setup | Stellar mainnet | `1acef069110b3015b72c8ad5df13b9647480e3af952188581921e56cfae555e5` |
| Mainnet Extension QuickShield USDC fund transfer | Stellar mainnet | `8581307efcb3ad4f1ed9b9789f595cf6c1a44018dc62432d6372b4463adcd658` |
| Mainnet Extension QuickShield USDC setup | Stellar mainnet | `84c33d8ff7798a5be616b0c402265be9cbd9518674dd75f00443cfdc1e56d65c` |
| Mainnet Extension QuickShield USDC shield | Stellar mainnet | `a3fb0596b7cf5d79f093dcca9ff4faa6c5975499a1d36afdcf1a893f554aedcb` |
| Mainnet XLM shielded transfer | Stellar mainnet | `5a1523cfe48c3cab8adca44ca1d6518585b8d5bfa20afa8e2372f59fdb2548cd` |
| Mainnet XLM unshield | Stellar mainnet | `df5440dd80e45daf7068c66fa225a20f8167c686244ee084268df8db3f4e1a70` |
| Mainnet USDC shielded transfer | Stellar mainnet | `5317b8266ef93b84a6ab9f40eb5b157c5838b6b9a0826d60a6d6daf36a221aa1` |
| Mainnet USDC unshield | Stellar mainnet | `2dd8955cd57aa35b46a0ac944380afb12ac1b82da44f8cf8ab6a9d283064531b` |
| Extension bridge handoff | Local Chrome runtime | `pnpm extension:bridge` opened the web bridge route with network, destination, and resume hash. |
| Extension offscreen dry proof | Local Chrome runtime + Stellar testnet ASP | `pnpm extension:runtime:deep` generated a dry XLM proof after ASP insert `f18a1e7666ef827da5636d810ba26afc4d3808bf8d56a6b2249cbe7b2aaaec17`. |

Full evidence, explorer links, balance notes, and failure fixes are in `.thoughts/research/spikes-log.md`.

## Demo Video Script

1. Open the web app on testnet and create or unlock the seed-backed wallet.
2. Show the private receive code as raw `zkf1...` text and QR.
3. Show the public boundary copy: shield/deposit and unshield/withdraw are public.
4. Demonstrate or replay the USDC loop: shield, shielded transfer, unshield.
5. Show load-bearing ZK evidence: proof generated, valid proof accepted, tampered proof rejected.
6. Show CCTP bridge-then-shield evidence: Sepolia approval, burn, Iris attestation, Stellar mint/forward, ASP insert, separate USDC shield.
7. Show disclosure/export as user-held compliance evidence.
8. Optionally show the extension: receive plumbing, QuickShield XLM/USDC evidence, and bridge handoff.
9. Close with honest boundaries: testnet remains the safest live demo, mainnet XLM/USDC QuickShield and private-loop smokes have recorded evidence, unaudited, no mainnet bridge claim, no atomic bridge claim, no public dApp signing claim.

## Non-Claims

- No mainnet bridge-to-shield is claimed yet.
- No atomic bridge-and-shield is claimed.
- No extension-native Ethereum provider bridge is claimed.
- No Freighter-compatible dApp signing wallet is claimed.
- No Wallets Kit compatibility is claimed.
- No Chrome Web Store publishing is claimed.
- No audited production-funds safety is claimed.

## Future Tracks

- Mainnet deployment after explicit approval, funding, and recorded evidence.
- Atomic bridge-and-shield only after a custom adapter passes real tests.
- Confidential Token wallet mode as a separate privacy lane for private amounts between public addresses.
- Mobile app after the web and extension surfaces are submission-stable.
