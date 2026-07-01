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

  const method = await jsonRpcMethod(input, init)
  if (!method || !eventMethods.has(method)) return undefined

  if (input instanceof Request) {
    return { input: new Request(bootnodeUrl, input), init }
  }
  return { input: bootnodeUrl, init }
}

function requestUrl(input: RequestInfo | URL): string | undefined {
  if (typeof input === 'string') return input
  if (input instanceof URL) return input.href
  if (input instanceof Request) return input.url
  return undefined
}

async function jsonRpcMethod(input: RequestInfo | URL, init?: RequestInit): Promise<string | undefined> {
  const body = await requestBodyText(input, init)
  if (!body) return undefined
  try {
    const parsed = JSON.parse(body) as unknown
    return isRecord(parsed) && typeof parsed.method === 'string' ? parsed.method : undefined
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
