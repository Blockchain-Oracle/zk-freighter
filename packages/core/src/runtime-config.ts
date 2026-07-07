import type { NetworkKey } from './networks'

type RuntimeEnv = Record<string, string | undefined>
type RuntimeGlobal = typeof globalThis & {
  __ZKF_CONFIG__?: RuntimeEnv
}
type RuntimeImportMeta = ImportMeta & {
  readonly env?: RuntimeEnv
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
    ...((import.meta as RuntimeImportMeta).env ?? {}),
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
  // Local-dev convenience ONLY: fall back to a bootnode/funder on localhost when the
  // app is served from a dev host. Each app's bundler injects `import.meta.env.PROD`,
  // so writing that literal lets it dead-code-strip this whole block from production
  // builds — a shipped bundle (extension, web, mobile) must never silently point at a
  // developer's machine. (Core ships no Vite types of its own, hence the inline cast.)
  if ((import.meta as ImportMeta & { readonly env: { readonly PROD?: boolean } }).env.PROD) return undefined
  const localHost = localServiceHost()
  if (key === 'FUNDING_API_URL' && network === 'testnet' && localHost) return `http://${localHost}:8787`
  if (key === 'BOOTNODE_URL' && network === 'testnet' && localHost) return `http://${localHost}:8788/rpc`
  if (key === 'BOOTNODE_URL' && network === 'mainnet' && localHost) return `http://${localHost}:8789/rpc`
  return undefined
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/u, '')
}

function localServiceHost(): string | undefined {
  const host = globalThis.location?.hostname
  if (host === 'localhost' || host === '127.0.0.1') return '127.0.0.1'
  if (isPrivateLanHost(host)) return host
  return undefined
}

function isPrivateLanHost(host: string | undefined): host is string {
  return host?.startsWith('192.168.') === true ||
    host?.startsWith('10.') === true ||
    /^172\.(1[6-9]|2[0-9]|3[0-1])\./u.test(host ?? '')
}
