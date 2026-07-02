import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'com.zkfreighter.wallet',
  appName: 'ZK Freighter',
  webDir: 'dist',
  plugins: {
    SplashScreen: {
      // Hold the native splash briefly, then the BrandIntro takes over in-app.
      launchShowDuration: 600,
      launchAutoHide: true,
      backgroundColor: '#0c0d0f',
      splashFullScreen: true,
      splashImmersive: true,
      showSpinner: false,
    },
  },
}

export default config
