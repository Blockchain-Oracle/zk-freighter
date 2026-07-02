import { GitBranch } from 'lucide-react'
import { Logo } from '@zk-fighter/ui'
import { docsUrl, sourceUrl } from '../links'

export function SiteFooter() {
  return (
    <footer className="site-footer">
      <div className="site-footer-brand">
        <Logo size={26} glow />
        <div>
          <strong>ZK Fighter</strong>
          <span>Shielded payments on Stellar</span>
        </div>
      </div>
      <nav aria-label="Footer">
        <a href={docsUrl}>Docs</a>
        <a href={sourceUrl}><GitBranch size={15} /> GitHub</a>
        <a href="#privacy">Privacy model</a>
      </nav>
    </footer>
  )
}
