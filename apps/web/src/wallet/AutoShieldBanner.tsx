import type { AutoShieldRunResult, AssetCode } from '@zk-freighter/core'
import { formatStroops } from './format'

const DISPLAY_DECIMALS: Record<AssetCode, number> = { USDC: 2, XLM: 3 }

interface BannerCopy {
  readonly tone: 'pos' | 'warn' | 'ac'
  readonly title: string
  readonly body: string
}

function copyFor(result: AutoShieldRunResult): BannerCopy | null {
  const amount = `${formatStroops(result.amountStroops, DISPLAY_DECIMALS[result.asset])} ${result.asset}`
  if (result.kind === 'shielded') {
    return {
      tone: 'pos',
      title: `Auto-shielded ${amount}`,
      body: 'The deposit itself is visible on Stellar — your shielded balance stays private.',
    }
  }
  if (result.kind === 'blocked') {
    return {
      tone: 'warn',
      title: 'Auto-shield paused',
      body: result.blocker ?? 'Shield access is still confirming — it will try again next time you open the wallet.',
    }
  }
  if (result.kind === 'failed') {
    return {
      tone: 'warn',
      title: 'Auto-shield couldn’t complete',
      body: 'Your funds are untouched. Try a manual shield from the Shield tab.',
    }
  }
  if (result.reason === 'first-shield') {
    return {
      tone: 'ac',
      title: 'Turn on privacy with your first shield',
      body: 'Auto-shield starts after your first manual shield — it takes about a minute to set up.',
    }
  }
  return null
}

const TONE_COLOR: Record<BannerCopy['tone'], string> = {
  pos: 'var(--pos)',
  warn: 'var(--warn)',
  ac: 'var(--ac2)',
}

export function AutoShieldBanner({ result, onDismiss }: { result: AutoShieldRunResult; onDismiss: () => void }) {
  const copy = copyFor(result)
  if (!copy) return null
  const color = TONE_COLOR[copy.tone]
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '13px 16px', margin: '14px 24px 0', border: `1px solid ${color}`, borderRadius: 12, background: 'var(--card)' }}>
      <span aria-hidden="true" style={{ flex: 'none', color, fontSize: 15, lineHeight: 1.4 }}>⬡</span>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 12.5, fontWeight: 700, color: 'var(--tx)' }}>{copy.title}</div>
        <div style={{ marginTop: 3, fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.5 }}>{copy.body}</div>
      </div>
      <button onClick={onDismiss} aria-label="Dismiss" style={{ marginLeft: 'auto', flex: 'none', background: 'none', border: 'none', color: 'var(--tx3)', cursor: 'pointer', fontSize: 15, lineHeight: 1 }}>×</button>
    </div>
  )
}
