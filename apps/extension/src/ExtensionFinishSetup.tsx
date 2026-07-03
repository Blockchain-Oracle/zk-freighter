import { Logo } from '@zk-freighter/ui'
import { openOnboardingTab } from './extension-onboarding'

// Shown in the 360px popup while intro v2 is unfinished. The slides themselves
// run in a full tab (opened here), never cramped into the popup.
export function ExtensionFinishSetup() {
  return (
    <div style={{ minHeight: 480, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 20, padding: 28, textAlign: 'center', color: '#f3f4f6', background: 'radial-gradient(320px 260px at 50% 38%, rgba(94,124,250,.14), transparent 70%), #0c0d0f' }}>
      <Logo size={64} glow />
      <div>
        <div style={{ font: '800 20px/1.15 var(--font-sans, inherit)', letterSpacing: '-0.02em' }}>Welcome to ZK Freighter</div>
        <div style={{ marginTop: 10, fontSize: 13, lineHeight: 1.55, color: '#c7cbd4', maxWidth: 260 }}>
          Let’s set up your shielded wallet. This opens in a full tab so there’s room to walk through it.
        </div>
      </div>
      <button
        onClick={() => { openOnboardingTab(); window.close() }}
        style={{ width: '100%', maxWidth: 260, padding: '13px 18px', borderRadius: 14, border: 'none', cursor: 'pointer', font: '750 14px/1 var(--font-sans, inherit)', color: '#0c0d0f', background: 'linear-gradient(135deg,#8a9bff,#5E7CFA)', boxShadow: '0 10px 30px -12px rgba(94,124,250,.8)' }}
      >
        Finish setting up
      </button>
    </div>
  )
}
