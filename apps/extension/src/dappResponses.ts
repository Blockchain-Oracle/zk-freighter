import type {
  AspMembershipInsertReport,
  AssetCode,
  CctpBridgeReport,
  CctpSourceKey,
  EvmFundingReport,
  FreighterBridgeResponse,
  GenerateDisclosureReport,
  NetworkKey,
  PasskeyEnvelope,
  PasskeySupportReport,
  PublicStellarPaymentReport,
  PublicDiscoveryLookupReport,
  PublicDiscoveryPublishReport,
  FundingApiReport,
  StellarUsdcTrustlineReport,
  XlmPrivateSubmitReport,
  XlmShieldSubmitReport,
  VerifyDisclosureReport,
} from '@zk-freighter/core'

import type { ActivityRecord } from './activity-store'

export interface DappWalletStatus {
  readonly ok: boolean
  readonly hasVault: boolean
  readonly unlocked: boolean
  readonly network: NetworkKey
  readonly publicKey: string
  readonly privateReceiveCode: string
  readonly evmAddress: string
  readonly passkeyEnabled: boolean
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

export interface BridgeSourceBalancesResponse {
  readonly ok: boolean
  readonly sourceChainKey?: CctpSourceKey
  readonly sourceLabel?: string
  readonly gasToken?: string
  readonly address?: string
  readonly nativeWei?: string
  readonly usdcAtomic?: string
  readonly error?: string
}

export interface ConfidentialResponse {
  readonly ok: boolean
  readonly report?: unknown
  readonly error?: string
}

export interface DappBalances {
  readonly shieldedXlmStroops: string
  readonly shieldedUsdcStroops: string
  readonly publicXlmStroops: string
  readonly publicUsdcStroops: string
  readonly noteCount: number
  readonly shieldedOk: boolean
  readonly publicOk: boolean
  readonly blockers: readonly string[]
  readonly scannedAt: string
}

export interface DappBalancesResponse {
  readonly ok: boolean
  readonly balances?: DappBalances
  readonly syncing: boolean
  readonly error?: string
}

export interface DemoFundingResponse {
  readonly ok: boolean
  readonly report?: ExtensionDemoFundingStatusReport | ExtensionDemoFundingRequestReport
  readonly error?: string
}

export interface SerializablePublicBalancesReport {
  readonly status: 'loaded' | 'unfunded' | 'failed'
  readonly network: NetworkKey
  readonly userAddress: string
  readonly balances: Record<AssetCode, string>
  readonly error?: string
}

export interface ExtensionDemoFundingStatusReport {
  readonly status: 'ready' | 'needs-funding' | 'unavailable' | 'failed'
  readonly network: NetworkKey
  readonly userAddress: string
  readonly balances?: SerializablePublicBalancesReport
  readonly hostedFunding?: FundingApiReport
  readonly blockers: readonly string[]
}

export interface ExtensionDemoFundingRequestReport {
  readonly status: 'funded' | 'ready' | 'unavailable' | 'failed'
  readonly network: NetworkKey
  readonly userAddress: string
  readonly trustline?: StellarUsdcTrustlineReport
  readonly hostedFunding?: FundingApiReport
  readonly balances?: SerializablePublicBalancesReport
  readonly blockers: readonly string[]
}

export interface PrivateRuntimeStatusResponse {
  readonly ok: true
  readonly surface: 'extension-popup'
  readonly coordinator: 'offscreen-queue'
  readonly proving: 'offscreen'
}

export interface PrivateEngineResetResponse {
  readonly ok: boolean
  readonly removedEntries: number
  readonly error?: string
}

export interface PrivateActionResponse {
  readonly ok: boolean
  readonly report?: XlmPrivateSubmitReport
  readonly error?: string
}

export interface PublicActionResponse {
  readonly ok: boolean
  readonly report?: PublicStellarPaymentReport
  readonly error?: string
}

export interface DiscoverLookupResponse {
  readonly ok: boolean
  readonly report?: PublicDiscoveryLookupReport
  readonly error?: string
}

export interface DiscoverPublishResponse {
  readonly ok: boolean
  readonly report?: PublicDiscoveryPublishReport
  readonly error?: string
}

export interface DiscoverStatusResponse {
  readonly ok: boolean
  readonly discoverable: boolean
  readonly receiveCode?: string
  readonly report?: PublicDiscoveryPublishReport
  readonly lookup?: PublicDiscoveryLookupReport
  readonly error?: string
}

export interface DisclosureResponse {
  readonly ok: boolean
  readonly report?: GenerateDisclosureReport
  readonly error?: string
}

export interface DisclosureVerifyResponse {
  readonly ok: boolean
  readonly report?: VerifyDisclosureReport
  readonly error?: string
}

export interface ActivityResponse {
  readonly ok: boolean
  readonly records: readonly ActivityRecord[]
}

export interface PasskeySupportResponse {
  readonly ok: boolean
  readonly support?: PasskeySupportReport
  readonly enabled: boolean
  readonly envelope?: PasskeyEnvelope
  readonly error?: string
}

export interface PasskeyPrepareCreateResponse {
  readonly ok: boolean
  readonly error?: string
}

export interface AutoShieldTickResult {
  readonly kind: 'shielded' | 'skipped' | 'blocked' | 'failed'
  readonly asset: AssetCode
  readonly amountStroops: string
  readonly reason: string
  readonly blocker?: string
}

export interface AutoShieldTickResponse {
  readonly ok: boolean
  readonly result?: AutoShieldTickResult
  readonly error?: string
}

export interface EvmFundResponse {
  readonly ok: boolean
  readonly report?: EvmFundingReport
  readonly error?: string
}

export type DappRuntimeResponse =
  | DappWalletStatus
  | FreighterBridgeResponse
  | PrepareShieldAccessResponse
  | PrepareUsdcReceiveResponse
  | QuickShieldResponse
  | QuickBridgeResponse
  | BridgeSourceBalancesResponse
  | ConfidentialResponse
  | DappBalancesResponse
  | DemoFundingResponse
  | PrivateRuntimeStatusResponse
  | PrivateEngineResetResponse
  | PrivateActionResponse
  | PublicActionResponse
  | DiscoverLookupResponse
  | DiscoverStatusResponse
  | DiscoverPublishResponse
  | DisclosureResponse
  | DisclosureVerifyResponse
  | ActivityResponse
  | PasskeySupportResponse
  | PasskeyPrepareCreateResponse
  | AutoShieldTickResponse
  | EvmFundResponse
  | { readonly ok: boolean; readonly publicKey?: string; readonly error?: string }
