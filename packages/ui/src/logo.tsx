/** The ZK Freighter coin: a circle split into a dark half and a hatched periwinkle half. */
export function Logo({ size = 30, glow = false }: { size?: number; glow?: boolean }) {
  return (
    <span
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        display: 'flex',
        flex: 'none',
        border: '1px solid rgba(255,255,255,.12)',
        boxShadow: glow ? '0 8px 22px -8px rgba(94,124,250,.6)' : undefined,
      }}
    >
      <span style={{ flex: 1, background: '#1b1a24' }} />
      <span style={{ flex: 1, background: 'linear-gradient(135deg,#8a9bff,#5E7CFA)', position: 'relative', overflow: 'hidden' }}>
        <span style={{ position: 'absolute', inset: 0, background: 'repeating-linear-gradient(120deg, transparent 0 4px, rgba(255,255,255,.5) 4px 5px)' }} />
      </span>
    </span>
  )
}
