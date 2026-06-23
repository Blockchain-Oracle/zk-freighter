import { describe, expect, it } from 'vitest'
import { bytesToHex } from './bytes'
import { deriveWalletIdentity } from './identity'
import type { NethermindWebModule, PreparedSorobanTx } from './nethermind-runtime'
import { decodeReceiveCode } from './receive-code'
import { lookupPublishedReceiveCode, publishPrivateReceiveDiscovery } from './public-discovery'

const mnemonic = 'abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon abandon about'
const preparedLatestLedger = 1
const signedAuthEntryCount = 1
const publishedLedger = 3_242_000
const enabledTestnetPoolCount = 2
const preparedTx: PreparedSorobanTx = { txXdr: 'prepared', authEntries: [], latestLedger: preparedLatestLedger }
const xlmPoolId = 'CBQ46IL6HQA2VTPERULO7DBAKHMJ7ZCNVOSDIIX3HLC5T7MSPB6Z5SMY'
const usdcPoolId = 'CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY'

function moduleForClient(client: unknown): NethermindWebModule {
  return {
    Config: class {
      constructor(_rpcUrl: string, _bootnodeUrl?: string, _backgroundEvents?: boolean) {}
    },
    default: async () => undefined,
    mainThread: async () => ({ webClient: client }),
  } as NethermindWebModule
}

describe('public discovery', () => {
  it('publishes private receive keys to every enabled testnet pool', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    const preparedCalls: string[] = []
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
      prepareRegisterPublicKeys: async (
        poolId: string,
        userAddress: string,
        notePublicKeyHex: string,
        encryptionPublicKeyHex: string,
      ) => {
        preparedCalls.push(poolId)
        expect(userAddress).toBe(identity.stellarPublicKey)
        expect(notePublicKeyHex).toBe(`0x${bytesToHex(identity.privateReceive.notePublicKey)}`)
        expect(encryptionPublicKeyHex).toBe(`0x${bytesToHex(identity.privateReceive.encryptionPublicKey)}`)
        return preparedTx
      },
    }

    const report = await publishPrivateReceiveDiscovery({
      identity,
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
      submitPreparedTx: async () => ({ hash: 'abc123', signedAuthEntryCount }),
    })

    expect(report.status).toBe('submitted')
    expect(preparedCalls).toEqual([xlmPoolId, usdcPoolId])
    expect(report.pools).toHaveLength(enabledTestnetPoolCount)
    expect(report.pools.every((pool) => pool.txHash === 'abc123')).toBe(true)
  })

  it('looks up a published owner and returns a raw private receive code', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'testnet')
    let synced = false
    const client = {
      deriveAndSaveUserKeys: async () => undefined,
      getASPSecret: async () => undefined,
      getUserKeys: async () => undefined,
      syncPoolEvents: async () => {
        synced = true
      },
      getRecentPublicKeys: async () => [
        {
          address: identity.stellarPublicKey,
          encryptionKey: `0x${bytesToHex(identity.privateReceive.encryptionPublicKey)}`,
          noteKey: `0x${bytesToHex(identity.privateReceive.notePublicKey)}`,
          ledger: publishedLedger,
        },
      ],
    }

    const report = await lookupPublishedReceiveCode({
      ownerAddress: identity.stellarPublicKey,
      network: 'testnet',
      importWebModule: async () => moduleForClient(client),
    })

    expect(report.status).toBe('found')
    expect(synced).toBe(true)
    expect(report.receiveCode?.startsWith('zkf1')).toBe(true)
    const decoded = decodeReceiveCode(report.receiveCode ?? '')
    expect(decoded.ok).toBe(true)
  })

  it('blocks publishing when no shielded pool is enabled on the selected network', async () => {
    const identity = deriveWalletIdentity(mnemonic, 'mainnet')
    const report = await publishPrivateReceiveDiscovery({ identity, network: 'mainnet' })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('No shielded pools')
  })
})
