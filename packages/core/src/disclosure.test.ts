import { describe, expect, it } from 'vitest'
import { deriveWalletIdentity } from './identity'
import type { NethermindWebModule } from './nethermind-runtime'
import {
  generateDisclosureArtifact,
  parseDisclosureArtifact,
  verifyDisclosureArtifact,
} from './disclosure'
import {
  CANONICAL_SELECTIVE_DISCLOSURE_1_VK_HASH,
  DISCLOSURE_ARTIFACT_KIND,
  type DisclosureReceipt,
} from './disclosure-types'
import type { XlmShieldedNote } from './xlm-private-types'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const xlmPoolId = 'CCCHESF5HNGMCP5ZLGFBKBTW23YXNAJ6LTGSK7CO3FKFIVEHFE3CD4LZ'
const mainnetXlmPoolId = 'CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE'
const note: XlmShieldedNote = {
  id: '0x' + '11'.repeat(32),
  amountStroops: '10000000',
  spent: false,
  leafIndex: 7,
  createdAtLedger: 3_245_000,
}

function moduleForClient(client: unknown): NethermindWebModule {
  return {
    Config: class {
      constructor(_rpcUrl: string, _bootnodeUrl?: string, _backgroundEvents?: boolean) {}
    },
    default: async () => undefined,
    mainThread: async () => ({ webClient: client }),
  } as NethermindWebModule
}

function receipt(overrides: Partial<DisclosureReceipt> = {}): DisclosureReceipt {
  return {
    version: 1,
    circuit: {
      name: 'selectiveDisclosure_1',
      levels: 10,
      nNotes: 1,
      vkHash: CANONICAL_SELECTIVE_DISCLOSURE_1_VK_HASH,
    },
    context: {
      network: 'testnet',
      poolAddress: xlmPoolId,
      authorityLabel: 'Reviewer',
      authorityIdentityPayloadHex: '0x7265766965776572',
      purpose: 'audit-review',
      contextNonce: '0x' + '01'.repeat(32),
    },
    publicInputs: {
      roots: ['0x' + '22'.repeat(32)],
      noteCommitments: [note.id],
      extContextHash: '0x' + '33'.repeat(32),
    },
    proofCompressedHex: '0x' + '44'.repeat(128),
    issuedAt: '2026-06-23T19:00:00Z',
    ...overrides,
  }
}

describe('disclosure artifacts', () => {
  it('generates a scoped read-only artifact through the Nethermind disclosure path', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const calls: string[] = []
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
      generateSelectiveDisclosure: async (
        poolId: string,
        userAddress: string,
        selectedCommitment: string,
        authorityLabel: string,
      ) => {
        calls.push(poolId)
        expect(userAddress).toBe(identity.stellarPublicKey)
        expect(selectedCommitment).toBe(note.id)
        expect(authorityLabel).toBe('Reviewer')
        return receipt()
      },
    }

    const report = await generateDisclosureArtifact({
      identity,
      network: 'testnet',
      asset: 'XLM',
      note,
      authorityLabel: 'Reviewer',
      authorityIdentityPayloadHex: '0x7265766965776572',
      purpose: 'audit-review',
      contextNonceHex: '0x' + '01'.repeat(32),
      importWebModule: async () => moduleForClient(client),
    })

    expect(report.status).toBe('generated')
    expect(calls).toEqual([xlmPoolId])
    expect(report.artifact?.kind).toBe(DISCLOSURE_ARTIFACT_KIND)
    expect(report.artifact?.activity.commitment).toBe(note.id)
    expect(report.artifactJson).not.toContain('privateKey')
  })

  it('verifies only when proof, context, and known-root checks pass', async () => {
    const artifact = parseDisclosureArtifact(
      JSON.stringify({
        kind: DISCLOSURE_ARTIFACT_KIND,
        version: 1,
        network: 'testnet',
        ownerAddress: 'GABC',
        activity: { asset: 'XLM', amountStroops: note.amountStroops, commitment: note.id, createdAtLedger: 1, leafIndex: 1 },
        receipt: receipt(),
        warnings: ['Read-only'],
      }),
    )
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
      verifySelectiveDisclosure: async (_json: string, expectedVkHash: string) => {
        expect(expectedVkHash).toBe(CANONICAL_SELECTIVE_DISCLOSURE_1_VK_HASH)
        return { proofVerified: true, contextVerified: true, knownRootStatus: true }
      },
    }

    const report = await verifyDisclosureArtifact({
      artifactJson: JSON.stringify(artifact),
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
    })

    expect(report.status).toBe('verified')
    expect(report.fullyVerified).toBe(true)
    expect(report.readOnly).toBe(true)
    expect(report.spendAuthorityPresent).toBe(false)
  })

  it('rejects malformed artifacts before verifier work', () => {
    expect(() => parseDisclosureArtifact('{"kind":"wrong"}')).toThrow('Invalid ZK Fighter disclosure artifact')
  })

  it('fails closed when an artifact contains spend-authority-shaped fields', async () => {
    const artifact = {
      kind: DISCLOSURE_ARTIFACT_KIND,
      version: 1,
      network: 'testnet',
      ownerAddress: 'GABC',
      activity: { asset: 'XLM', amountStroops: note.amountStroops, commitment: note.id, createdAtLedger: 1, leafIndex: 1 },
      receipt: receipt(),
      warnings: ['Read-only'],
      privateKey: 'do-not-accept',
    }

    const report = await verifyDisclosureArtifact({ artifactJson: JSON.stringify(artifact), network: 'testnet' })

    expect(report.status).toBe('failed')
    expect(report.spendAuthorityPresent).toBe(true)
    expect(report.blockers[0]).toContain('secret')
  })

  it('fails closed when the artifact network does not match the verifier network', async () => {
    const client = {
      verifySelectiveDisclosure: async () => {
        throw new Error('verifier should not run for a mismatched network')
      },
    }
    const artifact = {
      kind: DISCLOSURE_ARTIFACT_KIND,
      version: 1,
      network: 'testnet',
      ownerAddress: 'GABC',
      activity: { asset: 'XLM', amountStroops: note.amountStroops, commitment: note.id, createdAtLedger: 1, leafIndex: 1 },
      receipt: receipt(),
      warnings: ['Read-only'],
    }

    const report = await verifyDisclosureArtifact({
      artifactJson: JSON.stringify(artifact),
      network: 'mainnet',
      importWebModule: async () => moduleForClient(client),
    })

    expect(report.status).toBe('failed')
    expect(report.blockers[0]).toContain('testnet')
    expect(report.blockers[0]).toContain('mainnet')
  })

  it('generates against the configured mainnet pool when selected', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'mainnet')
    const calls: string[] = []
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
      generateSelectiveDisclosure: async (poolId: string) => {
        calls.push(poolId)
        return receipt()
      },
    }
    const report = await generateDisclosureArtifact({
      identity,
      network: 'mainnet',
      asset: 'XLM',
      note,
      authorityLabel: 'Reviewer',
      authorityIdentityPayloadHex: '0x7265766965776572',
      purpose: 'audit-review',
      contextNonceHex: '0x' + '01'.repeat(32),
      importWebModule: async () => moduleForClient(client),
    })

    expect(report.status).toBe('generated')
    expect(calls).toEqual([mainnetXlmPoolId])
  })
})
