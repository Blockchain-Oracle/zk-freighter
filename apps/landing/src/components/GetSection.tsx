import { QRCodeSVG } from 'qrcode.react'
import { androidUrl, extensionUrl } from '../links'
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
              <span className="get-pill get-pill-soon" title="iOS distribution via TestFlight is being prepared">
                <BrandIcon name="apple" /> iOS · soon
              </span>
            </div>
            <small>
              Scan to grab the Android build (APK) — allow “install unknown apps” when your
              browser asks. Play Store listing is in the works.
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
            <h3>For browser</h3>
            <p>Glance, QuickShield, receive — heavy proving promotes to the side panel.</p>
            <div className="get-actions">
              <a className="get-pill" href={extensionUrl}>
                <BrowserIcons /> Get extension
              </a>
            </div>
            <ol className="get-steps">
              <li>Unzip the download</li>
              <li>Open <code>chrome://extensions</code> · Developer mode</li>
              <li>Load unpacked · pick the folder — ~30 seconds</li>
            </ol>
            <small>Chrome Web Store listing is in the works.</small>
          </div>
          <div className="get-shot get-shot-popup">
            <MockScreen src="/mock-extension.html" width={360} height={735} radius={16} />
          </div>
        </article>
      </div>
    </section>
  )
}
