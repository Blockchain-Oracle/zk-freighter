# Reality Research: Multichain CCTP Bridge

## Scope

Check whether ZK Fighter's CCTP bridge should stay Ethereum-only or expand to other source chains, especially Base and Arbitrum. This is a current-reality pass for the bridge-in path: source-chain USDC -> public Stellar USDC -> separate ZK Fighter shield/deposit.

## Sources Checked

- Context7:
  - `npx ctx7@latest library "Circle CCTP" "Circle CCTP V2 supported chains and domains Stellar Ethereum Base Arbitrum Optimism Avalanche Polygon mainnet testnet contract addresses USDC"`
  - `npx ctx7@latest docs /llmstxt/developers_circle_llms-full_txt "Circle CCTP V2 supported chains domains contract addresses USDC Stellar Ethereum Base Arbitrum Optimism Avalanche Polygon mainnet testnet"`
- Official Circle docs:
  - Circle CCTP supported chains and domains: https://developers.circle.com/cctp/concepts/supported-chains-and-domains
  - Circle CCTP EVM contract addresses: https://developers.circle.com/cctp/references/contract-addresses
  - Circle CCTP on Stellar: https://developers.circle.com/cctp/references/stellar
  - Circle Stellar contracts and interfaces: https://developers.circle.com/cctp/references/stellar-contracts
  - Circle USDC contract addresses: https://developers.circle.com/stablecoins/usdc-contract-addresses
  - Circle Stellar transfer quickstart: https://developers.circle.com/cctp/quickstarts/transfer-usdc-stellar-arc
- Official chain docs:
  - Base network details: https://docs.base.org/base-chain/quickstart/connecting-to-base
  - Arbitrum chain info: https://docs.arbitrum.io/for-devs/dev-tools-and-resources/chain-info
  - OP network details: https://docs.optimism.io/op-mainnet/network-information/connecting-to-op
  - Avalanche C-Chain details: https://build.avax.network/docs/primary-network
  - Polygon PoS RPC/network details: https://docs.polygon.technology/pos/reference/rpc-endpoints
- Local repo files:
  - `README.md`
  - `docs/VERIFIED-FACTS.md`
  - `.thoughts/research/2026-06-25-mainnet-readiness.md`
  - `packages/core/src/networks.ts`
  - `packages/core/src/cctp-bridge.ts`
  - `packages/core/src/cctp-types.ts`
  - `apps/extension/src/ExtensionBridgePanel.tsx`

## Verified Facts

### CCTP is not Ethereum-only

- Circle CCTP supports multiple source domains, including Ethereum, Avalanche, OP Mainnet, Arbitrum, Base, Polygon PoS, Unichain, Solana, Stellar, and others.
- Circle assigns CCTP domains separately from EVM chain IDs. Relevant domains:
  - Ethereum: `0`
  - Avalanche: `1`
  - OP Mainnet: `2`
  - Arbitrum: `3`
  - Base: `6`
  - Polygon PoS: `7`
  - Unichain: `10`
  - Stellar: `27`
- Circle docs state that if a mainnet is listed, its official testnet is supported too.
- Circle docs say USDC is supported on all CCTP domains except BNB Smart Chain. BNB Smart Chain is USYC-only in the current CCTP table.

### Stellar remains a special destination

- Circle docs say inbound transfers to Stellar should use `CctpForwarder`.
- On EVM source burns targeting Stellar, both `mintRecipient` and `destinationCaller` must be the Stellar `CctpForwarder` contract.
- `hookData` carries the final Stellar `forwardRecipient` strkey. The forward recipient can be a `G...`, `M...`, or `C...` address.
- Circle warns that wrong `mintRecipient` or wrong `destinationCaller` can leave funds stuck.
- Stellar USDC has 7 display decimals, while the CCTP message `amount` field uses 6-decimal subunits regardless of direction.

### Current Stellar CCTP IDs match our config

Mainnet, domain `27`:

