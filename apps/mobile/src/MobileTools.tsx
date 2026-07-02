import { useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { CheckCircle2, Loader2, RefreshCw, XCircle } from 'lucide-react'
import { Button, Callout, Logo, useTheme } from '@zk-freighter/ui'
import type { NetworkKey } from '@zk-freighter/core'
import { capabilityChecks, runMobileRuntimeCheck, type MobileRuntimeReport, type RuntimeStatus } from './mobile-runtime'
import { truncateMiddle } from './mobile-format'

interface SettingsProps {
  readonly network: NetworkKey
  readonly address: string
  readonly syncStatus: 'idle' | 'syncing' | 'failed'
  readonly onNetwork: (network: NetworkKey) => void
  readonly onSync: () => Promise<void>
  readonly onReset: () => Promise<void>
  readonly onLock: () => void
}

export function MobileSettings({ network, address, syncStatus, onNetwork, onSync, onReset, onLock }: SettingsProps) {
  const [runtime, setRuntime] = useState<MobileRuntimeReport | null>(null)
  const [running, setRunning] = useState(false)
  const [resetting, setResetting] = useState(false)
  const platform = Capacitor.getPlatform()
  const { theme, setTheme } = useTheme()

  async function checkRuntime() {
    setRunning(true)
    try {
      setRuntime(await runMobileRuntimeCheck(platform))
    } finally {
      setRunning(false)
    }
  }

  async function reset() {
    setResetting(true)
    try {
      await onReset()
    } finally {
      setResetting(false)
    }
  }

  return (
    <div className="screen-stack">
      <div className="route-head"><strong>Settings</strong><span>{platform}</span></div>
      <section className="settings-account"><Logo size={34} glow /><span><strong>Personal</strong><em>{truncateMiddle(address, 5, 5)}</em></span></section>
      <section className="settings-card">
        <label>Network</label>
        <select value={network} onChange={(event) => onNetwork(event.target.value as NetworkKey)}>
          <option value="testnet">Testnet</option>
          <option value="mainnet">Mainnet</option>
        </select>
      </section>
      <section className="settings-card">
        <label>Appearance</label>
        <div className="settings-segment">
          <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')}>Dark</button>
          <button className={theme === 'light' ? 'on' : ''} onClick={() => setTheme('light')}>Light</button>
        </div>
      </section>
      <section className="settings-card">
        <label>Public account</label>
        <code>{address}</code>
      </section>
      <section className="settings-card">
        <label>Private runtime</label>
        <div className="settings-actions">
          <Button variant="secondary" loading={syncStatus === 'syncing'} onClick={() => void onSync()}>Sync now</Button>
          <Button variant="secondary" loading={resetting} onClick={() => void reset()}>Reset cache</Button>
        </div>
      </section>
      <section className="settings-card">
        <label>Runtime readiness</label>
        <Button fullWidth loading={running} onClick={() => void checkRuntime()}>Run readiness check</Button>
        <RuntimePanel report={runtime} status={running ? 'running' : runtime?.status ?? 'idle'} />
      </section>
      <Callout tone="warn" title="Recovery">
        Exporting secrets on mobile needs a dedicated confirmation screen. For this checkpoint, use the recovery phrase you saved during setup.
      </Callout>
      <Button fullWidth variant="danger" onClick={onLock}>Lock wallet</Button>
    </div>
  )
}

function RuntimePanel({ report, status }: { readonly report: MobileRuntimeReport | null; readonly status: RuntimeStatus }) {
  const checks = report?.capabilities ?? capabilityChecks()
  return (
    <div className="runtime-mini">
      <span className={`status-badge ${status}`}>{status === 'idle' ? 'not run' : status}</span>
      {checks.map((check) => <div key={check.label} className="mini-check">{check.ok ? <CheckCircle2 size={15} /> : <XCircle size={15} />}<span><b>{check.label}</b><em>{check.detail}</em></span></div>)}
      {report?.prover ? <div className="mini-check"><CheckCircle2 size={15} /><span><b>Prover assets</b><em>{report.prover.status} · {Math.round(report.prover.durationMs)} ms</em></span></div> : null}
      {status === 'running' ? <div className="mini-check"><Loader2 size={15} className="spin" /><span><b>Checking</b><em>Keep the app open.</em></span></div> : null}
      {report?.error ? <div className="mini-error">{report.error}</div> : null}
    </div>
  )
}
