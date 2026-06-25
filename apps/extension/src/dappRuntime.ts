import {
  createEncryptedVault,
  encodeReceiveCode,
  freighterNetworkDetails,
  freighterRequestSource,
  freighterServiceTypes,
  unlockEncryptedVault,
  type AspMembershipInsertReport,
  type AssetCode,
  type CctpSourceKey,
  type FreighterBridgeRequest,
  type NetworkKey,
  type StellarUsdcTrustlineReport,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'

import {
  dappMessageTypes,
  type BridgeHandoffResponse,
  type DappRuntimeMessage,
  type DappRuntimeResponse,
  type DappWalletStatus,
  type PrepareShieldAccessResponse,
  type PrepareUsdcReceiveResponse,
  type QuickShieldResponse,
} from './dappMessages'
import {
  externalDappUnsupportedMessage,
  openExtensionSidePanel,
  responseBase,
  withError,
} from './dappRuntimeHelpers'
import { identityForMnemonic, readStoredDappWallet, writeStoredDappWallet } from './dappRuntimeState'
import { bridgeUrl } from './bridge-url'

const unsupportedSigningFields = { signedTransaction: '', signerAddress: '' } as const

export interface ExtensionShieldRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly amountStroops?: string
  readonly timeoutMs?: number
}

export interface ExtensionAspInsertRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
}

export interface ExtensionUsdcTrustlineRequest { readonly mnemonic: string; readonly network: NetworkKey }

type ExtensionShieldRunner = (request: ExtensionShieldRequest) => Promise<XlmShieldSubmitReport>
type ExtensionAspInsertRunner = (request: ExtensionAspInsertRequest) => Promise<AspMembershipInsertReport>
type ExtensionUsdcTrustlineRunner = (request: ExtensionUsdcTrustlineRequest) => Promise<StellarUsdcTrustlineReport>
type BridgeHandoffOpener = (url: string) => Promise<boolean>

interface MessageSender { readonly tab?: { readonly windowId?: number } }

export class ExtensionDappRuntime {
  private unlockedMnemonic: string | null = null

  constructor(
    private readonly runShield?: ExtensionShieldRunner,
    private readonly openBridgeHandoffUrl?: BridgeHandoffOpener,
    private readonly runAspInsert?: ExtensionAspInsertRunner,
    private readonly runUsdcTrustline?: ExtensionUsdcTrustlineRunner,
  ) {}

  canHandle(type: string | undefined): boolean {
    return Object.values(dappMessageTypes).includes(type as never)
  }

  async handle(message: DappRuntimeMessage, sender?: MessageSender): Promise<DappRuntimeResponse | null> {
    switch (message.type) {
      case dappMessageTypes.status:
        return this.status()
      case dappMessageTypes.importVault:
        return this.importVault(message)
      case dappMessageTypes.unlock:
        return this.unlock(message.password)
      case dappMessageTypes.lock:
        this.unlockedMnemonic = null
        return this.status()
      case dappMessageTypes.prepareShieldAccess:
        return this.prepareShieldAccess()
      case dappMessageTypes.prepareUsdcReceive:
        return this.prepareUsdcReceive()
      case dappMessageTypes.quickShield:
        return this.quickShield(message.asset, message.amountStroops, message.timeoutMs)
      case dappMessageTypes.openBridgeHandoff:
        return this.openBridgeHandoff(message.resumeBurnHash, message.sourceChainKey)
      case dappMessageTypes.freighterRequest:
        void openExtensionSidePanel(sender?.tab?.windowId)
        return this.handleFreighterRequest(message.request)
    }
  }

  private async importVault(message: Extract<DappRuntimeMessage, { readonly type: typeof dappMessageTypes.importVault }>) {
    const created = await createEncryptedVault(message.mnemonic, message.password)
    if (!created.ok) {
      return this.status(`Vault import failed: ${created.error}`)
    }

    this.unlockedMnemonic = message.mnemonic
    await writeStoredDappWallet({
      vault: created.value,
      network: message.network ?? 'testnet',
    })
    return this.status()
  }

  private async unlock(password: string): Promise<DappWalletStatus> {
    const state = await readStoredDappWallet()
    if (!state.vault) {
      return this.status('No encrypted vault is stored.')
    }

    const unlocked = await unlockEncryptedVault(state.vault, password)
    if (!unlocked.ok) {
      return this.status(`Vault unlock failed: ${unlocked.error}`)
    }

    this.unlockedMnemonic = unlocked.value
    return this.status()
  }

