import {
  createEncryptedVault,
  deriveEvmAddress,
  encodeReceiveCode,
  unlockEncryptedVault,
  type AspMembershipInsertReport,
  type AssetCode,
  type CctpBridgeReport,
  type CctpSourceKey,
  type FreighterBridgeRequest,
  type GenerateDisclosureReport,
  type NetworkKey,
  type PublicDiscoveryLookupReport,
  type StellarUsdcTrustlineReport,
  type XlmPrivateSubmitReport,
  type XlmShieldSubmitReport,
} from '@zk-fighter/core'

import {
  dappMessageTypes,
  type ConfidentialOpKind,
  type ConfidentialResponse,
  type DappBalances,
  type DappBalancesResponse,
  type DappRuntimeMessage,
  type DappRuntimeResponse,
  type DappWalletStatus,
  type DisclosureResponse,
  type DiscoverLookupResponse,
  type PrepareShieldAccessResponse,
  type PrepareUsdcReceiveResponse,
  type PrivateActionResponse,
  type QuickBridgeResponse,
  type QuickShieldResponse,
} from './dappMessages'
import { balanceCacheKey, clearAllBalanceCache, isBalanceStale, readBalanceCache, writeBalanceCache } from './balance-cache'
import { freighterResponse, openExtensionSidePanel } from './dappRuntimeHelpers'
import { identityForMnemonic, readStoredDappWallet, writeStoredDappWallet } from './dappRuntimeState'

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

export interface ExtensionBalancesRequest { readonly mnemonic: string; readonly network: NetworkKey }

export interface ExtensionPrivateTransferRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly amountStroops: string
  readonly receiveCode: string
}

export interface ExtensionUnshieldRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly amountStroops: string
  readonly recipientAddress: string
}

export interface ExtensionDiscoverRequest { readonly network: NetworkKey; readonly ownerAddress: string }

export interface ExtensionDisclosureRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly asset: AssetCode
  readonly authority: string
  readonly purpose: string
}

export interface ExtensionBridgeRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly sourceChainKey: CctpSourceKey
  readonly resumeBurnHash?: string
}

export interface ExtensionConfidentialRequest {
  readonly mnemonic: string
  readonly network: NetworkKey
  readonly op: ConfidentialOpKind
  readonly amount?: string
  readonly to?: string
}

type ExtensionShieldRunner = (request: ExtensionShieldRequest) => Promise<XlmShieldSubmitReport>
type ExtensionAspInsertRunner = (request: ExtensionAspInsertRequest) => Promise<AspMembershipInsertReport>
type ExtensionUsdcTrustlineRunner = (request: ExtensionUsdcTrustlineRequest) => Promise<StellarUsdcTrustlineReport>
type ExtensionBridgeRunner = (request: ExtensionBridgeRequest) => Promise<CctpBridgeReport>
type ExtensionConfidentialRunner = (request: ExtensionConfidentialRequest) => Promise<unknown>
type ExtensionBalancesRunner = (request: ExtensionBalancesRequest) => Promise<DappBalances>
type ExtensionPrivateTransferRunner = (request: ExtensionPrivateTransferRequest) => Promise<XlmPrivateSubmitReport>
type ExtensionUnshieldRunner = (request: ExtensionUnshieldRequest) => Promise<XlmPrivateSubmitReport>
type ExtensionDiscoverRunner = (request: ExtensionDiscoverRequest) => Promise<PublicDiscoveryLookupReport>
type ExtensionDisclosureRunner = (request: ExtensionDisclosureRequest) => Promise<GenerateDisclosureReport>

interface MessageSender { readonly tab?: { readonly windowId?: number } }

