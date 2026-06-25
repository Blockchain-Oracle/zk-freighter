import {
  extensionReadinessDigest,
  freighterRequestSource,
  freighterResponseSource,
  phase11ExtensionReadiness,
  zkFighterRequestSource,
  zkFighterResponseSource,
} from '@zk-fighter/core'
import { browser } from 'wxt/browser'

import { dappMessageTypes } from '../src/dappMessages'

interface PageRequest {
  readonly source?: string
  readonly id?: string
  readonly method?: string
  readonly messageId?: number | string
  readonly type?: string
  readonly transactionXdr?: string
  readonly networkPassphrase?: string
  readonly accountToSign?: string
  readonly address?: string
  readonly isAllowed?: boolean
}

export default defineContentScript({
  matches: ['<all_urls>'],
  runAt: 'document_start',
  main() {
    window.addEventListener('message', (event) => {
      if (event.source !== window) {
        return
      }

      const request = asPageRequest(event.data)
      if (request.source === zkFighterRequestSource) {
        window.postMessage(
          {
            source: zkFighterResponseSource,
            id: request.id,
            ok: request.method === 'status',
            readiness: phase11ExtensionReadiness,
            digest: extensionReadinessDigest(),
            error:
              request.method === 'status'
                ? null
                : 'ZK Fighter external dApp access and signing are disabled; use QuickShield and bridge inside ZK Fighter.',
          },
          event.origin,
        )
        return
      }

      if (request.source !== freighterRequestSource) {
        return
      }

      void relayFreighterRequest(request, event.origin)
    })
  },
})

function asPageRequest(value: unknown): PageRequest {
  return typeof value === 'object' && value !== null ? (value as PageRequest) : {}
}

async function relayFreighterRequest(request: PageRequest, targetOrigin: string): Promise<void> {
  try {
    const response = await browser.runtime.sendMessage({
      type: dappMessageTypes.freighterRequest,
      origin: window.location.origin,
      request,
    })

    if (response !== null && response !== undefined) {
      window.postMessage(response, targetOrigin)
    }
  } catch (error) {
    window.postMessage(
      {
        source: freighterResponseSource,
        messagedId: request.messageId ?? 0,
        apiError: { code: -1, message: error instanceof Error ? error.message : String(error) },
      },
      targetOrigin,
    )
  }
}
