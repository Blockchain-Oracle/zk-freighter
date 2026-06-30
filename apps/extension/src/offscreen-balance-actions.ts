import {
  deriveWalletIdentity,
  loadPublicStellarBalances,
  loadXlmShieldedNotes,
  type NetworkKey,
  type XlmShieldedNote,
} from '@zk-fighter/core'

import type { DappBalances } from './dappMessages'

function sumUnspentStroops(notes: readonly XlmShieldedNote[]): bigint {
  return notes.reduce((total, note) => (note.spent ? total : total + BigInt(note.amountStroops)), 0n)
}

/**
 * Real balance scan, run in the offscreen document (it already holds the unlocked
 * identity for proving). Shielded = sum of UNSPENT notes per asset via the
 * Nethermind pool client; public = a Horizon account lookup. This is fetch+decrypt
 * only — NO zk-proving — so it is cheap relative to a spend. Pool blockers are
 * surfaced, never swallowed into a fabricated zero.
 */
export async function runLoadBalances(payload: { readonly [key: string]: unknown }): Promise<DappBalances> {
  const mnemonic = String(payload['mnemonic'] ?? '')
  const network = asNetworkKey(payload['network'])
  const identity = deriveWalletIdentity(mnemonic, network)

  const [xlm, usdc, publicBalances] = await Promise.all([
    loadXlmShieldedNotes({ identity, network, asset: 'XLM' }),
    loadXlmShieldedNotes({ identity, network, asset: 'USDC' }),
    loadPublicStellarBalances({ address: identity.stellarPublicKey, network }),
  ])

  return {
    shieldedXlmStroops: sumUnspentStroops(xlm.notes).toString(),
    shieldedUsdcStroops: sumUnspentStroops(usdc.notes).toString(),
    publicXlmStroops: (publicBalances.balances.XLM ?? 0n).toString(),
    publicUsdcStroops: (publicBalances.balances.USDC ?? 0n).toString(),
    noteCount: xlm.notes.length + usdc.notes.length,
    blockers: [...xlm.blockers, ...usdc.blockers],
    scannedAt: new Date().toISOString(),
  }
}

function asNetworkKey(value: unknown): NetworkKey {
  if (value === 'testnet' || value === 'mainnet') return value
  throw new Error('Unsupported balance network.')
}