export class ExtensionDappRuntime {
  private unlockedMnemonic: string | null = null
  /** Cache keys with a background balance refresh in flight (dedupes scans). */
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
    private readonly runDisclosure?: ExtensionDisclosureRunner,
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
        // Locking must not leave shielded amounts readable at rest.
        void clearAllBalanceCache()
        return this.status()
      case dappMessageTypes.prepareShieldAccess:
        return this.prepareShieldAccess()
      case dappMessageTypes.prepareUsdcReceive:
        return this.prepareUsdcReceive()
      case dappMessageTypes.quickShield:
        return this.quickShield(message.asset, message.amountStroops, message.timeoutMs)
      case dappMessageTypes.quickBridge:
        return this.quickBridge(message.sourceChainKey, message.resumeBurnHash)
      case dappMessageTypes.confidential:
        return this.confidential(message.op, message.amount, message.to)
      case dappMessageTypes.balances:
        return this.balances()
      case dappMessageTypes.privateTransfer:
        return this.privateTransfer(message.asset, message.amountStroops, message.receiveCode)
      case dappMessageTypes.unshield:
        return this.unshield(message.asset, message.amountStroops, message.recipientAddress)
      case dappMessageTypes.discover:
        return this.discover(message.ownerAddress)
      case dappMessageTypes.disclosure:
        return this.disclosure(message.asset, message.authority, message.purpose)
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
    // A new/replaced wallet must not inherit a previous wallet's cached balances.
    await clearAllBalanceCache()
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
      evmAddress: this.unlockedMnemonic ? deriveEvmAddress(this.unlockedMnemonic) : '',
      ...(error === undefined ? {} : { error }),
    }
  }

  private async handleFreighterRequest(request: FreighterBridgeRequest) {
    const state = await readStoredDappWallet()
    return freighterResponse(request, state.network)
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
      return { ok: false, error: 'Extension offscreen USDC receive setup is unavailable.' }
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

  private async confidential(op: ConfidentialOpKind, amount?: string, to?: string): Promise<ConfidentialResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) {
      return ready
    }
    if (!this.runConfidential) {
      return { ok: false, error: 'Extension offscreen confidential runner is unavailable.' }
    }
    try {
      // mnemonic is injected from the unlocked vault — never supplied by the panel.
      return { ok: true, report: await this.runConfidential({ mnemonic: ready.mnemonic, network: ready.network, op, amount, to }) }
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

  private async quickBridge(sourceChainKey: CctpSourceKey, resumeBurnHash?: string): Promise<QuickBridgeResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) {
      return ready
    }

    if (!this.runBridge) {
      return { ok: false, error: 'Extension native bridge runner is unavailable.' }
    }

    try {
      return {
        ok: true,
        report: await this.runBridge({
          mnemonic: ready.mnemonic,
          network: ready.network,
          sourceChainKey,
          resumeBurnHash,
        }),
      }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  /**
   * Real balances with stale-while-revalidate. A cached scan is returned instantly
   * (durable across browser restarts) while a background refresh runs if it is
   * stale; a cold cache scans synchronously so the first open still shows real
   * numbers — never a fabricated value.
   */
  private async balances(): Promise<DappBalancesResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) {
      return { ok: false, syncing: false, error: ready.error }
    }
    if (!this.runBalances) {
      return { ok: false, syncing: false, error: 'Extension balance runner is unavailable.' }
    }

    const state = await readStoredDappWallet()
    const identity = identityForMnemonic(this.unlockedMnemonic, state)
    if (!identity) {
      return { ok: false, syncing: false, error: 'Unlock ZK Fighter to view balances.' }
    }
    const key = balanceCacheKey(ready.network, identity.stellarPublicKey)

    const cached = await readBalanceCache(key)
    if (cached) {
      if (isBalanceStale(cached)) {
        void this.refreshBalances(key, ready.mnemonic, ready.network)
      }
      return { ok: true, balances: cached, syncing: this.refreshingBalances.has(key) }
    }

    try {
      const fresh = await this.runBalances({ mnemonic: ready.mnemonic, network: ready.network })
      await writeBalanceCache(key, fresh)
      return { ok: true, balances: fresh, syncing: false }
    } catch (error) {
      return { ok: false, syncing: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async refreshBalances(key: string, mnemonic: string, network: NetworkKey): Promise<void> {
    if (this.refreshingBalances.has(key) || !this.runBalances) return
    this.refreshingBalances.add(key)
    try {
      const fresh = await this.runBalances({ mnemonic, network })
      // Don't re-populate the at-rest cache if the wallet locked mid-refresh.
      if (this.unlockedMnemonic === mnemonic) {
        await writeBalanceCache(key, fresh)
      }
    } catch (error) {
      console.warn('[ExtensionDappRuntime] balance refresh failed', error)
    } finally {
      this.refreshingBalances.delete(key)
    }
  }

  private async privateTransfer(asset: AssetCode, amountStroops: string, receiveCode: string): Promise<PrivateActionResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) return { ok: false, error: ready.error }
    if (!this.runPrivateTransfer) return { ok: false, error: 'Extension private transfer runner is unavailable.' }
    try {
      const report = await this.runPrivateTransfer({ mnemonic: ready.mnemonic, network: ready.network, asset, amountStroops, receiveCode })
      void clearAllBalanceCache() // a spend changes the balance — drop the stale cache
      return { ok: true, report }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async unshield(asset: AssetCode, amountStroops: string, recipientAddress: string): Promise<PrivateActionResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) return { ok: false, error: ready.error }
    if (!this.runUnshield) return { ok: false, error: 'Extension unshield runner is unavailable.' }
    try {
      const report = await this.runUnshield({ mnemonic: ready.mnemonic, network: ready.network, asset, amountStroops, recipientAddress })
      void clearAllBalanceCache()
      return { ok: true, report }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async discover(ownerAddress: string): Promise<DiscoverLookupResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) return { ok: false, error: ready.error }
    if (!this.runDiscover) return { ok: false, error: 'Extension discovery runner is unavailable.' }
    try {
      // Public lookup — no mnemonic needed; the network comes from the unlocked vault.
      return { ok: true, report: await this.runDiscover({ network: ready.network, ownerAddress }) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
  }

  private async disclosure(asset: AssetCode, authority: string, purpose: string): Promise<DisclosureResponse> {
    const ready = await this.requireUnlockedWallet()
    if (!ready.ok) return { ok: false, error: ready.error }
    if (!this.runDisclosure) return { ok: false, error: 'Extension disclosure runner is unavailable.' }
    try {
      return { ok: true, report: await this.runDisclosure({ mnemonic: ready.mnemonic, network: ready.network, asset, authority, purpose }) }
    } catch (error) {
      return { ok: false, error: error instanceof Error ? error.message : String(error) }
    }
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
