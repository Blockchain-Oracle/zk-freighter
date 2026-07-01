import type {
  AspMembershipInsertReport,
  AssetCode,
  CctpBridgeReport,
  CctpSourceKey,
  GenerateDisclosureReport,
  VerifyDisclosureReport,
  NetworkKey,
  PublicDiscoveryPublishReport,
  PublicDiscoveryLookupReport,
  StellarUsdcTrustlineReport,
  XlmPrivateSubmitReport,
  XlmShieldSubmitReport,
} from '@zk-fighter/core'

import type { ConfidentialOpKind, DappBalances } from './dappMessages'

// Offscreen-runner request shapes (the runtime injects the unlocked mnemonic here)
// + the runner function aliases. Split out of dappRuntime.ts to keep it < 300 lines.

export interface ExtensionShieldRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly amountStroops?: string
  readonly timeoutMs?: number
}

export interface ExtensionAspInsertRequest { readonly mnemonic: string; readonly network: NetworkKey }
export interface ExtensionUsdcTrustlineRequest { readonly mnemonic: string; readonly network: NetworkKey }
export interface ExtensionBalancesRequest { readonly mnemonic: string; readonly network: NetworkKey; readonly syncBeforeRead?: boolean }
export interface ExtensionDiscoverRequest { readonly network: NetworkKey; readonly ownerAddress: string }
export interface ExtensionDiscoverPublishRequest { readonly mnemonic: string; readonly network: NetworkKey }

export interface ExtensionPrivateTransferRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly amountStroops: string
  readonly receiveCode: string
  readonly timeoutMs?: number
}

export interface ExtensionUnshieldRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly amountStroops: string
  readonly recipientAddress: string
  readonly timeoutMs?: number
}

export interface ExtensionDisclosureRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly authority: string
  readonly purpose: string
}

export interface ExtensionDisclosureVerifyRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly artifactJson: string
}

export interface ExtensionBridgeRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly sourceChainKey: CctpSourceKey
  readonly amountAtomic?: string
  readonly resumeBurnHash?: string
}

export interface ExtensionConfidentialRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly op: ConfidentialOpKind
  readonly amount?: string
  readonly to?: string
}

export type ExtensionShieldRunner = (request: ExtensionShieldRequest) => Promise<XlmShieldSubmitReport>
export type ExtensionAspInsertRunner = (request: ExtensionAspInsertRequest) => Promise<AspMembershipInsertReport>
export type ExtensionUsdcTrustlineRunner = (request: ExtensionUsdcTrustlineRequest) => Promise<StellarUsdcTrustlineReport>
export type ExtensionBridgeRunner = (request: ExtensionBridgeRequest) => Promise<CctpBridgeReport>
export type ExtensionConfidentialRunner = (request: ExtensionConfidentialRequest) => Promise<unknown>
export type ExtensionBalancesRunner = (request: ExtensionBalancesRequest) => Promise<DappBalances>
export type ExtensionPrivateTransferRunner = (request: ExtensionPrivateTransferRequest) => Promise<XlmPrivateSubmitReport>
export type ExtensionUnshieldRunner = (request: ExtensionUnshieldRequest) => Promise<XlmPrivateSubmitReport>
export type ExtensionDiscoverRunner = (request: ExtensionDiscoverRequest) => Promise<PublicDiscoveryLookupReport>
export type ExtensionDiscoverPublishRunner = (request: ExtensionDiscoverPublishRequest) => Promise<PublicDiscoveryPublishReport>
export type ExtensionDisclosureRunner = (request: ExtensionDisclosureRequest) => Promise<GenerateDisclosureReport>
export type ExtensionDisclosureVerifyRunner = (request: ExtensionDisclosureVerifyRequest) => Promise<VerifyDisclosureReport>
