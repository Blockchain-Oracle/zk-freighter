import { ensureStellarUsdcTrustline, type StellarUsdcTrustlineReport } from './cctp-stellar'
import { loadHostedFundingStatus, requestHostedFunding, type FundingApiReport } from './funding-api'
import type { WalletIdentity } from './identity'
import { type NetworkKey } from './networks'
import { loadPublicStellarBalances, type PublicBalancesReport } from './stellar-balance'

export interface DemoFundingStatusReport {
  readonly status: 'ready' | 'needs-funding' | 'unavailable' | 'failed'
  readonly network: NetworkKey
  readonly userAddress: string
  readonly balances?: PublicBalancesReport
  readonly hostedFunding?: FundingApiReport
  readonly blockers: readonly string[]
}

export interface DemoFundingRequestReport {
  readonly status: 'funded' | 'ready' | 'unavailable' | 'failed'
  readonly network: NetworkKey
  readonly userAddress: string
  readonly trustline?: StellarUsdcTrustlineReport
  readonly hostedFunding?: FundingApiReport
  readonly balances?: PublicBalancesReport
  readonly blockers: readonly string[]
}

export interface DemoFundingOptions {
  readonly identity: WalletIdentity
  readonly network: NetworkKey
  readonly fundingApiUrl?: string
  readonly fetch?: typeof fetch
}

const minimumUsefulXlm = 15_000_000n
const minimumUsefulUsdc = 10_000_000n

export async function demoFundingStatus(options: DemoFundingOptions): Promise<DemoFundingStatusReport> {
  if (options.network !== 'testnet') {
    return {
      status: 'unavailable',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      blockers: ['Demo funding is only available on Stellar testnet.'],
    }
  }

  try {
    const balances = await loadPublicStellarBalances({ address: options.identity.stellarPublicKey, network: options.network })
    if (balances.status === 'failed') {
      return { status: 'failed', network: options.network, userAddress: options.identity.stellarPublicKey, balances, blockers: [balances.error ?? 'Public balance lookup failed.'] }
    }
    const needsXlm = balances.status === 'unfunded' || balances.balances.XLM < minimumUsefulXlm
    const needsUsdc = balances.balances.USDC < minimumUsefulUsdc
    const localBlockers = [
      ...(needsXlm ? ['Add testnet XLM before shielding or creating a USDC trustline.'] : []),
      ...(needsUsdc ? ['Add testnet USDC before USDC shielding.'] : []),
    ]
    const hostedFunding = localBlockers.length
      ? await loadHostedFundingStatus({
        network: options.network,
        address: options.identity.stellarPublicKey,
        fundingApiUrl: options.fundingApiUrl,
        fetch: options.fetch,
      })
      : undefined
    const blockers = hostedFunding?.status === 'unavailable' || hostedFunding?.status === 'failed'
      ? [...localBlockers, ...hostedFunding.blockers]
      : localBlockers
    return {
      status: blockers.length ? 'needs-funding' : 'ready',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      balances,
      ...(hostedFunding ? { hostedFunding } : {}),
      blockers,
    }
  } catch (error) {
    return {
      status: 'failed',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      blockers: [error instanceof Error ? error.message : 'Demo funding status failed.'],
    }
  }
}

export async function requestDemoFunding(options: DemoFundingOptions): Promise<DemoFundingRequestReport> {
  if (options.network !== 'testnet') {
    return {
      status: 'unavailable',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      blockers: ['Demo funding is only available on Stellar testnet.'],
    }
  }

  try {
    const trustline = await ensureStellarUsdcTrustline({ identity: options.identity, network: options.network, fetch: options.fetch })
    const hostedFunding = await requestHostedFunding({
      network: options.network,
      address: options.identity.stellarPublicKey,
      assets: ['XLM', 'USDC'],
      fundingApiUrl: options.fundingApiUrl,
      fetch: options.fetch,
    })
    const balances = await loadPublicStellarBalances({ address: options.identity.stellarPublicKey, network: options.network })
    const usdcReady = balances.status === 'loaded' && balances.balances.USDC >= minimumUsefulUsdc
    const xlmReady = balances.status === 'loaded' && balances.balances.XLM >= minimumUsefulXlm
    const ready = xlmReady && usdcReady
    const fundingMoved = hostedFunding.status === 'funded' || trustline.friendbotHash !== undefined || trustline.txHash !== undefined
    return {
      status: ready ? 'ready' : fundingMoved ? 'funded' : hostedFunding.status === 'failed' ? 'failed' : 'unavailable',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      trustline,
      hostedFunding,
      balances,
      blockers: ready
        ? ['XLM testnet funding and USDC are ready.']
        : fundingBlockers(balances, hostedFunding),
    }
  } catch (error) {
    return {
      status: 'failed',
      network: options.network,
      userAddress: options.identity.stellarPublicKey,
      blockers: [error instanceof Error ? error.message : 'Demo funding failed.'],
    }
  }
}

function fundingBlockers(balances: PublicBalancesReport, hostedFunding: FundingApiReport): readonly string[] {
  const blockers = [...hostedFunding.blockers]
  if (balances.status !== 'loaded') {
    blockers.push(balances.error ?? 'Public balance lookup did not confirm funding yet.')
  } else {
    if (balances.balances.XLM < minimumUsefulXlm) blockers.push('Public XLM is still below the shield/send reserve target.')
    if (balances.balances.USDC < minimumUsefulUsdc) blockers.push('Public USDC is still missing. The funding service will send it after the canonical USDC trustline is visible.')
  }
  return blockers.length ? blockers : ['Funding submitted; wait a few seconds for Horizon to show the updated public balances.']
}
