import { runWithNethermindWebClient, type NethermindModuleImporter } from './nethermind-runtime'
import { isShieldedAssetEnabled, type NetworkKey } from './networks'
import { appendNethermindEvent, defaultNow, keyHex, poolIdForAsset, prepareClient } from './xlm-private-support'
import type { XlmPrivateProgressEvent } from './xlm-private-types'
import {
  CANONICAL_SELECTIVE_DISCLOSURE_1_VK_HASH,
  DISCLOSURE_ARTIFACT_KIND,
  DISCLOSURE_ARTIFACT_VERSION,
  type DisclosureArtifact,
  type DisclosureReceipt,
  type GenerateDisclosureOptions,
  type GenerateDisclosureReport,
  type VerifyDisclosureReport,
} from './disclosure-types'

const disclosureNonceBytes = 32
const hexPrefix = '0x'
const fieldHexLength = 66
const proofHexLength = 258
const bn254Prime = 21888242871839275222246405745257275088548364400416034343698204186575808495617n
const secretFieldNames = [
  'mnemonic',
  'seedPhrase',
  'stellarSecretKey',
  'secretKey',
  'privateKey',
  'notePrivateKey',
  'spendKey',
  'keyDerivationSignature',
  'blinding',
  'membershipBlinding',
] as const

export function randomDisclosureNonceHex(): string {
  const bytes = new Uint8Array(disclosureNonceBytes)
  globalThis.crypto.getRandomValues(bytes)
  const value = BigInt(keyHex(bytes)) % bn254Prime
  return `${hexPrefix}${value.toString(16).padStart(disclosureNonceBytes * 2, '0')}`
}

