import type { NetworkKey } from './networks'

type RuntimeEnv = Record<string, string | undefined>
type RuntimeGlobal = typeof globalThis & {
  __ZKF_CONFIG__?: RuntimeEnv
}

declare const process: { env?: RuntimeEnv } | undefined

export interface RuntimeEndpointConfig {
  readonly fundingApiUrl?: string
  readonly bootnodeUrl?: string
}

export function resolveRuntimeEndpoints(network: NetworkKey, env: RuntimeEnv = readRuntimeEnv()): RuntimeEndpointConfig {
  return {
    fundingApiUrl: endpointFor(network, env, 'FUNDING_API_URL'),
    bootnodeUrl: endpointFor(network, env, 'BOOTNODE_URL'),
  }
}

export function readRuntimeEnv(): RuntimeEnv {
  return {
    ...(typeof process !== 'undefined' ? process.env : undefined),
    ...(globalThis as RuntimeGlobal).__ZKF_CONFIG__,
  }
}

function endpointFor(network: NetworkKey, env: RuntimeEnv, key: string): string | undefined {
  const suffix = network === 'testnet' ? 'TESTNET' : 'MAINNET'
  const explicit =
    env[`VITE_ZKF_${suffix}_${key}`] ??
    env[`ZKF_${suffix}_${key}`] ??
    env[`VITE_ZKF_${key}`] ??
    env[`ZKF_${key}`]

  if (explicit) return trimTrailingSlash(explicit)
  if (key === 'FUNDING_API_URL' && network === 'testnet' && isLocalDevelopment()) return 'http://127.0.0.1:8787'
  if (key === 'BOOTNODE_URL' && network === 'testnet' && isLocalDevelopment()) return 'http://127.0.0.1:8788/rpc'
  if (key === 'BOOTNODE_URL' && network === 'mainnet' && isLocalDevelopment()) return 'http://127.0.0.1:8789/rpc'
  return undefined
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '')
}

function isLocalDevelopment(): boolean {
  const host = globalThis.location?.hostname
  return host === 'localhost' || host === '127.0.0.1' || host?.startsWith('192.168.') === true
}
