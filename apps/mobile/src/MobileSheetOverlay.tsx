import { MobileBridge, MobileSend, MobileShield } from './MobileFlows'
import { MoreSheet } from './MobileChrome'
import type { FlowProps, MobileRouteParams } from './MobileFlowPrimitives'
import { useSheetDrag } from './mobile-gestures'
import type { MobileRoute } from './mobile-storage'

export function MobileSheetOverlay({
  route,
  params,
  address,
  flowProps,
  onClose,
  onLock,
}: {
  readonly route: MobileRoute
  readonly params: MobileRouteParams
  readonly address: string
  readonly flowProps: FlowProps
  readonly onClose: () => void
  readonly onLock: () => void
}) {
  const drag = useSheetDrag(onClose)
  const content = route === 'more'
    ? <MoreSheet address={address} onRoute={flowProps.onRoute} onLock={onLock} onClose={onClose} />
    : route === 'send'
      ? <MobileSend {...flowProps} initialCode={params.sendCode} initialMode={params.sendMode} />
      : route === 'shield'
        ? <MobileShield {...flowProps} initialMode={params.shieldMode} />
        : <MobileBridge {...flowProps} />
  return (
    <div className="mobile-modal-layer" onClick={onClose}>
      <section
        className={`mobile-bottom-sheet ${route === 'more' ? 'sheet-tall' : ''}`}
        style={drag.sheetStyle}
        onClick={(event) => event.stopPropagation()}
        {...drag.handlers}
      >
        <div className="sheet-grabber" />
        {content}
      </section>
    </div>
  )
}
