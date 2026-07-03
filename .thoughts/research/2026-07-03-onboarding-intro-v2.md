# Onboarding Intro v2 — Research Findings (2026-07-03)

> Intended destination: `.thoughts/research/2026-07-03-onboarding-intro-v2.md` (blocked by plan mode; copy verbatim on approval).
> Method: web teardowns (PageFlows), official docs/blogs, and primary-source code (Zashi/Zodl + Signal GitHub repos read via raw.githubusercontent / gh API).

## 1. What real premium wallets actually do on first run

### Phantom (extension + mobile)
- Extension opens **in a new browser tab** after install ([help.phantom.com Get started](https://help.phantom.com/hc/en-us/articles/36482144712083-Get-started-with-Phantom), [925studios teardown](https://www.925studios.co/blog/phantom-wallet-design-breakdown)).
- **No educational carousel.** Welcome screen forks immediately: "Create a new wallet" vs "I already have a wallet". PageFlows capture of the web/extension create path: 8 screens, ~53s total — install → create → save recovery phrase → password → keyboard shortcuts → wallet → done ([PageFlows Phantom onboarding](https://pageflows.com/post/desktop-web/onboarding/phantom/)).
- Design philosophy (925studios): plain language, **one decision per screen**, progressive disclosure, safe defaults; they design the scary moments (backup, signing, recovery, errors) first — education is contextual, not front-loaded.
- Brand line: "The money app that'll take you places" ([phantom.com](https://phantom.com/)).

### MetaMask (extension, 2024–2026)
- Onboarding runs in a **full tab** — the extension ships two HTML entry points, `home.html` (fullscreen) and `popup.html` ([MetaMask community: opening extension in full browser tab](https://community.metamask.io/t/opening-extension-in-full-browser-tab/24141)); a tab is auto-opened on install ([GH issue #1804](https://github.com/MetaMask/metamask-extension/issues/1804)).
- PageFlows capture: **14 screens, ~70s**: Welcome → sign up (create/import fork) → data-tracking (MetaMetrics) opt-in → set password → "Secure your wallet" → reveal SRP → confirm SRP → setup complete → product-updates opt-in → wallet ([PageFlows MetaMask](https://pageflows.com/post/desktop-web/onboarding/metamask/)).
- **No intro slides.** The only pre-fork content is terms + analytics consent. Education is folded into the SRP step ("Secure your wallet" explainer). 2025 updates: RPC choice during onboarding, opt-out of third-party API calls ([metamask.io news](https://metamask.io/news/metamask-mobile-and-extension-updates-improve-wallet-experience-with-more-control-and-transparency)).

### Rainbow (extension + mobile)
- Install opens a **separate window**; first screen is "Create a new wallet" ([rainbow.me extension guide](https://rainbow.me/support/extension/get-started-with-the-rainbow-extension)).
- Deliberately lightweight: user lands **directly in the wallet, backup is deferred** ("back up later" pattern) — praised for low friction, criticized for letting users skip security ([Medium non-custodial onboarding case study](https://medium.com/@abassdamilare15/a-case-study-on-the-onboarding-process-of-a-non-custodial-wallet-crypto-wallet-1fad9f75ed3a), [rainbow.me app guide](https://rainbow.me/en/support/app/get-started-with-the-rainbow-app)).

### Family (family.co, iOS + web)
- **No educational carousel either.** Premium feel comes from motion, not slides: intro splash animation, wallet-creation "onboarding sheets morph" (stacked sheets varying in height = progressive disclosure), card-stack animation during wallet generation, confetti on backup completion ([60fps.design/apps/family](https://60fps.design/apps/family)).
- 2024+ "Family Accounts": onboarding = 3 actions (sign up w/ phone or email → passkey → in). Education happens in-context via transaction modals/simulations, not tutorials ([family.co/blog/family-accounts](https://family.co/blog/family-accounts)).
- Users call it "absolutely mind blowing from an onboarding perspective" — the lesson is *choreography of the create flow itself*, not a preamble ([family.co](https://family.co/)).

### Zashi / Zodl (Zcash — closest privacy analog; primary source: their code)
- Current Android app has a **single "plain onboarding" screen** — logo + one line + fork. Exact strings from `ui-design-lib/.../values/strings.xml` (repo `zodl-inc/zodl-android`, formerly `Electric-Coin-Company/zashi-android`):
  - `plainOnboarding_title` = **"Zcash-powered mobile wallet built for financial sovereignty."**
  - Buttons: **"Create New Wallet"** / **"Restore Existing Wallet"**.
- The resource name `plainOnboarding` marks it as the replacement for an earlier richer flow — the shipped choice was to strip onboarding down, not expand it.
- Create path drops you **straight into the wallet, no seed backup upfront** (backup later via Advanced Settings) ([Bankless Zashi walkthrough](https://www.bankless.com/read/zcash-zashi-privacy-wallet)).
- **Shielding is taught contextually, not in slides**: a home-screen smart banner — `smartBanner_content_shield_title` = "Unshielded Balance", button "Shield", help label "Transparent" — prompts shielding when transparent funds arrive. Honest vocabulary throughout: "shielded"/"transparent"/"private payments"; the about copy says "built for unstoppable private payments… shielded $ZEC", never "anonymous/untraceable".
- Their OnboardingView.kt imports `HapticFeedbackType` — haptic tick on onboarding interaction is part of the premium feel.

### Coinbase Wallet
- Mobbin catalogs full iOS/Android onboarding flows (paywalled beyond thumbnails): create-first CTA, wallet creation + asset management focus ([Mobbin Coinbase Wallet Android flow](https://mobbin.com/explore/flows/ea843647-b1c1-42b6-a3a7-9ae01bbe4f89), [iOS flow](https://mobbin.com/flows/598884d8-e33c-435f-bc0a-b26e99ac90b3)). No evidence of an educational carousel before the fork.

## 2. How privacy products explain "what stays private" without overclaiming
- **Signal** (primary source, `feature/registration/.../strings.xml` in signalapp/Signal-Android): the ENTIRE first-run education is one screen — `RegistrationActivity_take_privacy_with_you_be_yourself_in_every_message` = **"Take privacy with you.\nBe yourself in every message."** plus "Signal is a 501c3 nonprofit\nTerms & Privacy Policy", then Continue → permissions rationale dialogs. Emotional benefit ("be yourself"), zero crypto mechanics, zero overclaim.
- **Zashi/Zodl**: no privacy lecture up front; the boundary is taught at the moment it matters (transparent funds arrive → "Unshielded Balance → Shield"). Where privacy limits DO matter (data export), the copy is exhaustive and honest ("All private information, memos, amounts, and recipient addresses, even for your shielded activity will be exported… irrevocable").
- **Brave**: welcome flow leads with a consent decision — P3A analytics **opt-in checkbox on the first welcome screen**, framed as "doesn't collect any personal information… nothing like your browsing history" ([Brave P3A help](https://support.brave.app/hc/en-us/articles/9140465918093-What-is-P3A-in-Brave), [GH #13926](https://github.com/brave/brave-browser/issues/13926)); then privacy *stats* shown on first new tab — proof, not promises ([brave.com first-run study](https://brave.com/blog/popular-browsers-first-run/)).
- Pattern: privacy products either (a) one emotional line (Signal), or (b) contextual just-in-time boundary education (Zashi). Nobody ships a 5-slide privacy lecture.

## 3. Patterns for a ~20s, 3–5 slide, Continue-paced flow
- **User-paced only, never auto-advance** — NN/g: auto-forwarding carousels "annoy users & reduce visibility" ([nngroup.com/articles/auto-forwarding](https://www.nngroup.com/articles/auto-forwarding/)). Continue button matches this.
- **If you carousel, NN/g's rules**: highly visible Skip, minimum number of cards, **one concept per card**; deck-of-cards tutorials strain memory and make the app look more complicated ([nngroup.com/articles/mobile-app-onboarding](https://www.nngroup.com/articles/mobile-app-onboarding/), [Skip it when possible](https://www.nngroup.com/videos/onboarding-skip-it-when-possible/)). So: 3–4 slides max, teach the *mental model* (which users genuinely lack for shielded balances — NN/g's objection is to teaching UI mechanics, not novel concepts).
- **Fork placement**: industry norm is fork on screen 1 (Phantom, Zashi, Rainbow, MetaMask after consent). Nobody gates create/import behind >1 screen. If slides come first, Skip must jump straight to the fork.
- **Progress**: dots or step count; Skip top corner from slide 1.
- **Sound**: no surveyed wallet plays sound during onboarding. Haptics on slide transitions yes (Zodl uses Compose `HapticFeedbackType`), mobile only.
- **Reduced motion**: none of the teardowns document it, but Family-style motion-heavy onboarding must degrade; honor `prefers-reduced-motion` by swapping animated sequences for static frames + crossfade (consistent with existing BrandIntro behavior).

## 4. Recommended ZK Freighter intro v2 (4 slides, ~20s, Continue-paced)
Skip button visible from slide 1 (jumps to slide 4's fork). Dots progress. Haptic tick per slide (mobile). No auto-advance. Chime stays where BrandIntro has it (once, optional).

1. **Brand + promise** (reuse coin animation as the hero). Title: "Privacy by default on Stellar." Sub: "Shielded transfers for XLM and USDC." — Signal-style single emotional line; no mechanics yet. [Continue]
2. **The mental model: two balances.** Live-UI-style diagram (public row / shielded row — Family evidence says show the real product, not abstract illustration). Title: "Two balances. One wallet." Sub: "Your public balance works like any Stellar account. Your shielded balance keeps amounts and recipients out of public view." [Continue]
3. **The honest boundary** (the Zashi lesson, moved up front because it's our differentiator). Title: "Shielding in and out is public." Sub: "When you shield or unshield, that boundary transaction is visible on-chain. What you do inside — shielded transfers — is not." Never "anonymous/untraceable"; matches repo copy rules. [Continue]
4. **Keys + fork.** Title: "Your keys stay on this device." Sub: "You can make your private code discoverable later — your choice." Buttons: **[Create new wallet] [I already have a wallet]** — fork ends the intro, Phantom/Zashi style; no separate "done" screen.

Contextual follow-through (Zashi pattern, not slides): first time public funds arrive, show a "Shield" smart-banner; first shield action gets the boundary reminder inline.

## 5. Per-surface delivery
- **Extension**: open a dedicated **full-tab onboarding page** on install (MetaMask `home.html` vs `popup.html` split; Phantom/Rainbow open a tab/window too). Do NOT run slides in the 360px popup; popup shows a "Finish setting up" CTA that reopens the tab if onboarding is incomplete.
- **Web**: same slide component full-viewport at first run, centered/balanced for wide canvas (per design memory: don't trace the narrow prototype column).
- **Mobile (Capacitor)**: same slides, swipe + Continue both advance (NN/g: swipe alone has low discoverability), haptic on transition, `prefers-reduced-motion` → static frames.
- **Once-per-surface gating**: keep the existing localStorage key approach; intro v2 replaces (not stacks on) the 3.3s BrandIntro on first run — returning users get the short BrandIntro only.
