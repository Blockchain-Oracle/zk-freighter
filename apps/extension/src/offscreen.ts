import './runtime-env'
import { deriveWalletIdentity, ensureStellarUsdcTrustline, extensionReadinessDigest, generateSeedPhrase, initializeNethermindWebModule, insertAspMembershipLeaf, phase11ExtensionReadiness, runNethermindDryDepositProofAttempt, submitShieldWithPrerequisites, type AssetCode, type NetworkKey, type WalletIdentity } from '@zk-fighter/core'
import { browser } from 'wxt/browser'
import { runPrivateTransfer, runUnshieldWithdrawal } from './offscreen-private-actions'
import { runConfidentialOp } from './offscreen-confidential-actions'
import { runLoadBalances } from './offscreen-balance-actions'
import { runDiscoverLookup, runDiscoverPublish } from './offscreen-discover-actions'
import { runDisclosure, runDisclosureVerify } from './offscreen-disclosure-actions'
import { serializeChromeMessage } from './chrome-message-serialization'

const offscreenStatusMessageType = 'zkf.offscreen.status'
const nethermindProbeMessageType = 'zkf.offscreen.nethermindProbe'
const dryProofAttemptMessageType = 'zkf.offscreen.dryProofAttempt'
const prepareDeepProofMessageType = 'zkf.offscreen.prepareDeepProofIdentity'
const aspInsertAndDryProofMessageType = 'zkf.offscreen.aspInsertAndDryProof'
const submitShieldDepositMessageType = 'zkf.offscreen.submitShieldDeposit'
const insertAspMembershipMessageType = 'zkf.offscreen.insertAspMembership'
const prepareUsdcReceiveMessageType = 'zkf.offscreen.prepareUsdcReceive'
const privateTransferMessageType = 'zkf.offscreen.privateTransfer'
const unshieldWithdrawalMessageType = 'zkf.offscreen.unshieldWithdrawal'
const confidentialMessageType = 'zkf.offscreen.confidential'
const loadBalancesMessageType = 'zkf.offscreen.loadBalances'
const discoverLookupMessageType = 'zkf.offscreen.discoverLookup'
const discoverPublishMessageType = 'zkf.offscreen.discoverPublish'
const disclosureMessageType = 'zkf.offscreen.disclosure'
const disclosureVerifyMessageType = 'zkf.offscreen.disclosureVerify'
const extensionProofAttemptTimeoutMs = 18_000
const deepProofAttemptTimeoutMs = 180_000
const statusEventLimit = 8
let deepProofIdentity: WalletIdentity | undefined

