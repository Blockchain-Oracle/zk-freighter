import '../src/runtime-env'
import { createSeedEvmClient, deriveWalletIdentity, ensureStellarUsdcTrustline, extensionReadinessDigest, getCctpSource, phase11ExtensionReadiness, resumeCctpBridgeToStellar, runCctpBridgeToStellar, type AspMembershipInsertReport, type CctpBridgeReport, type GenerateDisclosureReport, type PublicDiscoveryLookupReport, type PublicDiscoveryPublishReport, type StellarUsdcTrustlineReport, type VerifyDisclosureReport, type XlmPrivateSubmitReport, type XlmShieldSubmitReport } from '@zk-freighter/core'
import { browser } from 'wxt/browser'

import type { ExtensionAspInsertRequest, ExtensionBalancesRequest, ExtensionBridgeRequest, ExtensionConfidentialRequest, ExtensionDisclosureRequest, ExtensionDisclosureVerifyRequest, ExtensionDiscoverPublishRequest, ExtensionDiscoverRequest, ExtensionPrivateTransferRequest, ExtensionShieldRequest, ExtensionUnshieldRequest, ExtensionUsdcTrustlineRequest } from '../src/dappRuntime-types'
import { type DappBalances, type DappRuntimeMessage, type PrivateEngineResetResponse } from '../src/dappMessages'
import { ExtensionDappRuntime } from '../src/dappRuntime'
import { assertOffscreenSuccess } from '../src/offscreen-response'
import { clearAllBalanceCache } from '../src/balance-cache'

const statusMessageType = 'zkf.extension.status'
const offscreenStatusMessageType = 'zkf.extension.offscreenStatus'
const nethermindProbeMessageType = 'zkf.extension.nethermindProbe'
const dryProofAttemptMessageType = 'zkf.extension.dryProofAttempt'
const prepareDeepProofMessageType = 'zkf.extension.prepareDeepProofIdentity'
const aspInsertAndDryProofMessageType = 'zkf.extension.aspInsertAndDryProof'
const offscreenSubmitShieldMessageType = 'zkf.offscreen.submitShieldDeposit'
const offscreenInsertAspMessageType = 'zkf.offscreen.insertAspMembership'
const offscreenPrepareUsdcReceiveMessageType = 'zkf.offscreen.prepareUsdcReceive'
const offscreenPrivateTransferMessageType = 'zkf.offscreen.privateTransfer'
const offscreenConfidentialMessageType = 'zkf.offscreen.confidential'
const offscreenUnshieldWithdrawalMessageType = 'zkf.offscreen.unshieldWithdrawal'
const offscreenLoadBalancesMessageType = 'zkf.offscreen.loadBalances'
const offscreenDiscoverLookupMessageType = 'zkf.offscreen.discoverLookup'
const offscreenDiscoverPublishMessageType = 'zkf.offscreen.discoverPublish'
const offscreenDisclosureMessageType = 'zkf.offscreen.disclosure'
const offscreenDisclosureVerifyMessageType = 'zkf.offscreen.disclosureVerify'
const offscreenResetPrivateStorageMessageType = 'zkf.offscreen.resetPrivateStorage'
let offscreenQueue: Promise<unknown> = Promise.resolve()
let offscreenReset: Promise<void> = Promise.resolve()

interface MessagePayload { readonly type?: string }

