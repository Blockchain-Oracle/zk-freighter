import { createContext, useContext, useMemo, useState } from 'react'
import type { CSSProperties, ReactNode } from 'react'
import { fontSans, palettes, paletteToCssVars } from './tokens'
import type { ThemeName } from './tokens'

interface ThemeContextValue {
  theme: ThemeName
  setTheme: (theme: ThemeName) => void
  toggleTheme: () => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within <ThemeProvider>')
  return ctx
}

export interface ThemeProviderProps {
  children: ReactNode
  /** Starting theme. Persistence is the host app's job (see StorageAdapter). */
  initialTheme?: ThemeName
  /** Fired on every theme change so the host can persist it. */
  onThemeChange?: (theme: ThemeName) => void
  /** Extra styles merged onto the themed root container. */
  style?: CSSProperties
  className?: string
}

/**
 * Applies the active palette as CSS custom properties on a root container and
 * exposes theme controls via context. Components read `var(--xx)` so they stay
 * surface- and theme-agnostic.
 */
export function ThemeProvider({
  children,
  initialTheme = 'dark',
  onThemeChange,
  style,
  className,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeName>(initialTheme)

  const value = useMemo<ThemeContextValue>(() => {
    const setTheme = (next: ThemeName) => {
      setThemeState(next)
      onThemeChange?.(next)
    }
    return {
      theme,
      setTheme,
      toggleTheme: () => setTheme(theme === 'dark' ? 'light' : 'dark'),
    }
  }, [theme, onThemeChange])

  const rootStyle: Record<string, string | number> = {
    ...paletteToCssVars(palettes[theme]),
    background: 'var(--page)',
    color: 'var(--tx)',
    fontFamily: fontSans,
    minHeight: '100%',
    ...(style as Record<string, string | number> | undefined),
  }

  return (
    <ThemeContext.Provider value={value}>
      <div className={className} style={rootStyle as CSSProperties}>
        {children}
      </div>
    </ThemeContext.Provider>
  )
}
