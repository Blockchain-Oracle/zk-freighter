import type {
  AssetCode,
  CctpSourceKey,
  FreighterBridgeRequest,
  NetworkKey,
  PasskeyCreateMaterial,
  PasskeyUnlockMaterial,
} from '@zk-fighter/core'

export type * from './dappResponses'

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
  bridgeSourceBalances: 'zkf.extension.bridge.balances',
  confidential: 'zkf.extension.confidential',
  balances: 'zkf.extension.balances',
  demoFundingStatus: 'zkf.extension.demoFunding.status',
  demoFundingRequest: 'zkf.extension.demoFunding.request',
  privateRuntimeStatus: 'zkf.extension.privateRuntime.status',
  privateTransfer: 'zkf.extension.dapp.privateTransfer',
  publicTransfer: 'zkf.extension.dapp.publicTransfer',
  unshield: 'zkf.extension.dapp.unshield',
  discover: 'zkf.extension.dapp.discover',
  discoverStatus: 'zkf.extension.dapp.discoverStatus',
  discoverPublish: 'zkf.extension.dapp.discoverPublish',
  disclosure: 'zkf.extension.dapp.disclosure',
  disclosureVerify: 'zkf.extension.dapp.disclosureVerify',
  activity: 'zkf.extension.dapp.activity',
  setNetwork: 'zkf.extension.dapp.setNetwork',
  passkeySupport: 'zkf.extension.dapp.passkeySupport',
  passkeyPrepareCreate: 'zkf.extension.dapp.passkeyPrepareCreate',
  passkeyCreate: 'zkf.extension.dapp.passkeyCreate',
  passkeyUnlock: 'zkf.extension.dapp.passkeyUnlock',
  passkeyRemove: 'zkf.extension.dapp.passkeyRemove',
} as const

/** Confidential-token ops (Track B). Proving runs in the offscreen (bb.js). */
export type ConfidentialOpKind = 'register' | 'deposit' | 'merge' | 'withdraw' | 'transfer' | 'scan'

export type DappMessageType = (typeof dappMessageTypes)[keyof typeof dappMessageTypes]

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
      readonly amountAtomic?: string; readonly resumeBurnHash?: string
    }
  | {
      readonly type: typeof dappMessageTypes.bridgeSourceBalances
      readonly sourceChainKey: CctpSourceKey
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
      readonly syncBeforeRead?: boolean
    }
  | {
      readonly type: typeof dappMessageTypes.demoFundingStatus
    }
  | {
      readonly type: typeof dappMessageTypes.demoFundingRequest
    }
  | {
      readonly type: typeof dappMessageTypes.privateRuntimeStatus
    }
  | {
      readonly type: typeof dappMessageTypes.privateTransfer
      readonly asset: AssetCode
      readonly amountStroops: string
      readonly receiveCode: string
      readonly timeoutMs?: number
    }
  | {
      readonly type: typeof dappMessageTypes.publicTransfer
      readonly asset: AssetCode
      readonly amountStroops: string
      readonly recipientAddress: string
    }
  | {
      readonly type: typeof dappMessageTypes.unshield
      readonly asset: AssetCode
      readonly amountStroops: string
      readonly recipientAddress: string
      readonly timeoutMs?: number
    }
  | {
      readonly type: typeof dappMessageTypes.discover
      readonly ownerAddress: string
    }
  | {
      readonly type: typeof dappMessageTypes.discoverStatus
    }
  | {
      readonly type: typeof dappMessageTypes.discoverPublish
    }
  | {
      readonly type: typeof dappMessageTypes.disclosure
      readonly asset: AssetCode
      readonly authority: string
      readonly purpose: string
    }
  | {
      readonly type: typeof dappMessageTypes.disclosureVerify
      readonly artifactJson: string
    }
  | {
      readonly type: typeof dappMessageTypes.activity
      readonly network?: NetworkKey
    }
  | {
      readonly type: typeof dappMessageTypes.setNetwork
      readonly network: NetworkKey
    }
  | {
      readonly type: typeof dappMessageTypes.passkeySupport
    }
  | {
      readonly type: typeof dappMessageTypes.passkeyPrepareCreate
      readonly password: string
    }
  | {
      readonly type: typeof dappMessageTypes.passkeyCreate
      readonly password: string
      readonly material: PasskeyCreateMaterial
    }
  | {
      readonly type: typeof dappMessageTypes.passkeyUnlock
      readonly material: PasskeyUnlockMaterial
    }
  | {
      readonly type: typeof dappMessageTypes.passkeyRemove
    }
