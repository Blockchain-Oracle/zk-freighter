import { describe, expect, it } from 'vitest'
import { bigIntToBytesLE, bytesToHex } from './bytes'
import {
  NETHERMIND_NOTE_PUBLIC_KEY_SK1_LE,
  NETHERMIND_POSEIDON2_T3_KAT,
  deriveNotePublicKeyFromPrivateKey,
  poseidon2Bn254T3Permutation,
} from './poseidon2-bn254'

describe('Nethermind Poseidon2 BN254 t=3 compatibility', () => {
  it('matches the reference permutation KAT', () => {
    expect(poseidon2Bn254T3Permutation(NETHERMIND_POSEIDON2_T3_KAT.input)).toEqual(
      NETHERMIND_POSEIDON2_T3_KAT.output,
    )
  })

  it('matches the reference note public key vector for private scalar one', () => {
    const publicKey = deriveNotePublicKeyFromPrivateKey(bigIntToBytesLE(1n))

    expect(bytesToHex(publicKey)).toBe(NETHERMIND_NOTE_PUBLIC_KEY_SK1_LE)
  })
})

