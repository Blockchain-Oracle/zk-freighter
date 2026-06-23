import { sha256 } from '@noble/hashes/sha2.js'
import { bytesToHex } from './bytes'

const defaultBaseUrl = '/'
const msPrecision = 2

export type ProverArtifactKind =
  | 'worker-script'
  | 'worker-wasm'
  | 'storage-worker-script'
  | 'storage-worker-wasm'
  | 'wasm-bindgen-js'
  | 'wasm-bindgen-wasm'
  | 'circuit-wasm'
  | 'circuit-r1cs'
  | 'disclosure-circuit-wasm'
  | 'disclosure-circuit-r1cs'
  | 'proving-key'
  | 'verification-key'
  | 'soroban-verification-key'

export type ProverArtifactStatus = 'present' | 'missing' | 'failed' | 'mismatch'
export type ProverBenchmarkStatus = 'ready' | 'blocked' | 'failed'

export interface ProverArtifactSpec {
  readonly kind: ProverArtifactKind
  readonly path: string
  readonly required: boolean
  readonly expectedBytes?: number
  readonly expectedSha256?: string
}

export interface ProverArtifactCheck extends ProverArtifactSpec {
  readonly status: ProverArtifactStatus
  readonly bytes?: number
  readonly sha256?: string
  readonly elapsedMs: number
  readonly error?: string
}

export interface ProverRuntimeSignal {
  readonly userAgent?: string
  readonly usedJsHeapSize?: number
}

export interface ProverBenchmarkReport {
  readonly circuit: 'policy_tx_2_2'
  readonly runtime: 'nethermind-browser-wasm'
  readonly status: ProverBenchmarkStatus
  readonly durationMs: number
  readonly artifacts: readonly ProverArtifactCheck[]
  readonly blockers: readonly string[]
  readonly runtimeSignal: ProverRuntimeSignal
  readonly proofAttempted: false
  readonly proofGenerated: false
}

export interface ProverBenchmarkOptions {
  readonly baseUrl?: string
  readonly fetcher?: typeof fetch
  readonly now?: () => number
  readonly userAgent?: string
  readonly usedJsHeapSize?: number
}

export const POLICY_TX_2_2_ARTIFACTS = [
  { kind: 'worker-script', path: 'js/prover-worker.js', required: true },
  { kind: 'worker-wasm', path: 'js/prover-worker_bg.wasm', required: true },
  { kind: 'wasm-bindgen-js', path: 'js/web.js', required: true },
  { kind: 'wasm-bindgen-wasm', path: 'js/web_bg.wasm', required: true },
  { kind: 'storage-worker-script', path: 'js/storage-worker.js', required: true },
  { kind: 'storage-worker-wasm', path: 'js/storage-worker_bg.wasm', required: true },
  {
    kind: 'circuit-wasm',
    path: 'circuits/policy_tx_2_2.wasm',
    required: true,
    expectedBytes: 646_077,
    expectedSha256: '6356b72f8623d1a33d30bd7dc37f5a0baf70d116dbb64f85e1e1a25ec305e6d1',
  },
  {
    kind: 'circuit-r1cs',
    path: 'circuits/policy_tx_2_2.r1cs',
    required: true,
    expectedBytes: 5_136_008,
    expectedSha256: 'a8cee4bd7ca39dd60dcefc73b4c1568247724511a5dd6023e8438d54262c729e',
  },
  {
    kind: 'disclosure-circuit-wasm',
    path: 'circuits/selectiveDisclosure_1.wasm',
    required: true,
    expectedBytes: 474_209,
    expectedSha256: 'f2468df7b9a28582e0e8f5301d483c3349574334b43ded5220084100e0c09aaf',
  },
  {
    kind: 'disclosure-circuit-r1cs',
    path: 'circuits/selectiveDisclosure_1.r1cs',
    required: true,
    expectedBytes: 715_760,
    expectedSha256: 'e83f0d99277e77283514e0690d94805ca6ffc65792c59e8f795be4ed31788667',
  },
  {
    kind: 'proving-key',
    path: 'circuit_keys/policy_tx_2_2_proving_key.bin',
    required: true,
    expectedBytes: 8_126_128,
    expectedSha256: '161bd582fb66b6e4a57dd30660f39cf00163a45e35c4d505c037e6ac2938b324',
  },
  {
    kind: 'verification-key',
    path: 'circuit_keys/policy_tx_2_2_vk.json',
    required: true,
    expectedBytes: 3_910,
    expectedSha256: '8077e82ee940618ecdaa985cf621695317736fc76634174382aa585f7aa43f42',
  },
  {
    kind: 'soroban-verification-key',
    path: 'circuit_keys/policy_tx_2_2_vk_soroban.bin',
    required: true,
    expectedBytes: 1_220,
    expectedSha256: '03f4117090a9dc4b04656618dbd0541066b95d34a343f3a824890b04e2306f91',
  },
] as const satisfies readonly ProverArtifactSpec[]

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/') ? baseUrl : `${baseUrl}/`
}

