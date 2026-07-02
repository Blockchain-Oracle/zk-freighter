import { ThemeProvider } from '@zk-freighter/ui'
import { GetSection } from './components/GetSection'
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
        <GetSection />
        <FooterCta />
      </main>
      <SiteFooter />
    </ThemeProvider>
  )
}
