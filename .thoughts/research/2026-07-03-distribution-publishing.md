
# Distribution & Publishing — ZK Freighter (2026-07-03)

Surfaces: WXT MV3 extension (Chrome-first), Capacitor Android (`com.zkfreighter.wallet`), Capacitor iOS (no Apple account). Current: GitHub release `v0.1.0-alpha` (APK + extension zip), landing at zkfreighter.app with QR codes.

## 1. Chrome Web Store

- **Cost:** $5 one-time registration, covers up to 20 extensions. [Register docs](https://developer.chrome.com/docs/webstore/register)
- **Review time:** Google states ~90% of submissions reviewed within 3 days; first submissions with sensitive permissions can take 1–3 weeks (manual review). Budget 1–2 weeks for a wallet. [Review process](https://developer.chrome.com/docs/webstore/review-process), [ExtensionBooster 2026 guide](https://extensionbooster.net/blog/chrome-web-store-extension-review-time-2026-how-long-guide/)
- **MV3:** required for all new submissions; our WXT build is already MV3. `pnpm zip` / `wxt zip` emits store-ready `.output/*-chrome.zip` — no repackaging needed; `wxt submit` can upload via API. [WXT publishing](https://wxt.dev/guide/essentials/publishing)
- **Privacy/data disclosure:** privacy-policy URL is mandatory; the Privacy Practices tab requires per-category data-collection disclosures + Limited Use certification + a **remote code declaration**. MV3 bans remotely hosted code and "full functionality must be discernible from submitted code." [Privacy fields](https://developer.chrome.com/docs/webstore/cws-dashboard-privacy), [User data FAQ](https://developer.chrome.com/docs/webstore/program-policies/user-data-faq)
- **ZK/wallet-specific gotchas:** (a) **bundle all proving artifacts (WASM, circuits, keys) in the zip** — fetching executable code/WASM at runtime violates the remote-code policy and is the most likely wallet rejection vector; (b) justify every host permission in the reviewer notes (unjustified broad `host_permissions` is a top rejection reason); (c) single-purpose rule — keep the listing "privacy wallet for Stellar," nothing unrelated; (d) non-custodial seed handling is allowed — disclose that keys never leave the device; crypto **mining** is banned, wallets are not. [Common rejections](https://www.extensionradar.com/blog/chrome-extension-rejected), [Program policies](https://developer.chrome.com/docs/webstore/program-policies/policies)
- **Unlisted visibility: yes.** Same review, no search listing, installable by anyone with the store URL — ideal hackathon posture. [Distribution options](https://developer.chrome.com/docs/webstore/cws-dashboard-distribution)

## 2. Edge Add-ons

- **Cost:** free (Microsoft Partner Center, needs a Microsoft account). [Publish docs](https://learn.microsoft.com/en-us/microsoft-edge/extensions-chromium/publish/publish-extension)
- **Same zip:** yes — Chromium extension APIs/packaging identical; the chrome-mv3 zip submits as-is (WXT also has `-b edge`).
- **Review:** up to 7 business days standard; expedited queue exists for established extensions (won't apply to us initially). [Edge blog 2025](https://blogs.windows.com/msedgedev/2025/02/26/empowering-microsoft-edge-add-ons-developers-with-faster-reviews/)
- **Effort delta from Chrome:** ~1 hour (account + listing forms). Also supports hidden/unlisted listings. Do it — it's free redundancy if Chrome review stalls.

## 3. Android — the critical track

### (a) Google Play
- $25 one-time; personal-account ID verification (government ID, hours–2 days). [Fees](https://support.google.com/googleplay/android-developer/answer/13628312)
- **Closed-testing gate (verified current):** personal accounts created after 2023-11-13 must run a closed test with **12 opted-in testers continuously for 14 consecutive days** before applying for production access (was 20, lowered Dec 2024); approval also judges tester engagement. Realistic time-to-public-listing: **3–5 weeks minimum**. [Google policy](https://support.google.com/googleplay/android-developer/answer/14151465), [Testers Community](https://www.testerscommunity.com/blog/google-play-12-testers-policy)
- **Crypto policy (effective 2025-10-29):** Financial Features Declaration required; licensing (FinCEN MSB / MiCA CASP / FCA) applies to **custodial** wallets & exchanges in ~15 jurisdictions. **Non-custodial wallets are explicitly out of scope** — ZK Freighter qualifies, but must file the declaration accurately. [Play policy](https://support.google.com/googleplay/android-developer/answer/16329703), [Forbes](https://www.forbes.com/sites/boazsobrado/2025/08/13/google-play-store-requires-government-licenses-for-crypto-wallet-apps/)

### (b) Direct APK sideload (current approach) — friction reality
- One-time per-browser "Install unknown apps" grant, then a **Play Protect scan dialog on every unknown-app install** ("unknown app — scan?" → tap through). Full **blocks** are reserved for apps declaring abuse-prone permissions (SMS, accessibility, notification listener) — the wallet declares none, so expect warning-level friction only, not blocks. [Play Protect dev guidance](https://developers.google.com/android/play-protect/warning-dev-guidance), [HowToGeek](https://www.howtogeek.com/two-ways-to-install-apps-when-google-play-protect-wont-allow-it/)
- **Signing:** a default Capacitor/Android Studio debug build is signed with the machine-local `~/.android/debug.keystore` (`androiddebugkey`/`android`) — **unfit for distribution** (key varies per machine → every future update fails with "signatures do not match" → users must uninstall, losing local state — fatal for a wallet). **Create one release keystore now** (`keytool -genkey … -validity 10000`), sign every release with it forever, back it up, and increment `versionCode` on every release. [Ionic release guide](https://ionic.io/blog/building-and-releasing-your-capacitor-android-app), [Signature-mismatch behavior](https://bayton.org/android/resolve-app-install-errors/)
- Also: set current `targetSdk` (older-SDK APKs trigger extra Play Protect warnings).

### (c) Lower-friction alternatives
- **Obtainium** (power users): point it at the GitHub repo; it notifies + installs every new release automatically. Best sideload auto-update story; zero infra. [Obtainium](https://github.com/ImranR98/Obtainium)
- **Self-hosted F-Droid repo:** real infra + repo signing; only benefits F-Droid users — skip for now.
- **Firebase App Distribution:** free, but testers must install the App Tester app and be invited — more friction than a direct link; useful later as the Play closed-testing feeder. [Firebase](https://firebase.google.com/docs/app-distribution)
- **Capgo / capacitor-updater:** OTA-updates the web bundle inside the installed shell — users install the APK once and JS-level updates arrive silently. Strong fit for Capacitor; evaluate separately. [Capgo](https://capgo.app/blog/transform-pwa-to-native-app-with-capacitor/)

### Recommendation (one-time install, no repeated hassle)
1. **Now:** release-keystore-signed APK on GitHub Releases, stable URL `github.com/Blockchain-Oracle/zk-freighter/releases/latest/download/zk-freighter.apk`, QR to it, short install note ("Android will ask once to allow installs from your browser; Play Protect will offer a scan — normal for apps outside Play"). Add an "auto-updates via Obtainium" line for power users. Consider Capgo OTA so one sideload = perpetual freshness.
2. **In parallel:** pay $25, start the 12-tester/14-day closed test immediately (the clock is the bottleneck); file the non-custodial Financial Features Declaration. Swap the landing link to Play when production is granted.

## 4. iOS

- **Without a $99/yr account: no installable native path.** Free-Apple-ID sideloading = 7-day expiry, 3 apps, per-device via Xcode/AltStore-classic — not distribution.
- **With account ($99/yr):** **TestFlight is the path** — first build gets a beta review (lighter than App Store review, typically ~1–2 days), then a public link, 10k testers, builds valid 90 days; many crypto wallets (Tonkeeper, SubWallet, Unstoppable) distribute betas this way. [TestFlight overview](https://developer.apple.com/help/app-store-connect/test-a-beta-version/testflight-overview/). Ad Hoc (100 devices, manual UDID collection) is strictly worse. Unlisted App Store links exist but need full App Review.
- **AltStore PAL:** EU-only (expanding to Japan/Brazil/Australia); still requires an Apple dev account + notarization — no cost/effort saving, niche reach. [AltStore PAL FAQ](https://faq.altstore.io/altstore-pal/what-is-altstore-pal)
- **PWA fallback: realistic and honest today.** The web wallet at zkfreighter.app works in mobile Safari; add-to-home-screen is manual (Share → Add to Home Screen) and iOS PWAs have storage/background limits, but it is the only zero-account option. [iOS PWA limits](https://www.magicbell.com/blog/pwa-ios-limitations-safari-support-complete-guide)
- **Landing copy (honest):** "iPhone: use the web wallet at zkfreighter.app (Add to Home Screen for an app-like experience). Native iOS app via TestFlight is coming."

## 5. Landing-page "Get it" targets

| Surface | TODAY | AFTER approvals |
|---|---|---|
| Chrome/Edge | Release zip + load-unpacked instructions (keep until store URL exists) | `chromewebstore.google.com/detail/<id>` (works even if unlisted); Edge Add-ons URL as secondary |
| Android | `releases/latest/download/zk-freighter.apk` + QR + one-line Play Protect note + Obtainium mention | Play Store listing URL (keep APK as power-user alternative) |
| iOS | Web wallet link + Add-to-Home-Screen hint, "TestFlight coming" | TestFlight public link (`testflight.apple.com/join/<code>`), later App Store |

Use `/releases/latest/download/<fixed-asset-name>` so the landing page and QR codes never need re-printing per release.

## Recommended sequencing

| When | Action | Cost / needs Abu |
|---|---|---|
| This week | Create release keystore, re-sign APK, fix `versionCode` discipline, upload fixed-name asset, update landing QR to `latest` URL | free |
| This week | Register CWS, submit extension **unlisted** (bundle proving WASM, privacy policy URL, permission justifications, remote-code = No) | **$5 (Abu)** |
| This week | Register Edge Partner Center, submit same zip | free |
| This week | Pay Play fee, start closed test (12 testers × 14 days — start the clock now), file non-custodial declaration | **$25 (Abu)** |
| When Abu decides | Apple Developer account → TestFlight beta + public link | **$99/yr (Abu)** |
| +2–5 weeks | Swap landing links: CWS URL, Play production, TestFlight link | — |

Blockers genuinely needing Abu: the three account payments ($5 / $25 / $99) and recruiting ~12 closed-test humans.
