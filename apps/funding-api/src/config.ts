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
  }
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
