import { generateSeedPhrase } from '@zk-fighter/core'
import { Clipboard, KeyRound, LockKeyhole, QrCode, RefreshCw } from 'lucide-react'
import { QRCodeSVG } from 'qrcode.react'

import type { DappWalletStatus } from './dappMessages'
import { shorten } from './extension-format'

interface ExtensionWalletPanelProps {
  readonly status: DappWalletStatus | null
  readonly mnemonic: string
  readonly password: string
  readonly setMnemonic: (value: string) => void
  readonly setPassword: (value: string) => void
  readonly importWallet: () => Promise<void>
  readonly unlockWallet: () => Promise<void>
  readonly lockWallet: () => Promise<void>
  readonly copyPublicKey: () => Promise<void>
  readonly copyReceiveCode: () => Promise<void>
}

export function ExtensionWalletPanel(props: ExtensionWalletPanelProps) {
  return (
    <section className="panel" aria-labelledby="wallet-heading">
      <div className="section-header">
        <h2 id="wallet-heading">Wallet</h2>
        <span className={`badge ${props.status?.unlocked ? 'badge-ready' : 'badge-deferred'}`}>
          {props.status?.unlocked ? 'unlocked' : 'locked'}
        </span>
      </div>
      {props.status?.error ? <p className="error">{props.status.error}</p> : null}
      <WalletBody {...props} />
    </section>
  )
}

function WalletBody(props: ExtensionWalletPanelProps) {
  if (!props.status?.hasVault) {
    return (
      <div className="stack">
        <p className="copy">Import your seed phrase here, or generate a new test wallet. The seed phrase remains recovery.</p>
        <textarea
          aria-label="Seed phrase"
          value={props.mnemonic}
          onChange={(event) => props.setMnemonic(event.target.value)}
        />
        <input
          aria-label="Vault password"
          type="password"
          value={props.password}
          onChange={(event) => props.setPassword(event.target.value)}
        />
        <div className="inline-actions stretch">
          <button type="button" className="ghost" onClick={() => props.setMnemonic(generateSeedPhrase())}>
            <RefreshCw size={16} aria-hidden="true" /> Generate
          </button>
          <button type="button" onClick={props.importWallet}>
            <KeyRound size={16} aria-hidden="true" /> Import
          </button>
        </div>
      </div>
    )
  }

  if (!props.status.unlocked) {
    return (
      <div className="stack">
        <input
          aria-label="Unlock password"
          type="password"
          value={props.password}
          onChange={(event) => props.setPassword(event.target.value)}
        />
        <button type="button" onClick={props.unlockWallet}>
          <LockKeyhole size={16} aria-hidden="true" /> Unlock
        </button>
      </div>
    )
  }

  return (
    <div className="stack">
      <dl className="meta-list">
        <div>
          <dt>Network</dt>
          <dd>{props.status.network === 'testnet' ? 'Stellar Testnet' : 'Stellar Mainnet'}</dd>
        </div>
        <div>
          <dt>Public Stellar address</dt>
          <dd>
            <button type="button" className="ghost compact" onClick={props.copyPublicKey}>
              <Clipboard size={14} aria-hidden="true" /> {shorten(props.status.publicKey)}
            </button>
          </dd>
        </div>
      </dl>

      <div className="receive-block">
        <QrCode size={18} aria-hidden="true" />
        <div>
          <p className="label">Private receive code</p>
          <p className="copy">QR and copy payload are the raw zkf1 string.</p>
        </div>
      </div>
      <div className="receive-grid">
        <QRCodeSVG value={props.status.privateReceiveCode} size={128} level="M" marginSize={2} />
        <button type="button" className="ghost text-left" onClick={props.copyReceiveCode}>
          <Clipboard size={16} aria-hidden="true" /> {shorten(props.status.privateReceiveCode, 12, 8)}
        </button>
      </div>

      <button type="button" className="ghost" onClick={props.lockWallet}>
        <LockKeyhole size={16} aria-hidden="true" /> Lock
      </button>
    </div>
  )
}
