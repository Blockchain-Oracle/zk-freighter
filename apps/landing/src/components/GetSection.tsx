import { QRCodeSVG } from 'qrcode.react'
import { androidUrl, extensionUrl, extensionZipUrl, installUrl, iosUrl } from '../links'
import { BrandIcon, BrowserIcons } from './BrandIcon'
import { MockScreen } from './MockScreen'
import { useReveal } from './useReveal'

export function GetSection() {
  const ref = useReveal<HTMLElement>()
  return (
    <section id="download" className="get reveal" ref={ref}>
      <span className="section-label">Get ZK Freighter</span>
      <h2>Install once. Same wallet everywhere.</h2>
      <div className="get-grid">
        <article className="get-card">
          <div className="get-card-copy">
            <h3>For mobile</h3>
            <p>Thumb-first shielded wallet — swipeable cards, proving in-sheet.</p>
            <div className="get-actions">
              <a className="get-pill" href={androidUrl}>
                <BrandIcon name="android" /> Get Android
              </a>
              <a className="get-pill" href={iosUrl} title="Open the web wallet in Safari and Add to Home Screen">
                <BrandIcon name="apple" /> iOS · web app
              </a>
            </div>
            <small>
              Scan to grab the Android build (APK) — allow “install unknown apps” when your
              browser asks. On iPhone, open in Safari and Add to Home Screen.{' '}
              <a href={installUrl}>Install help ›</a>
            </small>
          </div>
          <div className="get-qr" aria-label="QR code linking to the Android download">
            <QRCodeSVG value={androidUrl} size={92} level="M" marginSize={0} />
          </div>
          <div className="get-shot get-shot-phone">
            <MockScreen src="/mock-mobile.html" width={288} height={604} radius={22} />
          </div>
        </article>

        <article className="get-card">
          <div className="get-card-copy">
            <h3>Browser extension</h3>
            <p>Glance, QuickShield, receive — heavy proving promotes to the side panel.</p>
            <div className="get-actions">
              <a className="get-pill" href={extensionUrl}>
                <BrowserIcons /> Get extension
              </a>
            </div>
            <small>
              One click from the Chrome Web Store — works in Chrome and Brave, auto-updates.
              Edge listing is in review. Prefer manual?{' '}
              <a href={extensionZipUrl}>Download the zip</a> and Load unpacked.
            </small>
          </div>
          <div className="get-qr" aria-label="QR code linking to the Chrome Web Store listing">
            <QRCodeSVG value={extensionUrl} size={92} level="M" marginSize={0} />
          </div>
          <div className="get-shot get-shot-popup">
            <MockScreen src="/mock-extension.html" width={360} height={735} radius={16} />
          </div>
        </article>
      </div>
    </section>
  )
}
