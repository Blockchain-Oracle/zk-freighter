export const appUrl = import.meta.env.VITE_ZKF_APP_URL ?? 'https://app.zkfreighter.dev'
export const docsUrl = import.meta.env.VITE_ZKF_DOCS_URL ?? 'https://docs.zkfreighter.dev'
export const sourceUrl = 'https://github.com/Blockchain-Oracle/zk-freighter'
export const releasesUrl = import.meta.env.VITE_ZKF_RELEASES_URL ?? `${sourceUrl}/releases/latest`
/** Android APK download; defaults to the latest GitHub release. */
export const androidUrl = import.meta.env.VITE_ZKF_ANDROID_URL ?? releasesUrl
/** Extension zip download; defaults to the latest GitHub release. */
export const extensionUrl = import.meta.env.VITE_ZKF_EXTENSION_URL ?? releasesUrl
