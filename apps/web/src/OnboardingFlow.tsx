import { useState } from 'react'
import { generateSeedPhrase, validateSeedPhrase, type NetworkKey } from '@zk-fighter/core'
import { Button, Logo, PasswordStrength, Segmented } from '@zk-fighter/ui'
import { CardBody, CardTop, OnboardCard, PasswordField, TestnetPill } from './AccessPanels'
import { passwordMinLength } from './app-helpers'

type Step = 'welcome' | 'recovery' | 'import' | 'password' | 'ready'
type Mode = 'create' | 'import'

interface OnboardingFlowProps {
  network: NetworkKey
  networks: readonly NetworkKey[]
  busy: boolean
  onChangeNetwork: (network: NetworkKey) => void
  onCreate: (seedPhrase: string, password: string) => Promise<{ ok: boolean; error?: string }>
  onDemoFunding: (seedPhrase: string) => Promise<{ ok: boolean; message: string }>
  onEnter: (seedPhrase: string) => void
}

const labelStyle = { font: '600 9px/1 var(--fm)', letterSpacing: '.1em', color: 'var(--tx3)', marginBottom: 8 } as const
const backArrow = { fontSize: 15, color: 'var(--tx2)', cursor: 'pointer', background: 'none', border: 'none' } as const

export function OnboardingFlow({ network, networks, busy, onChangeNetwork, onCreate, onDemoFunding, onEnter }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>('welcome')
  const [mode, setMode] = useState<Mode>('create')
  const [mnemonic, setMnemonic] = useState('')
  const [importPhrase, setImportPhrase] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [ack, setAck] = useState(false)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [fundingMessage, setFundingMessage] = useState('')
  const [fundingReady, setFundingReady] = useState(false)

  const seedSource = mode === 'create' ? mnemonic : importPhrase
  const seed = seedSource.trim()
  const words = seed ? seed.split(/\s+/) : []
  const passwordsMatch = password.length >= passwordMinLength && password === confirm

  function startCreate() {
    setMode('create')
    setMnemonic(generateSeedPhrase())
    setError('')
    setStep('recovery')
  }

  function copyDownload(action: 'copy' | 'download') {
    if (action === 'copy') {
      navigator.clipboard.writeText(seed).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 1600) }, () => {})
    } else {
      const url = URL.createObjectURL(new Blob([seed], { type: 'text/plain' }))
      const a = document.createElement('a')
      a.href = url
      a.download = 'zk-fighter-recovery-phrase.txt'
      a.click()
      URL.revokeObjectURL(url)
    }
  }

  async function create() {
    setError('')
    const result = await onCreate(seed, password)
    if (result.ok) setStep('ready')
    else setError(result.error ?? 'Could not create the vault.')
  }

  async function addDemoFunds() {
    setFundingMessage('')
    setFundingReady(false)
    const result = await onDemoFunding(seed)
    setFundingMessage(result.message)
    setFundingReady(result.ok)
  }

  const testnet = <TestnetPill network={network} />

  if (step === 'welcome') {
    return (
      <OnboardCard>
        <CardTop left={<Logo size={24} />} title="ZK Fighter" right={testnet} />
        <CardBody center>
          <Logo size={72} glow />
          <div>
            <div style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.03em' }}>ZK Fighter</div>
            <div style={{ fontSize: 14, color: 'var(--tx2)', marginTop: 9, lineHeight: 1.55 }}>Shielded payments on Stellar.<br />You hold the keys.</div>
          </div>
          <div style={{ display: 'flex', gap: 18, font: '600 10px/1 var(--fm)', color: 'var(--tx3)', letterSpacing: '.06em' }}>
            <span>XLM · USDC</span><span style={{ color: 'var(--pos)' }}>● SELF-CUSTODY</span>
          </div>
          <Segmented options={networks.map((key) => ({ value: key, label: key === 'mainnet' ? 'Mainnet' : 'Testnet' }))} value={network} onChange={(value) => onChangeNetwork(value as NetworkKey)} size="sm" />
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <Button fullWidth onClick={startCreate}>Create a new wallet</Button>
            <Button variant="secondary" fullWidth onClick={() => { setMode('import'); setError(''); setStep('import') }}>I already have a recovery phrase</Button>
          </div>
        </CardBody>
      </OnboardCard>
    )
  }

  if (step === 'recovery') {
    return (
      <OnboardCard>
        <CardTop left={<button onClick={() => setStep('welcome')} style={backArrow}>‹</button>} title="Recovery phrase" right={<span style={{ font: '600 10px/1 var(--fm)', color: 'var(--tx3)' }}>Step 1 of 2</span>} />
        <CardBody style={{ gap: 14 }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '12px 13px', border: '1px solid rgba(229,180,92,.3)', borderRadius: 12, background: 'rgba(229,180,92,.06)' }}>
            <span style={{ flex: 'none', width: 22, height: 22, borderRadius: 7, background: 'rgba(229,180,92,.16)', display: 'grid', placeItems: 'center', color: 'var(--warn)', fontSize: 12 }}>!</span>
            <span style={{ fontSize: 11.5, lineHeight: 1.5, color: 'var(--tx2)' }}>Write these 12 words down in order. They’re the <b style={{ color: 'var(--warn)' }}>only</b> way back in — no support backdoor, no reset.</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8 }}>
            {words.map((word, index) => (
              <div key={`${index}-${word}`} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 11px', border: '1px solid var(--bd)', borderRadius: 10, background: 'var(--card)' }}>
                <span style={{ font: '600 9px/1 var(--fm)', color: 'var(--tx3)', width: 14 }}>{index + 1}</span>
                <span style={{ font: '600 12px/1 var(--sans)', color: 'var(--tx)' }}>{word}</span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', gap: 9 }}>
            <Button variant="secondary" fullWidth onClick={() => copyDownload('copy')}>{copied ? 'Copied' : 'Copy'}</Button>
            <Button variant="secondary" fullWidth onClick={() => copyDownload('download')}>Download</Button>
          </div>
          <label style={{ display: 'flex', alignItems: 'flex-start', gap: 10, cursor: 'pointer' }}>
            <input type="checkbox" checked={ack} onChange={(event) => setAck(event.target.checked)} style={{ marginTop: 2 }} />
            <span style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.45 }}>I’ve saved my recovery phrase somewhere safe.</span>
          </label>
          <Button fullWidth disabled={!ack} onClick={() => setStep('password')} style={{ marginTop: 'auto' }}>Continue</Button>
        </CardBody>
      </OnboardCard>
    )
  }

  if (step === 'import') {
    return (
      <OnboardCard>
        <CardTop left={<button onClick={() => setStep('welcome')} style={backArrow}>‹</button>} title="Recovery phrase" right={testnet} />
        <CardBody style={{ gap: 14 }}>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.55 }}>Enter your 12-word recovery phrase to restore your wallet on this device.</div>
          <textarea value={importPhrase} onChange={(event) => setImportPhrase(event.target.value)} rows={4} placeholder="word1 word2 word3 …" style={{ width: '100%', boxSizing: 'border-box', padding: '13px 14px', borderRadius: 13, border: '1px solid var(--bd2)', background: 'var(--card)', color: 'var(--tx)', fontSize: 13, fontFamily: 'var(--fm)', outline: 'none', resize: 'vertical' }} />
          {importPhrase.trim() && !validateSeedPhrase(importPhrase.trim()) ? <div style={{ fontSize: 11.5, color: 'var(--warn)' }}>That doesn’t look like a valid 12-word phrase.</div> : null}
          <Button fullWidth disabled={!validateSeedPhrase(importPhrase.trim())} onClick={() => setStep('password')} style={{ marginTop: 'auto' }}>Continue</Button>
        </CardBody>
      </OnboardCard>
    )
  }

  if (step === 'password') {
    return (
      <OnboardCard>
        <CardTop left={<button onClick={() => setStep(mode === 'create' ? 'recovery' : 'import')} style={backArrow}>‹</button>} title="Vault password" right={<span style={{ font: '600 10px/1 var(--fm)', color: 'var(--tx3)' }}>Step 2 of 2</span>} />
        <CardBody style={{ gap: 15 }}>
          <div style={{ fontSize: 12.5, color: 'var(--tx2)', lineHeight: 1.55 }}>Unlocks the wallet on <b style={{ color: 'var(--tx)' }}>this device</b>. Different from your recovery phrase — and it can’t recover funds.</div>
          <div>
            <div style={labelStyle}>PASSWORD</div>
            <PasswordField value={password} onChange={setPassword} autoFocus />
            {password ? <PasswordStrength password={password} /> : null}
          </div>
          <div>
            <div style={labelStyle}>CONFIRM</div>
            <PasswordField value={confirm} onChange={setConfirm} onEnter={() => { if (passwordsMatch) void create() }} />
          </div>
          <div style={{ fontSize: 11, color: 'var(--tx3)', lineHeight: 1.5 }}>Passkey unlock can be enabled later in Settings.</div>
          {error ? <div style={{ fontSize: 11.5, color: 'var(--dng)' }}>{error}</div> : null}
          <Button fullWidth loading={busy} disabled={!passwordsMatch} onClick={() => void create()} style={{ marginTop: 'auto' }}>{mode === 'create' ? 'Create wallet' : 'Restore wallet'}</Button>
        </CardBody>
      </OnboardCard>
    )
  }

  return (
    <OnboardCard>
      <CardTop left={<Logo size={24} />} title="ZK Fighter" right={testnet} />
      <CardBody center>
        <div style={{ width: 74, height: 74, borderRadius: '50%', background: 'radial-gradient(circle, rgba(53,199,123,.25), rgba(53,199,123,.06))', border: '1.5px solid rgba(53,199,123,.5)', display: 'grid', placeItems: 'center', fontSize: 34, color: 'var(--pos)' }}>✓</div>
        <div>
          <div style={{ fontSize: 22, fontWeight: 800, letterSpacing: '-.02em' }}>Wallet ready</div>
          <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginTop: 9, lineHeight: 1.55, maxWidth: 280 }}>Add funds, then shield them to start sending privately.</div>
        </div>
        <div style={{ width: '100%', border: '1px dashed rgba(229,180,92,.4)', borderRadius: 12, background: 'rgba(229,180,92,.05)', padding: '12px 14px', fontSize: 11, color: 'var(--warn)', lineHeight: 1.5 }}>
          {network === 'testnet' ? 'Testnet · hackathon build — don’t use real funds yet.' : 'Mainnet — verify everything before moving real funds.'}
        </div>
        {network === 'testnet' ? (
          <div style={{ width: '100%', border: '1px solid rgba(94,124,250,.34)', borderRadius: 14, background: 'rgba(94,124,250,.07)', padding: '13px 14px', display: 'flex', flexDirection: 'column', gap: 10 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ width: 27, height: 27, borderRadius: 9, background: 'rgba(94,124,250,.16)', color: 'var(--ac2)', display: 'grid', placeItems: 'center', fontSize: 14 }}>+</span>
              <span style={{ fontSize: 12.5, color: 'var(--tx)', fontWeight: 800 }}>Add testnet funds</span>
            </div>
            <div style={{ fontSize: 11.5, color: 'var(--tx2)', lineHeight: 1.45 }}>Funds XLM and USDC for this wallet so you can shield without hunting for faucets.</div>
            {fundingMessage ? <div style={{ fontSize: 11, color: fundingReady ? 'var(--pos)' : 'var(--warn)', lineHeight: 1.45 }}>{fundingMessage}</div> : null}
            <Button variant={fundingReady ? 'secondary' : 'primary'} fullWidth loading={busy} onClick={() => void addDemoFunds()}>{fundingReady ? 'Funding ready' : 'Add demo funds'}</Button>
          </div>
        ) : null}
        <Button fullWidth onClick={() => onEnter(seed)}>Go to wallet</Button>
      </CardBody>
    </OnboardCard>
  )
}
