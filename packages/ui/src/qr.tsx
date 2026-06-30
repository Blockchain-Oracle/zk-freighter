import type { ReactNode } from 'react'

/**
 * White QR container with an optional ZK Fighter center logo + caption. The caller
 * supplies the actual QR element (e.g. <QRCodeSVG/>) as children so this stays free
 * of a qrcode dependency. Use error-correction level Q+ when `logo` is on so the
 * occluded center still scans.
 */
export function QrCard({
  children,
  caption,
  badge,
  logo = true,
}: {
  children: ReactNode
  caption?: ReactNode
  badge?: ReactNode
  logo?: boolean
}) {
  return (
    <div
      style={{
        flex: 'none',
        width: 300,
        maxWidth: '100%',
        border: '1px solid var(--bd)',
        borderRadius: 18,
        background: 'var(--panel)',
        padding: 24,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 18,
      }}
    >
      {badge}
      <div style={{ position: 'relative', padding: 16, background: '#fff', borderRadius: 18, display: 'flex' }}>
        {children}
        {logo ? (
          <span style={{ position: 'absolute', left: '50%', top: '50%', transform: 'translate(-50%,-50%)', width: 38, height: 38, borderRadius: 10, overflow: 'hidden', display: 'flex', border: '3px solid #fff' }}>
            <span style={{ flex: 1, background: '#1b1a24' }} />
            <span style={{ flex: 1, background: 'linear-gradient(135deg,#8a9bff,#5E7CFA)' }} />
          </span>
        ) : null}
      </div>
      {caption ? <div style={{ fontSize: 11.5, color: 'var(--tx3)', textAlign: 'center', lineHeight: 1.5 }}>{caption}</div> : null}
    </div>
  )
}
