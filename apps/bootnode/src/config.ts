import { NETWORKS, privateEventContractIds, type NetworkKey } from '@zk-fighter/core'

export interface BootnodeConfig {
  readonly port: number
  readonly databaseUrl?: string
  readonly upstreamRpcUrl: string
  readonly network: NetworkKey
  readonly allowedContracts: readonly string[]
  readonly indexerStartLedger: number
  readonly indexerPageSize: number
  readonly indexerMaxPagesPerRound: number
  readonly indexerIntervalMs: number
  readonly indexerEnabled: boolean
}

const defaultIndexerStartLedger = {
  testnet: 3_368_685,
  mainnet: 63_190_069,
} as const satisfies Record<NetworkKey, number>

export function readConfig(env: NodeJS.ProcessEnv = process.env): BootnodeConfig {
  const network = env.ZKF_BOOTNODE_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
  const upstreamOverride = text(env.ZKF_BOOTNODE_UPSTREAM_RPC_URL)
  return {
    port: parseNumber(env.PORT, 8788),
    databaseUrl: text(env.DATABASE_URL),
    upstreamRpcUrl: upstreamOverride ?? NETWORKS[network].rpcUrl,
    network,
    allowedContracts: list(env.ZKF_BOOTNODE_ALLOWED_CONTRACTS) ?? privateEventContractIds(network),
    indexerStartLedger: parseNumber(env.ZKF_BOOTNODE_START_LEDGER, defaultIndexerStartLedger[network]),
    indexerPageSize: parseNumber(env.ZKF_BOOTNODE_PAGE_SIZE, 200),
    indexerMaxPagesPerRound: parseNumber(env.ZKF_BOOTNODE_MAX_PAGES_PER_ROUND, 4),
    indexerIntervalMs: parseNumber(env.ZKF_BOOTNODE_INDEXER_INTERVAL_MS, 2_000),
    indexerEnabled: parseIndexerEnabled(env.ZKF_BOOTNODE_INDEXER_ENABLED, network, upstreamOverride),
  }
}

function parseIndexerEnabled(value: string | undefined, network: NetworkKey, upstreamOverride: string | undefined): boolean {
  if (value === 'true') return true
  if (value === 'false') return false
  return network === 'testnet' || Boolean(upstreamOverride)
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = text(value) ? Number(text(value)) : fallback
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function list(value: string | undefined): readonly string[] | undefined {
  const parts = value?.split(',').map((part) => part.trim()).filter(Boolean)
  return parts?.length ? parts : undefined
}

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
