export function assertOffscreenSuccess(value: unknown): unknown {
  if (isOffscreenError(value)) {
    throw new Error(typeof value.error === 'string' ? value.error : 'Offscreen action failed.')
  }
  return value
}

function isOffscreenError(value: unknown): value is { readonly ok: false; readonly error?: unknown } {
  return typeof value === 'object' && value !== null && (value as { readonly ok?: unknown }).ok === false
}
