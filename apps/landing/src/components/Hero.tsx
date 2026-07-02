import { androidUrl, extensionUrl } from '../links'
import { BrandIcon, BrowserIcons } from './BrandIcon'
import { DeviceShowcase } from './DeviceShowcase'

export function Hero() {
  return (
    <section className="hero" aria-label="ZK Freighter — shielded payments on Stellar">
      <div className="hero-band">
        <div className="hero-copy">
          <h1>
            Hold it. Send it.
            <br />
            <em>Nobody sees it.</em>
          </h1>
          <div className="hero-actions">
            <a className="hero-pill" href={androidUrl}>
              <BrandIcon name="android" /> Get Android
            </a>
            <a className="hero-pill" href={extensionUrl}>
              <BrowserIcons /> Get extension
            </a>
          </div>
        </div>
        <DeviceShowcase />
      </div>
    </section>
  )
}
