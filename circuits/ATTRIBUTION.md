# Attribution

The Noir circuits, gadgets, and verification keys in this directory are vendored
from the OpenZeppelin / Stellar Development Foundation **Confidential Tokens**
preview:

- Source: `OpenZeppelin/stellar-contracts`, branch `feat/confidential-verifier-ultrahonk`
  (studied at commit `539968f`), path `packages/tokens/src/confidential/circuits`.
- License: as upstream (see the source repository's LICENSE).

They are vendored — not modified in substance — so ZK Fighter's confidential-token
mode can compile them with a pinned toolchain (`nargo 1.0.0-beta.11`, `bb 0.87.0`)
and reproduce the on-chain verification keys byte-for-byte (see `scripts/` and the
provenance check). The `CircuitType` ordinals and committed `vks/` are the
cross-language contract with the on-chain UltraHonk verifier and MUST NOT drift.

ZK Fighter does not claim authorship of these circuits; they remain the work of
their upstream authors. Our contribution is the wallet-side runtime, key model,
and the build/provenance integration.
