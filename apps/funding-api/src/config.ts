export interface FundingConfig {
  readonly port: number
  readonly databaseUrl?: string
  readonly funderSecret?: string
  readonly xlmAmountStroops: bigint
  readonly usdcAmountStroops: bigint
  readonly addressWindowMs: number
  readonly ipWindowMs: number
  readonly addressLimit: number
  readonly ipLimit: number
  /** EVM faucet (Base + OP Sepolia). Testnet-only by construction. */
  readonly evmFunderPrivateKey?: string
  /** USDC base units (6 decimals). */
  readonly evmUsdcAmount: bigint
  readonly evmGasAmountWei: bigint
  readonly evmRpcUrls: { readonly base: string; readonly optimism: string }
}

export function readConfig(env: NodeJS.ProcessEnv = process.env): FundingConfig {
  return {
    port: parseNumber(env.PORT, 8787),
    databaseUrl: text(env.DATABASE_URL),
    funderSecret: text(env.ZKF_TESTNET_FUNDER_SECRET) ?? text(env.STELLAR_TESTNET_FUNDER_SECRET),
    xlmAmountStroops: parseStroops(env.ZKF_TESTNET_FUND_XLM, 25n * 10_000_000n),
    usdcAmountStroops: parseStroops(env.ZKF_TESTNET_FUND_USDC, 5n * 10_000_000n),
    addressWindowMs: parseNumber(env.ZKF_FUNDING_ADDRESS_WINDOW_MS, 24 * 60 * 60 * 1000),
    ipWindowMs: parseNumber(env.ZKF_FUNDING_IP_WINDOW_MS, 60 * 60 * 1000),
    addressLimit: parseNumber(env.ZKF_FUNDING_ADDRESS_LIMIT, 3),
    ipLimit: parseNumber(env.ZKF_FUNDING_IP_LIMIT, 20),
    evmFunderPrivateKey: text(env.ZKF_EVM_FUNDER_PRIVATE_KEY),
    evmUsdcAmount: parseBigint(env.ZKF_EVM_FUND_USDC_UNITS, 10_000_000n), // 10 USDC
    evmGasAmountWei: parseBigint(env.ZKF_EVM_FUND_GAS_WEI, 2_000_000_000_000_000n), // 0.002 ETH
    evmRpcUrls: {
      base: text(env.ZKF_EVM_RPC_BASE) ?? 'https://sepolia.base.org',
      optimism: text(env.ZKF_EVM_RPC_OPTIMISM) ?? 'https://sepolia.optimism.io',
    },
  }
}

function parseBigint(value: string | undefined, fallback: bigint): bigint {
  const normalized = text(value)
  if (!normalized || !/^\d+$/u.test(normalized)) return fallback
  return BigInt(normalized)
}

function parseNumber(value: string | undefined, fallback: number): number {
  const parsed = text(value) ? Number(text(value)) : fallback
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : fallback
}

function parseStroops(value: string | undefined, fallback: bigint): bigint {
  const normalized = text(value)
  if (!normalized) return fallback
  if (!/^\d+(\.\d{1,7})?$/u.test(normalized)) return fallback
  const [whole = '0', fractional = ''] = normalized.split('.')
  return BigInt(whole) * 10_000_000n + BigInt(fractional.padEnd(7, '0').slice(0, 7))
}

function text(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed ? trimmed : undefined
}
