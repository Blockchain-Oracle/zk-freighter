import { useState, type CSSProperties, type ReactNode } from 'react'

// The two boundary balance surfaces. Shielded = frosted periwinkle (private pool);
// Public = amber dashed (the public Stellar account). Both recur on every surface,
// so they live here as one component each (size via the `style` wrapper).

const SHIELDED_BG = 'linear-gradient(150deg, rgba(94,124,250,.30), rgba(94,124,250,.05) 70%)'
const SHIELDED_HATCH = 'repeating-linear-gradient(118deg, transparent 0 11px, rgba(255,255,255,.05) 11px 12px)'

/**
 * Frosted "shielded balance" card with a light sheen sweep. If `back` is given,
 * the card becomes clickable and cross-dissolves to that face (e.g. the notes view).
 */
export function ShieldedCard({
  children,
  back,
  style,
}: {
  children: ReactNode
  back?: ReactNode
  style?: CSSProperties
}) {
  const [flipped, setFlipped] = useState(false)
  const flippable = Boolean(back)
  return (
    <div
      onClick={flippable ? () => setFlipped((value) => !value) : undefined}
      style={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 18,
        border: '1px solid var(--bd2)',
        backgroundImage: `${SHIELDED_HATCH}, ${SHIELDED_BG}`,
        backdropFilter: 'blur(8px)',
        cursor: flippable ? 'pointer' : 'default',
        ...style,
      }}
    >
      <span
        aria-hidden="true"
        className="animate-zkSheen"
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '45%',
          height: '100%',
          background: 'linear-gradient(100deg, transparent, rgba(255,255,255,.13), transparent)',
          pointerEvents: 'none',
        }}
      />
      <div
        style={{
          position: 'relative',
          height: '100%',
          transition: 'opacity .35s ease',
          opacity: flipped ? 0 : 1,
          visibility: flipped ? 'hidden' : 'visible',
        }}
      >
        {children}
      </div>
      {flippable ? (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            transition: 'opacity .35s ease',
            opacity: flipped ? 1 : 0,
            visibility: flipped ? 'visible' : 'hidden',
          }}
        >
          {back}
        </div>
      ) : null}
    </div>
  )
}

/** Amber dashed "public boundary" card — the public Stellar account / public funds. */
export function PublicCard({ children, style }: { children: ReactNode; style?: CSSProperties }) {
  return (
    <div
      style={{
        position: 'relative',
        borderRadius: 18,
        border: '1px dashed rgba(229,180,92,.42)',
        backgroundImage: 'linear-gradient(150deg, rgba(229,180,92,.10), rgba(229,180,92,.02) 70%)',
        ...style,
      }}
    >
      {children}
    </div>
  )
}
