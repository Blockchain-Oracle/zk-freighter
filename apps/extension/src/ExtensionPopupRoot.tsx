import { useEffect, useState } from 'react'
import { BrandIntro } from '@zk-freighter/ui'
import { browser } from 'wxt/browser'

import { ExtensionApp } from './ExtensionApp'
import { ExtensionFinishSetup } from './ExtensionFinishSetup'
import { dappMessageTypes } from './dappMessages'
import { hasExtensionOnboarded, markExtensionOnboarded } from './extension-onboarding'

type Gate = 'checking' | 'onboard' | 'app'

// The popup never runs the slides itself: if intro v2 is unfinished it nudges
// the user into the full-tab flow. Wallets created before intro v2 have no key,
// so an existing vault backfills the flag and goes straight to the app.
export function ExtensionPopupRoot() {
  const [gate, setGate] = useState<Gate>(() => (hasExtensionOnboarded() ? 'app' : 'checking'))

  useEffect(() => {
    if (gate !== 'checking') return
    let cancelled = false
    void browser.runtime.sendMessage({ type: dappMessageTypes.status }).then(
      (status) => {
        if (cancelled) return
        if (status && typeof status === 'object' && (status as { hasVault?: boolean }).hasVault) {
          markExtensionOnboarded()
          setGate('app')
        } else {
          setGate('onboard')
        }
      },
      () => { if (!cancelled) setGate('onboard') },
    )
    return () => { cancelled = true }
  }, [gate])

  if (gate === 'checking') return null
  if (gate === 'onboard') return <ExtensionFinishSetup />
  return (
    <>
      <BrandIntro storageKey="zkf.intro.extension.v1" />
      <ExtensionApp />
    </>
  )
}
