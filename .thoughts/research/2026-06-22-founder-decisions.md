# Founder Decisions: ZK Fighter

Date: 2026-06-22

These are product decisions from the founder conversation. They are inputs to the spec and research-backed plan, not implementation work.

## Locked

- **Brand/product name:** ZK Fighter.
- **Receive model:** include both modes in the MVP:
  - Private code sharing by default.
  - Optional public key publishing/discoverability for users who choose it.
- **Default privacy stance:** private receive code is shared directly unless the user opts into publishing.
- **Publishing copy requirement:** explain that publishing does not expose private keys or funds, but it creates a public on-chain link from the user's public Stellar identity to that private receive identity.
- **Bridge MVP scope:** safe two-step bridge then shield:
  1. CCTP brings USDC publicly onto Stellar.
  2. ZK Fighter shields that USDC into the privacy pool with a separate transaction.
- **Atomic bridge-and-shield:** not locked for MVP. It is a research/spike candidate only, and must not be claimed until a custom adapter proves it with real tests.
- **Network posture:** testnet first, mainnet-capable from the beginning.
- **Mainnet posture:** once testnet is working, mainnet can be tested/published with explicit care around real funds, deployed contract IDs, and unsupported features.
- **Testing posture:** test continuously while building; do not wait until the end.

## Working Direction

- Web app is the first surface to prove the core wallet loop.
- Extension remains a desired target, built from shared core logic rather than as a separate product.
- WXT/MV3 constraints must be handled honestly: proving should not live in the background service worker, and passkey ceremonies should use a tab/page/side panel instead of an action popup.

## Open Until Spec

- Exact user-facing name for optional publishing:
  - "Make my private code discoverable"
  - "Publish private receive keys"
  - "Let people find my private code"
- Whether optional publishing ships in the first working slice or after direct private-code transfers are working.
- Exact mainnet feature gates if USDC pool or bridge contracts are not deployed on mainnet by demo time.
