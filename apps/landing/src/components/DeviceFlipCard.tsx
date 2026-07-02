import { ArrowRight } from 'lucide-react'
import { Logo } from '@zk-freighter/ui'
import { MockScreen } from './MockScreen'

export type DeviceVariant = 'web' | 'extension' | 'mobile'

const mockByVariant: Record<DeviceVariant, { src: string; width: number; height: number; maxHeight: number }> = {
  web: { src: '/mock-web.html', width: 1320, height: 900, maxHeight: 340 },
  extension: { src: '/mock-extension.html', width: 360, height: 735, maxHeight: 430 },
  mobile: { src: '/mock-mobile.html', width: 288, height: 604, maxHeight: 430 },
}

export interface DeviceFlipCardProps {
  readonly variant: DeviceVariant
  readonly title: string
  readonly meta: string
  readonly backLine: string
  readonly ctaLabel: string
  readonly ctaHref: string
  readonly flipped: boolean
  readonly onFlip: () => void
}

/**
 * A live-rendered designer screen (no images) that rises on hover and flips
 * (3D) on click/tap to reveal its call-to-action face. Mouse users can click
 * anywhere; keyboard/AT users get a real toggle button, and the hidden face is
 * `inert` so its controls never become phantom tab stops.
 */
export function DeviceFlipCard({ variant, title, meta, backLine, ctaLabel, ctaHref, flipped, onFlip }: DeviceFlipCardProps) {
  const mock = mockByVariant[variant]
  return (
    <article className={`flip-card flip-${variant}${flipped ? ' is-flipped' : ''}`} onClick={onFlip}>
      <span className="flip-inner">
        <span className="flip-face flip-front" inert={flipped || undefined}>
          <MockScreen {...mock} />
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
