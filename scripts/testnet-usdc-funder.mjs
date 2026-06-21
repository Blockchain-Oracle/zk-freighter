import { mkdir, readFile, writeFile, chmod } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { homedir } from 'node:os'

import { Asset, BASE_FEE, Horizon, Keypair, Networks, Operation, TransactionBuilder } from '@stellar/stellar-sdk'

import {
  delay,
  formatStellarAmount,
  testnetUsdcBalance,
  testnetUsdcIssuer,
} from './extension-quickshield-funding.mjs'

const horizonUrl = 'https://horizon-testnet.stellar.org'
const friendbotUrl = 'https://friendbot.stellar.org'
const defaultFunderPath = join(homedir(), '.config', 'zk-fighter', 'testnet-usdc-funder.json')
const waitMsDefault = 24 * 60 * 1000
const pollIntervalMsDefault = 30_000
const txTimeoutSeconds = 30
const usdcAsset = new Asset('USDC', testnetUsdcIssuer)

export async function ensureLocalTestnetUsdcFunder(options = {}) {
  const walletPath = options.walletPath ?? defaultFunderPath
  const wallet = await loadOrCreateWallet(walletPath)
  const keypair = Keypair.fromSecret(wallet.stellarSeed)
  const server = new Horizon.Server(horizonUrl)
  const accountSetup = await ensureAccount(server, keypair.publicKey())
  const trustlineTx = await ensureTrustline(server, keypair)
  const balanceStroops = await testnetUsdcBalance(keypair.publicKey())

  return {
    publicKey: keypair.publicKey(),
    walletPath,
    balanceStroops: balanceStroops.toString(),
    balance: formatStellarAmount(balanceStroops),
    friendbotTx: accountSetup.friendbotTx,
    trustlineTx,
  }
}

export async function fundTargetFromLocalUsdcFunder(destination, amountStroops, options = {}) {
  const log = options.log ?? (() => {})
  const waitMs = options.waitMs ?? waitMsDefault
  const pollIntervalMs = options.pollIntervalMs ?? pollIntervalMsDefault
  const funder = await ensureLocalTestnetUsdcFunder(options)
  const deadline = Date.now() + waitMs

  for (;;) {
    const balance = await testnetUsdcBalance(funder.publicKey)
    if (balance >= amountStroops) {
      const txHash = await submitPayment(funder.walletPath, destination, amountStroops)
      return {
        status: 'sent',
        funderPublicKey: funder.publicKey,
        destination,
        amount: formatStellarAmount(amountStroops),
        txHash,
        explorerUrl: `https://stellar.expert/explorer/testnet/tx/${txHash}`,
      }
    }

    if (Date.now() >= deadline) {
      throw new Error(
        `Timed out waiting for reusable USDC funder ${funder.publicKey}; ` +
          `need ${formatStellarAmount(amountStroops)}, saw ${formatStellarAmount(balance)}.`,
      )
    }

    log(
      `[zkf] Fund reusable USDC funder ${funder.publicKey} with at least ` +
        `${formatStellarAmount(amountStroops)}; current balance is ${formatStellarAmount(balance)}.`,
    )
    await delay(pollIntervalMs)
  }
}

async function loadOrCreateWallet(walletPath) {
  try {
    return JSON.parse(await readFile(walletPath, 'utf8'))
  } catch {
    const keypair = Keypair.random()
    const wallet = {
      network: 'testnet',
      publicKey: keypair.publicKey(),
      stellarSeed: keypair.secret(),
      createdAt: new Date().toISOString(),
    }
    await mkdir(dirname(walletPath), { recursive: true, mode: 0o700 })
    await writeFile(walletPath, `${JSON.stringify(wallet, null, 2)}\n`, { mode: 0o600 })
    await chmod(walletPath, 0o600)
    return wallet
  }
}

async function ensureAccount(server, publicKey) {
  try {
    await server.loadAccount(publicKey)
    return {}
  } catch {
    const response = await fetch(`${friendbotUrl}?addr=${encodeURIComponent(publicKey)}`)
    const body = await response.json().catch(() => undefined)
    if (!response.ok) {
      throw new Error(`Friendbot failed for reusable USDC funder with HTTP ${response.status}.`)
    }
    return { friendbotTx: body?.hash }
  }
}

async function ensureTrustline(server, keypair) {
  const account = await server.loadAccount(keypair.publicKey())
  if (account.balances?.some((balance) => balance.asset_code === 'USDC' && balance.asset_issuer === testnetUsdcIssuer)) {
    return undefined
  }
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.changeTrust({ asset: usdcAsset }))
    .setTimeout(txTimeoutSeconds)
    .build()

  tx.sign(keypair)
  const result = await server.submitTransaction(tx)
  return result.hash
}

async function submitPayment(walletPath, destination, amountStroops) {
  const wallet = await loadOrCreateWallet(walletPath)
  const keypair = Keypair.fromSecret(wallet.stellarSeed)
  const server = new Horizon.Server(horizonUrl)
  const account = await server.loadAccount(keypair.publicKey())
  const tx = new TransactionBuilder(account, {
    fee: BASE_FEE,
    networkPassphrase: Networks.TESTNET,
  })
    .addOperation(Operation.payment({ destination, asset: usdcAsset, amount: amountForPayment(amountStroops) }))
    .setTimeout(txTimeoutSeconds)
    .build()

  tx.sign(keypair)
  const result = await server.submitTransaction(tx)
  return result.hash
}

function amountForPayment(stroops) {
  return formatStellarAmount(stroops).replace(' USDC', '')
}
