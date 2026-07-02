import type { AssetCode } from './assets'
import type { WalletIdentity } from './identity'
import type { NethermindModuleImporter } from './nethermind-runtime'
import type { NetworkKey } from './networks'
import type { XlmPrivateProgressEvent, XlmShieldedNote } from './xlm-private-types'

export const DISCLOSURE_ARTIFACT_VERSION = 1
export const DISCLOSURE_ARTIFACT_KIND = 'zk-freighter-disclosure-artifact'
export const CANONICAL_SELECTIVE_DISCLOSURE_1_VK_HASH =
  '0xe8c9879c1239deeaab3cda366419e3536a6f66502f88c3eec09da1e52843e5af'

export type DisclosureGenerateStatus = 'generated' | 'blocked' | 'failed'
export type DisclosureVerifyStatus = 'verified' | 'rejected' | 'failed'

export interface DisclosureReceipt {
  readonly version: number
  readonly circuit: {
    readonly name: string
    readonly levels: number
    readonly nNotes: number
    readonly vkHash: string
  }
  readonly context: {
    readonly network: string
    readonly poolAddress: string
    readonly authorityLabel: string
    readonly authorityIdentityPayloadHex: string
    readonly purpose: string
    readonly contextNonce: string
  }
  readonly publicInputs: {
    readonly roots: readonly string[]
    readonly noteCommitments: readonly string[]
    readonly extContextHash: string
  }
  readonly proofCompressedHex: string
  readonly issuedAt: string
}

export interface DisclosureActivity {
  readonly asset: AssetCode
  readonly amountStroops: string
  readonly commitment: string
  readonly createdAtLedger: number
  readonly leafIndex: number
}

export interface DisclosureArtifact {
  readonly kind: typeof DISCLOSURE_ARTIFACT_KIND
  readonly version: typeof DISCLOSURE_ARTIFACT_VERSION
  readonly network: NetworkKey
  readonly ownerAddress: string
  readonly activity: DisclosureActivity
  readonly receipt: DisclosureReceipt
  readonly warnings: readonly string[]
}

export interface GenerateDisclosureOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly note: XlmShieldedNote
  readonly authorityLabel: string
  readonly authorityIdentityPayloadHex: string
  readonly purpose: string
  readonly contextNonceHex?: string
  readonly now?: () => number
  readonly importWebModule?: NethermindModuleImporter
}

export interface GenerateDisclosureReport {
  readonly status: DisclosureGenerateStatus
  readonly durationMs: number
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly poolContractId?: string
  readonly artifact?: DisclosureArtifact
  readonly artifactJson?: string
  readonly statusEvents: readonly XlmPrivateProgressEvent[]
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface VerifyDisclosureReport {
  readonly status: DisclosureVerifyStatus
  readonly fullyVerified: boolean
  readonly proofVerified: boolean
  readonly contextVerified: boolean
  readonly knownRootStatus: boolean
  readonly readOnly: boolean
  readonly spendAuthorityPresent: boolean
  readonly artifact?: DisclosureArtifact
  readonly blockers: readonly string[]
  readonly error?: string
}
