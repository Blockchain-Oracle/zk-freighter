import {
  deriveAspMembershipLeaf,
  deriveWalletIdentity,
  getNetworkConfig,
  insertAspMembershipLeaf,
  writeAspAccessRecord,
  type NetworkKey,
} from '@zk-freighter/core'

const explicitSetupConfirmWaitMs = 45_000

export async function runAspInsert(payload: { readonly [key: string]: unknown }) {
  const mnemonic = typeof payload.mnemonic === 'string' ? payload.mnemonic : ''
  const network = asNetworkKey(payload.network)

  if (!mnemonic) {
    throw new Error('Missing extension wallet mnemonic.')
  }

  const identity = deriveWalletIdentity(mnemonic, network)
  const report = await insertAspMembershipLeaf({ identity, network })
  if (report.status === 'submitted') {
    const leaf = deriveAspMembershipLeaf(identity)
    const timestamp = Date.now()
    // This path is an explicit setup request used by legacy smokes. The tx is
    // already confirmed here; let the following shield call try and retry on
    // real indexer state instead of forcing the one-button UI cool-down.
    await writeAspAccessRecord({
      network,
      userAddress: identity.stellarPublicKey,
      poolContractId: getNetworkConfig(network).assets.XLM.poolId,
      leafHex: leaf.membershipLeafHex,
      status: 'submitted',
      txHash: report.txHash,
      explorerUrl: report.explorerUrl,
      submittedAt: timestamp - explicitSetupConfirmWaitMs,
      updatedAt: timestamp,
    })
  }
  return report
}

function asNetworkKey(value: unknown): NetworkKey {
  if (value === 'testnet' || value === 'mainnet') return value
  throw new Error('Unsupported extension network.')
}