- `TokenMessengerMinter`: `CAE2G5Z77UP7GYPYGFOWFGW7C7J6I4YP2AFGSADRKQY62SYUFLPNFTXL`
- `MessageTransmitter`: `CACMENFFJPJMSDAJQLX4R7K3SFZIW2LJSE3R2UMLGSWHFHS353FVXAZV`
- `CctpForwarder`: `CBZL2IH7F6BIDAA3WBNXYKIXSATJGMSW7K5P5MJ6STX5RXN47TZJDF5T`

Testnet, domain `27`:

- `TokenMessengerMinter`: `CDNG7HXAPBWICI2E3AUBP3YZWZELJLYSB6F5CC7WLDTLTHVM74SLRTHP`
- `MessageTransmitter`: `CBJ6MTCKKZG73PMDZCJMSFRD7DQEMI4FKDH7CGDSV4W6FHCRBCQAVVJY`
- `CctpForwarder`: `CA66Q2WFBND6V4UEB7RD4SAXSVIWMD6RA4X3U32ELVFGXV5PJK4T4VSZ`

### EVM CCTP contract IDs are shared for the first priority chains

Mainnet EVM `TokenMessengerV2`:

- Ethereum, Avalanche, OP Mainnet, Arbitrum, Base, Polygon PoS, and Unichain use `0x28b5a0e9C621a5BadaA536219b3a228C8168cf5d`.

Mainnet EVM `MessageTransmitterV2`:

- Ethereum, Avalanche, OP Mainnet, Arbitrum, Base, Polygon PoS, and Unichain use `0x81D40F21F12A8F0E3252Bccb954D722d4c464B64`.

Testnet EVM `TokenMessengerV2`:

- Ethereum Sepolia, Avalanche Fuji, OP Sepolia, Arbitrum Sepolia, Base Sepolia, Polygon PoS Amoy, and Unichain Sepolia use `0x8FE6B999Dc680CcFDD5Bf7EB0974218be2542DAA`.

Testnet EVM `MessageTransmitterV2`:

- Ethereum Sepolia, Avalanche Fuji, OP Sepolia, Arbitrum Sepolia, Base Sepolia, Polygon PoS Amoy, and Unichain Sepolia use `0xE737e5cEBEEBa77EFE34D4aa090756590b1CE275`.

### Candidate EVM source chain facts

| Source | CCTP domain | Mainnet chain ID | Testnet chain ID | Mainnet USDC | Testnet USDC |
|---|---:|---:|---:|---|---|
| Ethereum / Sepolia | 0 | 1 | 11155111 | `0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48` | `0x1c7D4B196Cb0C7B01d743Fbc6116a902379C7238` |
| Base / Base Sepolia | 6 | 8453 | 84532 | `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913` | `0x036CbD53842c5426634e7929541eC2318f3dCF7e` |
| Arbitrum One / Arbitrum Sepolia | 3 | 42161 | 421614 | `0xaf88d065e77c8cC2239327C5EDb3A432268e5831` | `0x75faf114eafb1BDbe2F0316DF893fd58CE46AA4d` |
| OP Mainnet / OP Sepolia | 2 | 10 | 11155420 | `0x0b2C639c533813f4Aa9D7837CAf62653d097Ff85` | `0x5fd84259d66Cd46123540766Be93DFE6D43130D7` |
| Avalanche C-Chain / Fuji | 1 | 43114 | 43113 | `0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E` | `0x5425890298aed601595a70AB815c96711a31Bc65` |
| Polygon PoS / Amoy | 7 | 137 | 80002 | `0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359` | `0x41E94Eb019C0762f9Bfcf9Fb1E58725BfB0e7582` |

Gas token notes:

- Ethereum, Base, Arbitrum, and OP use ETH as the source-chain gas token.
- Avalanche uses AVAX.
- Polygon PoS/Amoy uses POL in current Polygon docs.

### Pre-implementation ZK Fighter code was single-source-chain

- `packages/core/src/networks.ts` defines `CctpConfig.evmSource`, singular.
- Testnet `evmSource` is Ethereum Sepolia only.
- Mainnet `evmSource` is Ethereum mainnet only.
- `packages/core/src/cctp-bridge.ts` calls `config.cctp.evmSource` directly and has user-facing progress strings that say `Ethereum`.
- `resumeCctpBridgeToStellar` polls Iris using the single configured `evmSource.domain`; with multiple source chains, a burn hash alone is not enough. Resume state must also store the selected source chain/domain.
- `packages/core/src/cctp-types.ts` has `sourceChain?: string` on reports, but run/resume options do not include a source-chain selector.
- `apps/extension/src/ExtensionBridgePanel.tsx` still says `Ethereum Sepolia USDC via Circle CCTP` for the bridge handoff.
- This subsection is historical. The implementation follow-up below records the current multichain source registry and handoff changes.

