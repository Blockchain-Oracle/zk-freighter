import { useCallback, useEffect, useRef, useState } from 'react'
import { Logo } from './logo'

// Timed to the intro sound: ~4.2s asset with its fade starting at 3s —
// the overlay dissolves inside the audio fade so both land together.
const introMs = 3300
const fadeMs = 700

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function ringStyle(delaySeconds: number): React.CSSProperties {
  return {
    position: 'absolute',
    width: 92,
    height: 92,
    borderRadius: '50%',
    border: '1.5px solid rgba(94,124,250,.55)',
    animation: `zkIntroRing 1.5s ease-out ${delaySeconds}s both`,
    pointerEvents: 'none',
  }
}

/**
 * First-run brand intro: the coin pops in on a black stage with the wordmark,
 * holds ~2s, then fades. Tap skips. Shows once per `storageKey` (localStorage);
 * reduced-motion gets a static quick fade. `soundSrc` is attempted once —
 * browsers may block audio before a user gesture, and that failure is silent
 * and harmless by design.
 */
export function BrandIntro({
  storageKey = 'zkf.intro.v1',
  soundSrc,
  tagline = 'Shielded payments on Stellar',
  onDone,
}: {
  storageKey?: string | null
  soundSrc?: string
  tagline?: string
  onDone?: () => void
}) {
  const [phase, setPhase] = useState<'in' | 'out' | 'gone'>(() => {
    if (storageKey && typeof localStorage !== 'undefined' && localStorage.getItem(storageKey)) return 'gone'
    return 'in'
  })
  const doneRef = useRef(false)

  const finish = useCallback(() => {
    if (doneRef.current) return
    doneRef.current = true
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(Date.now()))
      } catch {
        // storage may be unavailable (private mode); the intro just won't be remembered
      }
    }
    setPhase('out')
    window.setTimeout(() => {
      setPhase('gone')
      onDone?.()
    }, fadeMs)
  }, [onDone, storageKey])

  useEffect(() => {
    if (phase !== 'in') return
    const hold = prefersReducedMotion() ? 900 : introMs
    const timer = window.setTimeout(finish, hold)
    let audio: HTMLAudioElement | undefined
    if (soundSrc) {
      audio = new Audio(soundSrc)
      audio.volume = 0.75
      audio.play().catch(() => undefined)
    }
    return () => {
      window.clearTimeout(timer)
      // StrictMode dev double-mount: stop the first instance so audio never overlaps
      audio?.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  if (phase === 'gone') return null

  const reduced = prefersReducedMotion()
  return (
    <div
      role="presentation"
      onClick={finish}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 18,
        background:
          'radial-gradient(560px 420px at 50% 58%, rgba(94,124,250,.14), transparent 70%), #0c0d0f',
        cursor: 'pointer',
        opacity: phase === 'out' ? 0 : 1,
        transition: `opacity ${fadeMs}ms ease`,
      }}
    >
      <span style={{ position: 'relative', display: 'grid', placeItems: 'center' }}>
        {reduced ? null : (
          <>
            <span style={ringStyle(0.35)} />
            <span style={ringStyle(1.2)} />
            <span style={ringStyle(2.05)} />
          </>
        )}
        <span style={{ animation: reduced ? undefined : 'zkIntroCoin 1s cubic-bezier(.3,1.4,.4,1) both' }}>
          <Logo size={84} glow />
        </span>
      </span>
      <div
        style={{
          textAlign: 'center',
          animation: reduced ? undefined : 'zkIntroText .7s ease .45s both',
        }}
      >
        <div style={{ font: '850 26px/1.1 var(--font-sans, inherit)', letterSpacing: '-0.02em', color: '#f3f4f6' }}>
          ZK Freighter
        </div>
        <div
          style={{
            marginTop: 9,
            font: "700 10.5px/1 var(--font-mono, ui-monospace, monospace)",
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: '#9aa0a9',
          }}
        >
          {tagline}
        </div>
      </div>
    </div>
  )
}
