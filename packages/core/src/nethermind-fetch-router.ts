const eventMethods = new Set(['getEvents', 'getLatestLedger'])
const routes = new Map<string, string>()
let originalFetch: typeof fetch | undefined

export function installNethermindEventFetchRouter(input: {
  readonly rpcUrl: string
  readonly bootnodeUrl?: string
}): () => void {
  if (!input.bootnodeUrl || typeof globalThis.fetch !== 'function') return () => undefined
  const rpcUrl = normalizeUrl(input.rpcUrl)
  routes.set(rpcUrl, input.bootnodeUrl)
  if (!originalFetch) {
    originalFetch = globalThis.fetch.bind(globalThis)
    globalThis.fetch = routeEventFetch as typeof fetch
  }

  return () => {
    routes.delete(rpcUrl)
    if (routes.size === 0 && originalFetch) {
      globalThis.fetch = originalFetch
      originalFetch = undefined
    }
  }
}

async function routeEventFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const fetchTarget = await routedTarget(input, init)
  if (fetchTarget) return originalFetch!(fetchTarget.input, fetchTarget.init)
  return originalFetch!(input, init)
}

async function routedTarget(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ readonly input: RequestInfo | URL; readonly init?: RequestInit } | undefined> {
  const url = requestUrl(input)
  if (!url) return undefined
  const bootnodeUrl = routes.get(normalizeUrl(url))
  if (!bootnodeUrl) return undefined

  const body = await jsonRpcBody(input, init)
  if (!body || !eventMethods.has(body.method)) return undefined

  if (input instanceof Request) {
    return { input: bootnodeUrl, init: requestInitFrom(input, init, body.text) }
  }
  return { input: bootnodeUrl, init }
}

function requestUrl(input: RequestInfo | URL): string | undefined {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input instanceof Request) return input.url
  return undefined
}

async function jsonRpcBody(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<{ readonly method: string; readonly text: string } | undefined> {
  const text = await requestBodyText(input, init)
  if (!text) return undefined
  try {
    const parsed = JSON.parse(text) as unknown
    return isRecord(parsed) && typeof parsed.method === 'string' ? { method: parsed.method, text } : undefined
  } catch {
    return undefined
  }
}

async function requestBodyText(input: RequestInfo | URL, init?: RequestInit): Promise<string | undefined> {
  if (typeof init?.body === 'string') return init.body
  if (input instanceof Request) return input.clone().text()
  return undefined
}

function normalizeUrl(value: string): string {
  return value.replace(/\/+$/u, '')
}

function requestInitFrom(request: Request, init: RequestInit | undefined, body: string): RequestInit {
  return {
    method: init?.method ?? request.method,
    headers: init?.headers ?? request.headers,
    body,
    signal: init?.signal ?? request.signal,
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
