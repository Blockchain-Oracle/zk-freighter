import {
  deriveWalletIdentity,
  loadPublicStellarBalances,
  loadXlmShieldedNoteSet,
  type NetworkKey,
  type XlmShieldedNote,
} from '@zk-fighter/core'

import type { DappBalances } from './dappMessages'
import { uniqueBlockers } from './balance-issue'

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

  // Public load is isolated so a Horizon failure can't take down a good shielded
  // scan (and vice versa). Each section reports its own ok flag honestly.
  const publicScan = loadPublicStellarBalances({ address: identity.stellarPublicKey, network })
    .then((report) => ({
      ok: report.status !== 'failed',
      xlm: report.balances.XLM ?? 0n,
      usdc: report.balances.USDC ?? 0n,
      error: report.status === 'failed' ? report.error : undefined,
    }))
    .catch((error: unknown) => ({ ok: false, xlm: 0n, usdc: 0n, error: error instanceof Error ? error.message : String(error) }))

  const reports = await loadXlmShieldedNoteSet({ identity, network, assets: ['XLM', 'USDC'] })
  const xlm = reports.XLM
  const usdc = reports.USDC
  const pub = await publicScan

  const shieldedOk = xlm?.status === 'loaded' && usdc?.status === 'loaded'
  const rawBlockers = [...(xlm?.blockers ?? []), ...(usdc?.blockers ?? [])]
  if (!pub.ok) rawBlockers.push(`Public balance unavailable${pub.error ? `: ${pub.error}` : '.'}`)
  const blockers = uniqueBlockers(rawBlockers)

  return {
    shieldedXlmStroops: sumUnspentStroops(xlm?.notes ?? []).toString(),
    shieldedUsdcStroops: sumUnspentStroops(usdc?.notes ?? []).toString(),
    publicXlmStroops: pub.xlm.toString(),
    publicUsdcStroops: pub.usdc.toString(),
    noteCount: (xlm?.notes.length ?? 0) + (usdc?.notes.length ?? 0),
    shieldedOk,
    publicOk: pub.ok,
    blockers,
    scannedAt: new Date().toISOString(),
  }
}

function asNetworkKey(value: unknown): NetworkKey {
  if (value === 'testnet' || value === 'mainnet') return value
  throw new Error('Unsupported balance network.')
}
