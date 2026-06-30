import { lookupPublishedReceiveCode, type NetworkKey, type PublicDiscoveryLookupReport } from '@zk-fighter/core'

// Discover lookup runs in the offscreen because it uses the Nethermind WASM client
// (getRecentPublicKeys). It is a PUBLIC query — no mnemonic, no proving — just a
// read of someone's published receive code by their public Stellar address.
export async function runDiscoverLookup(payload: { readonly [key: string]: unknown }): Promise<PublicDiscoveryLookupReport> {
  const network = asNetworkKey(payload['network'])
  const ownerAddress = String(payload['ownerAddress'] ?? '').trim()
  return lookupPublishedReceiveCode({ ownerAddress, network })
}

function asNetworkKey(value: unknown): NetworkKey {
  if (value === 'testnet' || value === 'mainnet') return value
  throw new Error('Unsupported discover network.')
}
