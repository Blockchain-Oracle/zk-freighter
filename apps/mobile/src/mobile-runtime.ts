import {
  generateDisclosureArtifact,
  initializeNethermindWebModule,
  loadXlmShieldedNoteSet,
  restartNethermindWebClientCache,
  runPolicyTx2x2ProverBenchmark,
  submitShieldWithPrerequisites,
  submitXlmPrivateTransfer,
  submitXlmUnshieldWithdrawal,
  verifyDisclosureArtifact,
  type GenerateDisclosureOptions,
  type GenerateDisclosureReport,
  type NetworkKey,
  type ProverBenchmarkReport,
  type SubmitShieldWithPrerequisitesOptions,
  type SubmitXlmPrivateTransferOptions,
  type SubmitXlmUnshieldWithdrawalOptions,
  type VerifyDisclosureReport,
  type WalletIdentity,
  type XlmNotesReport,
  type XlmPrivateSubmitReport,
  type ShieldWithPrerequisitesReport,
} from '@zk-freighter/core'
import { writeShieldedBalanceCache } from './mobile-storage'

export type RuntimeStatus = 'idle' | 'running' | 'ready' | 'blocked' | 'failed'

export interface CapabilityCheck {
  readonly label: string
  readonly ok: boolean
  readonly detail: string
}

export interface MobileRuntimeReport {
  readonly status: RuntimeStatus
  readonly platform: string
  readonly capabilities: readonly CapabilityCheck[]
  readonly prover?: ProverBenchmarkReport
  readonly nethermindModule?: 'ready' | 'failed'
  readonly error?: string
}

export interface MobileShieldedSyncReport {
  readonly status: 'loaded' | 'failed'
  readonly xlm: XlmNotesReport | null
  readonly usdc: XlmNotesReport | null
  readonly error?: string
}

let queue: Promise<unknown> = Promise.resolve()

export function capabilityChecks(): readonly CapabilityCheck[] {
  return [
    { label: 'Secure random', ok: typeof crypto?.getRandomValues === 'function', detail: 'Required for wallet keys and nonces.' },
    { label: 'Web Crypto', ok: Boolean(crypto?.subtle), detail: 'Required for encrypted vault material.' },
    { label: 'Workers', ok: typeof Worker !== 'undefined', detail: 'Required by Nethermind storage/prover workers.' },
    { label: 'WebAssembly', ok: typeof WebAssembly !== 'undefined', detail: 'Required by proof and runtime modules.' },
    { label: 'Fetch', ok: typeof fetch === 'function', detail: 'Required for proof assets, RPC, funding API, and bootnode.' },
  ]
}

export async function runMobileRuntimeCheck(platform: string): Promise<MobileRuntimeReport> {
  try {
    const capabilities = capabilityChecks()
    const prover = await runPolicyTx2x2ProverBenchmark()
    const moduleStatus = await initializeNethermindWebModule().then((): 'ready' => 'ready').catch((): 'failed' => 'failed')
    const blocked = capabilities.some((check) => !check.ok) || prover.status !== 'ready' || moduleStatus !== 'ready'
    return { status: blocked ? 'blocked' : 'ready', platform, capabilities, prover, nethermindModule: moduleStatus }
  } catch (error) {
    return { status: 'failed', platform, capabilities: capabilityChecks(), error: error instanceof Error ? error.message : 'Mobile runtime check failed.' }
  }
}

export function runMobilePrivateJob<T>(job: () => Promise<T>): Promise<T> {
  const next = queue.catch(() => undefined).then(job)
  queue = next
  return next
}

export async function syncMobileShieldedBalances(identity: WalletIdentity, network: NetworkKey): Promise<MobileShieldedSyncReport> {
  try {
    const reports = await runMobilePrivateJob(() => loadXlmShieldedNoteSet({
      identity,
      network,
      assets: ['XLM', 'USDC'],
      syncBeforeRead: true,
      timeoutMs: 90_000,
    }))
    const result = { status: 'loaded' as const, xlm: reports.XLM ?? null, usdc: reports.USDC ?? null }
    writeShieldedBalanceCache({ network, address: identity.stellarPublicKey, updatedAt: Date.now(), xlm: result.xlm, usdc: result.usdc })
    return result
  } catch (error) {
    return { status: 'failed', xlm: null, usdc: null, error: error instanceof Error ? error.message : 'Shielded balance sync failed.' }
  }
}

export function runMobilePrivateTransfer(options: SubmitXlmPrivateTransferOptions): Promise<XlmPrivateSubmitReport> {
  return runMobilePrivateJob(() => submitXlmPrivateTransfer(options))
}

export function runMobileUnshield(options: SubmitXlmUnshieldWithdrawalOptions): Promise<XlmPrivateSubmitReport> {
  return runMobilePrivateJob(() => submitXlmUnshieldWithdrawal(options))
}

export function runMobileShield(options: SubmitShieldWithPrerequisitesOptions): Promise<ShieldWithPrerequisitesReport> {
  return runMobilePrivateJob(() => submitShieldWithPrerequisites(options))
}

export function runMobileDisclosureGenerate(options: GenerateDisclosureOptions): Promise<GenerateDisclosureReport> {
  return runMobilePrivateJob(() => generateDisclosureArtifact(options))
}

export function runMobileDisclosureVerify(options: {
  readonly artifactJson: string
  readonly network: NetworkKey
  readonly expectedVkHash?: string
}): Promise<VerifyDisclosureReport> {
  return runMobilePrivateJob(() => verifyDisclosureArtifact(options))
}

export async function resetMobilePrivateRuntime(): Promise<void> {
  await runMobilePrivateJob(() => restartNethermindWebClientCache())
}
