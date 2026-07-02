import { useState, type CSSProperties } from 'react'
import { generateSeedPhrase } from '@zk-freighter/core'
import { Button, Logo } from '@zk-freighter/ui'
import { type DappWalletStatus } from './dappMessages'

// The popup's locked surfaces: Import (no vault) and Unlock (vault, locked).
// Mirrors the web access cards + the v2 Extension Popup design, driven by the
// real runtime (importVault / unlock messages). No balances are needed here.

const field: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
  padding: '11px 13px',
  borderRadius: 12,
  border: '1px solid var(--bd2)',
  background: 'var(--card)',
  color: 'var(--tx)',
  fontFamily: 'var(--fm)',
  fontSize: 13,
  outline: 'none',
}
const labelStyle: CSSProperties = { font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 7 }

function Pill({ network }: { network: string }) {
  const mainnet = network === 'mainnet'
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx2)', padding: '5px 10px', border: '1px solid var(--bd)', borderRadius: 999 }}>
      <span style={{ width: 5, height: 5, borderRadius: '50%', background: mainnet ? 'var(--warn)' : 'var(--pos)', boxShadow: `0 0 6px ${mainnet ? 'var(--warn)' : 'var(--pos)'}` }} />
      {network.toUpperCase()}
    </span>
  )
}

function Header({ network }: { network: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 16px', borderBottom: '1px solid var(--bd)' }}>
      <Logo size={22} />
      <span style={{ fontWeight: 700, fontSize: 13 }}>ZK Freighter</span>
      <span style={{ marginLeft: 'auto' }}><Pill network={network} /></span>
    </div>
  )
}

interface AccessProps {
  readonly status: DappWalletStatus | null
  readonly mnemonic: string
  readonly password: string
  readonly busy: boolean
  readonly setMnemonic: (value: string) => void
  readonly setPassword: (value: string) => void
  readonly importWallet: () => Promise<void>
  readonly unlockWallet: () => Promise<void>
}

export function ExtensionAccess({ status, mnemonic, password, busy, setMnemonic, setPassword, importWallet, unlockWallet }: AccessProps) {
  const [show, setShow] = useState(false)
  const network = status?.network ?? 'testnet'
  const hasVault = Boolean(status?.hasVault)

  const card = (children: React.ReactNode) => (
    <div style={{ width: '100%', background: 'var(--panel)', border: '1px solid var(--bd2)', borderRadius: 18, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
      <Header network={network} />
      <div style={{ padding: 18, display: 'flex', flexDirection: 'column', gap: 14 }}>{children}</div>
    </div>
  )

  const passwordRow = (placeholder: string, onEnter?: () => void) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '11px 13px', borderRadius: 12, background: 'var(--card)', border: '1px solid var(--bd2)' }}>
      <input
        type={show ? 'text' : 'password'}
        value={password}
        placeholder={placeholder}
        onChange={(event) => setPassword(event.target.value)}
        onKeyDown={(event) => { if (event.key === 'Enter' && onEnter) onEnter() }}
        style={{ flex: 1, minWidth: 0, background: 'none', border: 'none', outline: 'none', color: 'var(--tx)', fontFamily: 'var(--fm)', fontSize: 14, letterSpacing: password && !show ? '.18em' : 0 }}
      />
      <button type="button" onClick={() => setShow((value) => !value)} style={{ flex: 'none', background: 'none', border: 'none', color: 'var(--tx3)', fontSize: 11, cursor: 'pointer' }}>{show ? 'hide' : 'show'}</button>
    </div>
  )

  if (!hasVault) {
    return card(
      <>
        <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
          <Logo size={48} glow />
          <div>
            <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '-.02em' }}>Set up your wallet</div>
            <div style={{ fontSize: 12, color: 'var(--tx2)', marginTop: 6, lineHeight: 1.5 }}>Import a recovery phrase, or generate a new test wallet.</div>
          </div>
        </div>
        <div>
          <div style={labelStyle}>RECOVERY PHRASE</div>
          <textarea aria-label="Seed phrase" value={mnemonic} onChange={(event) => setMnemonic(event.target.value)} rows={3} placeholder="word1 word2 word3 …" style={{ ...field, resize: 'vertical' }} />
        </div>
        <div>
          <div style={labelStyle}>VAULT PASSWORD</div>
          {passwordRow('Choose a password')}
        </div>
        <div style={{ display: 'flex', gap: 9 }}>
          <Button variant="secondary" fullWidth onClick={() => setMnemonic(generateSeedPhrase())}>Generate</Button>
          <Button fullWidth loading={busy} disabled={!mnemonic.trim() || !password} onClick={() => void importWallet()}>Import</Button>
        </div>
        <div style={{ fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5, textAlign: 'center' }}>The recovery phrase is the only way back in — keep it safe and offline.</div>
      </>,
    )
  }

  return card(
    <>
      <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12, marginTop: 6 }}>
        <Logo size={52} glow />
        <div>
          <div style={{ fontSize: 20, fontWeight: 800, letterSpacing: '-.02em' }}>Welcome back</div>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', marginTop: 6 }}>Unlock to access your shielded wallet.</div>
        </div>
      </div>
      <div>
        <div style={labelStyle}>VAULT PASSWORD</div>
        {passwordRow('Vault password', () => void unlockWallet())}
      </div>
      {status?.error ? <div style={{ fontSize: 11.5, color: 'var(--dng)' }}>{status.error}</div> : null}
      <Button fullWidth loading={busy} disabled={!password} onClick={() => void unlockWallet()}>Unlock</Button>
      <div style={{ fontSize: 10.5, color: 'var(--tx3)', lineHeight: 1.5, textAlign: 'center' }}>Locking clears the in-memory wallet. Your seed phrase is the only way back in.</div>
    </>,
  )
}
