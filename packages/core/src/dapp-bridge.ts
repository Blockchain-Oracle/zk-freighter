import { getNetworkConfig, type NetworkKey } from './networks'

export const zkFreighterRequestSource = 'ZKFIGHTER_EXTENSION_REQUEST'
export const zkFreighterResponseSource = 'ZKFIGHTER_EXTENSION_RESPONSE'

export const freighterRequestSource = 'FREIGHTER_EXTERNAL_MSG_REQUEST'
export const freighterResponseSource = 'FREIGHTER_EXTERNAL_MSG_RESPONSE'

export const freighterServiceTypes = {
  requestAccess: 'REQUEST_ACCESS',
  requestPublicKey: 'REQUEST_PUBLIC_KEY',
  submitTransaction: 'SUBMIT_TRANSACTION',
  submitAuthEntry: 'SUBMIT_AUTH_ENTRY',
  submitBlob: 'SUBMIT_BLOB',
  requestNetwork: 'REQUEST_NETWORK',
  requestNetworkDetails: 'REQUEST_NETWORK_DETAILS',
  requestConnectionStatus: 'REQUEST_CONNECTION_STATUS',
  requestAllowedStatus: 'REQUEST_ALLOWED_STATUS',
  setAllowedStatus: 'SET_ALLOWED_STATUS',
} as const

export interface FreighterBridgeRequest {
  readonly source?: string
  readonly messageId?: number | string
  readonly type?: string
  readonly transactionXdr?: string
  readonly networkPassphrase?: string
  readonly accountToSign?: string
  readonly address?: string
  readonly isAllowed?: boolean
}

export interface FreighterApiError {
  readonly code: number
  readonly message: string
}

export interface FreighterNetworkDetails {
  readonly network: 'PUBLIC' | 'TESTNET'
  readonly networkName: 'Main Net' | 'Test Net'
  readonly networkUrl: string
  readonly networkPassphrase: string
  readonly sorobanRpcUrl: string
  readonly friendbotUrl?: string
}

export interface FreighterBridgeResponse {
  readonly source: typeof freighterResponseSource
  readonly messagedId: number | string
  readonly isConnected?: boolean
  readonly publicKey?: string
  readonly network?: string
  readonly networkDetails?: FreighterNetworkDetails
  readonly isAllowed?: boolean
  readonly signedTransaction?: string
  readonly signerAddress?: string
  readonly apiError?: FreighterApiError
  readonly error?: string
}

const freighterNetworkByKey = {
  mainnet: { network: 'PUBLIC', networkName: 'Main Net' },
  testnet: { network: 'TESTNET', networkName: 'Test Net' },
} as const

export function freighterNetworkDetails(networkKey: NetworkKey): FreighterNetworkDetails {
  const network = getNetworkConfig(networkKey)
  const freighterNetwork = freighterNetworkByKey[networkKey]

  return {
    network: freighterNetwork.network,
    networkName: freighterNetwork.networkName,
    networkUrl: network.horizonUrl,
    networkPassphrase: network.passphrase,
    sorobanRpcUrl: network.rpcUrl,
    ...(networkKey === 'testnet' ? { friendbotUrl: 'https://friendbot.stellar.org' } : {}),
  }
}
