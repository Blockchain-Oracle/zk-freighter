import { describe, expect, it, vi } from 'vitest'
import {
  AUTO_SHIELD_COOLDOWN_MS,
  createAutoShieldRunner,
  type AutoShieldSubmitReport,
} from './auto-shield-runner'
import type { AutoShieldSettings } from './auto-shield-settings'
import type { PublicBalancesReport } from './stellar-balance'

const ENABLED: AutoShieldSettings = { enabled: true, floors: { XLM: '50000000', USDC: '10000000' } }

function balances(xlm: bigint): PublicBalancesReport {
  return { status: 'loaded', network: 'testnet', userAddress: 'G...', balances: { XLM: xlm, USDC: 0n } }
}

const submitted: AutoShieldSubmitReport = { status: 'submitted', txHash: 'abc', amountStroops: '0' }

interface HarnessOptions {
  settings?: AutoShieldSettings
  hasShieldedBefore?: boolean
  balance?: bigint
  submit?: (input: { asset: 'XLM' | 'USDC'; amountStroops: bigint }) => Promise<AutoShieldSubmitReport>
}

function harness(opts: HarnessOptions = {}) {
  let clock = 1_000_000
  const submit = vi.fn(opts.submit ?? (async () => submitted))
  const loadBalances = vi.fn(async () => balances(opts.balance ?? 200_000_000n))
  const runner = createAutoShieldRunner({
    submit,
    loadBalances,
    getSettings: () => opts.settings ?? ENABLED,
    hasShieldedBefore: () => opts.hasShieldedBefore ?? true,
    now: () => clock,
  })
  return { runner, submit, loadBalances, advance: (ms: number) => { clock += ms } }
}

describe('createAutoShieldRunner', () => {
  it('shields on the happy path', async () => {
    const { runner, submit } = harness()
    const result = await runner.maybeRun('XLM')
    expect(result.kind).toBe('shielded')
    expect(result.amountStroops).toBe(150_000_000n) // 20 XLM − 5 XLM holdback
    expect(submit).toHaveBeenCalledOnce()
  })

  it('stops after the max runs per session', async () => {
    const { runner, submit, advance } = harness()
    expect((await runner.maybeRun('XLM')).kind).toBe('shielded')
    advance(AUTO_SHIELD_COOLDOWN_MS)
    expect((await runner.maybeRun('XLM')).kind).toBe('shielded')
    advance(AUTO_SHIELD_COOLDOWN_MS)
    expect((await runner.maybeRun('XLM')).kind).toBe('shielded')
    advance(AUTO_SHIELD_COOLDOWN_MS)
    const fourth = await runner.maybeRun('XLM')
    expect(fourth).toMatchObject({ kind: 'skipped', reason: 'max-runs' })
    expect(submit).toHaveBeenCalledTimes(3)
  })

  it('no-ops re-entry while a run is in flight', async () => {
    let release!: () => void
    const gate = new Promise<void>((resolve) => { release = resolve })
    const { runner, submit } = harness({
      submit: async () => { await gate; return submitted },
    })
    const first = runner.maybeRun('XLM')
    const second = await runner.maybeRun('XLM')
    expect(second).toMatchObject({ kind: 'skipped', reason: 'busy' })
    release()
    expect((await first).kind).toBe('shielded')
    expect(submit).toHaveBeenCalledOnce()
  })

  it('respects the per-asset cooldown', async () => {
    const { runner } = harness()
    expect((await runner.maybeRun('XLM')).kind).toBe('shielded')
    const again = await runner.maybeRun('XLM')
    expect(again).toMatchObject({ kind: 'skipped', reason: 'cooldown' })
  })

  it('latches after a blocked run and never retries the asset', async () => {
    const blocked: AutoShieldSubmitReport = { status: 'blocked', blockers: ['access still confirming'] }
    const { runner, submit, advance } = harness({ submit: async () => blocked })
    const first = await runner.maybeRun('XLM')
    expect(first).toMatchObject({ kind: 'blocked', blocker: 'access still confirming' })
    advance(AUTO_SHIELD_COOLDOWN_MS)
    const second = await runner.maybeRun('XLM')
    expect(second).toMatchObject({ kind: 'skipped', reason: 'latched' })
    expect(submit).toHaveBeenCalledOnce()
  })

  it('latches after a failed run', async () => {
    const failed: AutoShieldSubmitReport = { status: 'failed', blockers: ['network error'] }
    const { runner, submit, advance } = harness({ submit: async () => failed })
    expect((await runner.maybeRun('XLM')).kind).toBe('failed')
    advance(AUTO_SHIELD_COOLDOWN_MS)
    expect((await runner.maybeRun('XLM')).reason).toBe('latched')
    expect(submit).toHaveBeenCalledOnce()
  })

  it('skips the first-ever shield', async () => {
    const { runner, submit } = harness({ hasShieldedBefore: false })
    const result = await runner.maybeRun('XLM')
    expect(result).toMatchObject({ kind: 'skipped', reason: 'first-shield' })
    expect(submit).not.toHaveBeenCalled()
  })

  it('skips when disabled', async () => {
    const { runner, submit } = harness({ settings: { ...ENABLED, enabled: false } })
    const result = await runner.maybeRun('XLM')
    expect(result).toMatchObject({ kind: 'skipped', reason: 'disabled' })
    expect(submit).not.toHaveBeenCalled()
  })

  it('respects the floor', async () => {
    // 6 XLM public → 1 XLM spendable, under the 5 XLM floor.
    const { runner, submit } = harness({ balance: 60_000_000n })
    const result = await runner.maybeRun('XLM')
    expect(result).toMatchObject({ kind: 'skipped', reason: 'below-floor' })
    expect(submit).not.toHaveBeenCalled()
  })

  it('fails and latches when balances cannot load', async () => {
    const failing = vi.fn(async (): Promise<PublicBalancesReport> => ({
      status: 'failed', network: 'testnet', userAddress: 'G...', balances: { XLM: 0n, USDC: 0n }, error: 'horizon down',
    }))
    const runner = createAutoShieldRunner({
      submit: async () => submitted,
      loadBalances: failing,
      getSettings: () => ENABLED,
      hasShieldedBefore: () => true,
    })
    const result = await runner.maybeRun('XLM')
    expect(result).toMatchObject({ kind: 'failed', reason: 'balance-unavailable', blocker: 'horizon down' })
  })
})
