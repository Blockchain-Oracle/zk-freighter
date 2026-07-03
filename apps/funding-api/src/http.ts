export function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...cors(), 'content-type': 'application/json; charset=utf-8' },
  })
}

export function empty(status: number): Response {
  return new Response(null, { status, headers: cors() })
}

export function cors(): Record<string, string> {
  return {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET,POST,OPTIONS',
    'access-control-allow-headers': 'content-type',
  }
}

export function ipFor(request: Request): string {
  return request.headers.get('x-zkf-client-ip') || 'local'
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
