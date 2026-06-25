import { getCctpSource, getDefaultCctpSource, type CctpSourceKey, type NetworkKey } from '@zk-fighter/core'

const webBridgeUrl = 'http://localhost:5173/'

export function bridgeUrl(
  network: NetworkKey,
  destination: string,
  resumeBurnHash?: string,
  sourceChainKey?: CctpSourceKey,
): string {
  const url = new URL(webBridgeUrl)
  url.searchParams.set('zkfAction', 'bridge')
  url.searchParams.set('network', network)
  url.searchParams.set('destination', destination)
  const source = sourceChainKey ? getCctpSource(network, sourceChainKey) : getDefaultCctpSource(network)
  if (source) {
    url.searchParams.set('sourceChain', source.key)
  }
  const burnHash = resumeBurnHash?.trim()
  if (burnHash) {
    url.searchParams.set('resumeBurnHash', burnHash)
  }
  return url.toString()
}
