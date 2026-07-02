export const appUrl = import.meta.env.VITE_ZKF_APP_URL ?? 'https://app.zkfreighter.dev'
export const docsUrl = import.meta.env.VITE_ZKF_DOCS_URL ?? 'https://docs.zkfreighter.dev'
export const sourceUrl = 'https://github.com/Blockchain-Oracle/zk-freighter'
export const releasesUrl = import.meta.env.VITE_ZKF_RELEASES_URL ?? `${sourceUrl}/releases`
/** Direct Android APK download (v0.1.0-alpha release asset). */
export const androidUrl =
  import.meta.env.VITE_ZKF_ANDROID_URL ??
  `${sourceUrl}/releases/download/v0.1.0-alpha/zk-freighter-android-alpha.apk`
/** Direct extension zip download (v0.1.0-alpha release asset). */
export const extensionUrl =
  import.meta.env.VITE_ZKF_EXTENSION_URL ??
  `${sourceUrl}/releases/download/v0.1.0-alpha/zk-freighter-extension-chrome-alpha.zip`
