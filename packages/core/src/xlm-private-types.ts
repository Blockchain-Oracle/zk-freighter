import type { WalletIdentity } from './identity'
import type { AssetCode } from './assets'
import type { NetworkKey } from './networks'
import type { NethermindModuleImporter } from './nethermind-runtime'
import type { SubmitPreparedSorobanTxOptions } from './soroban-submit'

export type XlmPrivateAction = 'transfer' | 'withdraw'
export type XlmPrivateStatus = 'submitted' | 'blocked' | 'failed'

export interface XlmShieldedNote {
  readonly id: string
  readonly amountStroops: string
  readonly spent: boolean
  readonly leafIndex: number
  readonly createdAtLedger: number
}

export interface XlmPrivateProgressEvent {
  readonly source: 'nethermind' | 'soroban'
  readonly elapsedMs: number
  readonly flow?: string
  readonly step?: string
  readonly message: string
  readonly current?: number
  readonly total?: number
}

export interface XlmNotesReport {
  readonly status: 'loaded' | 'blocked' | 'failed'
  readonly asset: AssetCode
  readonly durationMs: number
  readonly network: NetworkKey
  readonly poolContractId?: string
  readonly userAddress: string
  readonly notes: readonly XlmShieldedNote[]
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface XlmPrivateSubmitReport {
  readonly action: XlmPrivateAction
  readonly status: XlmPrivateStatus
  readonly asset: AssetCode
  readonly durationMs: number
  readonly network: NetworkKey
  readonly poolContractId?: string
  readonly userAddress: string
  readonly amountStroops: string
  readonly proofGenerated: boolean
  readonly submitReached: boolean
  readonly transactionSubmitted: boolean
  readonly txHashes: readonly string[]
  readonly explorerUrls: readonly string[]
  readonly signedAuthEntryCount: number
  readonly statusEvents: readonly XlmPrivateProgressEvent[]
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface XlmPrivateBaseOptions {
  readonly asset?: AssetCode
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly amountStroops: bigint
  readonly timeoutMs?: number
  readonly now?: () => number
  readonly importWebModule?: NethermindModuleImporter
  readonly submitOptions?: Pick<
    SubmitPreparedSorobanTxOptions,
    'serverFactory' | 'sleep' | 'confirmationPolls' | 'pollIntervalMs'
  >
}

export interface LoadXlmShieldedNotesOptions {
  readonly asset?: AssetCode
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly limit?: number
  readonly now?: () => number
  readonly importWebModule?: NethermindModuleImporter
}

export interface SubmitXlmPrivateTransferOptions extends XlmPrivateBaseOptions {
  readonly receiveCode: string
}

export interface SubmitXlmUnshieldWithdrawalOptions extends XlmPrivateBaseOptions {
  readonly recipientAddress: string
}
