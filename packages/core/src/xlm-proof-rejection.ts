import { xdr } from '@stellar/stellar-sdk'
import type { WalletIdentity } from './identity'
import type { NetworkKey } from './networks'
import type { NethermindModuleImporter, NethermindPreparedProverTx } from './nethermind-runtime'
import { submitPreparedSorobanTx, type SorobanSubmitStatus } from './soroban-submit'
import {
  appendNethermindEvent,
  defaultNow,
  explorerUrl,
  prepareClient,
  requireTestnet,
  xlmPoolId,
} from './xlm-private-support'
import type { XlmPrivateProgressEvent } from './xlm-private-types'

const defaultTamperAmountStroops = 100_000n
const transactionHashPattern = /\b[0-9a-f]{64}\b/i
const textDecoder = new TextDecoder()

export interface XlmTamperedProofRejectionReport {
  readonly status: 'rejected' | 'blocked' | 'failed'
  readonly durationMs: number
  readonly network: NetworkKey
  readonly poolContractId?: string
  readonly userAddress: string
  readonly amountStroops: string
  readonly submitReached: boolean
  readonly rejectionObserved: boolean
  readonly txHash?: string
  readonly explorerUrl?: string
  readonly statusEvents: readonly XlmPrivateProgressEvent[]
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface RunXlmTamperedProofRejectionOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly amountStroops?: bigint
  readonly recipientAddress?: string
  readonly now?: () => number
  readonly importWebModule?: NethermindModuleImporter
}

function keyName(scVal: xdr.ScVal): string {
  if (scVal.switch().name === 'scvSymbol') {
    const symbol = scVal.sym()
    return typeof symbol === 'string' ? symbol : textDecoder.decode(symbol)
  }

  return scVal.switch().name
}

function mapEntry(scVal: xdr.ScVal, name: string): xdr.ScMapEntry {
  if (scVal.switch().name !== 'scvMap') {
    throw new Error(`Expected ${name} container to be an ScVal map`)
  }

  const entry = scVal.map()?.find((item) => keyName(item.key()) === name)
  if (!entry) {
    throw new Error(`Prepared transaction is missing ${name}`)
  }

  return entry
}

export function tamperProofBytesInTxXdr(txXdr: string): string {
  const envelope = xdr.TransactionEnvelope.fromXDR(txXdr, 'base64')
  const v1 = envelope.v1()
  if (!v1) {
    throw new Error('Unsupported transaction envelope; expected v1')
  }

  for (const operation of v1.tx().operations()) {
    const body = operation.body()
    if (body.switch().value !== xdr.OperationType.invokeHostFunction().value) {
      continue
    }

    const args = body.invokeHostFunctionOp().hostFunction().invokeContract().args()
    const proofContainer = mapEntry(args[0], 'proof').val()
    const aBytes = mapEntry(proofContainer, 'a').val()
    if (aBytes.switch().name !== 'scvBytes') {
      throw new Error('Prepared proof field a is not bytes')
    }

    const tampered = new Uint8Array(aBytes.bytes())
    tampered[0] ^= 1
    mapEntry(proofContainer, 'a').val(xdr.ScVal.scvBytes(asScvBytesInput(tampered)))
    return envelope.toXDR('base64')
  }

  throw new Error('No invokeHostFunction operation found to tamper')
}

function asScvBytesInput(bytes: Uint8Array): Parameters<typeof xdr.ScVal.scvBytes>[0] {
  return bytes as Parameters<typeof xdr.ScVal.scvBytes>[0]
}

function tamperPreparedProof(prepared: NethermindPreparedProverTx): NethermindPreparedProverTx {
  return {
    ...prepared,
    sorobanTx: {
      ...prepared.sorobanTx,
      txXdr: tamperProofBytesInTxXdr(prepared.sorobanTx.txXdr),
    },
  }
}

function extractHash(message: string): string | undefined {
  return message.match(transactionHashPattern)?.[0]
}

export async function runXlmTamperedProofRejection(
  options: RunXlmTamperedProofRejectionOptions,
): Promise<XlmTamperedProofRejectionReport> {
  const now = options.now ?? defaultNow
  const started = now()
  const poolContractId = xlmPoolId(options.network)
  const amount = options.amountStroops ?? defaultTamperAmountStroops
  const statusEvents: XlmPrivateProgressEvent[] = []
  let submitReached = false
  const gate = requireTestnet(options.network, 'XLM tampered proof check')

  if (gate || !poolContractId) {
    return report('blocked', gate ?? 'XLM pool is not configured for this network.')
  }

  try {
    const client = await prepareClient(options)
    if (!client.executeWithdraw) {
      throw new Error('Nethermind WebClient does not expose executeWithdraw')
    }

    await client.executeWithdraw(
      poolContractId,
      options.identity.stellarPublicKey,
      options.recipientAddress ?? options.identity.stellarPublicKey,
      amount,
      async (prepared) => {
        submitReached = true
        const accepted = await submitPreparedSorobanTx(tamperPreparedProof(prepared), {
          identity: options.identity,
          network: options.network,
          onStatus: (event: SorobanSubmitStatus) => {
            statusEvents.push({
              elapsedMs: Math.round(now() - started),
              source: 'soroban',
              message: event.message,
              step: event.stage,
            })
          },
        })
        throw new Error(`Tampered proof was unexpectedly accepted: ${accepted.hash}`)
      },
      (event) => appendNethermindEvent(statusEvents, event, Math.round(now() - started)),
    )

    return report('failed', 'Tampered proof was not rejected.')
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown tampered proof error'
    const txHash = extractHash(message)
    const rejected = submitReached && !message.includes('unexpectedly accepted')
    return report(rejected ? 'rejected' : 'failed', message, txHash)
  }

  function report(
    status: XlmTamperedProofRejectionReport['status'],
    blocker: string,
    txHash?: string,
  ): XlmTamperedProofRejectionReport {
    return {
      status,
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      amountStroops: amount.toString(),
      submitReached,
      rejectionObserved: status === 'rejected',
      txHash,
      explorerUrl: txHash ? explorerUrl(options.network, txHash) : undefined,
      statusEvents,
      blockers: [blocker],
      error: status === 'rejected' ? undefined : blocker,
    }
  }
}
