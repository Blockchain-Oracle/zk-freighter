import { useState } from 'react'
import { appUrl, extensionUrl, mobileUrl } from '../links'
import { DeviceFlipCard, type DeviceVariant } from './DeviceFlipCard'

const cards = [
  {
    variant: 'web' as DeviceVariant,
    title: 'Web app',
    meta: 'full wallet · desktop',
    shot: '/shot-web.png',
    shotAlt: 'ZK Freighter web wallet — shielded balance, boundary strip, and activity',
    backLine: 'Send, shield, bridge, selective disclosure and confidential tokens — the full wallet in the browser.',
    ctaLabel: 'Open web app',
    ctaHref: appUrl,
  },
  {
    variant: 'extension' as DeviceVariant,
    title: 'Extension',
    meta: 'quick companion · Chrome',
    shot: '/shot-extension.png',
    shotAlt: 'ZK Freighter extension popup — shielded and public balances at a glance',
    backLine: 'Glance, QuickShield, receive and bridge. Heavy proving promotes to the side panel.',
    ctaLabel: 'Download extension',
    ctaHref: extensionUrl,
  },
  {
    variant: 'mobile' as DeviceVariant,
    title: 'Mobile',
    meta: 'thumb-first · Android & iOS',
    shot: '/shot-mobile.png',
    shotAlt: 'ZK Freighter mobile home — swipeable shielded balance card and activity',
    backLine: 'Swipeable cards, bottom-sheet flows, proving in-sheet. Early native build.',
    ctaLabel: 'Get the mobile build',
    ctaHref: mobileUrl,
  },
]

export function DeviceShowcase() {
  const [flipped, setFlipped] = useState<DeviceVariant | null>(null)
  return (
    <div className="device-showcase" aria-label="ZK Freighter on web, extension and mobile — real screenshots">
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
