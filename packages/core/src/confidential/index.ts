// Confidential-token (Track B) primitives. Fully isolated from the shielded-pool
// path: separate Grumpkin key model + Poseidon2-t4 hashing + (later) prover runtime.
export * from './poseidon2'
export * from './grumpkin'
// Proofless on-chain ops (deposit/merge) — light, no bb.js/noir runtime, safe
// to ship in the eager barrel. The proof-gated client stays lazy (see below).
export * from './soroban'
// Read-only contract views (registration, auditor key, account) — light.
export * from './reads'
// Local confidential-balance bookkeeping — pure + localStorage, no heavy deps.
export * from './balance-state'
// NOTE: ./prover is intentionally NOT re-exported here. It pulls the heavy bb.js +
// noir_js WASM runtime; keeping it out of the package barrel ensures the eager web /
// extension bundle stays light. Import it directly (or dynamically) when entering
// confidential mode: `import('@zk-fighter/core/dist/confidential/prover')` /
// the app's lazy confidential entry.
