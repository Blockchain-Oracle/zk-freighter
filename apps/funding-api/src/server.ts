import { createServer } from 'node:http'
import { existsSync } from 'node:fs'
import { loadEnvFile } from 'node:process'

import { readConfig } from './config.js'
import { createHandler } from './handler.js'
import { createStore } from './store.js'

loadLocalEnv()

const config = readConfig()
const store = await createStore(config.databaseUrl)
const handler = createHandler(config, store)

// Behind a reverse proxy (Coolify/Traefik in production) the socket address is
// the proxy for every client, collapsing per-IP rate limits into one global
// bucket. When the operator declares the proxy trusted, use the client hop of
// X-Forwarded-For; never trust it on direct connections (spoofable).
const trustProxy = process.env.ZKF_TRUST_PROXY === 'true'

function clientIpFor(incoming: import('node:http').IncomingMessage): string {
  const socketIp = incoming.socket.remoteAddress ?? 'local'
  if (!trustProxy) return socketIp
  const forwarded = incoming.headers['x-forwarded-for']
  const chain = (Array.isArray(forwarded) ? forwarded.join(',') : forwarded ?? '').split(',').map((hop) => hop.trim()).filter(Boolean)
  return chain[0] ?? socketIp
}

const maxBodyBytes = 4096

const server = createServer((incoming, outgoing) => {
  const declaredLength = Number(incoming.headers['content-length'] ?? 0)
  if (Number.isFinite(declaredLength) && declaredLength > maxBodyBytes) {
    outgoing.writeHead(413, { 'content-type': 'application/json; charset=utf-8' })
    outgoing.end(JSON.stringify({ ok: false, error: 'Request body too large.' }))
    return
  }
  const url = `http://${incoming.headers.host ?? '127.0.0.1'}${incoming.url ?? '/'}`
  const headers = new Headers()
  for (const [key, value] of Object.entries(incoming.headers)) {
    if (typeof value === 'string') headers.set(key, value)
    else if (Array.isArray(value)) headers.set(key, value.join(', '))
  }
  headers.set('x-zkf-client-ip', clientIpFor(incoming))
  const request = new Request(url, {
    method: incoming.method,
    headers,
    body: incoming.method === 'GET' || incoming.method === 'HEAD' ? undefined : incoming as unknown as BodyInit,
    duplex: 'half',
  } as RequestInit)

  handler(request)
    .then(async (response) => {
      outgoing.writeHead(response.status, Object.fromEntries(response.headers.entries()))
      outgoing.end(response.body ? Buffer.from(await response.arrayBuffer()) : undefined)
    })
    .catch((error: unknown) => {
      console.error('[funding-api] request failed', error)
      outgoing.writeHead(500, { 'content-type': 'application/json; charset=utf-8' })
      outgoing.end(JSON.stringify({ ok: false, error: 'Funding service failed.' }))
    })
})

server.listen(config.port, () => {
  console.log(`[funding-api] listening on :${config.port}`)
})

for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    server.close(() => {
      void store.close().finally(() => process.exit(0))
    })
  })
}

function loadLocalEnv(): void {
  const envFile = process.env.ZKF_ENV_FILE ?? '.env.local'
  if (existsSync(envFile)) loadEnvFile(envFile)
}
