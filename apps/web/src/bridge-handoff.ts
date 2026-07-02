import { getCctpSource, isCctpSourceKey, type CctpSourceKey, type NetworkKey } from '@zk-freighter/core'

export function bridgeResumeBurnHashFromUrl(network: NetworkKey, publicKey: string): string | undefined {
  const params = bridgeParams()
  if (!params || !handoffMatches(params, network, publicKey)) {
    return undefined
  }

  return params.get('resumeBurnHash')?.trim() || undefined
}

export function bridgeSourceChainFromUrl(network: NetworkKey, publicKey: string): CctpSourceKey | undefined {
  const params = bridgeParams()
  if (!params || !handoffMatches(params, network, publicKey)) {
    return undefined
  }

  const sourceChain = params.get('sourceChain')?.trim()
  return isCctpSourceKey(sourceChain) && getCctpSource(network, sourceChain) ? sourceChain : undefined
}

export function bridgeHandoffNotice(network: NetworkKey, publicKey: string): string | undefined {
  const params = bridgeParams()
  if (!params || params.get('zkfAction') !== 'bridge') {
    return undefined
  }

  if (!handoffMatches(params, network, publicKey)) {
    return 'Extension bridge handoff opened, but this unlocked wallet does not match the destination in the handoff URL.'
  }

  const source = bridgeSourceChainFromUrl(network, publicKey)
  const label = source ? getCctpSource(network, source)?.label : 'the selected source chain'
  return `Opened from the extension for ${label}. The bridge leg is still public; shielding is the separate privacy step after USDC arrives.`
}

function bridgeParams(): URLSearchParams | undefined {
  return typeof window === 'undefined' ? undefined : new URLSearchParams(window.location.search)
}

function handoffMatches(params: URLSearchParams, network: NetworkKey, publicKey: string): boolean {
  return params.get('network') === network && params.get('destination') === publicKey
}