function artifactUrl(baseUrl: string, path: string): string {
  return `${baseUrl}${path}`
}

function roundMs(value: number): number {
  return Number(value.toFixed(msPrecision))
}

function defaultNow(): number {
  return globalThis.performance?.now() ?? Date.now()
}

function runtimeSignal(options: ProverBenchmarkOptions): ProverRuntimeSignal {
  return {
    userAgent: options.userAgent ?? globalThis.navigator?.userAgent,
    usedJsHeapSize: options.usedJsHeapSize ?? readUsedJsHeapSize(),
  }
}

function readUsedJsHeapSize(): number | undefined {
  const perf = globalThis.performance as Performance & {
    readonly memory?: { readonly usedJSHeapSize?: number }
  }
  return perf.memory?.usedJSHeapSize
}

async function checkArtifact(
  spec: ProverArtifactSpec,
  baseUrl: string,
  fetcher: typeof fetch,
  now: () => number,
): Promise<ProverArtifactCheck> {
  const started = now()
  const url = artifactUrl(baseUrl, spec.path)

  try {
    const response = await fetcher(url)
    if (!response.ok) {
      return {
        ...spec,
        status: 'missing',
        elapsedMs: roundMs(now() - started),
        error: `HTTP ${response.status}`,
      }
    }

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.toLowerCase().includes('text/html')) {
      return {
        ...spec,
        status: 'missing',
        elapsedMs: roundMs(now() - started),
        error: 'served HTML fallback',
      }
    }

    const bytes = new Uint8Array(await response.arrayBuffer())
    const digest = bytesToHex(sha256(bytes))
    const status = artifactStatus(spec, bytes.length, digest)
    return { ...spec, status, bytes: bytes.length, sha256: digest, elapsedMs: roundMs(now() - started) }
  } catch (error) {
    return {
      ...spec,
      status: 'failed',
      elapsedMs: roundMs(now() - started),
      error: error instanceof Error ? error.message : 'unknown fetch error',
    }
  }
}

function artifactStatus(spec: ProverArtifactSpec, bytes: number, sha: string): ProverArtifactStatus {
  if (spec.expectedBytes !== undefined && spec.expectedBytes !== bytes) {
    return 'mismatch'
  }

  if (spec.expectedSha256 !== undefined && spec.expectedSha256 !== sha) {
    return 'mismatch'
  }

  return 'present'
}

function blockersFor(checks: readonly ProverArtifactCheck[]): readonly string[] {
  return checks
    .filter((check) => check.required && check.status !== 'present')
    .map((check) => `${check.kind} unavailable at ${check.path}${check.error ? ` (${check.error})` : ''}`)
}

export async function runPolicyTx2x2ProverBenchmark(
  options: ProverBenchmarkOptions = {},
): Promise<ProverBenchmarkReport> {
  const started = options.now?.() ?? defaultNow()
  const now = options.now ?? defaultNow
  const fetcher = options.fetcher ?? globalThis.fetch
  const baseUrl = normalizeBaseUrl(options.baseUrl ?? defaultBaseUrl)

  if (!fetcher) {
    return {
      circuit: 'policy_tx_2_2',
      runtime: 'nethermind-browser-wasm',
      status: 'blocked',
      durationMs: 0,
      artifacts: [],
      blockers: ['fetch is unavailable in this runtime'],
      runtimeSignal: runtimeSignal(options),
      proofAttempted: false,
      proofGenerated: false,
    }
  }

  const checks = await Promise.all(
    POLICY_TX_2_2_ARTIFACTS.map((artifact) => checkArtifact(artifact, baseUrl, fetcher, now)),
  )
  const blockers = blockersFor(checks)
  const failed = checks.some((check) => check.status === 'failed')

  return {
    circuit: 'policy_tx_2_2',
    runtime: 'nethermind-browser-wasm',
    status: blockers.length > 0 ? (failed ? 'failed' : 'blocked') : 'ready',
    durationMs: roundMs(now() - started),
    artifacts: checks,
    blockers,
    runtimeSignal: runtimeSignal(options),
    proofAttempted: false,
    proofGenerated: false,
  }
}
