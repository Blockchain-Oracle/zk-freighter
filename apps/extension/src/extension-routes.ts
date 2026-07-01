export type ExtensionScreen =
  | 'home'
  | 'receive'
  | 'publicView'
  | 'settings'
  | 'confidential'
  | 'activity'
  | 'disclosure'
  | 'discover'
  | 'bridge'
  | 'proving'
  | 'signingDisabled'

export type ExtensionNavigate = (screen: ExtensionScreen) => void
