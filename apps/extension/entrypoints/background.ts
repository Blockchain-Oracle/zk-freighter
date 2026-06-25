import {
  extensionReadinessDigest,
  phase11ExtensionReadiness,
  type AspMembershipInsertReport,
  type StellarUsdcTrustlineReport,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'
import { browser } from 'wxt/browser'

import type { ExtensionAspInsertRequest, ExtensionShieldRequest, ExtensionUsdcTrustlineRequest } from '../src/dappRuntime'
import { type DappRuntimeMessage } from '../src/dappMessages'
import { ExtensionDappRuntime } from '../src/dappRuntime'

const statusMessageType = 'zkf.extension.status'
const openSidePanelMessageType = 'zkf.extension.openSidePanel'
const offscreenStatusMessageType = 'zkf.extension.offscreenStatus'
const nethermindProbeMessageType = 'zkf.extension.nethermindProbe'
const dryProofAttemptMessageType = 'zkf.extension.dryProofAttempt'
const prepareDeepProofMessageType = 'zkf.extension.prepareDeepProofIdentity'
const aspInsertAndDryProofMessageType = 'zkf.extension.aspInsertAndDryProof'
const offscreenSubmitShieldMessageType = 'zkf.offscreen.submitShieldDeposit'
const offscreenInsertAspMessageType = 'zkf.offscreen.insertAspMembership'
const offscreenPrepareUsdcReceiveMessageType = 'zkf.offscreen.prepareUsdcReceive'
const privateTransferMessageType = 'zkf.extension.privateTransfer'
const unshieldWithdrawalMessageType = 'zkf.extension.unshieldWithdrawal'
const offscreenPrivateTransferMessageType = 'zkf.offscreen.privateTransfer'
const offscreenUnshieldWithdrawalMessageType = 'zkf.offscreen.unshieldWithdrawal'

type MessagePayload = {
  readonly type?: string
}

export default defineBackground(() => {
  const dappRuntime = new ExtensionDappRuntime(
    runShieldInOffscreen,
    openBridgeHandoffUrl,
    runAspInsertInOffscreen,
    runUsdcTrustlineInOffscreen,
  )

  browser.runtime.onInstalled.addListener(() => {
    void browser.storage.local.set({
      'zkf.extension.installedAt': new Date().toISOString(),
    })
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

    if (payload.type === openSidePanelMessageType) {
      void openSidePanel(sender.tab?.windowId).then((opened) => {
        sendResponse({ ok: opened })
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

    if (payload.type === privateTransferMessageType) {
      void sendOffscreenMessage({ ...payload, type: offscreenPrivateTransferMessageType }).then(sendResponse, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === unshieldWithdrawalMessageType) {
      void sendOffscreenMessage({ ...payload, type: offscreenUnshieldWithdrawalMessageType }).then(sendResponse, (error: unknown) => {
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

async function openSidePanel(windowId: number | undefined): Promise<boolean> {
  const sidePanel = (browser as typeof browser & {
    readonly sidePanel?: {
      readonly open?: (options: { windowId: number }) => Promise<void>
    }
  }).sidePanel

  if (windowId === undefined || sidePanel?.open === undefined) {
    return false
  }

  await sidePanel.open({ windowId })
  return true
}

async function runShieldInOffscreen(request: ExtensionShieldRequest): Promise<XlmShieldSubmitReport> {
  return (await sendOffscreenMessage({ type: offscreenSubmitShieldMessageType, ...request })) as XlmShieldSubmitReport
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

async function openBridgeHandoffUrl(url: string): Promise<boolean> {
  try {
    await browser.tabs.create({ url })
    return true
  } catch {
    return false
  }
}

async function sendOffscreenMessage(message: { readonly type: string; readonly [key: string]: unknown }): Promise<unknown> {
  const offscreen = (chrome as typeof chrome & {
    readonly offscreen?: {
      readonly createDocument?: (parameters: {
        url: string
        reasons: readonly string[]
        justification: string
      }) => Promise<void>
      readonly hasDocument?: () => Promise<boolean>
    }
  }).offscreen

  if (offscreen?.createDocument === undefined) {
    return { ok: false, error: 'Chrome offscreen API is unavailable.' }
  }

  const hasDocument = offscreen.hasDocument === undefined ? false : await offscreen.hasDocument()
  if (!hasDocument) {
    await offscreen.createDocument({
      url: 'prover-offscreen.html',
      reasons: ['WORKERS'],
      justification: 'Prepare a dedicated extension document for browser prover runtime checks.',
    })
  }

  return browser.runtime.sendMessage(message)
}
