import {
  bytesToHex,
  parseAssetAmountToStroops,
  type AssetCode,
  type GenerateDisclosureReport,
  type PublicStellarPaymentReport,
  type XlmNotesReport,
  type XlmPrivateSubmitReport,
  type XlmShieldedNote,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import type { MobileActivityStatus } from './mobile-storage'
import { formatAssetAmount, noteBalance, summarizeError, truncateMiddle } from './mobile-format'

export const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/u
export const ASSETS = ['USDC', 'XLM'] as const
export const XLM_FEE_RESERVE_BUFFER_STROOPS = 25_000_000n

export type AmountParseResult =
  | { readonly ok: true; readonly stroops: bigint }
  | { readonly ok: false; readonly error: string }

export function parseMobileAmount(amount: string, asset: AssetCode): AmountParseResult {
  const parsed = parseAssetAmountToStroops(amount, asset)
  return parsed.ok ? { ok: true, stroops: parsed.stroops } : { ok: false, error: parsed.error }
}

export function reportStatus(status: XlmPrivateSubmitReport['status'] | XlmShieldSubmitReport['status'] | PublicStellarPaymentReport['status'] | GenerateDisclosureReport['status']): MobileActivityStatus {
  if (status === 'submitted' || status === 'generated') return 'submitted'
  if (status === 'blocked') return 'blocked'
  return 'failed'
}

export function privateReportHash(report: XlmPrivateSubmitReport): string | undefined {
  return report.txHashes[0]
}

export function privateReportExplorer(report: XlmPrivateSubmitReport): string | undefined {
  return report.explorerUrls[0]
}

export function shieldReportHash(report: XlmShieldSubmitReport): string | undefined {
  return report.txHash
}

export function shieldReportExplorer(report: XlmShieldSubmitReport): string | undefined {
  return report.explorerUrl
}

export function reportMessage(report: { readonly blockers: readonly string[]; readonly error?: string }): string {
  return summarizeError(report.error ?? report.blockers[0])
}

export function firstUnspentNote(report: XlmNotesReport | null): XlmShieldedNote | undefined {
  if (!report || report.status !== 'loaded') return undefined
  return [...report.notes].filter((note) => !note.spent).sort((a, b) => Number(BigInt(b.amountStroops) - BigInt(a.amountStroops)))[0]
}

export function availableShielded(report: XlmNotesReport | null): bigint | null {
  return noteBalance(report)
}

export function maxAmountText(value: bigint | null, asset: AssetCode): string {
  if (value === null) return ''
  return formatAssetAmount(value, asset).replace(` ${asset}`, '').replaceAll(',', '')
}

export async function loadCircuit(name: 'circuit_register' | 'circuit_transfer' | 'circuit_withdraw'): Promise<unknown> {
  const response = await fetch(`/circuits/${name}.json`)
  if (!response.ok) throw new Error(`Failed to load ${name} circuit (${response.status}).`)
  return response.json()
}

export function authorityPayloadHex(value: string): string {
  return `0x${bytesToHex(new TextEncoder().encode(value.trim()))}`
}

export function shortTx(value?: string): string {
  return value ? truncateMiddle(value, 10, 8) : 'Not submitted'
}
