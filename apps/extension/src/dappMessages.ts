import type {
  AspMembershipInsertReport,
  AssetCode,
  CctpBridgeReport,
  CctpSourceKey,
  FreighterBridgeRequest,
  FreighterBridgeResponse,
  NetworkKey,
  PublicDiscoveryLookupReport,
  StellarUsdcTrustlineReport,
  XlmPrivateSubmitReport,
  XlmShieldSubmitReport,
} from '@zk-fighter/core'

export const dappMessageTypes = {
  freighterRequest: 'zkf.extension.freighterRequest',
  status: 'zkf.extension.dapp.status',
  importVault: 'zkf.extension.dapp.importVault',
  unlock: 'zkf.extension.dapp.unlock',
  lock: 'zkf.extension.dapp.lock',
  prepareShieldAccess: 'zkf.extension.quickShield.prepareAccess',
  prepareUsdcReceive: 'zkf.extension.quickShield.prepareUsdcReceive',
  quickShield: 'zkf.extension.quickShield',
  quickBridge: 'zkf.extension.bridge.run',
  confidential: 'zkf.extension.confidential',
  balances: 'zkf.extension.balances',
  privateTransfer: 'zkf.extension.dapp.privateTransfer',
  unshield: 'zkf.extension.dapp.unshield',
  discover: 'zkf.extension.dapp.discover',
} as const

/** Confidential-token ops (Track B). Proving runs in the offscreen (bb.js). */
export type ConfidentialOpKind = 'register' | 'deposit' | 'merge' | 'withdraw' | 'transfer' | 'scan'

export type DappMessageType = (typeof dappMessageTypes)[keyof typeof dappMessageTypes]

export interface DappWalletStatus {
  readonly ok: boolean
  readonly hasVault: boolean
  readonly unlocked: boolean
  readonly network: NetworkKey
  readonly publicKey: string
  readonly privateReceiveCode: string
  /** Seed-derived EVM address used to fund + sign the CCTP bridge (no MetaMask). */
  readonly evmAddress: string
  readonly error?: string
}

export interface QuickShieldResponse {
  readonly ok: boolean
  readonly report?: XlmShieldSubmitReport
  readonly error?: string
}

export interface PrepareShieldAccessResponse {
  readonly ok: boolean
  readonly report?: AspMembershipInsertReport
  readonly error?: string
}

export interface PrepareUsdcReceiveResponse {
  readonly ok: boolean
  readonly report?: StellarUsdcTrustlineReport
  readonly error?: string
}

export interface QuickBridgeResponse {
  readonly ok: boolean
  readonly report?: CctpBridgeReport
  readonly error?: string
}

export type DappRuntimeMessage =
  | {
      readonly type: typeof dappMessageTypes.freighterRequest
      readonly origin: string
      readonly request: FreighterBridgeRequest
    }
  | {
      readonly type: typeof dappMessageTypes.status
    }
  | {
      readonly type: typeof dappMessageTypes.importVault
      readonly mnemonic: string
      readonly password: string
      readonly network?: NetworkKey
    }
  | {
      readonly type: typeof dappMessageTypes.unlock
      readonly password: string
    }
  | {
      readonly type: typeof dappMessageTypes.lock
    }
  | {
      readonly type: typeof dappMessageTypes.prepareShieldAccess
    }
  | {
      readonly type: typeof dappMessageTypes.prepareUsdcReceive
    }
  | {
      readonly type: typeof dappMessageTypes.quickShield
      readonly asset: AssetCode
      readonly amountStroops?: string
      readonly timeoutMs?: number
    }
  | {
      readonly type: typeof dappMessageTypes.quickBridge
      readonly sourceChainKey: CctpSourceKey
      readonly resumeBurnHash?: string
    }
  | {
      readonly type: typeof dappMessageTypes.confidential
      readonly op: ConfidentialOpKind
      /** Underlying base units (i128), for deposit/withdraw/transfer. */
      readonly amount?: string
      /** Recipient Stellar address, for withdraw/transfer. */
      readonly to?: string
    }
  | {
      readonly type: typeof dappMessageTypes.balances
    }
  | {
      readonly type: typeof dappMessageTypes.privateTransfer
      readonly asset: AssetCode
      readonly amountStroops: string
      readonly receiveCode: string
    }
  | {
      readonly type: typeof dappMessageTypes.unshield
      readonly asset: AssetCode
      readonly amountStroops: string
      readonly recipientAddress: string
    }
  | {
      readonly type: typeof dappMessageTypes.discover
      readonly ownerAddress: string
    }

export interface ConfidentialResponse {
  readonly ok: boolean
  /** The op's structured report (ConfidentialSubmitReport) or scan summary. */
  readonly report?: unknown
  readonly error?: string
}

/** Real shielded + public balances, in atomic stroops (7dp). Never fabricated. */
export interface DappBalances {
  readonly shieldedXlmStroops: string
  readonly shieldedUsdcStroops: string
  readonly publicXlmStroops: string
  readonly publicUsdcStroops: string
  readonly noteCount: number
  /**
   * False when a shielded pool scan failed/was blocked — the shielded stroops are
   * then NOT a real balance (the UI must show "unknown", never a fabricated 0).
   */
  readonly shieldedOk: boolean
  /** False when the Horizon public lookup failed — public stroops are then unknown. */
  readonly publicOk: boolean
  /** Non-empty when a scan was blocked/failed — surfaced honestly, not hidden. */
  readonly blockers: readonly string[]
  /** ISO timestamp of the scan that produced these numbers. */
  readonly scannedAt: string
}

/**
 * Balance response. `balances` is the last-known REAL scan (from durable cache or
 * a fresh scan); `syncing` means a background refresh is in flight, so the popup
 * shows the cached numbers immediately and updates when the next poll lands.
 */
export interface DappBalancesResponse {
  readonly ok: boolean
  readonly balances?: DappBalances
  readonly syncing: boolean
  readonly error?: string
}

/** Send (private transfer) + Unshield (withdraw) both return a private submit report. */
export interface PrivateActionResponse {
  readonly ok: boolean
  readonly report?: XlmPrivateSubmitReport
  readonly error?: string
}

/** Discover: look up a published receive code by public Stellar address. */
export interface DiscoverLookupResponse {
  readonly ok: boolean
  readonly report?: PublicDiscoveryLookupReport
  readonly error?: string
}

export type DappRuntimeResponse =
  | DappWalletStatus
  | FreighterBridgeResponse
  | PrepareShieldAccessResponse
  | PrepareUsdcReceiveResponse
  | QuickShieldResponse
  | QuickBridgeResponse
  | ConfidentialResponse
  | DappBalancesResponse
  | {
      readonly ok: boolean
      readonly publicKey?: string
      readonly error?: string
    }