browser.runtime.onMessage.addListener((message: unknown, _sender, sendResponse) => {
  const payload = typeof message === 'object' && message !== null ? (message as { type?: string }) : {}
  const respond = (response: unknown) => sendResponse(serializeChromeMessage(response))

  if (payload.type !== offscreenStatusMessageType) {
    if (payload.type === dryProofAttemptMessageType) {
      void runExtensionDryProofAttempt().then(respond)
      return true
    }

    if (payload.type === prepareDeepProofMessageType) {
      deepProofIdentity = deriveWalletIdentity(generateSeedPhrase(), 'testnet')
      respond({ ok: true, userAddress: deepProofIdentity.stellarPublicKey })
      return true
    }

    if (payload.type === aspInsertAndDryProofMessageType) {
      void runAspInsertAndDryProof().then(respond)
      return true
    }

    if (payload.type === submitShieldDepositMessageType) {
      void runShieldDeposit(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === insertAspMembershipMessageType) {
      void runAspInsert(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === prepareUsdcReceiveMessageType) {
      void runUsdcReceivePreparation(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === privateTransferMessageType) {
      void runPrivateTransfer(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === unshieldWithdrawalMessageType) {
      void runUnshieldWithdrawal(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === confidentialMessageType) {
      void runConfidentialOp(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === loadBalancesMessageType) {
      // Real balance scan (fetch+decrypt notes + Horizon) — no proving.
      void runLoadBalances(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === discoverLookupMessageType) {
      // Public discovery lookup (getRecentPublicKeys) — no proving, no secret.
      void runDiscoverLookup(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === discoverPublishMessageType) {
      void runDiscoverPublish(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === disclosureMessageType) {
      // selectiveDisclosure proof — read-only receipt; proves note ownership only.
      void runDisclosure(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type === disclosureVerifyMessageType) {
      void runDisclosureVerify(payload).then(respond, (error: unknown) => {
        sendResponse({ ok: false, error: error instanceof Error ? error.message : String(error) })
      })
      return true
    }

    if (payload.type !== nethermindProbeMessageType) {
      return false
    }

    void probeNethermindModule().then(respond)
    return true
  }

  respond({
    ok: true,
    readiness: phase11ExtensionReadiness,
    digest: extensionReadinessDigest(),
    proverRuntime: 'not-generated',
  })
  return true
})

async function probeNethermindModule(): Promise<unknown> {
  const started = performance.now()
  try {
    const mod = await initializeNethermindWebModule()
    return {
      ok: true,
      runtime: 'nethermind-browser-wasm',
      elapsedMs: Math.round(performance.now() - started),
      exports: {
        Config: typeof mod.Config,
        mainThread: typeof mod.mainThread,
      },
      proofGenerated: false,
    }
  } catch (error) {
    return {
      ok: false,
      elapsedMs: Math.round(performance.now() - started),
      error: error instanceof Error ? error.message : String(error),
      proofGenerated: false,
    }
  }
}

async function runShieldDeposit(payload: { readonly [key: string]: unknown }) {
  const mnemonic = typeof payload.mnemonic === 'string' ? payload.mnemonic : ''
  const network = asNetworkKey(payload.network)
  const asset = asAssetCode(payload.asset)
  const amountStroops = typeof payload.amountStroops === 'string' ? BigInt(payload.amountStroops) : undefined
  const timeoutMs = typeof payload.timeoutMs === 'number' ? payload.timeoutMs : undefined

  if (!mnemonic) {
    throw new Error('Missing extension wallet mnemonic.')
  }

  return submitShieldWithPrerequisites({
    asset,
    identity: deriveWalletIdentity(mnemonic, network),
    network,
    amountStroops,
    timeoutMs,
    runAspSetup: true,
  })
}

async function runAspInsert(payload: { readonly [key: string]: unknown }) {
  const mnemonic = typeof payload.mnemonic === 'string' ? payload.mnemonic : ''
  const network = asNetworkKey(payload.network)

  if (!mnemonic) {
    throw new Error('Missing extension wallet mnemonic.')
  }

  return insertAspMembershipLeaf({
    identity: deriveWalletIdentity(mnemonic, network),
    network,
  })
}

async function runUsdcReceivePreparation(payload: { readonly [key: string]: unknown }) {
  const mnemonic = typeof payload.mnemonic === 'string' ? payload.mnemonic : ''
  const network = asNetworkKey(payload.network)

  if (!mnemonic) {
    throw new Error('Missing extension wallet mnemonic.')
  }

  return ensureStellarUsdcTrustline({
    identity: deriveWalletIdentity(mnemonic, network),
    network,
  })
}

async function runAspInsertAndDryProof(): Promise<unknown> {
  const identity = deepProofIdentity ?? deriveWalletIdentity(generateSeedPhrase(), 'testnet')
  deepProofIdentity = identity
  const insert = await insertAspMembershipLeaf({ identity, network: 'testnet' })
  const proof = await runNethermindDryDepositProofAttempt({
    identity,
    network: 'testnet',
    timeoutMs: deepProofAttemptTimeoutMs,
  })

  return {
    ok: true,
    userAddress: identity.stellarPublicKey,
    aspInsert: {
      status: insert.status,
      contractId: insert.contractId,
      txHash: insert.txHash,
      explorerUrl: insert.explorerUrl,
      blockers: insert.blockers,
      error: insert.error,
      statusEvents: insert.statusEvents.slice(-statusEventLimit),
    },
    dryProofAttempt: {
      status: proof.status,
      durationMs: proof.durationMs,
      poolContractId: proof.poolContractId,
      userKeysStored: proof.userKeysStored,
      aspSecretStored: proof.aspSecretStored,
      proofGenerated: proof.proofGenerated,
      submitReached: proof.submitReached,
      blockers: proof.blockers,
      error: proof.error,
      statusEvents: proof.statusEvents.slice(-statusEventLimit),
    },
  }
}

async function runExtensionDryProofAttempt(): Promise<unknown> {
  const identity = deriveWalletIdentity(generateSeedPhrase(), 'testnet')
  const report = await runNethermindDryDepositProofAttempt({
    identity,
    network: 'testnet',
    timeoutMs: extensionProofAttemptTimeoutMs,
  })

  return {
    ok: true,
    status: report.status,
    durationMs: report.durationMs,
    userAddress: report.userAddress,
    poolContractId: report.poolContractId,
    userKeysStored: report.userKeysStored,
    aspSecretStored: report.aspSecretStored,
    proofGenerated: report.proofGenerated,
    submitReached: report.submitReached,
    blockers: report.blockers,
    error: report.error,
    statusEvents: report.statusEvents.slice(-statusEventLimit),
  }
}

function asNetworkKey(value: unknown): NetworkKey {
  if (value === 'testnet' || value === 'mainnet') return value
  throw new Error('Unsupported shield network.')
}

function asAssetCode(value: unknown): AssetCode {
  if (value === 'XLM' || value === 'USDC') return value
  throw new Error('Unsupported shield asset.')
}
