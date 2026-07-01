import { NETWORKS, privateEventContractIds, type NetworkKey } from '@zk-fighter/core'

export interface BootnodeConfig {
  readonly port: number
  readonly databaseUrl?: string
  readonly upstreamRpcUrl: string
  readonly network: NetworkKey
  readonly allowedContracts: readonly string[]
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): BootnodeConfig {
  const network = env.ZKF_BOOTNODE_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
  return {
    port: parseNumber(env.PORT, 8788),
    databaseUrl: text(env.DATABASE_URL),
    upstreamRpcUrl: text(env.ZKF_BOOTNODE_UPSTREAM_RPC_URL) ?? NETWORKS[network].rpcUrl,
    network,
    allowedContracts: list(env.ZKF_BOOTNODE_ALLOWED_CONTRACTS) ?? privateEventContractIds(network),
  }
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
