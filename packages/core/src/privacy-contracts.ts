import { NETWORKS, type NetworkKey } from './networks'

const privacySupportContracts = {
  testnet: {
    aspMembership: 'CCXIGPJJY6UHIETXFCIV77HFVJSFS6HAVRSMHJFV6UVENXPJOC2WA3Y2',
  },
  mainnet: {
    aspMembership: 'CCYY3LLTVD2UW3Z4QD76PICZNIUH3PXKWJSKJVAENBIYON7QVAQIW5PP',
  },
} as const satisfies Record<NetworkKey, { readonly aspMembership: string }>

export function privateAspMembershipContractId(network: NetworkKey): string {
  return privacySupportContracts[network].aspMembership
}

export function privateEventContractIds(network: NetworkKey): readonly string[] {
  const pools = Object.values(NETWORKS[network].assets)
    .flatMap((asset) => asset.shieldedPool === 'enabled' && asset.poolId ? [asset.poolId] : [])
  return Array.from(new Set([...pools, privateAspMembershipContractId(network)]))
}
