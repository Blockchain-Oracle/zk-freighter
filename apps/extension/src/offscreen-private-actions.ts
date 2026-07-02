import {
  deriveWalletIdentity,
  encodeReceiveCode,
  submitXlmPrivateTransfer,
  submitXlmUnshieldWithdrawal,
  type AssetCode,
  type NetworkKey,
} from '@zk-freighter/core'

interface PrivateActionInput {
  readonly asset: AssetCode
  readonly identity: ReturnType<typeof deriveWalletIdentity>
  readonly network: NetworkKey
  readonly amountStroops: bigint
  readonly timeoutMs?: number
}

export function runPrivateTransfer(payload: { readonly [key: string]: unknown }) {
  const { asset, identity, network, amountStroops, timeoutMs } = privateActionInput(payload)
  const receiveCode = typeof payload.receiveCode === 'string' && payload.receiveCode.trim()
    ? payload.receiveCode
    : encodeReceiveCode({
        version: 1,
        network,
        notePublicKey: identity.privateReceive.notePublicKey,
        encryptionPublicKey: identity.privateReceive.encryptionPublicKey,
      })

  return submitXlmPrivateTransfer({
    asset,
    identity,
    network,
    amountStroops,
    receiveCode,
    timeoutMs,
  })
}

export function runUnshieldWithdrawal(payload: { readonly [key: string]: unknown }) {
  const { asset, identity, network, amountStroops, timeoutMs } = privateActionInput(payload)
  const recipientAddress = typeof payload.recipientAddress === 'string' ? payload.recipientAddress : identity.stellarPublicKey

  return submitXlmUnshieldWithdrawal({
    asset,
    identity,
    network,
    amountStroops,
    recipientAddress,
    timeoutMs,
  })
}

function privateActionInput(payload: { readonly [key: string]: unknown }): PrivateActionInput {
  const mnemonic = typeof payload.mnemonic === 'string' ? payload.mnemonic : ''
  const amountStroops = typeof payload.amountStroops === 'string' ? BigInt(payload.amountStroops) : 0n

  if (!mnemonic) {
    throw new Error('Missing extension wallet mnemonic.')
  }
  if (amountStroops <= 0n) {
    throw new Error('Private action amount must be greater than zero.')
  }

  const network = asNetworkKey(payload.network)
  return {
    asset: asAssetCode(payload.asset),
    identity: deriveWalletIdentity(mnemonic, network),
    network,
    amountStroops,
    timeoutMs: typeof payload.timeoutMs === 'number' ? payload.timeoutMs : undefined,
  }
}

function asNetworkKey(value: unknown): NetworkKey {
  if (value === 'testnet' || value === 'mainnet') {
    return value
  }
  throw new Error('Unsupported private action network.')
}

function asAssetCode(value: unknown): AssetCode {
  if (value === 'XLM' || value === 'USDC') {
    return value
  }
  throw new Error('Unsupported private action asset.')
}
