import { decodeReceiveCode } from './receive-code'
import type { AssetCode } from './assets'
import { runWithNethermindWebClient, type NethermindPreparedProverTx } from './nethermind-runtime'
import {
  submitPreparedSorobanTx,
  type SorobanSubmitStatus,
} from './soroban-submit'
import {
  blockersForNullResult,
  buildNethermindEvent,
  defaultNow,
  explorerUrl,
  keyHex,
  poolIdForAsset,
  prepareClient,
  proofWasGenerated,
} from './xlm-private-support'
import { isShieldedAssetEnabled } from './networks'
import { loadXlmShieldedNotes as loadNotesForAsset } from './xlm-notes'
import type {
  LoadXlmShieldedNotesOptions,
  SubmitXlmPrivateTransferOptions,
  SubmitXlmUnshieldWithdrawalOptions,
  XlmNotesReport,
  XlmPrivateAction,
  XlmPrivateBaseOptions,
  XlmPrivateProgressEvent,
  XlmPrivateSubmitReport,
} from './xlm-private-types'

export { loadXlmShieldedNoteSet, loadXlmShieldedNotes } from './xlm-notes'

async function submitXlmPrivateAction(
  action: XlmPrivateAction,
  options: XlmPrivateBaseOptions,
  run: (
    submit: (prepared: NethermindPreparedProverTx) => Promise<string>,
    onStatus: (event: unknown) => void,
  ) => Promise<readonly string[] | null>,
): Promise<XlmPrivateSubmitReport> {
  const now = options.now ?? defaultNow
  const asset = options.asset ?? 'XLM'
  const started = now()
  const poolContractId = poolIdForAsset(options.network, asset)
  const statusEvents: XlmPrivateProgressEvent[] = []
  const txHashes: string[] = []
  let submitReached = false
  let transactionSubmitted = false
  let signedAuthEntryCount = 0

  // Accumulate for the final report AND stream live so the UI ring advances with the
  // real prover/submit heartbeat. A buggy listener must never abort an in-flight action.
  function record(event: XlmPrivateProgressEvent): void {
    statusEvents.push(event)
    try {
      options.onStatus?.(event)
    } catch (cause) {
      console.error('[xlm-private] onStatus listener threw', cause)
    }
  }

  if (!poolContractId || !isShieldedAssetEnabled(options.network, asset)) {
      return blockedReport(`${asset} pool is not configured for this network.`)
  }

  try {
    const submit = async (prepared: NethermindPreparedProverTx) => {
      submitReached = true
      const result = await submitPreparedSorobanTx(prepared, {
        identity: options.identity,
        network: options.network,
        onStatus: (event: SorobanSubmitStatus) => {
          record({
            elapsedMs: Math.round(now() - started),
            source: 'soroban',
            message: event.message,
            step: event.stage,
            current: event.current,
            total: event.total,
          })
        },
        ...options.submitOptions,
      })
      transactionSubmitted = true
      signedAuthEntryCount += result.signedAuthEntryCount
      txHashes.push(result.hash)
      return result.hash
    }
    const hashes = await run(submit, (event) => record(buildNethermindEvent(event, Math.round(now() - started))))
    const finalHashes = txHashes.length > 0 ? txHashes : [...(hashes ?? [])]

    if (finalHashes.length === 0) {
      return blockedReport(blockersForNullResult(statusEvents))
    }

    return {
      action,
      status: 'submitted',
      asset,
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      amountStroops: options.amountStroops.toString(),
      proofGenerated: true,
      submitReached: true,
      transactionSubmitted: true,
      txHashes: finalHashes,
      explorerUrls: finalHashes.map((hash) => explorerUrl(options.network, hash)),
      signedAuthEntryCount,
      statusEvents,
      blockers: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : `unknown ${asset} ${action} error`
    return {
      action,
      status: 'failed',
      asset,
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      amountStroops: options.amountStroops.toString(),
      proofGenerated: proofWasGenerated(statusEvents, submitReached),
      submitReached,
      transactionSubmitted,
      txHashes,
      explorerUrls: txHashes.map((hash) => explorerUrl(options.network, hash)),
      signedAuthEntryCount,
      statusEvents,
      blockers: [message],
      error: message,
    }
  }

  function blockedReport(blocker: string | readonly string[]): XlmPrivateSubmitReport {
    return {
      action,
      status: 'blocked',
      asset,
      durationMs: Math.round(now() - started),
      network: options.network,
      poolContractId,
      userAddress: options.identity.stellarPublicKey,
      amountStroops: options.amountStroops.toString(),
      proofGenerated: false,
      submitReached: false,
      transactionSubmitted: false,
      txHashes: [],
      explorerUrls: [],
      signedAuthEntryCount: 0,
      statusEvents,
      blockers: Array.isArray(blocker) ? blocker : [blocker],
    }
  }
}

export async function submitXlmPrivateTransfer(
  options: SubmitXlmPrivateTransferOptions,
): Promise<XlmPrivateSubmitReport> {
  const decoded = decodeReceiveCode(options.receiveCode.trim())
  if (!decoded.ok) {
    return submitXlmPrivateAction('transfer', options, async () => {
      throw new Error(`Invalid private receive code: ${decoded.error}`)
    })
  }

  if (decoded.value.network !== options.network) {
    return submitXlmPrivateAction('transfer', options, async () => {
      throw new Error(`Receive code is for ${decoded.value.network}, not ${options.network}`)
    })
  }

  return submitXlmPrivateAction('transfer', options, async (submit, onStatus) => {
    return runWithNethermindWebClient(options.network, async (client) => {
      const ready = await prepareClient(options, client)
      const poolContractId = poolIdForAsset(options.network, options.asset ?? 'XLM')
      if (!poolContractId) {
        throw new Error(`${options.asset ?? 'XLM'} pool is not configured for this network.`)
      }
      if (!ready.executeTransfer) {
        throw new Error('Nethermind WebClient does not expose executeTransfer')
      }

      await ready.syncPoolEvents?.()
      return ready.executeTransfer(
        poolContractId,
        options.identity.stellarPublicKey,
        options.amountStroops,
        keyHex(decoded.value.notePublicKey),
        keyHex(decoded.value.encryptionPublicKey),
        submit,
        onStatus,
      )
    }, options.importWebModule)
  })
}

export async function submitXlmUnshieldWithdrawal(
  options: SubmitXlmUnshieldWithdrawalOptions,
): Promise<XlmPrivateSubmitReport> {
  return submitXlmPrivateAction('withdraw', options, async (submit, onStatus) => {
    return runWithNethermindWebClient(options.network, async (client) => {
      const ready = await prepareClient(options, client)
      const poolContractId = poolIdForAsset(options.network, options.asset ?? 'XLM')
      if (!poolContractId) {
        throw new Error(`${options.asset ?? 'XLM'} pool is not configured for this network.`)
      }
      if (!ready.executeWithdraw) {
        throw new Error('Nethermind WebClient does not expose executeWithdraw')
      }

      await ready.syncPoolEvents?.()
      return ready.executeWithdraw(
        poolContractId,
        options.identity.stellarPublicKey,
        options.recipientAddress,
        options.amountStroops,
        submit,
        onStatus,
      )
    }, options.importWebModule)
  })
}

export function loadAssetShieldedNotes(
  options: LoadXlmShieldedNotesOptions & { readonly asset: AssetCode },
): Promise<XlmNotesReport> {
  return loadNotesForAsset(options)
}
