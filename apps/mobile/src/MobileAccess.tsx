import { useState } from 'react'
import { generateSeedPhrase, validateSeedPhrase, type NetworkKey } from '@zk-freighter/core'
import { Button, Logo } from '@zk-freighter/ui'
import { hapticAction } from './mobile-haptics'

const passwordMinLength = 8

interface AccessProps {
  readonly network: NetworkKey
  readonly hasVault: boolean
  readonly busy: boolean
  readonly error: string
  readonly onUnlock: (password: string) => void
  readonly onCreate: (mnemonic: string, password: string) => Promise<boolean>
  readonly onImport: (mnemonic: string, password: string) => Promise<boolean>
  readonly onNetwork: (network: NetworkKey) => void
}

type Step = 'welcome' | 'recovery' | 'import' | 'password' | 'ready' | 'unlock'
type Mode = 'create' | 'import'

export function MobileAccess({ network, hasVault, busy, error, onUnlock, onCreate, onImport, onNetwork }: AccessProps) {
  const [step, setStep] = useState<Step>(hasVault ? 'unlock' : 'welcome')
  const [mode, setMode] = useState<Mode>('create')
  const [mnemonic, setMnemonic] = useState('')
  const [importPhrase, setImportPhrase] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ack, setAck] = useState(false)
  const [copied, setCopied] = useState(false)
  const [localError, setLocalError] = useState('')
  const seed = mode === 'import' ? importPhrase.trim() : mnemonic
  const passwordReady = password.length >= passwordMinLength && password === confirm

  async function saveVault() {
    const ok = mode === 'create' ? await onCreate(seed, password) : await onImport(seed, password)
    if (ok) setStep('ready')
  }

  function startCreate() {
    setMnemonic(generateSeedPhrase())
    setMode('create')
    setAck(false)
    setCopied(false)
    setLocalError('')
    setStep('recovery')
  }

  function copySeed() {
    // Never affirm "Copied" unless the write succeeded — a silently failed copy during
    // seed backup is dangerous. Clipboard can be denied or absent on phone browsers.
    Promise.resolve()
      .then(() => navigator.clipboard.writeText(mnemonic))
      .then(() => {
        setCopied(true)
        setLocalError('')
        window.setTimeout(() => {
          setCopied(false)
          navigator.clipboard.writeText('').catch(() => undefined)
        }, 30_000)
      })
      .catch(() => {
        setLocalError('Copy failed on this browser — write the 12 words down instead.')
      })
  }

  return (
    <main className="mobile-access">
      <section className="access-card">
        <div className="access-top">
          <Logo size={28} glow />
          <strong>ZK Freighter</strong>
          <NetworkSwitch network={network} onNetwork={onNetwork} />
        </div>
        {step === 'welcome' ? (
          <div className="access-body center">
            <Logo size={74} glow />
            <div className="access-hero-copy">
              <h1>ZK Freighter</h1>
              <p>Shielded payments on Stellar.<br />You hold the keys.</p>
            </div>
            <div className="access-meta"><span>XLM · USDC</span><span>● SELF-CUSTODY</span></div>
            <div className="access-actions">
              <Button fullWidth onClick={startCreate}>Create a new wallet</Button>
              <Button fullWidth variant="secondary" onClick={() => { setMode('import'); setStep('import') }}>I already have a recovery phrase</Button>
            </div>
            {hasVault ? <Button fullWidth variant="ghost" onClick={() => setStep('unlock')}>Unlock existing vault</Button> : null}
          </div>
        ) : null}
        {step === 'unlock' ? (
          <div className="access-body unlock-body">
            <Logo size={54} glow />
            <h1>Welcome back</h1>
            <p>Unlock to open your shielded wallet.</p>
            <PasswordField value={password} onChange={setPassword} onEnter={() => onUnlock(password)} />
            {error ? <div className="error-line">{error}</div> : null}
            <Button fullWidth loading={busy} disabled={!password} onClick={() => { hapticAction(); onUnlock(password) }}>Unlock</Button>
            <Button fullWidth variant="ghost" onClick={() => setStep('welcome')}>Create or import instead</Button>
            <p className="access-footnote">Your recovery phrase is the only way back in. This password unlocks the vault on this device.</p>
          </div>
        ) : null}
        {step === 'recovery' ? (
          <div className="access-body">
            <StepHeader title="Recovery phrase" step="Step 1 of 2" onBack={() => setStep('welcome')} />
            <div className="warning-card"><span>!</span><p>Write these 12 words down in order. They're the <b>only</b> way back in — no support backdoor, no reset.</p></div>
            <div className="seed-grid">{mnemonic.split(' ').map((word, index) => <span key={word + index}><b>{index + 1}</b>{word}</span>)}</div>
            <div className="seed-actions"><button onClick={copySeed}>{copied ? 'Copied · clears in 30s' : 'Copy'}</button><button onClick={() => setAck(true)}>I wrote it down</button></div>
            {localError ? <div className="error-line">{localError}</div> : null}
            <label className="ack-row"><input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} /> I saved my recovery phrase offline.</label>
            <Button fullWidth disabled={!ack} onClick={() => setStep('password')}>Continue</Button>
          </div>
        ) : null}
        {step === 'import' ? (
          <div className="access-body">
            <StepHeader title="Restore wallet" step="Import" onBack={() => setStep('welcome')} />
            <h1>Restore wallet</h1>
            <p>Enter your 12-word recovery phrase.</p>
            <textarea className="mobile-input area" value={importPhrase} onChange={(event) => setImportPhrase(event.target.value)} placeholder="word1 word2 word3 ..." />
            {importPhrase.trim() && !validateSeedPhrase(importPhrase.trim()) ? <div className="error-line">Enter a valid 12-word phrase.</div> : null}
            <Button fullWidth disabled={!validateSeedPhrase(importPhrase.trim())} onClick={() => setStep('password')}>Continue</Button>
          </div>
        ) : null}
        {step === 'password' ? (
          <div className="access-body">
            <StepHeader title="Vault password" step="Step 2 of 2" onBack={() => setStep(mode === 'create' ? 'recovery' : 'import')} />
            <p className="password-copy">Unlocks the wallet on <b>this device</b>. Different from your recovery phrase — and it cannot recover funds.</p>
            <FieldLabel label="Password" />
            <PasswordField value={password} onChange={setPassword} />
            {password ? <PasswordMeter password={password} /> : null}
            <FieldLabel label="Confirm" />
            <PasswordField value={confirm} onChange={setConfirm} placeholder="Confirm password" onEnter={() => { if (passwordReady) void saveVault() }} />
            {localError || error ? <div className="error-line">{localError || error}</div> : null}
            <Button fullWidth loading={busy} disabled={!passwordReady} onClick={() => {
              if (!validateSeedPhrase(seed)) { setLocalError('Recovery phrase is not valid.'); return }
              void saveVault()
            }}>Save vault</Button>
          </div>
        ) : null}
        {step === 'ready' ? (
          <div className="access-body center">
            <div className="success-orb">✓</div>
            <h1>Wallet ready</h1>
            <p>Add funds, then shield them to start sending privately.</p>
            <div className="testnet-note">
              {network === 'testnet'
                ? 'Testnet · hackathon build — do not use real funds yet.'
                : 'Mainnet — verify everything before moving real funds.'}
            </div>
            <div className="access-actions">
              {network === 'testnet' ? <Button fullWidth onClick={() => { hapticAction(); onUnlock(password) }}>Add funds</Button> : null}
              <Button fullWidth variant="secondary" onClick={() => { hapticAction(); onUnlock(password) }}>Go to wallet</Button>
            </div>
          </div>
        ) : null}
      </section>
    </main>
  )
}

