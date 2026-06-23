import { describe, expect, it } from 'vitest'
import {
  createPasskeyEnvelope,
  parsePasskeyEnvelope,
  unlockPasskeyEnvelope,
  type WebAuthnPrfClient,
} from './passkey'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const userName = 'GAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAWHF'
const credentialId = new Uint8Array([1, 2, 3, 4, 5, 6])
const prfA = new Uint8Array(32).fill(7)
const prfB = new Uint8Array(32).fill(9)

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  const copy = new Uint8Array(bytes.length)
  copy.set(bytes)
  return copy.buffer
}

function credential(prfOutput: Uint8Array | null, enabled = true): PublicKeyCredential {
  return {
    rawId: toArrayBuffer(credentialId),
    getClientExtensionResults: () => ({
      prf: {
        enabled,
        results: prfOutput ? { first: toArrayBuffer(prfOutput) } : undefined,
      },
    }),
  } as PublicKeyCredential
}

function client(createPrf: Uint8Array | null, getPrf = createPrf): WebAuthnPrfClient & { getCalls: number } {
  return {
    getCalls: 0,
    create: async () => credential(createPrf),
    get: async function get() {
      this.getCalls += 1
      return credential(getPrf)
    },
  }
}

describe('passkey envelope', () => {
  it('encrypts the seed with PRF output and unlocks with the same credential', async () => {
    const webauthn = client(prfA)
    const envelope = await createPasskeyEnvelope({ mnemonic, userName, client: webauthn })

    expect(envelope.ok).toBe(true)
    if (!envelope.ok) return
    expect(JSON.stringify(envelope.value)).not.toContain('abandon')
    await expect(unlockPasskeyEnvelope({ envelope: envelope.value, client: webauthn })).resolves.toEqual({
      ok: true,
      value: mnemonic,
    })
  })

  it('uses an authentication ceremony when create-time PRF output is absent', async () => {
    const webauthn = client(null, prfA)
    const envelope = await createPasskeyEnvelope({ mnemonic, userName, client: webauthn })

    expect(envelope.ok).toBe(true)
    expect(webauthn.getCalls).toBe(1)
  })

  it('fails closed when the authenticator does not enable PRF', async () => {
    const webauthn: WebAuthnPrfClient = {
      create: async () => credential(null, false),
      get: async () => credential(prfA),
    }

    await expect(createPasskeyEnvelope({ mnemonic, userName, client: webauthn })).resolves.toEqual({
      ok: false,
      error: 'prf-unsupported',
    })
  })

  it('fails closed when the ceremony is cancelled', async () => {
    const webauthn: WebAuthnPrfClient = {
      create: async () => {
        throw new Error('not allowed')
      },
      get: async () => credential(prfA),
    }

    await expect(createPasskeyEnvelope({ mnemonic, userName, client: webauthn })).resolves.toEqual({
      ok: false,
      error: 'ceremony-cancelled',
    })
  })

  it('reports invalid WebAuthn origins as unavailable', async () => {
    const webauthn: WebAuthnPrfClient = {
      create: async () => {
        throw new DOMException('invalid domain', 'SecurityError')
      },
      get: async () => credential(prfA),
    }

    await expect(createPasskeyEnvelope({ mnemonic, userName, client: webauthn })).resolves.toEqual({
      ok: false,
      error: 'webauthn-unavailable',
    })
  })

  it('rejects mismatched PRF output without returning the seed', async () => {
    const setupClient = client(prfA)
    const envelope = await createPasskeyEnvelope({ mnemonic, userName, client: setupClient })
    expect(envelope.ok).toBe(true)
    if (!envelope.ok) return

    await expect(unlockPasskeyEnvelope({ envelope: envelope.value, client: client(prfB) })).resolves.toEqual({
      ok: false,
      error: 'passkey-mismatch',
    })
  })

  it('rejects corrupt serialized passkey envelopes', () => {
    expect(parsePasskeyEnvelope('{')).toEqual({ ok: false, error: 'corrupt-passkey' })
  })
})
