import { useCallback, useEffect, useRef, useState } from 'react'
import { onboardingInk, onboardingSlides } from './onboarding-slides'

export type OnboardingChoice = 'create' | 'import'

function prefersReducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function revealStyle(delaySeconds: number, reduced: boolean): React.CSSProperties {
  return { animation: reduced ? undefined : `zkRise .5s ease ${delaySeconds}s both` }
}

/**
 * First-run intro v2: a full-viewport #0c0d0f flow of four Continue-paced slides
 * that teach the shielded-balance mental model, then fork into create/import.
 * Never auto-advances (NN/g). Skip is visible until the final slide and jumps to
 * the fork. Swipe (mobile) and Continue both advance; `onSlideChange` fires per
 * step so mobile can add a haptic tick. `prefers-reduced-motion` drops the
 * staggered reveals. Completion writes `storageKey` so the flow shows once, then
 * calls `onComplete(choice)`. `soundSrc` plays a single chime on first gesture,
 * matching BrandIntro's autoplay-retry behavior.
 */
export function BrandOnboarding({
  storageKey,
  soundSrc,
  onComplete,
  onSlideChange,
}: {
  storageKey?: string | null
  soundSrc?: string
  onComplete: (choice: OnboardingChoice) => void
  onSlideChange?: (index: number) => void
}) {
  const [index, setIndex] = useState(0)
  const reduced = prefersReducedMotion()
  const doneRef = useRef(false)
  const startX = useRef<number | null>(null)
  const last = onboardingSlides.length - 1

  useEffect(() => {
    if (!soundSrc) return
    const audio = new Audio(soundSrc)
    audio.volume = 0.7
    audio.preload = 'auto'
    audio.load()
    let started = false
    // Audible autoplay is blocked until the page has a user gesture. The listeners
    // are attached up front (not only inside a rejected play() — that races the
    // first click), so the Continue tap that advances the flow reliably starts the
    // chime. `start` is idempotent and lets a failed attempt retry on the next tap.
    const start = () => {
      if (started || doneRef.current) return
      started = true
      audio.play().catch(() => { started = false })
    }
    start()
    window.addEventListener('pointerdown', start, { capture: true })
    window.addEventListener('keydown', start, { capture: true })
    return () => {
      window.removeEventListener('pointerdown', start, { capture: true })
      window.removeEventListener('keydown', start, { capture: true })
      audio.pause()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- run once on mount
  }, [])

  const go = useCallback((next: number) => {
    setIndex((current) => {
      const clamped = Math.max(0, Math.min(last, next))
      if (clamped !== current) onSlideChange?.(clamped)
      return clamped
    })
  }, [last, onSlideChange])

  const complete = useCallback((choice: OnboardingChoice) => {
    if (doneRef.current) return
    doneRef.current = true
    if (storageKey) {
      try {
        localStorage.setItem(storageKey, String(Date.now()))
      } catch {
        // storage may be unavailable (private mode); the flow just won't be remembered
      }
    }
    onComplete(choice)
  }, [onComplete, storageKey])

  function onPointerUp(event: React.PointerEvent) {
    if (startX.current === null) return
    const dx = event.clientX - startX.current
    startX.current = null
    if (dx < -45) go(index + 1)
    else if (dx > 45) go(index - 1)
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (index >= last) return
    if (event.key === 'ArrowRight' || event.key === 'Enter') go(index + 1)
    else if (event.key === 'ArrowLeft') go(index - 1)
  }

  const slide = onboardingSlides[index]
  const onFork = index === last
  return (
    <div
      role="group"
      aria-label="Welcome to ZK Freighter"
      tabIndex={0}
      onKeyDown={onKeyDown}
      onPointerDown={(event) => { startX.current = event.clientX }}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '28px 24px 30px',
        outline: 'none',
        touchAction: 'pan-y',
        color: onboardingInk.hi,
        background: 'radial-gradient(620px 480px at 50% 40%, rgba(94,124,250,.13), transparent 70%), #0c0d0f',
      }}
    >
      <div style={{ width: '100%', maxWidth: 460, display: 'flex', alignItems: 'center' }}>
        <span style={{ font: '800 12px/1 var(--font-sans, inherit)', letterSpacing: '-0.01em', color: onboardingInk.low }}>ZK Freighter</span>
        {onFork ? null : (
          <button onClick={() => go(last)} style={skipStyle}>Skip</button>
        )}
      </div>

      <div style={{ flex: 1, width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 26 }}>
        <div key={index} style={{ display: 'grid', placeItems: 'center', minHeight: 130 }}>{slide.visual(reduced)}</div>
        <div style={{ textAlign: 'center', maxWidth: 360 }}>
          <div key={`t${index}`} style={{ font: '820 25px/1.15 var(--font-sans, inherit)', letterSpacing: '-0.02em', ...revealStyle(0.05, reduced) }}>{slide.title}</div>
          <div key={`s${index}`} style={{ marginTop: 12, fontSize: 14, lineHeight: 1.6, color: onboardingInk.mid, ...revealStyle(0.14, reduced) }}>{slide.sub}</div>
        </div>
      </div>

      <div style={{ width: '100%', maxWidth: 460, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
        <div style={{ display: 'flex', gap: 8 }} aria-hidden>
          {onboardingSlides.map((_, dot) => (
            <span key={dot} style={{ width: dot === index ? 22 : 7, height: 7, borderRadius: 999, background: dot === index ? onboardingInk.accent : onboardingInk.line, transition: reduced ? undefined : 'width .3s ease, background .3s ease' }} />
          ))}
        </div>
        {onFork ? (
          <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 11 }}>
            <button onClick={() => complete('create')} style={forkPrimary}>Create new wallet</button>
            <button onClick={() => complete('import')} style={forkSecondary}>I already have a wallet</button>
          </div>
        ) : (
          <button onClick={() => go(index + 1)} style={forkPrimary}>Continue</button>
        )}
      </div>
    </div>
  )
}

const skipStyle: React.CSSProperties = {
  marginLeft: 'auto',
  background: 'none',
  border: 'none',
  cursor: 'pointer',
  font: '700 12px/1 var(--font-sans, inherit)',
  color: onboardingInk.low,
  padding: '6px 4px',
}

const forkPrimary: React.CSSProperties = {
  width: '100%',
  padding: '14px 18px',
  borderRadius: 14,
  border: 'none',
  cursor: 'pointer',
  font: '750 14px/1 var(--font-sans, inherit)',
  color: '#0c0d0f',
  background: 'linear-gradient(135deg,#8a9bff,#5E7CFA)',
  boxShadow: '0 10px 30px -12px rgba(94,124,250,.8)',
}

const forkSecondary: React.CSSProperties = {
  width: '100%',
  padding: '14px 18px',
  borderRadius: 14,
  cursor: 'pointer',
  font: '750 14px/1 var(--font-sans, inherit)',
  color: onboardingInk.hi,
  background: 'rgba(255,255,255,.04)',
  border: `1px solid ${onboardingInk.line}`,
}
