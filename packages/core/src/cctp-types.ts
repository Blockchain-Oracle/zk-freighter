import type { Hex } from 'viem'
import type { WalletIdentity } from './identity'
import type { CctpSourceKey, NetworkKey } from './networks'

export type CctpBridgeStatus = 'running' | 'completed' | 'blocked' | 'failed'
export type CctpBridgeStage = 'readiness' | 'approve' | 'burn' | 'attestation' | 'mint'

export interface CctpBridgeProgressEvent {
  readonly stage: CctpBridgeStage
  readonly elapsedMs: number
  readonly message: string
  readonly txHash?: string
  readonly attempt?: number
}

export interface CctpAttestationMessage {
  readonly message: string
  readonly attestation: string
  readonly status: string
  readonly eventNonce?: string
  readonly messageHash?: string
}

export interface EvmCctpSourceClient {
  readonly accountAddress?: string
  sendTransaction(transaction: { readonly to: string; readonly data: Hex; readonly chainIdHex: string }): Promise<string>
  waitForTransaction(txHash: string): Promise<void>
}

export interface CctpBridgeReport {
  readonly status: CctpBridgeStatus
  readonly network: NetworkKey
  readonly destinationAddress: string
  readonly sourceChainKey: CctpSourceKey
  readonly sourceChain?: string
  readonly sourceDomain: number
  readonly sourceChainId: number
  readonly sourceGasToken: string
  readonly amountAtomic: string
  readonly amountDisplay: string
  readonly maxFeeAtomic: string
  readonly finalityThreshold: number
  readonly evmApproveTxHash?: string
  readonly evmApproveExplorerUrl?: string
  readonly evmBurnTxHash?: string
  readonly evmBurnExplorerUrl?: string
  readonly irisUrl?: string
  readonly attestationStatus?: string
  readonly attestationEventNonce?: string
  readonly stellarMintTxHash?: string
  readonly stellarMintExplorerUrl?: string
  readonly publicUsdcArrived: boolean
  readonly shieldPrompt: boolean
  readonly statusEvents: readonly CctpBridgeProgressEvent[]
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface RunCctpBridgeOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly sourceChainKey?: CctpSourceKey
  readonly evmClient?: EvmCctpSourceClient
  readonly amountAtomic?: bigint
  readonly maxFeeAtomic?: bigint
  readonly finalityThreshold?: number
  readonly fetch?: typeof fetch
  readonly sleep?: (ms: number) => Promise<void>
  readonly now?: () => number
  readonly attestationPollIntervalMs?: number
  readonly attestationMaxPolls?: number
  readonly onProgress?: (report: CctpBridgeReport) => void
  readonly submitMintAndForward?: (options: {
    readonly identity: WalletIdentity
    readonly network: NetworkKey
    readonly attestation: CctpAttestationMessage
    readonly onStatus?: (event: CctpBridgeProgressEvent) => void
  }) => Promise<{ readonly hash: string }>
}

export interface ResumeCctpBridgeOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly sourceChainKey?: CctpSourceKey
  readonly evmBurnTxHash: string
  readonly evmApproveTxHash?: string
  readonly amountAtomic?: bigint
  readonly maxFeeAtomic?: bigint
  readonly finalityThreshold?: number
  readonly fetch?: typeof fetch
  readonly sleep?: (ms: number) => Promise<void>
  readonly now?: () => number
  readonly attestationPollIntervalMs?: number
  readonly attestationMaxPolls?: number
  readonly onProgress?: (report: CctpBridgeReport) => void
  readonly submitMintAndForward?: (options: {
    readonly identity: WalletIdentity
    readonly network: NetworkKey
    readonly attestation: CctpAttestationMessage
    readonly onStatus?: (event: CctpBridgeProgressEvent) => void
  }) => Promise<{ readonly hash: string }>
}
