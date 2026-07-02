import { Logo } from '@zk-fighter/ui'
import { appUrl, docsUrl, extensionUrl } from '../links'

export function Nav() {
  return (
    <header className="nav-pill">
      <a href="#top" className="brand" aria-label="ZK Fighter home">
        <Logo size={32} glow />
        <span>ZK Fighter</span>
      </a>
      <nav aria-label="Primary navigation">
        <a href="#everywhere">How it works</a>
        <a href="#privacy">Privacy model</a>
        <a href={docsUrl}>Docs</a>
      </nav>
      <a className="nav-open" href={appUrl}>Open web app</a>
      <a className="nav-download" href={extensionUrl}>Download</a>
    </header>
  )
}
