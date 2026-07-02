import { useEffect, useRef, useState } from 'react'

/**
 * Renders a designer screen (self-contained static HTML in /public) as a live,
 * scaled iframe — crisp at any zoom/DPR, unlike a screenshot. The mock pages
 * declare color-scheme dark + transparent backgrounds so they composite over
 * the hero band. Decorative: hidden from AT, never focusable or interactive.
 */
export function MockScreen({
  src,
  width,
  height,
  radius = 18,
  maxHeight,
}: {
  readonly src: string
  readonly width: number
  readonly height: number
  readonly radius?: number
  /** Crops the bottom: the wrapper never grows past this, in CSS px. */
  readonly maxHeight?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const [scale, setScale] = useState(0)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const observer = new ResizeObserver(() => {
      setScale(node.clientWidth / width)
    })
    observer.observe(node)
    return () => observer.disconnect()
  }, [width])

  const naturalHeight = Math.round(height * scale)
  return (
    <div
      ref={ref}
      className="mock-screen"
      style={{
        height: scale > 0 ? (maxHeight ? Math.min(naturalHeight, maxHeight) : naturalHeight) : undefined,
        borderRadius: radius,
      }}
      aria-hidden
    >
      {scale > 0 ? (
        <iframe
          src={src}
          title=""
          tabIndex={-1}
          loading="lazy"
          scrolling="no"
          style={{
            width,
            height,
            border: 0,
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            colorScheme: 'dark',
            background: 'transparent',
          }}
        />
      ) : null}
    </div>
  )
}