export async function generateDisclosureArtifact(
  options: GenerateDisclosureOptions,
): Promise<GenerateDisclosureReport> {
  const now = options.now ?? defaultNow
  const started = now()
  const poolContractId = poolIdForAsset(options.network, options.asset)
  const statusEvents: XlmPrivateProgressEvent[] = []

  if (!poolContractId || !isShieldedAssetEnabled(options.network, options.asset)) {
    return blockedReport('Disclosure receipts are enabled only for configured shielded pools.')
  }
  if (options.note.spent) {
    return blockedReport('Select an unspent shielded note before generating a disclosure receipt.')
  }

  try {
    const nonceHex = normalizedFieldHex(options.contextNonceHex ?? randomDisclosureNonceHex(), 'context nonce')
    const receipt = await runWithNethermindWebClient(options.network, async (client) => {
      const ready = await prepareClient(options, client)
      if (!ready.generateSelectiveDisclosure) {
        throw new Error('Nethermind WebClient does not expose generateSelectiveDisclosure')
      }

      return ready.generateSelectiveDisclosure(
        poolContractId,
        options.identity.stellarPublicKey,
        options.note.id,
        requiredText(options.authorityLabel, 'Authority label'),
        normalizedPayloadHex(options.authorityIdentityPayloadHex, 'Authority identity payload'),
        requiredText(options.purpose, 'Purpose'),
        BigInt(nonceHex),
        (event) => appendNethermindEvent(statusEvents, event, Math.round(now() - started)),
      )
    }, options.importWebModule)
    if (!isDisclosureReceipt(receipt)) {
      return blockedReport('Nethermind returned no disclosure receipt. The note may need ASP/indexer sync.')
    }

    const artifact: DisclosureArtifact = {
      kind: DISCLOSURE_ARTIFACT_KIND,
      version: DISCLOSURE_ARTIFACT_VERSION,
      network: options.network,
      ownerAddress: options.identity.stellarPublicKey,
      activity: {
        asset: options.asset,
        amountStroops: options.note.amountStroops,
        commitment: options.note.id,
        createdAtLedger: options.note.createdAtLedger,
        leafIndex: options.note.leafIndex,
      },
      receipt,
      warnings: [
        'Read-only: this artifact cannot spend funds.',
        'User-held: ZK Fighter cannot disclose this on the user behalf.',
        'Activity fields are owner-supplied context; verification proves receipt proof, context, and root freshness.',
      ],
    }

    return {
      status: 'generated',
      durationMs: Math.round(now() - started),
      network: options.network,
      asset: options.asset,
      poolContractId,
      artifact,
      artifactJson: JSON.stringify(artifact, null, 2),
      statusEvents,
      blockers: [],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'disclosure generation failed'
    return failedReport(message)
  }

  function blockedReport(blocker: string): GenerateDisclosureReport {
    return {
      status: 'blocked',
      durationMs: Math.round(now() - started),
      network: options.network,
      asset: options.asset,
      poolContractId,
      statusEvents,
      blockers: [blocker],
    }
  }

  function failedReport(message: string): GenerateDisclosureReport {
    return {
      status: 'failed',
      durationMs: Math.round(now() - started),
      network: options.network,
      asset: options.asset,
      poolContractId,
      statusEvents,
      blockers: [message],
      error: message,
    }
  }
}

export async function verifyDisclosureArtifact(options: {
  readonly artifactJson: string
  readonly network: NetworkKey
  readonly expectedVkHash?: string
  readonly importWebModule?: NethermindModuleImporter
}): Promise<VerifyDisclosureReport> {
  try {
    const parsed = parseDisclosureArtifact(options.artifactJson)
    const spendAuthorityPresent = disclosureArtifactContainsSpendAuthority(parsed)
    if (spendAuthorityPresent) {
      return verificationFailure('Artifact contains secret or spend-authority-shaped fields.', true)
    }
    if (parsed.network !== options.network) {
      return verificationFailure(`Disclosure artifact is for ${parsed.network}, not ${options.network}.`)
    }

    const report = await runWithNethermindWebClient(options.network, async (client) => {
      if (!client.verifySelectiveDisclosure) {
        throw new Error('Nethermind WebClient does not expose verifySelectiveDisclosure')
      }

      return parseVerificationReport(await client.verifySelectiveDisclosure(
        JSON.stringify(parsed.receipt),
        options.expectedVkHash ?? CANONICAL_SELECTIVE_DISCLOSURE_1_VK_HASH,
      ))
    }, options.importWebModule)
    const fullyVerified = report.proofVerified && report.contextVerified && report.knownRootStatus
    return {
      status: fullyVerified ? 'verified' : 'rejected',
      fullyVerified,
      ...report,
      readOnly: true,
      spendAuthorityPresent,
      artifact: parsed,
      blockers: fullyVerified ? [] : ['Disclosure verification requires proof, context, and known-root checks to pass.'],
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'disclosure verification failed'
    return verificationFailure(message)
  }

  function verificationFailure(message: string, spendAuthorityPresent = false): VerifyDisclosureReport {
    return {
      status: 'failed',
      fullyVerified: false,
      proofVerified: false,
      contextVerified: false,
      knownRootStatus: false,
      readOnly: true,
      spendAuthorityPresent,
      blockers: [message],
      error: message,
    }
  }
}

export function parseDisclosureArtifact(json: string): DisclosureArtifact {
  const value = JSON.parse(json) as unknown
  if (!isDisclosureArtifact(value)) {
    throw new Error('Invalid ZK Fighter disclosure artifact.')
  }
  return value
}

export function disclosureArtifactContainsSpendAuthority(value: unknown): boolean {
  if (Array.isArray(value)) {
    return value.some(disclosureArtifactContainsSpendAuthority)
  }
  if (!isRecord(value)) {
    return false
  }
  return Object.entries(value).some(([key, entry]) => {
    return secretFieldNames.includes(key as (typeof secretFieldNames)[number]) || disclosureArtifactContainsSpendAuthority(entry)
  })
}

function isDisclosureReceipt(value: unknown): value is DisclosureReceipt {
  if (!isRecord(value) || value.version !== 1 || typeof value.proofCompressedHex !== 'string') {
    return false
  }
  const circuit = isRecord(value.circuit) ? value.circuit : undefined
  const context = isRecord(value.context) ? value.context : undefined
  const publicInputs = isRecord(value.publicInputs) ? value.publicInputs : undefined
  return Boolean(
    circuit &&
      context &&
      publicInputs &&
      circuit.name === 'selectiveDisclosure_1' &&
      isHex(circuit.vkHash, fieldHexLength) &&
      isHex(value.proofCompressedHex, proofHexLength) &&
      Array.isArray(publicInputs.roots) &&
      Array.isArray(publicInputs.noteCommitments) &&
      isHex(publicInputs.extContextHash, fieldHexLength),
  )
}

function isDisclosureArtifact(value: unknown): value is DisclosureArtifact {
  if (!isRecord(value) || value.kind !== DISCLOSURE_ARTIFACT_KIND || value.version !== DISCLOSURE_ARTIFACT_VERSION) {
    return false
  }
  const activity = isRecord(value.activity) ? value.activity : undefined
  return Boolean(
    typeof value.network === 'string' &&
      typeof value.ownerAddress === 'string' &&
      Array.isArray(value.warnings) &&
      activity &&
      typeof activity.asset === 'string' &&
      typeof activity.amountStroops === 'string' &&
      typeof activity.commitment === 'string' &&
      typeof activity.createdAtLedger === 'number' &&
      typeof activity.leafIndex === 'number' &&
      isDisclosureReceipt(value.receipt),
  )
}

function parseVerificationReport(value: unknown) {
  if (!isRecord(value)) {
    throw new Error('Invalid disclosure verification report.')
  }
  return {
    proofVerified: value.proofVerified === true,
    contextVerified: value.contextVerified === true,
    knownRootStatus: value.knownRootStatus === true,
  }
}

function normalizedPayloadHex(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed.startsWith(hexPrefix) || trimmed.length <= hexPrefix.length || trimmed.length % 2 !== 0) {
    throw new Error(`${label} must be non-empty even-length 0x-prefixed hex.`)
  }
  if (!/^0x[0-9a-f]+$/.test(trimmed)) {
    throw new Error(`${label} must use lowercase hex digits.`)
  }
  return trimmed
}

function normalizedFieldHex(value: string, label: string): string {
  const normalized = normalizedPayloadHex(value, label)
  if (normalized.length !== fieldHexLength || BigInt(normalized) >= bn254Prime) {
    throw new Error(`${label} must be a 32-byte field element below the BN254 modulus.`)
  }
  return normalized
}

function requiredText(value: string, label: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new Error(`${label} is required.`)
  }
  return trimmed
}

function isHex(value: unknown, length: number): value is string {
  return typeof value === 'string' && value.length === length && /^0x[0-9a-f]+$/.test(value)
}
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
