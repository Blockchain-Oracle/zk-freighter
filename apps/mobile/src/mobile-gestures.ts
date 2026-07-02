import { useRef, useState } from 'react'
import { hapticResult, hapticTap } from './mobile-haptics'

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

  const settleBack = () => {
    start.current = null
    setSettling(true)
    setOffset(0)
  }

  const onTouchEnd = () => {
    if (!start.current) return
    if (offset > 130) {
      hapticTap()
      onDismiss()
      start.current = null
      setOffset(0)
      return
    }
    settleBack()
  }

  return {
    offset,
    sheetStyle: {
      transform: offset > 0 || settling ? `translateY(${offset}px)` : undefined,
      transition: settling ? 'transform 0.34s cubic-bezier(0.22, 1.2, 0.36, 1)' : offset > 0 ? 'none' : undefined,
    } as React.CSSProperties,
    handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: settleBack },
  }
}

const pullThreshold = 74

/**
 * Pull-to-refresh on a scrollable pane: pull past the threshold at the top,
 * release to trigger `onRefresh`. Failures are surfaced with a haptic and a
 * transient error flag — never a hanging spinner or a silent drop.
 */
export function usePullToRefresh(onRefresh: () => Promise<unknown> | void) {
  const [pull, setPull] = useState(0)
  const [refreshing, setRefreshing] = useState(false)
  const [failed, setFailed] = useState(false)
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

  const reset = () => {
    start.current = null
    setPull(0)
  }

  const onTouchEnd = () => {
    if (start.current === null) return
    if (pull >= pullThreshold * 0.45) {
      hapticTap()
      setRefreshing(true)
      setFailed(false)
      reset()
      void Promise.resolve()
        .then(onRefresh)
        .then(
          () => hapticResult(true),
          (error: unknown) => {
            console.warn('[pull-to-refresh] refresh failed', error)
            setFailed(true)
            hapticResult(false)
            window.setTimeout(() => setFailed(false), 2600)
          },
        )
        .finally(() => setRefreshing(false))
      return
    }
    reset()
  }

  return { pull, refreshing, failed, handlers: { onTouchStart, onTouchMove, onTouchEnd, onTouchCancel: reset } }
}
