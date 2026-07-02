import { NETWORKS, type NetworkKey } from './networks'

const privacySupportContracts = {
  testnet: {
    aspMembership: 'CCXIGPJJY6UHIETXFCIV77HFVJSFS6HAVRSMHJFV6UVENXPJOC2WA3Y2',
    startLedger: 3_368_685,
  },
  mainnet: {
    aspMembership: 'CCYY3LLTVD2UW3Z4QD76PICZNIUH3PXKWJSKJVAENBIYON7QVAQIW5PP',
    startLedger: 63_190_069,
  },
} as const satisfies Record<NetworkKey, { readonly aspMembership: string; readonly startLedger: number }>

export function privateAspMembershipContractId(network: NetworkKey): string {
  return privacySupportContracts[network].aspMembership
}

export function privateEventStartLedger(network: NetworkKey): number {
  return privacySupportContracts[network].startLedger
}

export function privateEventContractIds(network: NetworkKey): readonly string[] {
  const pools = Object.values(NETWORKS[network].assets)
    .flatMap((asset) => asset.shieldedPool === 'enabled' && asset.poolId ? [asset.poolId] : [])
  return Array.from(new Set([...pools, privateAspMembershipContractId(network)]))
}
