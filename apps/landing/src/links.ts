export const appUrl = import.meta.env.VITE_ZKF_APP_URL ?? 'https://app.zkfreighter.app'
export const docsUrl = import.meta.env.VITE_ZKF_DOCS_URL ?? 'https://docs.zkfreighter.app'
export const sourceUrl = 'https://github.com/Blockchain-Oracle/zk-freighter'
export const releasesUrl = import.meta.env.VITE_ZKF_RELEASES_URL ?? `${sourceUrl}/releases`
/** Stable Android APK download — always the newest release asset (Obtainium-trackable). */
export const androidUrl =
  import.meta.env.VITE_ZKF_ANDROID_URL ??
  `${sourceUrl}/releases/latest/download/zk-freighter.apk`
/** Chrome Web Store listing — works for Chrome and Brave (Edge listing in review). */
export const extensionUrl =
  import.meta.env.VITE_ZKF_EXTENSION_URL ??
  'https://chromewebstore.google.com/detail/zk-freighter/gokjpinnopbmpmadbieeojfaehbmnjmd'
/** Stable extension zip download — manual/unpacked fallback, always the newest release asset. */
export const extensionZipUrl = `${sourceUrl}/releases/latest/download/zk-freighter-extension-chrome.zip`
/** Responsive mobile web app (PWA) — the right phone experience for iOS + Android web. */
export const mobileUrl = import.meta.env.VITE_ZKF_MOBILE_URL ?? 'https://m.zkfreighter.app'
/** iPhone: open the mobile PWA in Safari and Add to Home Screen (native TestFlight is later). */
export const iosUrl = import.meta.env.VITE_ZKF_IOS_URL ?? mobileUrl
/** Install instructions per platform. */
export const installUrl = `${docsUrl}/docs/install`
