import { useState } from 'react'
import { BrandIntro, BrandOnboarding, type OnboardingChoice } from '@zk-freighter/ui'
import { App } from './App'
import { hapticTap } from './mobile-haptics'

const onboardingKey = 'zkf.onboarding.mobile.v2'

function hasOnboarded(): boolean {
  try {
    return Boolean(localStorage.getItem(onboardingKey))
  } catch {
    return false
  }
}

// First run: intro v2 full-screen (swipe + Continue both advance, haptic tick per
// slide). Returning users get only the short BrandIntro splash.
export function Root() {
  const [done, setDone] = useState(() => hasOnboarded())
  const [choice, setChoice] = useState<OnboardingChoice | undefined>(undefined)

  if (!done) {
    return (
      <BrandOnboarding
        storageKey={onboardingKey}
        soundSrc="/intro-welcome.mp3"
        onSlideChange={() => hapticTap()}
        onComplete={(next) => { setChoice(next); setDone(true) }}
      />
    )
  }

  return (
    <>
      {choice ? null : <BrandIntro storageKey="zkf.intro.mobile.v1" soundSrc="/intro-welcome.mp3" />}
      <App initialChoice={choice} />
    </>
  )
}
