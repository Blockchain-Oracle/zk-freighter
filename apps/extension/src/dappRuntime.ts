import {
  createEncryptedVault,
  deriveEvmAddress,
  unlockEncryptedVault,
  type AssetCode,
  type FreighterBridgeRequest,
  type NetworkKey,
} from '@zk-fighter/core'
import {
  dappMessageTypes,
  type BridgeSourceBalancesResponse,
  type DappBalancesResponse,
  type DappRuntimeMessage,
  type DappRuntimeResponse,
  type DappWalletStatus,
  type DemoFundingResponse,
  type DiscoverLookupResponse,
  type DiscoverPublishResponse,
  type DiscoverStatusResponse,
  type PrivateEngineResetResponse,
  type PrivateActionResponse,
  type QuickShieldResponse,
} from './dappMessages'
import { clearAllBalanceCache } from './balance-cache'
import { activityFlow, balancesFlow, bridgeSourceBalancesFlow, demoFundingRequestFlow, demoFundingStatusFlow, discoverFlow, discoverPublishFlow, discoverStatusFlow, privateTransferFlow, quickShieldFlow, receiveCodeForIdentity, recordBridgeActivity, recordConfidentialActivity, unshieldFlow } from './dappRuntime-flows'
import { publicTransferFlow } from './dappRuntime-public-flow'
import { passkeyCreateFlow, passkeyPrepareCreateFlow, passkeyRemoveFlow, passkeySupportFlow, passkeyUnlockFlow, setNetworkFlow } from './dappRuntime-wallet'
import { freighterResponse } from './dappRuntimeHelpers'
import { identityForMnemonic, readStoredDappWallet, requireUnlockedDappWallet, writeStoredDappWallet } from './dappRuntimeState'
import type {
  ExtensionAspInsertRunner,
  ExtensionBalancesRunner,
  ExtensionBridgeRunner,
  ExtensionConfidentialRunner,
  ExtensionDisclosureRunner,
  ExtensionDisclosureVerifyRunner,
  ExtensionDiscoverPublishRunner,
  ExtensionDiscoverRunner,
  ExtensionPrivateTransferRunner,
  ExtensionShieldRunner,
  ExtensionUnshieldRunner,
  ExtensionUsdcTrustlineRunner,
} from './dappRuntime-types'

interface MessageSender { readonly tab?: { readonly windowId?: number }; readonly url?: string }

export class ExtensionDappRuntime {
  private unlockedMnemonic: string | null = null
  private readonly refreshingBalances = new Set<string>()

