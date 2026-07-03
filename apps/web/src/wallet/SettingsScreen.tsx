import { useState } from 'react'
import {
  AUTO_SHIELD_STORAGE_KEY,
  NETWORKS,
  parseAutoShieldSettings,
  serializeAutoShieldSettings,
  type NetworkKey,
  type PasskeyEnvelope,
  type WalletIdentity,
} from '@zk-freighter/core'
import { BoundaryBadge, Segmented, truncateMiddle, useTheme } from '@zk-freighter/ui'
import { requestPrivateEngineStorageReset } from '../privateEngineStorage'
import type { WalletScreen } from './screens'
import type { CSSProperties, ReactNode } from 'react'

const NETWORK_OPTIONS = (Object.keys(NETWORKS) as NetworkKey[]).map((key) => ({ value: key, label: NETWORKS[key].label }))
const THEME_OPTIONS = [
  { value: 'light', label: 'Light' },
  { value: 'dark', label: 'Dark' },
]

const groupStyle: CSSProperties = { border: '1px solid var(--bd)', borderRadius: 16, background: 'var(--panel)', overflow: 'hidden' }
const groupHeader: CSSProperties = { padding: '13px 18px', borderBottom: '1px solid var(--bd)', font: '600 9px/1 var(--fm)', letterSpacing: '.12em', color: 'var(--tx3)' }

function ToggleSwitch({ on, onChange, label }: { on: boolean; onChange: (next: boolean) => void; label: string }) {
  return (
    <button role="switch" aria-checked={on} aria-label={label} onClick={() => onChange(!on)} style={{ flex: 'none', width: 42, height: 24, borderRadius: 999, border: '1px solid var(--bd2)', background: on ? 'var(--ac)' : 'var(--card2)', position: 'relative', cursor: 'pointer', transition: 'background .15s' }}>
      <span style={{ position: 'absolute', top: 2, left: on ? 20 : 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', transition: 'left .15s', boxShadow: '0 1px 3px rgba(0,0,0,.3)' }} />
    </button>
  )
}

function Rev({ label, children, top }: { label: string; children: ReactNode; top?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '15px 18px', borderTop: top ? 'none' : '1px solid var(--bd)', fontSize: 12.5, color: 'var(--tx2)' }}>
      {label}
      <span style={{ marginLeft: 'auto', fontWeight: 600, color: 'var(--tx)' }}>{children}</span>
    </div>
  )
}

interface SettingsScreenProps {
  identity: WalletIdentity
  network: NetworkKey
  receiveCode: string
  passkeyEnvelope: PasskeyEnvelope | null
  onChangeNetwork: (network: NetworkKey) => void
  onPasskeyEnvelopeChange: (envelope: PasskeyEnvelope | null) => void
  onNav: (screen: WalletScreen) => void
  onLock: () => void
}

