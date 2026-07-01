import type { AssetCode } from './assets'
import { isShieldedAssetEnabled } from './networks'
import { runWithNethermindWebClient } from './nethermind-runtime'
import { withPrivateRuntimeTimeout } from './private-runtime-timeout'
import {
  defaultNow,
  parseNote,
  poolIdForAsset,
  prepareClient,
} from './xlm-private-support'
import type {
  LoadXlmShieldedNotesOptions,
  XlmNotesReport,
  XlmShieldedNote,
} from './xlm-private-types'

export type XlmShieldedNoteSetReport = Partial<Record<AssetCode, XlmNotesReport>>

const shieldedAssets: readonly AssetCode[] = ['XLM', 'USDC']
const defaultRuntimeJobTimeoutMs = 90_000
const defaultStorageStepTimeoutMs = 10_000
const defaultPoolSyncTimeoutMs = 60_000

export async function loadXlmShieldedNotes(
  options: LoadXlmShieldedNotesOptions,
): Promise<XlmNotesReport> {
  const asset = options.asset ?? 'XLM'
  const reports = await loadXlmShieldedNoteSet({ ...options, assets: [asset] })
  const report = reports[asset]
  if (!report) throw new Error(`${asset} shielded note scan did not return a report.`)
  return report
}

export async function loadXlmShieldedNoteSet(
  options: Omit<LoadXlmShieldedNotesOptions, 'asset'> & { readonly assets?: readonly AssetCode[] },
): Promise<XlmShieldedNoteSetReport> {
  const now = options.now ?? defaultNow
  const started = now()
  const assets = uniqueAssets(options.assets ?? shieldedAssets)
  const reports: XlmShieldedNoteSetReport = {}
  const scannable = assets
    .map((asset) => ({ asset, poolContractId: poolIdForAsset(options.network, asset) }))
    .filter((entry): entry is { readonly asset: AssetCode; readonly poolContractId: string } => {
      const { asset, poolContractId } = entry
      if (poolContractId && isShieldedAssetEnabled(options.network, asset)) return true
      reports[asset] = notesReport({
        options,
        started,
        now,
        asset,
        poolContractId,
        status: 'blocked',
        blocker: `${asset} pool is not configured for this network.`,
      })
      return false
    })

  if (scannable.length === 0) return reports

  try {
    const result = await withPrivateRuntimeTimeout(
      runWithNethermindWebClient(options.network, async (client) => {
        const ready = await timedStep(
          prepareClient(options, client),
          options.timeoutMs ?? defaultStorageStepTimeoutMs,
          'private key preparation timed out',
        )
        if (!ready.getUnspentUserNotes) {
          throw new Error('Nethermind WebClient does not expose pool-filtered note loading')
        }

        if (options.syncBeforeRead) {
          await timedStep(
            Promise.resolve(ready.syncPoolEvents?.()),
            options.timeoutMs ?? defaultPoolSyncTimeoutMs,
            `${assetList(scannable.map(({ asset }) => asset))} pool sync timed out`,
          )
        }

        const notesByAsset = new Map<AssetCode, readonly XlmShieldedNote[]>()
        const failuresByAsset = new Map<AssetCode, string>()
        for (const { asset, poolContractId } of scannable) {
          try {
            const raw = await timedStep(
              ready.getUnspentUserNotes(poolContractId, options.identity.stellarPublicKey),
              options.timeoutMs ?? defaultStorageStepTimeoutMs,
              `${asset} note read timed out`,
            )
            const parsed = Array.isArray(raw) ? raw.map(parseNote).filter((note) => note !== undefined) : []
            notesByAsset.set(asset, options.limit ? parsed.slice(0, options.limit) : parsed)
          } catch (error) {
            failuresByAsset.set(asset, messageFor(error, `${asset} note read failed`))
          }
        }
        return { notesByAsset, failuresByAsset }
      }, options.importWebModule),
      options.timeoutMs ?? defaultRuntimeJobTimeoutMs,
      `${assetList(scannable.map(({ asset }) => asset))} private runtime job timed out`,
    )

    for (const { asset, poolContractId } of scannable) {
      const failure = result.failuresByAsset.get(asset)
      reports[asset] = notesReport({
        options,
        started,
        now,
        asset,
        poolContractId,
        status: failure ? 'failed' : 'loaded',
        notes: result.notesByAsset.get(asset) ?? [],
        blocker: failure,
      })
    }
  } catch (error) {
    const message = messageFor(error, 'unknown note loading error')
    for (const { asset, poolContractId } of scannable) {
      reports[asset] = notesReport({
        options,
        started,
        now,
        asset,
        poolContractId,
        status: 'failed',
        blocker: message,
      })
    }
  }

  return reports
}

async function timedStep<T>(work: Promise<T>, timeoutMs: number, label: string): Promise<T> {
  return withPrivateRuntimeTimeout(work, timeoutMs, label)
}

function uniqueAssets(assets: readonly AssetCode[]): readonly AssetCode[] {
  return [...new Set(assets)]
}

function assetList(assets: readonly AssetCode[]): string {
  return assets.join('/')
}

function messageFor(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback
}

function notesReport(input: {
  readonly options: Omit<LoadXlmShieldedNotesOptions, 'asset'>
  readonly started: number
  readonly now: () => number
  readonly asset: AssetCode
  readonly poolContractId?: string
  readonly status: XlmNotesReport['status']
  readonly notes?: readonly XlmShieldedNote[]
  readonly blocker?: string
}): XlmNotesReport {
  return {
    status: input.status,
    asset: input.asset,
    durationMs: Math.round(input.now() - input.started),
    network: input.options.network,
    poolContractId: input.poolContractId,
    userAddress: input.options.identity.stellarPublicKey,
    notes: input.notes ?? [],
    blockers: input.blocker ? [input.blocker] : [],
    error: input.status === 'failed' ? input.blocker : undefined,
  }
}
