import { hexToBytes } from './bytes'
import type { CctpAttestationMessage, CctpBridgeProgressEvent } from './cctp-types'

const defaultAttestationPollIntervalMs = 5_000
const defaultAttestationMaxPolls = 120

export async function pollCctpAttestation(options: {
  readonly irisUrl: string
  readonly sourceDomain: number
  readonly burnTxHash: string
  readonly fetch?: typeof fetch
  readonly sleep?: (ms: number) => Promise<void>
  readonly pollIntervalMs?: number
  readonly maxPolls?: number
  readonly onStatus?: (event: Omit<CctpBridgeProgressEvent, 'elapsedMs'>) => void
}): Promise<CctpAttestationMessage> {
  const fetcher = options.fetch ?? globalThis.fetch
  if (!fetcher) {
    throw new Error('Fetch is unavailable; cannot poll Circle Iris.')
  }

  const sleep = options.sleep ?? defaultSleep
  const pollIntervalMs = options.pollIntervalMs ?? defaultAttestationPollIntervalMs
  const maxPolls = options.maxPolls ?? defaultAttestationMaxPolls
  const url = `${options.irisUrl}/v2/messages/${options.sourceDomain}?transactionHash=${encodeURIComponent(options.burnTxHash)}`

  for (let attempt = 1; attempt <= maxPolls; attempt += 1) {
    const response = await fetcher(url, { method: 'GET' })
    if (response.status === 429) {
      throw new Error('Circle Iris rate limit hit; wait at least 5 minutes before retrying.')
    }
    if (response.status !== 404 && !response.ok) {
      throw new Error(`Circle Iris attestation request failed with HTTP ${response.status}.`)
    }
    if (response.ok) {
      const message = parseAttestationResponse(await response.json())
      if (message?.status === 'complete') {
        return message
      }
    }

    options.onStatus?.({ stage: 'attestation', message: 'Waiting for Circle Iris attestation', attempt })
    await sleep(pollIntervalMs)
  }

  throw new Error(`Circle Iris attestation was not complete after ${maxPolls} polls.`)
}

function parseAttestationResponse(value: unknown): CctpAttestationMessage | undefined {
  const messages = isRecord(value) && Array.isArray(value.messages) ? value.messages : []
  const first = messages[0]
  if (!isRecord(first) || typeof first.message !== 'string' || typeof first.attestation !== 'string') {
    return undefined
  }

  hexToBytes(first.message)
  hexToBytes(first.attestation)
  return {
    message: first.message,
    attestation: first.attestation,
    status: typeof first.status === 'string' ? first.status : 'unknown',
    eventNonce: typeof first.eventNonce === 'string' ? first.eventNonce : undefined,
    messageHash: typeof first.messageHash === 'string' ? first.messageHash : undefined,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function defaultSleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
