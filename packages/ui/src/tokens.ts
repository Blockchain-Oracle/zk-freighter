// Design tokens extracted from the ZK Fighter designer prototype (dark-first + light),
// exposed as CSS custom properties so every surface (web/extension/mobile) shares one
// visual language. The prototype uses inline styles + `var(--xx)`; we mirror that.

export type ThemeName = 'dark' | 'light'

export interface ThemePalette {
  bg: string
  page: string
  panel: string
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
  dng: string
  pub: string
  mask: string
  // Boundary-surface treatments differ per theme (Design System §04): frosted
  // shielded = periwinkle wash + hatch; public = amber wash + dashed border.
  shGrad: string
  shHatch: string
  pubGrad: string
  pubBd: string
}

// Accent is constant across themes in the prototype.
export const ACCENT = '#5E7CFA'

// Canonical values from the v2 `Design System.dc.html`. `--bg` is the canvas
// backdrop (behind the floating app panel), `--panel` is the app surface,
// `--card`/`--card2` are nested insets, `--tx3` is the legibility floor.
export const darkPalette: ThemePalette = {
  bg: '#0C0D0F',
  page: '#0A0B0D',
  panel: '#141519',
  card: '#1A1C22',
  card2: '#202329',
  bd: 'rgba(255,255,255,.08)',
  bd2: 'rgba(255,255,255,.14)',
  tx: '#F3F4F6',
  tx2: '#A6ABB4',
  tx3: '#878D98',
  side: '#101216',
  ac: ACCENT,
  ac2: '#9AA6FF',
  pos: '#35C77B',
  warn: '#E5B45C',
  dng: '#E5675C',
  pub: '#8A93A2',
  mask: 'rgba(12,13,15,.72)',
  shGrad: 'linear-gradient(150deg, rgba(94,124,250,.28), rgba(94,124,250,.04) 70%)',
  shHatch: 'rgba(255,255,255,.05)',
  pubGrad: 'linear-gradient(150deg, rgba(229,180,92,.10), rgba(229,180,92,.02) 70%)',
  pubBd: 'rgba(229,180,92,.42)',
}

// Light = the designer's warm CREAM/paper theme (Wireframes #fdfbf6/#f6f2ea +
// warm-dark #2a2722 text), not the cool grey of the hi-fi token sheet. Accent +
// boundary semantics stay; only the neutrals warm up.
export const lightPalette: ThemePalette = {
  bg: '#F6F2EA',
  page: '#EFE9DC',
  panel: '#FDFBF6',
  card: '#F1ECE1',
  card2: '#E9E3D6',
  bd: 'rgba(60,50,30,.1)',
  bd2: 'rgba(60,50,30,.16)',
  tx: '#2A2722',
  tx2: '#6B6760',
  tx3: '#8A857C',
  side: '#F1ECE0',
  ac: ACCENT,
  ac2: '#4A56C4',
  pos: '#2AA265',
  warn: '#A2741F',
  dng: '#D6544A',
  pub: '#8A857C',
  mask: 'rgba(246,242,234,.82)',
  shGrad: 'linear-gradient(150deg, rgba(94,124,250,.18), rgba(94,124,250,.04) 70%)',
  shHatch: 'rgba(94,124,250,.07)',
  pubGrad: 'linear-gradient(150deg, rgba(229,180,92,.16), rgba(229,180,92,.05) 70%)',
  pubBd: 'rgba(190,140,40,.5)',
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
    '--panel': p.panel,
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
    '--dng': p.dng,
    '--pub': p.pub,
    '--mask': p.mask,
    '--sh-grad': p.shGrad,
    '--sh-hatch': p.shHatch,
    '--pub-grad': p.pubGrad,
    '--pub-bd': p.pubBd,
    '--fm': fontMono,
  }
}