export default defineBackground(() => {
  const dappRuntime = new ExtensionDappRuntime(
    runShieldInOffscreen,
    runBridgeNatively,
    runAspInsertInOffscreen,
    runUsdcTrustlineInOffscreen,
    runConfidentialInOffscreen,
    runBalancesInOffscreen,
    runPrivateTransferInOffscreen,
    runUnshieldInOffscreen,
    runDiscoverInOffscreen,
    runDiscoverPublishInOffscreen,
    runDisclosureInOffscreen,
    runDisclosureVerifyInOffscreen,
    resetOffscreenRuntime,
    resetOffscreenPrivateStorage,
  )

  browser.runtime.onInstalled.addListener((details) => {
    void browser.storage.local.set({
      'zkf.extension.installedAt': new Date().toISOString(),
    })
    // Fresh install → open the full-tab intro v2 (MetaMask/Phantom pattern).
    // Updates keep the user where they are.
    if (details.reason === 'install') {
      void browser.tabs.create({ url: browser.runtime.getURL('/onboarding.html') })
    }
  })

  browser.runtime.onMessage.addListener((message: unknown, sender, sendResponse) => {
    const payload = asMessagePayload(message)

    if (dappRuntime.canHandle(payload.type)) {
      void dappRuntime.handle(message as DappRuntimeMessage, sender).then(sendResponse, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === statusMessageType) {
      sendResponse({
        ok: true,
        readiness: phase11ExtensionReadiness,
        digest: extensionReadinessDigest(),
      })
      return true
    }

    if (payload.type === offscreenStatusMessageType) {
      void sendOffscreenMessage({ type: 'zkf.offscreen.status' }).then(sendResponse, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === nethermindProbeMessageType) {
      void sendOffscreenMessage({ type: 'zkf.offscreen.nethermindProbe' }).then(sendResponse, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === dryProofAttemptMessageType) {
      void sendOffscreenMessage({ type: 'zkf.offscreen.dryProofAttempt' }).then(sendResponse, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === prepareDeepProofMessageType) {
      void sendOffscreenMessage({ type: 'zkf.offscreen.prepareDeepProofIdentity' }).then(sendResponse, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === aspInsertAndDryProofMessageType) {
      void sendOffscreenMessage({ type: 'zkf.offscreen.aspInsertAndDryProof' }).then(sendResponse, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    return false
  })
})

function asMessagePayload(message: unknown): MessagePayload {
  return typeof message === 'object' && message !== null ? (message as MessagePayload) : {}
}

async function runShieldInOffscreen(request: ExtensionShieldRequest): Promise<XlmShieldSubmitReport> {
  return (await sendOffscreenMessage({ type: offscreenSubmitShieldMessageType, ...request })) as XlmShieldSubmitReport
}

async function runConfidentialInOffscreen(request: ExtensionConfidentialRequest): Promise<unknown> {
  return sendOffscreenMessage({ type: offscreenConfidentialMessageType, ...request })
}

async function runBalancesInOffscreen(request: ExtensionBalancesRequest): Promise<DappBalances> {
  return (await sendOffscreenMessage({ type: offscreenLoadBalancesMessageType, ...request })) as DappBalances
}

// Send + Unshield: the runtime injects the unlocked mnemonic (never the popup),
// the offscreen runs the real submitXlmPrivateTransfer / submitXlmUnshieldWithdrawal.
async function runPrivateTransferInOffscreen(request: ExtensionPrivateTransferRequest): Promise<XlmPrivateSubmitReport> {
  return (await sendOffscreenMessage({ type: offscreenPrivateTransferMessageType, ...request })) as XlmPrivateSubmitReport
}

async function runUnshieldInOffscreen(request: ExtensionUnshieldRequest): Promise<XlmPrivateSubmitReport> {
  return (await sendOffscreenMessage({ type: offscreenUnshieldWithdrawalMessageType, ...request })) as XlmPrivateSubmitReport
}

async function runDiscoverInOffscreen(request: ExtensionDiscoverRequest): Promise<PublicDiscoveryLookupReport> {
  return (await sendOffscreenMessage({ type: offscreenDiscoverLookupMessageType, ...request })) as PublicDiscoveryLookupReport
}

async function runDiscoverPublishInOffscreen(
  request: ExtensionDiscoverPublishRequest,
): Promise<PublicDiscoveryPublishReport> {
  return (await sendOffscreenMessage({
    type: offscreenDiscoverPublishMessageType,
    ...request,
  })) as PublicDiscoveryPublishReport
}

async function runDisclosureInOffscreen(request: ExtensionDisclosureRequest): Promise<GenerateDisclosureReport> {
  return (await sendOffscreenMessage({ type: offscreenDisclosureMessageType, ...request })) as GenerateDisclosureReport
}

async function runDisclosureVerifyInOffscreen(request: ExtensionDisclosureVerifyRequest): Promise<VerifyDisclosureReport> {
  return (await sendOffscreenMessage({ type: offscreenDisclosureVerifyMessageType, ...request })) as VerifyDisclosureReport
}

async function runAspInsertInOffscreen(request: ExtensionAspInsertRequest): Promise<AspMembershipInsertReport> {
  return (await sendOffscreenMessage({ type: offscreenInsertAspMessageType, ...request })) as AspMembershipInsertReport
}

async function runUsdcTrustlineInOffscreen(
  request: ExtensionUsdcTrustlineRequest,
): Promise<StellarUsdcTrustlineReport> {
  return (await sendOffscreenMessage({
    type: offscreenPrepareUsdcReceiveMessageType,
    ...request,
  })) as StellarUsdcTrustlineReport
}

// Native CCTP bridge runs in the background. The seed-derived EVM key signs the
// approve+burn itself; no external dApp signer is used.
async function runBridgeNatively(request: ExtensionBridgeRequest): Promise<CctpBridgeReport> {
  const identity = deriveWalletIdentity(request.mnemonic, request.network)
  const resumeHash = request.resumeBurnHash?.trim()
  if (resumeHash) {
    return resumeCctpBridgeToStellar({
      identity,
      network: request.network,
      sourceChainKey: request.sourceChainKey,
      evmBurnTxHash: resumeHash,
    })
  }
  const amountAtomic = parseBridgeAmountAtomic(request.amountAtomic)

  await ensureStellarUsdcTrustline({ identity, network: request.network })
  const source = getCctpSource(request.network, request.sourceChainKey)
  if (!source) {
    throw new Error(`No CCTP source configured for ${request.sourceChainKey}.`)
  }
  const evmClient = await createSeedEvmClient({ ['mnemonic']: request.mnemonic, chainIdHex: source.chainIdHex })
  return runCctpBridgeToStellar({
    identity,
    network: request.network,
    sourceChainKey: request.sourceChainKey,
    evmClient,
    amountAtomic,
  })
}

function parseBridgeAmountAtomic(value: string | undefined): bigint {
  if (value === undefined) throw new Error('Bridge amount is required.')
  if (!/^[1-9]\d*$/u.test(value)) throw new Error('Bridge amount must be a positive decimal atomic value.')
  return BigInt(value)
}

async function sendOffscreenMessage(message: { readonly type: string; readonly [key: string]: unknown }): Promise<unknown> {
  offscreenQueue = offscreenQueue.catch(() => undefined).then(async () => {
    await offscreenReset
    return sendOffscreenMessageNow(message)
  })
  return offscreenQueue
}

async function resetOffscreenRuntime(): Promise<void> {
  void offscreenQueue.catch(() => undefined)
  offscreenReset = offscreenReset.catch(() => undefined).then(closeOffscreenDocument)
  offscreenQueue = offscreenReset
  await offscreenReset
}

async function resetOffscreenPrivateStorage(): Promise<PrivateEngineResetResponse> {
  let report: PrivateEngineResetResponse = { ok: true, removedEntries: 0 }
  void offscreenQueue.catch(() => undefined)
  offscreenReset = offscreenReset.catch(() => undefined).then(async () => {
    await closeOffscreenDocument()
    try {
      report = (await sendOffscreenMessageNow({ type: offscreenResetPrivateStorageMessageType })) as PrivateEngineResetResponse
    } finally {
      await closeOffscreenDocument()
    }
  })
  offscreenQueue = offscreenReset
  await offscreenReset
  await clearAllBalanceCache()
  return report
}

async function closeOffscreenDocument(): Promise<void> {
  const offscreen = offscreenApi()
  if (offscreen?.closeDocument === undefined) return
  const hasDocument = offscreen.hasDocument === undefined ? true : await offscreen.hasDocument()
  if (hasDocument) await offscreen.closeDocument()
}

async function sendOffscreenMessageNow(message: { readonly type: string; readonly [key: string]: unknown }): Promise<unknown> {
  const offscreen = offscreenApi()

  if (offscreen?.createDocument === undefined) {
    throw new Error('Chrome offscreen API is unavailable.')
  }

  const hasDocument = offscreen.hasDocument === undefined ? false : await offscreen.hasDocument()
  if (!hasDocument) {
    await offscreen.createDocument({
      url: 'prover-offscreen.html',
      reasons: ['WORKERS'],
      justification: 'Prepare a dedicated extension document for browser prover runtime checks.',
    })
  }

  return assertOffscreenSuccess(await browser.runtime.sendMessage(message))
}

function offscreenApi():
  | {
      readonly createDocument?: (parameters: {
        url: string
        reasons: readonly string[]
        justification: string
      }) => Promise<void>
      readonly hasDocument?: () => Promise<boolean>
      readonly closeDocument?: () => Promise<void>
    }
  | undefined {
  return (chrome as typeof chrome & {
    readonly offscreen?: {
      readonly createDocument?: (parameters: {
        url: string
        reasons: readonly string[]
        justification: string
      }) => Promise<void>
      readonly hasDocument?: () => Promise<boolean>
      readonly closeDocument?: () => Promise<void>
    }
  }).offscreen
}
