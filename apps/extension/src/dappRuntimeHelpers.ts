import {
  freighterResponseSource,
  type FreighterApiError,
  type FreighterBridgeRequest,
  type FreighterBridgeResponse,
} from '@zk-fighter/core'
import { browser } from 'wxt/browser'

export const externalDappUnsupportedMessage =
  'ZK Fighter external dApp access and signing are disabled; use QuickShield and bridge inside ZK Fighter.'

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

export async function openExtensionSidePanel(windowId: number | undefined): Promise<void> {
  const sidePanel = (browser as typeof browser & {
    readonly sidePanel?: {
      readonly open?: (options: { windowId: number }) => Promise<void>
    }
  }).sidePanel

  if (windowId === undefined || sidePanel?.open === undefined) {
    return
  }

  try {
    await sidePanel.open({ windowId })
  } catch {
    return
  }
}
