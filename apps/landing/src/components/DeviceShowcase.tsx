import { useState } from 'react'
import { appUrl, androidUrl, extensionUrl } from '../links'
import { DeviceFlipCard, type DeviceVariant } from './DeviceFlipCard'

const cards = [
  {
    variant: 'web' as DeviceVariant,
    title: 'Web app',
    meta: 'full wallet · desktop',
    backLine: 'Send, shield, bridge, selective disclosure and confidential tokens — the full wallet in the browser.',
    ctaLabel: 'Open web app',
    ctaHref: appUrl,
  },
  {
    variant: 'extension' as DeviceVariant,
    title: 'Extension',
    meta: 'quick companion · Chrome',
    backLine: 'Glance, QuickShield, receive and bridge. Heavy proving promotes to the side panel.',
    ctaLabel: 'Download extension',
    ctaHref: extensionUrl,
  },
  {
    variant: 'mobile' as DeviceVariant,
    title: 'Mobile',
    meta: 'thumb-first · Android & iOS',
    backLine: 'Swipeable cards, bottom-sheet flows, proving in-sheet. Early native build.',
    ctaLabel: 'Get the mobile build',
    ctaHref: androidUrl,
  },
]

export function DeviceShowcase() {
  const [flipped, setFlipped] = useState<DeviceVariant | null>(null)
  return (
    <div className="device-showcase" aria-label="ZK Freighter on web, extension and mobile">
      {cards.map((card) => (
        <DeviceFlipCard
          key={card.variant}
          {...card}
          flipped={flipped === card.variant}
          onFlip={() => setFlipped((current) => (current === card.variant ? null : card.variant))}
        />
      ))}
    </div>
  )
}
