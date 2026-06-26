// Confidential-token domain-separation tags (design doc Section 13). The integer
// values are the cross-language contract — each is the FIRST absorbed element of
// the corresponding Poseidon2 call and MUST match the circuits exactly.
//
// NOTE on the hash itself: the confidential token uses the Noir-stdlib Poseidon2
// *t4* sponge (state width 4, rate 3), which is a DIFFERENT permutation from the
// shielded pool's bb Poseidon2 *t3* (poseidon2-bn254.ts). The t4 sponge is added
// as its own KAT-gated primitive; these tags are valid for both.

export const CONFIDENTIAL_DOMAIN = {
  ADDRESS: 1n,
  VIEWING_KEY: 2n,
  DELEGATION_VIEWING_KEY: 3n,
  SPEND_RANDOMNESS: 4n,
  TX_BLINDING: 5n,
  TX_AMOUNT: 6n,
  ENCRYPTED_BALANCE: 7n,
  ENCRYPTED_ALLOWANCE: 8n,
  ALLOWANCE_RANDOMNESS: 9n,
  ESCROWED_DELEGATION_VIEWING_KEY: 10n,
  AUDITOR_SENDER: 11n,
  AUDITOR_RECIPIENT: 12n,
} as const

export type ConfidentialDomainTag = (typeof CONFIDENTIAL_DOMAIN)[keyof typeof CONFIDENTIAL_DOMAIN]
