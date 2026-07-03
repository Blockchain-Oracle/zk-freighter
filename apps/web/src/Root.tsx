import { useState } from 'react'
import { BrandIntro, BrandOnboarding, type OnboardingChoice } from '@zk-freighter/ui'
import App from './App.tsx'

const onboardingKey = 'zkf.onboarding.web.v2'

function hasOnboarded(): boolean {
  try {
    return Boolean(localStorage.getItem(onboardingKey))
  } catch {
    return false
  }
}

// First run: the intro v2 flow replaces the short splash and forks into the
// existing create/import flow. Returning users (key present) get only BrandIntro.
export function Root() {
  const [done, setDone] = useState(() => hasOnboarded())
  const [choice, setChoice] = useState<OnboardingChoice | undefined>(undefined)

  if (!done) {
    return (
      <BrandOnboarding
        storageKey={onboardingKey}
        soundSrc="/intro-welcome.mp3"
        onComplete={(next) => { setChoice(next); setDone(true) }}
      />
    )
  }

  return (
    <>
      {choice ? null : <BrandIntro storageKey="zkf.intro.web.v1" soundSrc="/intro-welcome.mp3" />}
      <App initialChoice={choice} />
    </>
  )
}
