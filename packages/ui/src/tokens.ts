// Design tokens extracted from the ZK Fighter designer prototype (dark-first + light),
// exposed as CSS custom properties so every surface (web/extension/mobile) shares one
// visual language. The prototype uses inline styles + `var(--xx)`; we mirror that.

export type ThemeName = 'dark' | 'light'

export interface ThemePalette {
  bg: string
  page: string
  card: string
  card2: string
  bd: string
  bd2: string
  tx: string
  tx2: string
  tx3: string
  side: string
  ac: string
  ac2: string
  pos: string
  warn: string
  pub: string
  mask: string
}

// Accent is constant across themes in the prototype.
export const ACCENT = '#5E7CFA'

export const darkPalette: ThemePalette = {
  bg: '#0E0F11',
  page: '#08090A',
  card: '#15161A',
  card2: '#1B1D21',
  bd: 'rgba(255,255,255,.07)',
  bd2: 'rgba(255,255,255,.14)',
  tx: '#F3F4F6',
  tx2: '#969BA3',
  tx3: '#5B616B',
  side: '#101113',
  ac: ACCENT,
  ac2: '#8AA0FF',
  pos: '#35C77B',
  warn: '#E5B45C',
  pub: '#8A93A2',
  mask: 'rgba(14,15,17,.72)',
}

export const lightPalette: ThemePalette = {
  bg: '#FFFFFF',
  page: '#E7EAEE',
  card: '#F5F7F9',
  card2: '#EBEEF2',
  bd: 'rgba(0,0,0,.08)',
  bd2: 'rgba(0,0,0,.15)',
  tx: '#16181C',
  tx2: '#586069',
  tx3: '#9198A1',
  side: '#F0F2F5',
  ac: ACCENT,
  ac2: '#4257CE',
  pos: '#1B9E60',
  warn: '#A9791F',
  pub: '#69717B',
  mask: 'rgba(244,246,248,.82)',
}

export const palettes: Record<ThemeName, ThemePalette> = {
  dark: darkPalette,
  light: lightPalette,
}

export const fontSans = "'Hanken Grotesk', system-ui, -apple-system, sans-serif"
export const fontMono = "'IBM Plex Mono', ui-monospace, monospace"

// The host app should add this <link> (or self-host) to load the prototype's fonts.
export const fontHref =
  'https://fonts.googleapis.com/css2?family=Hanken+Grotesk:wght@400;500;600;700;800&family=IBM+Plex+Mono:wght@400;500;600&display=swap'

export type CssVarMap = Record<string, string>

/** Maps a palette to the `--xx` CSS custom properties used across all surfaces. */
export function paletteToCssVars(p: ThemePalette): CssVarMap {
  return {
    '--bg': p.bg,
    '--page': p.page,
    '--card': p.card,
    '--card2': p.card2,
    '--bd': p.bd,
    '--bd2': p.bd2,
    '--tx': p.tx,
    '--tx2': p.tx2,
    '--tx3': p.tx3,
    '--side': p.side,
    '--ac': p.ac,
    '--ac2': p.ac2,
    '--pos': p.pos,
    '--warn': p.warn,
    '--pub': p.pub,
    '--mask': p.mask,
    '--fm': fontMono,
  }
}
