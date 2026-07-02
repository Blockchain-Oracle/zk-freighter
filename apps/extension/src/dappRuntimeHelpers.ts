import {
  freighterNetworkDetails,
  freighterRequestSource,
  freighterResponseSource,
  freighterServiceTypes,
  type FreighterApiError,
  type FreighterBridgeRequest,
  type FreighterBridgeResponse,
  type NetworkKey,
} from '@zk-freighter/core'

export const externalDappUnsupportedMessage =
  'ZK Freighter external dApp access and signing are disabled; use QuickShield and bridge inside ZK Freighter.'

const unsupportedSigningFields = { signedTransaction: '', signerAddress: '' } as const

/** External dApp (Freighter-style) requests: read-only network info; access + signing fail closed. */
export function freighterResponse(request: FreighterBridgeRequest, network: NetworkKey) {
  if (request.source !== freighterRequestSource) {
    return null
  }
  const base = responseBase(request)
  const details = freighterNetworkDetails(network)
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

export type ResponseBase = {
  readonly source: typeof freighterResponseSource
  readonly messagedId: number | string
}

export function responseBase(request: FreighterBridgeRequest): ResponseBase {
  return { source: freighterResponseSource, messagedId: request.messageId ?? 0 }
}

export function withError(
  base: ResponseBase,
  message: string,
  extra: Partial<FreighterBridgeResponse> = {},
): FreighterBridgeResponse {
  const apiError = { code: -1, message } as const satisfies FreighterApiError
  return { ...base, ...extra, apiError, error: message }
}
