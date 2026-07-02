import { siAndroid, siApple, siBrave, siFirefox, siGooglechrome } from 'simple-icons'

const icons = {
  apple: siApple,
  android: siAndroid,
  chrome: siGooglechrome,
  firefox: siFirefox,
  brave: siBrave,
} as const

export type BrandName = keyof typeof icons

/** Real brand glyphs (simple-icons paths), rendered in the current text color. */
export function BrandIcon({ name, size = 15 }: { readonly name: BrandName; readonly size?: number }) {
  const icon = icons[name]
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor" role="img" aria-label={icon.title} aria-hidden={false}>
      <path d={icon.path} />
    </svg>
  )
}

/** Freighter-style browser trio shown on the extension pill. */
export function BrowserIcons({ size = 15 }: { readonly size?: number }) {
  return (
    <span style={{ display: 'inline-flex', gap: 5, alignItems: 'center' }} aria-label="Chrome, Firefox and Brave">
      <BrandIcon name="chrome" size={size} />
      <BrandIcon name="firefox" size={size} />
      <BrandIcon name="brave" size={size} />
    </span>
  )
}
