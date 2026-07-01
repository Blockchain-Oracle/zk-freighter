import { bytesToBigIntLE, bytesToHex } from './bytes'
import type { WalletIdentity } from './identity'
import { getNetworkConfig, type NetworkKey } from './networks'
import { runWithNethermindWebClient, type NethermindModuleImporter } from './nethermind-runtime'
import { poseidon2Hash2Bn254 } from './poseidon2-bn254'

const aspMembershipLeafDomain = 1n
const fieldHexDigits = 64

export type AspMembershipPreflightStatus =
  | 'needs-registration'
  | 'ready'
  | 'blocked'
  | 'failed'

export interface AspMembershipLeaf {
  readonly notePublicKeyHex: string
  readonly encryptionPublicKeyHex: string
  readonly membershipBlindingDecimal: string
  readonly membershipLeafDecimal: string
  readonly membershipLeafHex: string
}

export interface AspMembershipContractState {
  readonly contractId?: string
  readonly root?: string
  readonly levels?: number
  readonly nextIndex?: string
  readonly admin?: string
  readonly adminInsertOnly?: boolean
  readonly capacity?: number
}

export interface AspMembershipPreflightReport {
  readonly status: AspMembershipPreflightStatus
  readonly network: NetworkKey
  readonly userAddress: string
  readonly poolContractId?: string
  readonly leaf: AspMembershipLeaf
  readonly contractState?: AspMembershipContractState
  readonly canInsertWithoutAdmin?: boolean
  readonly userKeysStored: boolean
  readonly aspSecretStored: boolean
  readonly referenceLeafMatches?: boolean
  readonly membershipOnChainVerified: false
  readonly proofGenerated: false
  readonly transactionSubmitted: false
  readonly blockers: readonly string[]
  readonly error?: string
}

export interface AspMembershipPreflightOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly importWebModule?: NethermindModuleImporter
}

export function deriveAspMembershipLeaf(identity: WalletIdentity): AspMembershipLeaf {
  const notePublicKey = bytesToBigIntLE(identity.privateReceive.notePublicKey)
  const membershipBlinding = bytesToBigIntLE(identity.privateReceive.membershipBlinding)
  const leaf = poseidon2Hash2Bn254(notePublicKey, membershipBlinding, aspMembershipLeafDomain)

  return {
    notePublicKeyHex: `0x${bytesToHex(identity.privateReceive.notePublicKey)}`,
    encryptionPublicKeyHex: `0x${bytesToHex(identity.privateReceive.encryptionPublicKey)}`,
    membershipBlindingDecimal: membershipBlinding.toString(),
    membershipLeafDecimal: leaf.toString(),
    membershipLeafHex: fieldHexBE(leaf),
  }
}

function fieldHexBE(value: bigint): string {
  return `0x${value.toString(16).padStart(fieldHexDigits, '0')}`
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringField(value: Record<string, unknown>, key: string): string | undefined {
  return typeof value[key] === 'string' ? value[key] : undefined
}

function numberField(value: Record<string, unknown>, key: string): number | undefined {
  return typeof value[key] === 'number' ? value[key] : undefined
}

function boolField(value: Record<string, unknown>, key: string): boolean | undefined {
  return typeof value[key] === 'boolean' ? value[key] : undefined
}

function parseAspMembershipState(value: unknown): AspMembershipContractState | undefined {
  if (!isRecord(value) || !isRecord(value.aspMembership)) {
    return undefined
  }

  return {
    admin: stringField(value.aspMembership, 'admin'),
    adminInsertOnly: boolField(value.aspMembership, 'adminInsertOnly'),
    capacity: numberField(value.aspMembership, 'capacity'),
    contractId: stringField(value.aspMembership, 'contractId'),
    levels: numberField(value.aspMembership, 'levels'),
    nextIndex: stringField(value.aspMembership, 'nextIndex'),
    root: stringField(value.aspMembership, 'root'),
  }
}

function normalizeHex(value: unknown): string | undefined {
  return typeof value === 'string' ? value.toLowerCase() : undefined
}

function baseReport(
  options: AspMembershipPreflightOptions,
  status: AspMembershipPreflightStatus,
  blockers: readonly string[],
  error?: string,
): AspMembershipPreflightReport {
  const network = getNetworkConfig(options.network)
  return {
    status,
    network: options.network,
    userAddress: options.identity.stellarPublicKey,
    poolContractId: network.assets.XLM.poolId,
    leaf: deriveAspMembershipLeaf(options.identity),
    userKeysStored: false,
    aspSecretStored: false,
    membershipOnChainVerified: false,
    proofGenerated: false,
    transactionSubmitted: false,
    blockers,
    error,
  }
}

export async function runAspMembershipPreflight(
  options: AspMembershipPreflightOptions,
): Promise<AspMembershipPreflightReport> {
  const network = getNetworkConfig(options.network)
  const poolContractId = network.assets.XLM.poolId
  const leaf = deriveAspMembershipLeaf(options.identity)

  if (!poolContractId) {
    return baseReport(options, 'blocked', ['XLM pool is not configured for this network.'])
  }

  try {
    const result = await runWithNethermindWebClient(options.network, async (client) => {
      if (!client.aspState || !client.deriveAspUserLeaf) {
        return { kind: 'blocked' as const, blockers: ['Nethermind WebClient does not expose ASP preflight APIs.'] }
      }

      await client.deriveAndSaveUserKeys(
        options.identity.stellarPublicKey,
        options.identity.keyDerivationSignature,
      )
      const userKeysStored = Boolean(await client.getUserKeys(options.identity.stellarPublicKey))
      const aspSecretStored = Boolean(await client.getASPSecret(options.identity.stellarPublicKey))
      const referenceLeaf = normalizeHex(
        await client.deriveAspUserLeaf(
          BigInt(leaf.membershipBlindingDecimal),
          leaf.notePublicKeyHex,
        ),
      )
      const referenceLeafMatches = referenceLeaf === leaf.membershipLeafHex
      const contractState = parseAspMembershipState(await client.aspState())
      return { kind: 'ready' as const, userKeysStored, aspSecretStored, referenceLeafMatches, contractState }
    }, options.importWebModule)
    if (result.kind === 'blocked') {
      return baseReport(options, 'blocked', result.blockers)
    }

    const { userKeysStored, aspSecretStored, referenceLeafMatches, contractState } = result
    const canInsertWithoutAdmin = contractState?.adminInsertOnly === false
    const blockers = [
      referenceLeafMatches ? undefined : 'Local ASP leaf derivation does not match the Nethermind runtime.',
      contractState ? undefined : 'ASP membership contract state could not be read.',
      userKeysStored ? undefined : 'Nethermind worker did not store user public privacy keys.',
      aspSecretStored ? undefined : 'Nethermind worker did not store the ASP membership blinding.',
      contractState?.adminInsertOnly
        ? `ASP membership insertion currently requires admin auth from ${contractState.admin ?? 'the ASP admin'}.`
        : undefined,
      'Membership inclusion is not exposed as a contract read; submit insert_leaf, wait for indexing, then rerun the dry proof attempt.',
    ].filter((blocker): blocker is string => Boolean(blocker))

    return {
      status: blockers.some((blocker) => blocker.startsWith('Local ASP leaf')) ? 'failed' : 'needs-registration',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      poolContractId,
      leaf,
      contractState,
      canInsertWithoutAdmin,
      userKeysStored,
      aspSecretStored,
      referenceLeafMatches,
      membershipOnChainVerified: false,
      proofGenerated: false,
      transactionSubmitted: false,
      blockers,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'unknown ASP preflight error'
    return baseReport(options, 'failed', [message], message)
  }
}
