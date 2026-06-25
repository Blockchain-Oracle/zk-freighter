import { extensionReadinessDigest, phase11ExtensionReadiness } from '@zk-fighter/core'
import { Clipboard, PanelRightOpen } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { browser } from 'wxt/browser'

import { ExtensionBridgePanel } from './ExtensionBridgePanel'
import { ExtensionQuickShieldPanel } from './ExtensionQuickShieldPanel'
import { ExtensionReadinessPanel } from './ExtensionReadinessPanel'
import { ExtensionWalletPanel } from './ExtensionWalletPanel'
import { dappMessageTypes, type DappWalletStatus } from './dappMessages'
import './ExtensionApp.css'

const statusRefreshMs = 1_000

interface ExtensionAppProps {
  readonly surface: 'popup' | 'side panel'
}

export function ExtensionApp({ surface }: ExtensionAppProps) {
  const [copyState, setCopyState] = useState('Copy readiness')
  const [receiveCopyState, setReceiveCopyState] = useState('Copy receive code')
  const [status, setStatus] = useState<DappWalletStatus | null>(null)
  const [mnemonic, setMnemonic] = useState('')
  const [password, setPassword] = useState('')
  const digest = useMemo(() => extensionReadinessDigest(), [])

  useEffect(() => {
    void refreshStatus()
    const timer = window.setInterval(() => void refreshStatus(), statusRefreshMs)
    return () => window.clearInterval(timer)
  }, [])

  async function refreshStatus() {
    const next = (await sendRuntimeMessage({ type: dappMessageTypes.status })) as DappWalletStatus
    setStatus(next)
  }

  async function sendRuntimeMessage(message: object): Promise<unknown> {
    const next = await browser.runtime.sendMessage(message)
    if (isWalletStatus(next)) {
      setStatus(next)
    }
    return next
  }

  async function copyDigest() {
    await navigator.clipboard.writeText(digest)
    setCopyState('Copied')
  }

  async function copyPublicKey() {
    if (status?.publicKey) {
      await navigator.clipboard.writeText(status.publicKey)
    }
  }

  async function copyReceiveCode() {
    if (status?.privateReceiveCode) {
      await navigator.clipboard.writeText(status.privateReceiveCode)
      setReceiveCopyState('Copied')
    }
  }

  async function openSidePanel() {
    await browser.runtime.sendMessage({ type: 'zkf.extension.openSidePanel' })
  }

  async function importWallet() {
    await sendRuntimeMessage({ type: dappMessageTypes.importVault, mnemonic, password, network: 'testnet' })
    setMnemonic('')
  }

  async function unlockWallet() {
    await sendRuntimeMessage({ type: dappMessageTypes.unlock, password })
  }

  async function lockWallet() {
    await sendRuntimeMessage({ type: dappMessageTypes.lock })
  }

  return (
    <main className="shell">
      <section className="masthead">
        <p className="eyebrow">ZK Fighter extension</p>
        <h1>{surface === 'popup' ? 'Runtime checkpoint' : 'Extension workspace'}</h1>
        <p className="summary">{phase11ExtensionReadiness.summary}</p>
      </section>

      <ExtensionWalletPanel
        status={status}
        mnemonic={mnemonic}
        password={password}
        setMnemonic={setMnemonic}
        setPassword={setPassword}
        importWallet={importWallet}
        unlockWallet={unlockWallet}
        lockWallet={lockWallet}
        copyPublicKey={copyPublicKey}
        copyReceiveCode={copyReceiveCode}
      />

      <ExtensionQuickShieldPanel status={status} sendRuntimeMessage={sendRuntimeMessage} />
      <ExtensionBridgePanel status={status} sendRuntimeMessage={sendRuntimeMessage} />
      <ExtensionReadinessPanel />

      <div className="actions">
        <button type="button" onClick={copyDigest}>
          <Clipboard size={16} aria-hidden="true" /> {copyState}
        </button>
        <span className="copy">{receiveCopyState}</span>
        {surface === 'popup' ? (
          <button type="button" onClick={openSidePanel}>
            <PanelRightOpen size={16} aria-hidden="true" /> Open panel
          </button>
        ) : null}
      </div>
    </main>
  )
}

function isWalletStatus(value: unknown): value is DappWalletStatus {
  return typeof value === 'object' && value !== null && 'hasVault' in value && 'unlocked' in value
}
