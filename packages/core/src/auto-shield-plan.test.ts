import { describe, expect, it, vi } from 'vitest'
import { planAutoShield, XLM_AUTO_SHIELD_HOLDBACK_STROOPS } from './auto-shield-plan'
import * as networks from './networks'

const XLM_FLOOR = 50_000_000n // 5 XLM
const USDC_FLOOR = 10_000_000n // 1 USDC
const CAP = 1_000_000_000n // 100 units — testnet/mainnet maxDepositStroops

describe('planAutoShield', () => {
  it('subtracts the fixed holdback from the XLM balance', () => {
    // 20 XLM public → 15 XLM spendable after the 5 XLM holdback, under the cap.
    const plan = planAutoShield({
      asset: 'XLM',
      network: 'testnet',
      publicBalanceStroops: 200_000_000n,
      floorStroops: XLM_FLOOR,
    })
    expect(plan).toEqual({
      action: 'shield',
      amountStroops: 200_000_000n - XLM_AUTO_SHIELD_HOLDBACK_STROOPS,
      reason: 'ok',
    })
  })

  it('skips when spendable XLM is below the floor', () => {
    // 9 XLM public → 4 XLM spendable, under the 5 XLM floor.
    const plan = planAutoShield({
      asset: 'XLM',
      network: 'testnet',
      publicBalanceStroops: 90_000_000n,
      floorStroops: XLM_FLOOR,
    })
    expect(plan).toEqual({ action: 'skip', amountStroops: 0n, reason: 'below-floor' })
  })

  it('skips with zero-spendable when the holdback exceeds the balance', () => {
    const plan = planAutoShield({
      asset: 'XLM',
      network: 'testnet',
      publicBalanceStroops: 30_000_000n,
      floorStroops: XLM_FLOOR,
    })
    expect(plan).toEqual({ action: 'skip', amountStroops: 0n, reason: 'zero-spendable' })
  })

  it('skips with zero-spendable for a zero balance', () => {
    const plan = planAutoShield({
      asset: 'USDC',
      network: 'testnet',
      publicBalanceStroops: 0n,
      floorStroops: USDC_FLOOR,
    })
    expect(plan).toEqual({ action: 'skip', amountStroops: 0n, reason: 'zero-spendable' })
  })

  it('clamps a 150-unit spendable amount down to the 100-unit cap', () => {
    // USDC uses the full balance; 150 units exceeds the 100-unit cap.
    const plan = planAutoShield({
      asset: 'USDC',
      network: 'testnet',
      publicBalanceStroops: 1_500_000_000n,
      floorStroops: USDC_FLOOR,
    })
    expect(plan).toEqual({ action: 'shield', amountStroops: CAP, reason: 'ok' })
  })

  it('shields exactly the cap when spendable equals it', () => {
    const plan = planAutoShield({
      asset: 'USDC',
      network: 'testnet',
      publicBalanceStroops: CAP,
      floorStroops: USDC_FLOOR,
    })
    expect(plan).toEqual({ action: 'shield', amountStroops: CAP, reason: 'ok' })
  })

  it('uses the full USDC balance without a holdback', () => {
    const plan = planAutoShield({
      asset: 'USDC',
      network: 'testnet',
      publicBalanceStroops: 50_000_000n,
      floorStroops: USDC_FLOOR,
    })
    expect(plan).toEqual({ action: 'shield', amountStroops: 50_000_000n, reason: 'ok' })
  })

  it('skips when the USDC balance is below the floor', () => {
    const plan = planAutoShield({
      asset: 'USDC',
      network: 'testnet',
      publicBalanceStroops: 5_000_000n,
      floorStroops: USDC_FLOOR,
    })
    expect(plan).toEqual({ action: 'skip', amountStroops: 0n, reason: 'below-floor' })
  })

  it('skips with no-cap when the asset exposes no deposit cap', () => {
    const spy = vi.spyOn(networks, 'maxShieldDepositStroops').mockReturnValueOnce(null)
    const plan = planAutoShield({
      asset: 'XLM',
      network: 'testnet',
      publicBalanceStroops: 200_000_000n,
      floorStroops: XLM_FLOOR,
    })
    expect(plan).toEqual({ action: 'skip', amountStroops: 0n, reason: 'no-cap' })
    spy.mockRestore()
  })

  it('shields when spendable sits exactly on the floor', () => {
    // XLM: floor + holdback public → spendable exactly equals the floor.
    const plan = planAutoShield({
      asset: 'XLM',
      network: 'testnet',
      publicBalanceStroops: XLM_FLOOR + XLM_AUTO_SHIELD_HOLDBACK_STROOPS,
      floorStroops: XLM_FLOOR,
    })
    expect(plan).toEqual({ action: 'shield', amountStroops: XLM_FLOOR, reason: 'ok' })
  })
})