function StepHeader({ title, step, onBack }: { readonly title: string; readonly step: string; readonly onBack: () => void }) {
  return <div className="step-header"><button onClick={onBack}>‹</button><strong>{title}</strong><span>{step}</span></div>
}

function FieldLabel({ label }: { readonly label: string }) {
  return <div className="field-label">{label}</div>
}

function PasswordMeter({ password }: { readonly password: string }) {
  const score = Math.min(4, Number(password.length >= 8) + Number(/[A-Z]/u.test(password)) + Number(/[0-9]/u.test(password)) + Number(/[^A-Za-z0-9]/u.test(password)))
  const label = score >= 3 ? 'Strong' : score >= 2 ? 'Okay' : 'Weak'
  return <div className="password-meter">{[0, 1, 2, 3].map((item) => <span key={item} className={item < score ? 'on' : ''} />)}<b>{label}</b></div>
}

function PasswordField({ value, onChange, placeholder = 'Vault password', onEnter }: { readonly value: string; readonly onChange: (value: string) => void; readonly placeholder?: string; readonly onEnter?: () => void }) {
  const [show, setShow] = useState(false)
  return (
    <div className="password-wrap">
      <input value={value} type={show ? 'text' : 'password'} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') onEnter?.() }} />
      <button type="button" onClick={() => setShow((next) => !next)}>{show ? 'hide' : 'show'}</button>
    </div>
  )
}

function NetworkSwitch({ network, onNetwork }: { readonly network: NetworkKey; readonly onNetwork: (network: NetworkKey) => void }) {
  return (
    <select className="network-select" value={network} onChange={(event) => onNetwork(event.target.value as NetworkKey)}>
      <option value="testnet">Testnet</option>
      <option value="mainnet">Mainnet</option>
    </select>
  )
}