### Current evidence state

- ZK Fighter already has real Sepolia -> Stellar testnet -> USDC shield evidence.
- ZK Fighter already has mainnet XLM/USDC pool deployments, QuickShield, shielded transfer, and unshield evidence.
- ZK Fighter does not yet have accepted mainnet bridge-to-shield evidence.
- ZK Fighter does not yet have Base Sepolia, Arbitrum Sepolia, Base mainnet, or Arbitrum mainnet CCTP evidence.

## Inferences

- The right product statement is "bridge USDC from supported CCTP chains into Stellar, then shield separately." It should not be "Ethereum bridge" as a hard product limit.
- The best next source chains are Base Sepolia and Arbitrum Sepolia because they use the same EVM CCTP call path as Ethereum Sepolia, are officially CCTP-supported, and are cheaper than Ethereum L1 for real mainnet testing.
- OP Sepolia is also a straightforward EVM addition. Avalanche and Polygon are feasible but add different gas-token UX, so they are slightly less clean for the first multichain demo.
- Non-EVM sources such as Solana and Starknet are real CCTP domains, but they need different wallet connection, signing, address encoding, and testing paths. They should not block the EVM multichain bridge.
- Stellar -> EVM bridge-out is supported by Circle's Stellar quickstart pattern, but it is a different product flow from ZK Fighter's current inbound "bridge then shield" story.
- Mainnet Ethereum should stay available as a supported route, but Base or Arbitrum should be the preferred mainnet evidence route because the source-chain gas risk is much lower.

## Unknowns And Questions

- Which source-chain wallet/funding will Abu provide first for real testnet evidence: Base Sepolia, Arbitrum Sepolia, OP Sepolia, or all three.
- The headless runner removes the injected-wallet dependency for evidence. Browser wallet network-switching is still useful for manual UI demos, but not required for accepted bridge hashes.
- Whether Circle faucet availability is currently smooth for every chosen testnet. The docs link the faucet, but live availability must be checked during the actual evidence run.
- Whether mainnet bridge-to-shield should use Base or Arbitrum first. Base is the current default for user familiarity and cost.
- Whether to include Polygon/Avalanche in the visible UI immediately or keep them behind an "advanced / more routes" section until they have hashes.

## Not Included

- Original research pass did not include code changes; see implementation follow-up below.
- No new chain transactions.
- No Base/Arbitrum/OP/Avalanche/Polygon bridge evidence.
- No mainnet bridge-to-shield evidence.
- No atomic bridge-and-shield claim.
- No non-EVM wallet integration plan beyond identifying it as separate work.

## Implementation Follow-Up

2026-06-25:

- ZK Fighter now has an EVM source-chain registry in `packages/core/src/networks.ts`.
- Configured active source chains are Ethereum, Base, Arbitrum, and OP for both testnet and mainnet.
- The bridge runner accepts a `sourceChainKey` and uses the selected source domain, chain ID, USDC contract, TokenMessenger, and explorer URL.
- Web bridge resume storage now records the selected source chain with the burn hash.
- Extension bridge handoff can pass the selected source chain to the web route.
- A headless evidence runner is now available through `pnpm cctp:bridge:testnet` and `pnpm cctp:bridge:mainnet`. It stores EVM private keys and the bridge destination mnemonic under `/Users/abu/.config/zk-fighter`, outside the repo.
- The runner uses one shared local EVM address per network across configured EVM sources, so Base/Arbitrum/OP/Ethereum testnet funding can target the same public address.
- Base Sepolia now has accepted public bridge-leg evidence: approval, burn, Iris attestation, and Stellar mint/forward. It does not yet have the separate post-bridge USDC shield hash.
- No Arbitrum/OP chain evidence has been recorded yet.