export function SettingsScreen({ identity, network, receiveCode, onChangeNetwork, onNav, onLock }: SettingsScreenProps) {
  const { theme, setTheme } = useTheme()
  const [autoShieldOn, setAutoShieldOn] = useState(
    () => parseAutoShieldSettings(window.localStorage.getItem(AUTO_SHIELD_STORAGE_KEY)).enabled,
  )

  function setAutoShield(enabled: boolean) {
    const current = parseAutoShieldSettings(window.localStorage.getItem(AUTO_SHIELD_STORAGE_KEY))
    window.localStorage.setItem(AUTO_SHIELD_STORAGE_KEY, serializeAutoShieldSettings({ ...current, enabled }))
    setAutoShieldOn(enabled)
  }

  function resetPrivateEngineCache() {
    requestPrivateEngineStorageReset()
    window.location.reload()
  }

  return (
    <section style={{ width: '100%', maxWidth: 880, margin: '0 auto', padding: '30px 34px 44px', display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 800, fontSize: 26, letterSpacing: '-.025em' }}>Settings</div>
      <div style={{ fontSize: 13.5, color: 'var(--tx2)', marginBottom: 18 }}>Account, security, network and appearance.</div>

      <div style={{ display: 'flex', gap: 26, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={groupStyle}>
            <div style={groupHeader}>ACCOUNT</div>
            <Rev label="Public address" top><span style={{ fontFamily: 'var(--fm)' }}>{truncateMiddle(identity.stellarPublicKey, 6, 4)}</span></Rev>
            <Rev label="Receive code"><span style={{ fontFamily: 'var(--fm)' }}>{truncateMiddle(receiveCode || '—', 7, 4)}</span></Rev>
          </div>

          <div style={groupStyle}>
            <div style={groupHeader}>SECURITY</div>
            <div style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--tx2)' }}>
                Seed phrase recovery is the only recovery path. Keep your vault password and seed phrase separate.
              </div>
            </div>
          </div>

          <div style={groupStyle}>
            <div style={groupHeader}>PREFERENCES</div>
            <Rev label="Network" top><Segmented options={NETWORK_OPTIONS} value={network} onChange={(value) => onChangeNetwork(value as NetworkKey)} size="sm" /></Rev>
            <Rev label="Appearance"><Segmented options={THEME_OPTIONS} value={theme} onChange={(value) => setTheme(value as 'light' | 'dark')} size="sm" /></Rev>
          </div>

          <div style={groupStyle}>
            <div style={groupHeader}>PRIVACY</div>
            <div style={{ display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--tx)' }}>Auto-shield public balance</div>
                <div style={{ marginTop: 4, fontSize: 11.5, lineHeight: 1.55, color: 'var(--tx2)' }}>
                  Each time you open the wallet, move your available public balance into your shielded balance. Requires one manual shield first. Each deposit is public and shields up to 100 at a time. You can turn this off anytime.
                </div>
              </div>
              <ToggleSwitch on={autoShieldOn} onChange={setAutoShield} label="Auto-shield public balance" />
            </div>
          </div>

          <div style={groupStyle}>
            <div style={groupHeader}>PRIVATE ENGINE</div>
            <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ fontSize: 12.5, lineHeight: 1.55, color: 'var(--tx2)' }}>
                If shielded notes stall after browser restarts or network switches, reset the local OPFS scan cache. Your vault, seed phrase, public address and activity stay in place.
              </div>
              <button onClick={resetPrivateEngineCache} style={{ alignSelf: 'flex-start', padding: '10px 12px', border: '1px solid rgba(94,124,250,.35)', borderRadius: 11, background: 'rgba(94,124,250,.08)', color: 'var(--tx)', fontSize: 12.5, fontWeight: 750, cursor: 'pointer' }}>
                Reset private engine cache
              </button>
            </div>
          </div>
        </div>

        <div style={{ flex: '1 1 320px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <button onClick={() => onNav('tools')} style={{ textAlign: 'left', cursor: 'pointer', border: '1px solid rgba(94,124,250,.25)', borderRadius: 16, background: 'linear-gradient(160deg, rgba(94,124,250,.08), transparent 60%), var(--panel)', padding: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
              <span style={{ width: 30, height: 30, borderRadius: 9, background: 'rgba(94,124,250,.16)', display: 'grid', placeItems: 'center', color: 'var(--ac2)', fontSize: 14 }}>◆</span>
              <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--tx)' }}>Verify it yourself</div>
              <div style={{ marginLeft: 'auto' }}><BoundaryBadge kind="neutral" label="DEVELOPER" size="sm" /></div>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--tx2)' }}><span style={{ color: 'var(--pos)' }}>✓</span>Prover readiness check<span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)', fontSize: 10.5, color: 'var(--ac2)' }}>Open ›</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--tx2)' }}><span style={{ color: 'var(--pos)' }}>✓</span>Tampered-proof rejection demo<span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)', fontSize: 10.5, color: 'var(--ac2)' }}>Run ›</span></div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 12, color: 'var(--tx2)' }}><span style={{ color: 'var(--pos)' }}>✓</span>Recorded on-chain evidence<span style={{ marginLeft: 'auto', fontFamily: 'var(--fm)', fontSize: 10.5, color: 'var(--ac2)' }}>View hashes ›</span></div>
            </div>
          </button>

          <div style={{ padding: '15px 17px', border: '1px dashed rgba(229,180,92,.4)', borderRadius: 14, background: 'rgba(229,180,92,.05)', fontSize: 11.5, lineHeight: 1.55, color: 'var(--warn)' }}>
            Hackathon software on reference implementations — do not use for real funds.
          </div>

          <button onClick={onLock} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 9, padding: 14, border: '1px solid rgba(229,103,92,.4)', borderRadius: 13, background: 'rgba(229,103,92,.06)', color: 'var(--dng)', fontSize: 13.5, fontWeight: 700, cursor: 'pointer' }}>
            Lock wallet
          </button>
        </div>
      </div>
    </section>
  )
}
