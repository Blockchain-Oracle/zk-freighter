import { describe, expect, it } from 'vitest'
import {
  POLICY_TX_2_2_ARTIFACTS,
  runPolicyTx2x2ProverBenchmark,
  type ProverArtifactSpec,
} from './prover'

function response(bytes: Uint8Array, status = 200): Response {
  const body = new ArrayBuffer(bytes.byteLength)
  new Uint8Array(body).set(bytes)
  return new Response(body, { status })
}

function htmlResponse(): Response {
  return new Response('<!doctype html>', {
    headers: { 'content-type': 'text/html' },
    status: 200,
  })
}

function bytesFor(spec: ProverArtifactSpec): Uint8Array {
  if (spec.expectedBytes) {
    return new Uint8Array(spec.expectedBytes)
  }

  return new TextEncoder().encode(`fixture:${spec.path}`)
}

describe('Nethermind prover benchmark facade', () => {
  it('fails closed when required artifacts are missing', async () => {
    const report = await runPolicyTx2x2ProverBenchmark({
      fetcher: async () => response(new Uint8Array(), 404),
      now: () => 1,
      userAgent: 'vitest',
    })

    expect(report.status).toBe('blocked')
    expect(report.proofGenerated).toBe(false)
    expect(report.proofAttempted).toBe(false)
    expect(report.blockers).toHaveLength(POLICY_TX_2_2_ARTIFACTS.length)
  })

  it('marks tampered committed keys as mismatches', async () => {
    const report = await runPolicyTx2x2ProverBenchmark({
      baseUrl: '/nethermind',
      fetcher: async (input) => {
        const spec = POLICY_TX_2_2_ARTIFACTS.find((artifact) =>
          input.toString().endsWith(artifact.path),
        )
        return response(bytesFor(spec ?? POLICY_TX_2_2_ARTIFACTS[0]))
      },
      now: () => 1,
      userAgent: 'vitest',
    })

    expect(report.status).toBe('blocked')
    expect(report.artifacts.some((artifact) => artifact.status === 'mismatch')).toBe(true)
    expect(report.blockers.some((blocker) => blocker.includes('proving-key'))).toBe(true)
  })

  it('treats Vite HTML fallbacks as missing assets', async () => {
    const report = await runPolicyTx2x2ProverBenchmark({
      fetcher: async () => htmlResponse(),
      now: () => 1,
      userAgent: 'vitest',
    })

    expect(report.status).toBe('blocked')
    expect(report.blockers[0]).toContain('served HTML fallback')
  })

  it('normalizes the benchmark base URL and captures runtime signal', async () => {
    const urls: string[] = []
    const report = await runPolicyTx2x2ProverBenchmark({
      baseUrl: '/custom-nethermind',
      fetcher: async (input) => {
        urls.push(input.toString())
        return response(new Uint8Array(), 404)
      },
      now: () => 1,
      userAgent: 'vitest',
      usedJsHeapSize: 123,
    })

    expect(urls[0]).toBe('/custom-nethermind/js/prover-worker.js')
    expect(report.runtimeSignal.userAgent).toBe('vitest')
    expect(report.runtimeSignal.usedJsHeapSize).toBe(123)
    expect(report.proofGenerated).toBe(false)
  })
})
