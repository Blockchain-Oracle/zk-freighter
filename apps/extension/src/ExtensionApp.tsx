import { useEffect, useState } from 'react'
import { browser } from 'wxt/browser'

import { ThemeProvider } from '@zk-fighter/ui'

import { ExtensionAccess } from './ExtensionAccess'
import { ExtensionHome } from './ExtensionHome'
import { ExtensionSidePanel } from './ExtensionSidePanel'
import { dappMessageTypes, type DappWalletStatus } from './dappMessages'

const statusRefreshMs = 1_000

interface ExtensionAppProps {
  readonly surface: 'popup' | 'side panel'
}

export function ExtensionApp({ surface }: ExtensionAppProps) {
  const [status, setStatus] = useState<DappWalletStatus | null>(null)
  const [mnemonic, setMnemonic] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)

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

  async function copyPublicKey() {
    if (status?.publicKey) {
      await navigator.clipboard.writeText(status.publicKey)
    }
  }

  async function copyReceiveCode() {
    if (status?.privateReceiveCode) {
      await navigator.clipboard.writeText(status.privateReceiveCode)
    }
  }

  async function openSidePanel() {
    await browser.runtime.sendMessage({ type: 'zkf.extension.openSidePanel' })
  }

  async function importWallet() {
    setBusy(true)
    try {
      await sendRuntimeMessage({ type: dappMessageTypes.importVault, mnemonic, password, network: 'testnet' })
      setMnemonic('')
    } finally {
      setBusy(false)
    }
  }

  async function unlockWallet() {
    setBusy(true)
    try {
      await sendRuntimeMessage({ type: dappMessageTypes.unlock, password })
    } finally {
      setBusy(false)
    }
  }

  async function lockWallet() {
    await sendRuntimeMessage({ type: dappMessageTypes.lock })
  }

  const locked = !status?.hasVault || !status?.unlocked
  const shellWidth = surface === 'popup' ? 360 : 400

  // Locked surfaces (Import / Unlock) are the re-skinned access cards on the
  // themed canvas. The unlocked workspace is still the transitional panel stack
  // (next chunk re-skins it to the v2 popup Home + side panel).
  if (locked) {
    return (
      <ThemeProvider initialTheme="dark" className="flex justify-center">
        <div style={{ width: shellWidth, maxWidth: '100%', minHeight: '100dvh', boxSizing: 'border-box', padding: 14, display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
          <ExtensionAccess
            status={status}
            mnemonic={mnemonic}
            password={password}
            busy={busy}
            setMnemonic={setMnemonic}
            setPassword={setPassword}
            importWallet={importWallet}
            unlockWallet={unlockWallet}
          />
        </div>
      </ThemeProvider>
    )
  }

  if (!status) return null

  // Popup (unlocked) = the re-skinned Home with REAL cached balances. The side
  // panel keeps the transitional workspace stack until E3/E4 re-skin it.
  if (surface === 'popup') {
    return (
      <ThemeProvider initialTheme="dark" className="flex justify-center">
        <div style={{ width: shellWidth, maxWidth: '100%', minHeight: '100dvh', boxSizing: 'border-box', padding: 14 }}>
          <ExtensionHome
            status={status}
            surface={surface}
            sendRuntimeMessage={sendRuntimeMessage}
            lockWallet={lockWallet}
            openSidePanel={openSidePanel}
            copyReceiveCode={copyReceiveCode}
          />
        </div>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider initialTheme="dark">
      <div style={{ width: shellWidth, maxWidth: '100%', minHeight: '100dvh', boxSizing: 'border-box', padding: 14 }}>
        <ExtensionSidePanel
          status={status}
          sendRuntimeMessage={sendRuntimeMessage}
          lockWallet={lockWallet}
          copyPublicKey={copyPublicKey}
          copyReceiveCode={copyReceiveCode}
        />
      </div>
    </ThemeProvider>
  )
}

function isWalletStatus(value: unknown): value is DappWalletStatus {
  return typeof value === 'object' && value !== null && 'hasVault' in value && 'unlocked' in value
}
