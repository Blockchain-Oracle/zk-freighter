import { execFile } from 'node:child_process'
import { chmod, mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { promisify } from 'node:util'

import { generateMnemonic } from '../packages/core/node_modules/@scure/bip39/index.js'
import { wordlist } from '../packages/core/node_modules/@scure/bip39/wordlists/english.js'

const mainnetRpcUrl = 'https://mainnet.sorobanrpc.com'
const mainnetPassphrase = 'Public Global Stellar Network ; September 2015'
const mainnetUsdcIssuer = 'GA5ZSEJYB37JRC5AVCIA5MOP4RHTM335X2KGX3IHOJAPP5RE34K4KZVN'
const mainnetAccountsUrl = 'https://horizon.stellar.org/accounts'
const stroopsPerUnit = 10_000_000n
const defaultPollIntervalMs = 30_000
const execFileAsync = promisify(execFile)

export async function recoveryPhraseForMainnetRun(options) {
  try {
    const wallet = JSON.parse(await readFile(options.walletPath, 'utf8'))
    if (typeof wallet.recoveryPhrase === 'string' && wallet.recoveryPhrase.trim()) {
      return wallet.recoveryPhrase
    }
    if (typeof wallet.mnemonic === 'string' && wallet.mnemonic.trim()) {
      return wallet.mnemonic
    }
  } catch {
    // Create the wallet below.
  }

  const recoveryPhrase = generateMnemonic(wordlist, 128)
  const wallet = {
    network: 'mainnet',
    recoveryPhrase,
    createdAt: new Date().toISOString(),
  }
  await mkdir(path.dirname(options.walletPath), { recursive: true, mode: 0o700 })
  await writeFile(options.walletPath, `${JSON.stringify(wallet, null, 2)}\n`, { mode: 0o600 })
  await chmod(options.walletPath, 0o600)
  return recoveryPhrase
}

export async function rememberMainnetPublicKey(publicKey, options) {
  const wallet = JSON.parse(await readFile(options.walletPath, 'utf8'))
  await writeFile(
    options.walletPath,
    `${JSON.stringify({ ...wallet, publicKey, updatedAt: new Date().toISOString() }, null, 2)}\n`,
    { mode: 0o600 },
  )
  await chmod(options.walletPath, 0o600)
}

export async function fundWithMainnetQa(address, options) {
  const balance = await mainnetNativeBalance(address)
  const targetBalance = BigInt(options.amountStroops)
  if (balance !== null && balance >= targetBalance) {
    return {
      status: 'already-funded',
      source: options.funder,
      destination: address,
      balanceStroops: balance.toString(),
    }
  }

  const missing = balance === null ? targetBalance : targetBalance - balance
  const command = balance === null ? 'create-account' : 'payment'
  const amountFlag = command === 'create-account' ? '--starting-balance' : '--amount'
  const submitted = await submitFundingTx({
    amount: missing.toString(),
    amountFlag,
    command,
    destination: address,
    funder: options.funder,
  })

  return {
    source: options.funder,
    destination: address,
    status: command === 'create-account' ? 'created' : 'topped-up',
    amountStroops: missing.toString(),
    txHash: submitted.txHash,
    explorerUrl: submitted.txHash ? `https://stellar.expert/explorer/public/tx/${submitted.txHash}` : undefined,
  }
}

export async function fundUsdcWithMainnetQa(destination, amountStroops, options) {
  const funderAddress = await mainnetAddressForIdentity(options.funder)
  const funderBalance = await mainnetUsdcBalance(funderAddress)
  if (funderBalance < amountStroops) {
    throw new Error(
      `Mainnet USDC funder has ${formatAmount(funderBalance)} USDC; ` +
        `need ${formatAmount(amountStroops)} USDC.`,
    )
  }

  const submitted = await submitFundingTx({
    amount: amountStroops.toString(),
    amountFlag: '--amount',
    asset: `USDC:${mainnetUsdcIssuer}`,
    command: 'payment',
    destination,
    funder: options.funder,
  })

  return {
    status: 'sent',
    source: options.funder,
    sourcePublicKey: funderAddress,
    destination,
    amount: formatAmount(amountStroops),
    txHash: submitted.txHash,
    explorerUrl: submitted.txHash ? `https://stellar.expert/explorer/public/tx/${submitted.txHash}` : undefined,
  }
}

export async function waitForMainnetUsdcBalance(address, requiredStroops, options = {}) {
  const waitMs = options.waitMs ?? 24 * 60 * 1000
  const pollIntervalMs = options.pollIntervalMs ?? defaultPollIntervalMs
  const log = options.log ?? (() => {})
  const deadline = Date.now() + waitMs

  for (;;) {
    const balance = await mainnetUsdcBalance(address)
    if (balance >= requiredStroops) {
      return { balanceStroops: balance.toString() }
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for mainnet USDC on ${address}; ` +
          `need ${formatAmount(requiredStroops)}, saw ${formatAmount(balance)}.`,
      )
    }

    log(`[zkf] Waiting for ${formatAmount(requiredStroops)} mainnet USDC on ${address}; saw ${formatAmount(balance)}.`)
    await delay(pollIntervalMs)
  }
}

async function submitFundingTx(options) {
  const args = [
    'tx',
    'new',
    options.command,
    '--source-account',
    options.funder,
    '--destination',
    options.destination,
    options.amountFlag,
    options.amount,
  ]
  if (options.asset) {
    args.push('--asset', options.asset)
  }
  args.push(
    '--rpc-url',
    mainnetRpcUrl,
    '--network-passphrase',
    mainnetPassphrase,
  )
  const { stdout, stderr } = await execFileAsync('stellar', args, { maxBuffer: 1024 * 1024 })
  const match = `${stdout}\n${stderr}`.match(/[0-9a-f]{64}/i)
  return { txHash: match?.[0] }
}

async function mainnetNativeBalance(address) {
  const response = await fetch(`${mainnetAccountsUrl}/${encodeURIComponent(address)}`)
  if (response.status === 404) {
    return null
  }
  if (!response.ok) {
    throw new Error(`Mainnet account lookup failed with HTTP ${response.status}.`)
  }
  const account = await response.json()
  const line = account.balances?.find((balance) => balance.asset_type === 'native')
  return parseStroops(line?.balance ?? '0')
}

export async function mainnetUsdcBalance(address) {
  const response = await fetch(`${mainnetAccountsUrl}/${encodeURIComponent(address)}`)
  if (!response.ok) {
    throw new Error(`Mainnet account lookup failed with HTTP ${response.status}.`)
  }
  const account = await response.json()
  const line = account.balances?.find(
    (balance) => balance.asset_code === 'USDC' && balance.asset_issuer === mainnetUsdcIssuer,
  )
  return parseStroops(line?.balance ?? '0')
}

async function mainnetAddressForIdentity(identity) {
  const { stdout } = await execFileAsync('stellar', ['keys', 'address', identity], { maxBuffer: 1024 * 1024 })
  return stdout.trim()
}

function parseStroops(value) {
  const [whole = '0', fractional = ''] = value.split('.')
  return BigInt(whole) * stroopsPerUnit + BigInt(fractional.padEnd(7, '0').slice(0, 7))
}

function formatAmount(stroops) {
  const whole = stroops / stroopsPerUnit
  const fractional = (stroops % stroopsPerUnit).toString().padStart(7, '0')
  return `${whole}.${fractional}`
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
