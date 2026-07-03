import type { AssetCode } from './assets'
import { maxShieldDepositStroops, type NetworkKey } from './networks'

/**
 * Conservative fixed holdback (5 XLM) kept public when auto-shielding XLM. It covers the
 * Stellar base reserve, a generous margin for subentries (trustlines/offers), and fees
 * without a live Horizon subentry lookup — see stellar-payment.ts for the exact reserve
 * math this deliberately over-approximates. USDC has no reserve, so it is not held back.
 */
export const XLM_AUTO_SHIELD_HOLDBACK_STROOPS = 50_000_000n

export type AutoShieldAction = 'shield' | 'skip'

export type AutoShieldReason =
  | 'ok'
  | 'disabled'
  | 'below-floor'
  | 'no-cap'
  | 'zero-spendable'

export interface AutoShieldPlan {
  readonly action: AutoShieldAction
  readonly amountStroops: bigint
  readonly reason: AutoShieldReason
}

export interface PlanAutoShieldInput {
  readonly asset: AssetCode
  readonly network: NetworkKey
  readonly publicBalanceStroops: bigint
  readonly floorStroops: bigint
}

/**
 * Pure auto-shield decision. XLM spendable subtracts the fixed holdback; USDC uses the
 * full balance. The amount is clamped to the shielded pool's per-deposit cap. Skips when
 * nothing is spendable, the spendable amount is below the user's floor, or the network
 * exposes no deposit cap for the asset.
 */
export function planAutoShield(input: PlanAutoShieldInput): AutoShieldPlan {
  const { asset, network, publicBalanceStroops, floorStroops } = input
  const spendable = asset === 'XLM'
    ? publicBalanceStroops - XLM_AUTO_SHIELD_HOLDBACK_STROOPS
    : publicBalanceStroops

  if (spendable <= 0n) {
    return { action: 'skip', amountStroops: 0n, reason: 'zero-spendable' }
  }
  if (spendable < floorStroops) {
    return { action: 'skip', amountStroops: 0n, reason: 'below-floor' }
  }

  const cap = maxShieldDepositStroops(network, asset)
  if (cap === null) {
    return { action: 'skip', amountStroops: 0n, reason: 'no-cap' }
  }

  const amount = spendable > cap ? cap : spendable
  return { action: 'shield', amountStroops: amount, reason: 'ok' }
}
