import { useState } from 'react'
import { BrandOnboarding } from '@zk-freighter/ui'
import { ExtensionApp } from './ExtensionApp'
import { extensionOnboardingKey, hasExtensionOnboarded } from './extension-onboarding'

// Intro v2 runs in a dedicated FULL TAB (opened on install / from the popup),
// never inside the 360px popup — per the MetaMask home.html vs popup.html split.
// The extension imports an existing wallet, so both fork choices land on the
// same import surface; the choice is not threaded further.
export function ExtensionOnboarding() {
  const [done, setDone] = useState(() => hasExtensionOnboarded())

  if (!done) {
    // The chime lives at the extension root (public dir) — /intro-welcome.mp3
    // resolves to chrome-extension://<id>/intro-welcome.mp3. Matches web/mobile.
    return <BrandOnboarding storageKey={extensionOnboardingKey} soundSrc="/intro-welcome.mp3" onComplete={() => setDone(true)} />
  }

  return (
    <div style={{ minHeight: '100dvh', display: 'grid', placeItems: 'center', padding: 24, background: '#0c0d0f' }}>
      <div style={{ width: 380, maxWidth: '100%' }}>
        <ExtensionApp />
      </div>
    </div>
  )
}
