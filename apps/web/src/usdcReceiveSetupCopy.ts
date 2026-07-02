import type { StellarUsdcTrustlineReport } from '@zk-freighter/core'
import { truncateMiddle } from './app-helpers'

export function usdcReceiveLabel(report: StellarUsdcTrustlineReport | null): string {
  if (!report) {
    return 'Use before receiving or bridging USDC to this public address.'
  }
  if (report.status === 'created') {
    return `USDC receiving enabled: ${truncateMiddle(report.txHash ?? '', 12, 10)}`
  }
  return 'USDC receiving is already enabled for this address.'
}

export function usdcReceiveErrorText(error: unknown): string {
  const message = error instanceof Error ? error.message : String(error)
  if (/not funded/i.test(message)) {
    return 'Fund this Stellar address with XLM first, then enable USDC receiving.'
  }
  if (/insufficient|underfunded|tx_insufficient_balance|op_underfunded/i.test(message)) {
    return 'Add enough XLM for the one-time 0.5 XLM reserve and network fee, then try again.'
  }
  if (/friendbot/i.test(message)) {
    return 'Testnet funding failed. Try again after the faucet recovers.'
  }
  return 'USDC receiving setup failed. Check the network and XLM reserve, then try again.'
}
