import { ArrowRight } from 'lucide-react'
import { Logo } from '@zk-fighter/ui'

export type DeviceVariant = 'web' | 'extension' | 'mobile'

export interface DeviceFlipCardProps {
  readonly variant: DeviceVariant
  readonly title: string
  readonly meta: string
  readonly shot: string
  readonly shotAlt: string
  readonly backLine: string
  readonly ctaLabel: string
  readonly ctaHref: string
  readonly flipped: boolean
  readonly onFlip: () => void
}

/**
 * A device preview that lifts on hover and flips (3D) on click/tap to reveal
 * its call-to-action face. Mouse users can click anywhere on the card;
 * keyboard/AT users get a real toggle button, and the hidden face is `inert`
 * so its controls never become phantom tab stops.
 */
export function DeviceFlipCard({ variant, title, meta, shot, shotAlt, backLine, ctaLabel, ctaHref, flipped, onFlip }: DeviceFlipCardProps) {
  return (
    <article className={`flip-card flip-${variant}${flipped ? ' is-flipped' : ''}`} onClick={onFlip}>
      <span className="flip-inner">
        <span className="flip-face flip-front" inert={flipped || undefined}>
          <DeviceFrame variant={variant}>
            <img src={shot} alt={shotAlt} loading="lazy" />
          </DeviceFrame>
          <span className="flip-caption">
            <button
              type="button"
              className="flip-toggle"
              aria-pressed={flipped}
              aria-label={`${title} — show actions`}
              onClick={(event) => {
                event.stopPropagation()
                onFlip()
              }}
            >
              <strong>{title}</strong>
              <span>{meta}</span>
            </button>
          </span>
        </span>
        <span className="flip-face flip-back" inert={!flipped || undefined}>
          <Logo size={40} glow />
          <strong>{title}</strong>
          <span className="flip-back-line">{backLine}</span>
          <a className="flip-cta" href={ctaHref} onClick={(event) => event.stopPropagation()}>
            {ctaLabel} <ArrowRight size={16} />
          </a>
          <button
            type="button"
            className="flip-hint"
            onClick={(event) => {
              event.stopPropagation()
              onFlip()
            }}
          >
            tap to flip back
          </button>
        </span>
      </span>
    </article>
  )
}

function DeviceFrame({ variant, children }: { readonly variant: DeviceVariant; readonly children: React.ReactNode }) {
  if (variant === 'web') {
    return (
      <span className="frame frame-browser">
        <span className="frame-bar">
          <span className="frame-dots"><i /><i /><i /></span>
          <span className="frame-url">app.zkfighter.dev</span>
        </span>
        {children}
      </span>
    )
  }
  if (variant === 'mobile') {
    return (
      <span className="frame frame-phone">
        <span className="frame-notch" />
        {children}
      </span>
    )
  }
  return (
    <span className="frame frame-popup">
      <span className="frame-bar">
        <span className="frame-ext-ic">⬡</span>
        <span className="frame-url">ZK Fighter</span>
        <span className="frame-pin">📌</span>
      </span>
      {children}
    </span>
  )
}
