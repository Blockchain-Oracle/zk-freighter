import type {
  AspMembershipInsertReport,
  AssetCode,
  CctpSourceKey,
  FreighterBridgeRequest,
  FreighterBridgeResponse,
  NetworkKey,
  StellarUsdcTrustlineReport,
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
  openBridgeHandoff: 'zkf.extension.bridge.open',
} as const

export type DappMessageType = (typeof dappMessageTypes)[keyof typeof dappMessageTypes]

export interface DappWalletStatus {
  readonly ok: boolean
  readonly hasVault: boolean
  readonly unlocked: boolean
  readonly network: NetworkKey
  readonly publicKey: string
  readonly privateReceiveCode: string
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

export interface BridgeHandoffResponse {
  readonly ok: boolean
  readonly url?: string
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
      readonly type: typeof dappMessageTypes.openBridgeHandoff
      readonly sourceChainKey?: CctpSourceKey
      readonly resumeBurnHash?: string
    }

export type DappRuntimeResponse =
  | DappWalletStatus
  | FreighterBridgeResponse
  | PrepareShieldAccessResponse
  | PrepareUsdcReceiveResponse
  | QuickShieldResponse
  | BridgeHandoffResponse
  | {
      readonly ok: boolean
      readonly publicKey?: string
      readonly error?: string
    }
