import type { AutoShieldRunResult } from '@zk-freighter/core'
import { formatAssetAmount } from './mobile-format'

interface BannerCopy {
  readonly color: string
  readonly title: string
  readonly body: string
}

function copyFor(result: AutoShieldRunResult): BannerCopy | null {
  const amount = formatAssetAmount(result.amountStroops, result.asset)
  if (result.kind === 'shielded') {
    return { color: 'var(--pos)', title: `Auto-shielded ${amount} ${result.asset}`, body: 'The deposit itself is visible on Stellar — your shielded balance stays private.' }
  }
  if (result.kind === 'blocked') {
    return { color: 'var(--warn)', title: 'Auto-shield paused', body: result.blocker ?? 'Shield access is still confirming — it will try again next time you open the wallet.' }
  }
  if (result.kind === 'failed') {
    return { color: 'var(--warn)', title: 'Auto-shield couldn’t complete', body: 'Your funds are untouched. Try a manual shield.' }
  }
  if (result.reason === 'first-shield') {
    return { color: 'var(--ac2)', title: 'Turn on privacy with your first shield', body: 'Auto-shield starts after your first manual shield — it takes about a minute to set up.' }
  }
  return null
}

export function MobileAutoShieldBanner({ result, onDismiss }: { readonly result: AutoShieldRunResult; readonly onDismiss: () => void }) {
  const copy = copyFor(result)
  if (!copy) return null
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, border: `1px solid ${copy.color}`, borderRadius: 16, background: 'var(--card)', padding: 12, marginBottom: 12 }}>
      <span aria-hidden="true" style={{ flex: 'none', color: copy.color, fontSize: 15, lineHeight: 1.3 }}>⬡</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 800, color: 'var(--tx)' }}>{copy.title}</div>
        <div style={{ marginTop: 3, fontSize: 11, color: 'var(--tx2)', lineHeight: 1.45 }}>{copy.body}</div>
      </div>
      <button type="button" onClick={onDismiss} aria-label="Dismiss" style={{ marginLeft: 'auto', flex: 'none', border: 0, background: 'transparent', color: 'var(--tx3)', fontSize: 16, lineHeight: 1, cursor: 'pointer' }}>×</button>
    </div>
  )
}
