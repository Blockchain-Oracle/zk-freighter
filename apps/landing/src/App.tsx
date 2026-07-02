import { ThemeProvider } from '@zk-fighter/ui'
import { Hero } from './components/Hero'
import { Nav } from './components/Nav'
import { BuiltOnStrip, FooterCta, Platforms, PrivacyModel } from './components/Sections'
import { SiteFooter } from './components/SiteFooter'

export function App() {
  return (
    <ThemeProvider initialTheme="dark" className="landing-shell">
      <main id="top">
        <Nav />
        <Hero />
        <BuiltOnStrip />
        <Platforms />
        <PrivacyModel />
        <FooterCta />
      </main>
      <SiteFooter />
    </ThemeProvider>
  )
}
