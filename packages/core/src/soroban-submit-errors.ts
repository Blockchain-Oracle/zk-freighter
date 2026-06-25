export function optionalSubmitDetail(value: unknown): string {
  if (value === undefined) {
    return ''
  }

  if (typeof value === 'string') {
    return ` (${value})`
  }

  try {
    return ` (${JSON.stringify(value)})`
  } catch {
    return ` (${String(value)})`
  }
}

export function sendFailureDetail(send: Record<string, unknown>): unknown {
  return {
    status: send.status,
    errorResultXdr: send.errorResultXdr,
    errorResultJson: send.errorResultJson ?? send.errorResultJSON,
    diagnosticEventsXdr: send.diagnosticEventsXdr,
    diagnosticEventsJson: send.diagnosticEventsJson ?? send.diagnosticEventsJSON,
  }
}
