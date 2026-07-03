import { useEffect, useState } from 'react'
import { Logo } from '@zk-freighter/ui'

const mobileUrl = import.meta.env.VITE_ZKF_MOBILE_URL ?? 'https://m.zkfreighter.app'
const androidUrl = 'https://github.com/Blockchain-Oracle/zk-freighter/releases/latest/download/zk-freighter.apk'
const PHONE_MAX_WIDTH = 760

/**
 * The web wallet's shell is a fixed desktop layout — it is not responsive on
 * phones. Rather than show a cramped, broken UI, small screens get a clear
 * hand-off to the mobile app (a responsive PWA + native builds), with an
 * explicit escape hatch for anyone who really wants the desktop layout.
 */
export function PhoneGate({ children }: { children: React.ReactNode }) {
  const [isPhone, setIsPhone] = useState(() => typeof window !== 'undefined' && window.innerWidth < PHONE_MAX_WIDTH)
  const [override, setOverride] = useState(false)

  useEffect(() => {
    const onResize = () => setIsPhone(window.innerWidth < PHONE_MAX_WIDTH)
    window.addEventListener('resize', onResize)
    return () => window.removeEventListener('resize', onResize)
  }, [])

  if (!isPhone || override) return <>{children}</>

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 22, padding: 28, textAlign: 'center', background: 'radial-gradient(520px 380px at 50% 34%, rgba(94,124,250,.14), transparent 70%), #0c0d0f', color: '#f3f4f6' }}>
      <Logo size={72} glow />
      <div>
        <div style={{ fontWeight: 850, fontSize: 22, letterSpacing: '-.02em' }}>Open the mobile app</div>
        <p style={{ maxWidth: 320, margin: '10px auto 0', fontSize: 13.5, lineHeight: 1.55, color: '#9aa0a9' }}>
          This web wallet is built for a desktop screen. On your phone, use the mobile app — a
          thumb-first shielded wallet made for small screens.
        </p>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 11, width: '100%', maxWidth: 320 }}>
        <a href={mobileUrl} style={btn('#5E7CFA', '#fff')}>Open mobile web app</a>
        <a href={androidUrl} style={btn('rgba(255,255,255,.06)', '#f3f4f6')}>Download Android app (APK)</a>
      </div>
      <button onClick={() => setOverride(true)} style={{ background: 'none', border: 'none', color: '#6b7280', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}>
        Continue to the desktop wallet anyway
      </button>
    </div>
  )
}

function btn(bg: string, color: string): React.CSSProperties {
  return { display: 'block', padding: '13px 16px', borderRadius: 13, background: bg, color, fontWeight: 700, fontSize: 14, textDecoration: 'none', border: bg.startsWith('rgba') ? '1px solid rgba(255,255,255,.12)' : 'none' }
}
