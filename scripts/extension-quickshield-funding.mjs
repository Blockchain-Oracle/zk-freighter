export const testnetUsdcIssuer = 'GBBD47IF6LWK7P7MDEVSCWR7DPUWV3NY3DTQEVFL4NAT4AQH3ZLLFLA5'
const testnetHorizonAccountsUrl = 'https://horizon-testnet.stellar.org/accounts'
const stroopsPerUnit = 10_000_000n
const defaultPollIntervalMs = 30_000
const defaultWaitMs = 24 * 60 * 1000

export async function waitForTestnetUsdcBalance(address, requiredStroops, options = {}) {
  const waitMs = options.waitMs ?? defaultWaitMs
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs
  const log = options.log ?? (() => {})
  const deadline = Date.now() + waitMs

  for (;;) {
    const balance = await testnetUsdcBalance(address)
    if (balance >= requiredStroops) {
      return { balanceStroops: balance.toString() }
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for testnet USDC on ${address}; ` +
          `need ${formatStellarAmount(requiredStroops)}, saw ${formatStellarAmount(balance)}.`,
      )
    }

    log(
      `[zkf] Fund ${address} with at least ${formatStellarAmount(requiredStroops)} testnet USDC; ` +
        `current balance is ${formatStellarAmount(balance)}.`,
    )
    await delay(pollIntervalMs)
  }
}

export async function testnetUsdcBalance(address) {
  const response = await fetch(`${testnetHorizonAccountsUrl}/${encodeURIComponent(address)}`)
  if (!response.ok) {
    throw new Error(`Horizon account lookup failed with HTTP ${response.status}.`)
  }
  const account = await response.json()
  const line = account.balances?.find(
    (balance) => balance.asset_code === 'USDC' && balance.asset_issuer === testnetUsdcIssuer,
  )
  return line?.balance ? parseStellarAmount(line.balance) : 0n
}

export function parseStellarAmount(value) {
  const [whole = '0', fractional = ''] = value.split('.')
  return BigInt(whole) * stroopsPerUnit + BigInt(fractional.padEnd(7, '0').slice(0, 7))
}

export function formatStellarAmount(stroops) {
  const whole = stroops / stroopsPerUnit
  const fractional = (stroops % stroopsPerUnit).toString().padStart(7, '0')
  return `${whole}.${fractional} USDC`
}

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