  constructor(
    private readonly runShield?: ExtensionShieldRunner,
    private readonly runBridge?: ExtensionBridgeRunner,
    private readonly runAspInsert?: ExtensionAspInsertRunner,
    private readonly runUsdcTrustline?: ExtensionUsdcTrustlineRunner,
    private readonly runConfidential?: ExtensionConfidentialRunner,
    private readonly runBalances?: ExtensionBalancesRunner,
    private readonly runPrivateTransfer?: ExtensionPrivateTransferRunner,
    private readonly runUnshield?: ExtensionUnshieldRunner,
    private readonly runDiscover?: ExtensionDiscoverRunner,
    private readonly runDiscoverPublish?: ExtensionDiscoverPublishRunner,
    private readonly runDisclosure?: ExtensionDisclosureRunner,
    private readonly runDisclosureVerify?: ExtensionDisclosureVerifyRunner,
    private readonly resetPrivateRuntime?: () => Promise<void>,
    private readonly resetPrivateStorage?: () => Promise<PrivateEngineResetResponse>,
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
        void clearAllBalanceCache()
        return this.status()
      case dappMessageTypes.prepareShieldAccess:
        return this.gated(this.runAspInsert, 'ASP insert', {})
      case dappMessageTypes.prepareUsdcReceive:
        return this.gated(this.runUsdcTrustline, 'USDC receive setup', {})
      case dappMessageTypes.quickShield:
        return this.quickShield(message.asset, message.amountStroops, message.timeoutMs)
      case dappMessageTypes.quickBridge:
        return this.gated(this.runBridge, 'native bridge', { sourceChainKey: message.sourceChainKey, amountAtomic: message.amountAtomic, resumeBurnHash: message.resumeBurnHash }, (report, ready) => {
          recordBridgeActivity(report, ready.network)
        })
      case dappMessageTypes.bridgeSourceBalances:
        return this.bridgeSourceBalances(message.sourceChainKey)
      case dappMessageTypes.confidential:
        return this.gated(this.runConfidential, 'confidential', { op: message.op, amount: message.amount, to: message.to }, (report, ready) => {
          recordConfidentialActivity(report, ready.network)
        })
      case dappMessageTypes.balances:
        return this.balances(message.syncBeforeRead === true)
      case dappMessageTypes.demoFundingStatus:
        return this.demoFundingStatus()
      case dappMessageTypes.demoFundingRequest:
        return this.demoFundingRequest()
      case dappMessageTypes.privateRuntimeStatus:
        return { ok: true, surface: 'extension-popup', coordinator: 'offscreen-queue', proving: 'offscreen' }
      case dappMessageTypes.privateEngineReset:
        return this.resetPrivateEngine()
      case dappMessageTypes.privateTransfer:
        return this.privateTransfer(message.asset, message.amountStroops, message.receiveCode, message.timeoutMs)
      case dappMessageTypes.publicTransfer:
        return this.publicTransfer(message.asset, message.amountStroops, message.recipientAddress)
      case dappMessageTypes.unshield:
        return this.unshield(message.asset, message.amountStroops, message.recipientAddress, message.timeoutMs)
      case dappMessageTypes.discover:
        return this.discover(message.ownerAddress)
      case dappMessageTypes.discoverStatus:
        return this.discoverStatus()
      case dappMessageTypes.discoverPublish:
        return this.discoverPublish()
      case dappMessageTypes.disclosure:
        return this.gated(this.runDisclosure, 'disclosure', { asset: message.asset, authority: message.authority, purpose: message.purpose })
      case dappMessageTypes.disclosureVerify:
        return this.gated(this.runDisclosureVerify, 'disclosure verify', { artifactJson: message.artifactJson })
      case dappMessageTypes.activity:
        return activityFlow(message.network)
      case dappMessageTypes.setNetwork:
        await setNetworkFlow(message.network)
        await this.resetPrivateRuntime?.()
        return this.status()
      case dappMessageTypes.passkeySupport:
        return passkeySupportFlow()
      case dappMessageTypes.passkeyPrepareCreate:
        return passkeyPrepareCreateFlow(message.password, sender)
      case dappMessageTypes.passkeyCreate:
        return passkeyCreateFlow(message.password, message.material, sender)
      case dappMessageTypes.passkeyUnlock:
        return this.unlockWithPasskey(message.material, sender)
      case dappMessageTypes.passkeyRemove:
        return passkeyRemoveFlow(sender)
      case dappMessageTypes.freighterRequest:
        return this.handleFreighterRequest(message.request)
    }
  }

  private async importVault(message: Extract<DappRuntimeMessage, { readonly type: typeof dappMessageTypes.importVault }>) {
    const created = await createEncryptedVault(message.mnemonic, message.password)
    if (!created.ok) {
      return this.status(`Vault import failed: ${created.error}`)
    }

    this.unlockedMnemonic = message.mnemonic
    const identity = identityForMnemonic(message.mnemonic, { network: message.network ?? 'testnet' })
    await clearAllBalanceCache()
    await writeStoredDappWallet({
      vault: created.value,
      network: message.network ?? 'testnet',
      walletPublicKey: identity?.stellarPublicKey,
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
      evmAddress: this.unlockedMnemonic ? deriveEvmAddress(this.unlockedMnemonic) : '',
      passkeyEnabled: state.passkeyEnvelope !== undefined,
      ...(error === undefined ? {} : { error }),
    }
  }

  private async handleFreighterRequest(request: FreighterBridgeRequest) {
    const state = await readStoredDappWallet()
    return freighterResponse(request, state.network)
  }

  // The unlocked mnemonic is injected here; the popup never sends it directly.
  private async gated<Q extends { mnemonic: string; network: NetworkKey }, T>(
    runner: ((request: Q) => Promise<T>) | undefined,
    name: string,
    extra: Omit<Q, 'mnemonic' | 'network'>,
    afterReport?: (report: T, ready: { readonly mnemonic: string; readonly network: NetworkKey }) => void,
  ): Promise<{ ok: true; report: T } | { ok: false; error: string }> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    if (!runner) return { ok: false, error: `Extension ${name} runner is unavailable.` }
    try {
      const report = await runner({ mnemonic: ready.mnemonic, network: ready.network, ...extra } as Q)
      afterReport?.(report, ready)
      return { ok: true, report }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async quickShield(asset: AssetCode, amountStroops?: string, timeoutMs?: number): Promise<QuickShieldResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return ready
    return quickShieldFlow(ready, this.runShield, asset, amountStroops, timeoutMs)
  }

  private async balances(syncBeforeRead = false): Promise<DappBalancesResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, syncing: false, error: ready.error }
    return balancesFlow(ready, this.runBalances, () => this.unlockedMnemonic, this.refreshingBalances, syncBeforeRead)
  }

  private async demoFundingStatus(): Promise<DemoFundingResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    return demoFundingStatusFlow(ready)
  }
  private async demoFundingRequest(): Promise<DemoFundingResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    return demoFundingRequestFlow(ready)
  }
  private async resetPrivateEngine(): Promise<PrivateEngineResetResponse> {
    try {
      this.refreshingBalances.clear()
      await clearAllBalanceCache()
      if (this.resetPrivateStorage) return this.resetPrivateStorage()
      await this.resetPrivateRuntime?.()
      return { ok: true, removedEntries: 0 }
    } catch (error) {
      return { ok: false, removedEntries: 0, error: error instanceof Error ? error.message : String(error) }
    }
  }
  private async privateTransfer(asset: AssetCode, amountStroops: string, receiveCode: string, timeoutMs?: number): Promise<PrivateActionResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    return privateTransferFlow(ready, this.runPrivateTransfer, asset, amountStroops, receiveCode, timeoutMs)
  }
  private async publicTransfer(asset: AssetCode, amountStroops: string, recipientAddress: string) {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    return publicTransferFlow(ready, asset, amountStroops, recipientAddress)
  }

  private async unshield(asset: AssetCode, amountStroops: string, recipientAddress: string, timeoutMs?: number): Promise<PrivateActionResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    return unshieldFlow(ready, this.runUnshield, asset, amountStroops, recipientAddress, timeoutMs)
  }

  private async discover(ownerAddress: string): Promise<DiscoverLookupResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    return discoverFlow(ready, this.runDiscover, ownerAddress)
  }

  private async discoverPublish(): Promise<DiscoverPublishResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    return discoverPublishFlow(ready, this.runDiscoverPublish)
  }

  private async discoverStatus(): Promise<DiscoverStatusResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, discoverable: false, error: ready.error }
    return discoverStatusFlow(ready, this.runDiscover)
  }

  private async bridgeSourceBalances(sourceChainKey: Extract<DappRuntimeMessage, { readonly type: typeof dappMessageTypes.bridgeSourceBalances }>['sourceChainKey']): Promise<BridgeSourceBalancesResponse> {
    const ready = await requireUnlockedDappWallet(this.unlockedMnemonic)
    if (!ready.ok) return { ok: false, error: ready.error }
    return bridgeSourceBalancesFlow(ready, sourceChainKey)
  }

  private async unlockWithPasskey(material: Extract<DappRuntimeMessage, { readonly type: typeof dappMessageTypes.passkeyUnlock }>['material'], sender?: MessageSender): Promise<DappWalletStatus> {
    const result = await passkeyUnlockFlow(material, sender)
    if (!result.ok) return this.status(result.error)
    this.unlockedMnemonic = result.mnemonic
    return this.status()
  }
}
