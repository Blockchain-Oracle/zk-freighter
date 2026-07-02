import { useEffect, useRef, useState } from 'react'
import { hapticTap } from './mobile-haptics'

/**
 * Drag-to-dismiss for bottom sheets: the sheet follows the finger down,
 * springs back under the threshold, dismisses past it. Attach the returned
 * handlers to the sheet element.
 */
export function useSheetDrag(onDismiss: () => void) {
  const [offset, setOffset] = useState(0)
  const [settling, setSettling] = useState(false)
  const start = useRef<{ y: number; scrollable: boolean } | null>(null)

  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    const sheet = event.currentTarget
    // only start a drag when the sheet body is scrolled to the top
    start.current = { y: event.touches[0].clientY, scrollable: sheet.scrollTop > 2 }
    setSettling(false)
  }

  const onTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (!start.current || start.current.scrollable) return
    const delta = event.touches[0].clientY - start.current.y
    setOffset(delta > 0 ? delta : 0)
  }

  const onTouchEnd = () => {
    if (!start.current) return
    start.current = null
    if (offset > 130) {
      hapticTap()
      onDismiss()
      setOffset(0)
      return
    }
    setSettling(true)
    setOffset(0)
  }

  return {
    offset,
    sheetStyle: {
      transform: offset > 0 || settling ? `translateY(${offset}px)` : undefined,
      transition: settling ? 'transform 0.34s cubic-bezier(0.22, 1.2, 0.36, 1)' : offset > 0 ? 'none' : undefined,
    } as React.CSSProperties,
    handlers: { onTouchStart, onTouchMove, onTouchEnd },
  }
}

const pullThreshold = 74

/**
 * Pull-to-refresh on a scrollable pane: pull past the threshold at the top,
 * release to trigger `onRefresh`. Returns the indicator state and handlers
 * for the scroll container.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const start = useRef<number | null>(null)

  const onTouchStart = (event: React.TouchEvent<HTMLElement>) => {
    if (event.currentTarget.scrollTop <= 1 && !refreshing) start.current = event.touches[0].clientY
    else start.current = null
  }

  const onTouchMove = (event: React.TouchEvent<HTMLElement>) => {
    if (start.current === null) return
    const delta = event.touches[0].clientY - start.current
    // resistance curve so the pull feels physical
    setPull(delta > 0 ? Math.min(120, delta * 0.45) : 0)
  }

  const onTouchEnd = () => {
    if (start.current === null) return
    start.current = null
    if (pull >= pullThreshold * 0.45) {
      hapticTap()
      setRefreshing(true)
      setPull(0)
      void Promise.resolve(onRefresh()).finally(() => setRefreshing(false))
      return
    }
    setPull(0)
  }

  return { pull, refreshing, handlers: { onTouchStart, onTouchMove, onTouchEnd } }
}

/** True once per route change; used to replay the slide-in transition. */
export function useRouteTransition(routeKey: string): string {
  const [animKey, setAnimKey] = useState(routeKey)
  useEffect(() => {
    setAnimKey(routeKey)
  }, [routeKey])
  return animKey
}