  private async status(error?: string): Promise<DappWalletStatus> {
    const state = await readStoredDappWallet()
    const identity = identityForMnemonic(this.unlockedMnemonic, state)
    return {
      ok: error === undefined,
      hasVault: state.vault !== undefined,
      unlocked: identity !== null,
      network: state.network,
      publicKey: identity?.stellarPublicKey ?? '',
      privateReceiveCode: identity ? receiveCodeForIdentity(identity, state.network) : '',
      ...(error === undefined ? {} : { error }),
    }
  }

  private async handleFreighterRequest(request: FreighterBridgeRequest) {
    if (request.source !== freighterRequestSource) {
      return null
    }

    const state = await readStoredDappWallet()
    const base = responseBase(request)
    const details = freighterNetworkDetails(state.network)

    switch (request.type) {
      case freighterServiceTypes.requestConnectionStatus:
        return { ...base, isConnected: true }
      case freighterServiceTypes.requestNetwork:
        return { ...base, network: details.network }
      case freighterServiceTypes.requestNetworkDetails:
        return { ...base, networkDetails: details }
      case freighterServiceTypes.requestPublicKey:
        return { ...base, publicKey: '' }
      case freighterServiceTypes.requestAllowedStatus:
        return { ...base, isAllowed: false }
      case freighterServiceTypes.requestAccess:
      case freighterServiceTypes.setAllowedStatus:
        return withError(base, externalDappUnsupportedMessage)
      case freighterServiceTypes.submitTransaction:
      case freighterServiceTypes.submitAuthEntry:
      case freighterServiceTypes.submitBlob:
        return withError(base, externalDappUnsupportedMessage, unsupportedSigningFields)
      default:
        return null
    }
  }

  private async prepareShieldAccess(): Promise<PrepareShieldAccessResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) {
      return ready
    }

    if (!this.runAspInsert) {
      return { ok: false, error: 'Extension offscreen ASP insert runner is unavailable.' }
    }

    try {
      return {
        ok: true,
        report: await this.runAspInsert({
          mnemonic: ready.mnemonic,
          network: ready.network,
        }),
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async prepareUsdcReceive(): Promise<PrepareUsdcReceiveResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) {
      return ready
    }

    if (!this.runUsdcTrustline) {
      return { ok: false, error: 'Extension offscreen USDC trustline runner is unavailable.' }
    }

    try {
      return {
        ok: true,
        report: await this.runUsdcTrustline({
          mnemonic: ready.mnemonic,
          network: ready.network,
        }),
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async quickShield(asset: AssetCode, amountStroops?: string, timeoutMs?: number): Promise<QuickShieldResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) {
      return ready
    }

    if (!this.runShield) {
      return { ok: false, error: 'Extension offscreen shield runner is unavailable.' }
    }

    try {
      return {
        ok: true,
        report: await this.runShield({
          mnemonic: ready.mnemonic,
          network: ready.network,
          asset,
          amountStroops,
          timeoutMs,
        }),
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async requireUnlockedWallet(): Promise<
    | { readonly ok: true; readonly mnemonic: string; readonly network: NetworkKey }
    | { readonly ok: false; readonly error: string }
  > {
    const state = await readStoredDappWallet()
    const identity = identityForMnemonic(this.unlockedMnemonic, state)
    const seedWords = this.unlockedMnemonic

    if (!state.vault) {
      return { ok: false, error: 'Import a seed-backed vault before shielding.' }
    }

    if (!identity || !seedWords) {
      return { ok: false, error: 'Unlock ZK Fighter before shielding.' }
    }
    return { ok: true, mnemonic: seedWords, network: state.network }
  }

  private async openBridgeHandoff(
    resumeBurnHash?: string,
    sourceChainKey?: CctpSourceKey,
  ): Promise<BridgeHandoffResponse> {
    const state = await readStoredDappWallet()
    const identity = identityForMnemonic(this.unlockedMnemonic, state)
    if (!identity) {
      return { ok: false, error: 'Unlock ZK Fighter before opening the bridge.' }
    }

    const url = bridgeUrl(state.network, identity.stellarPublicKey, resumeBurnHash, sourceChainKey)
    if (!this.openBridgeHandoffUrl) {
      return { ok: false, url, error: 'Bridge handoff opener is unavailable.' }
    }

    const opened = await this.openBridgeHandoffUrl(url)
    return opened ? { ok: true, url } : { ok: false, url, error: 'Could not open the web bridge tab.' }
  }
}

function receiveCodeForIdentity(identity: NonNullable<ReturnType<typeof identityForMnemonic>>, network: NetworkKey): string {
  return encodeReceiveCode({
    version: 1,
    network,
    notePublicKey: identity.privateReceive.notePublicKey,
    encryptionPublicKey: identity.privateReceive.encryptionPublicKey,
  })
}
