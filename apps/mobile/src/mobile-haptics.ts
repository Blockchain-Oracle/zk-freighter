import { Capacitor } from '@capacitor/core'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

const native = () => Capacitor.isNativePlatform()

/** Light tick for taps and card swipes. No-ops (and never throws) off-device. */
export function hapticTap(): void {
  if (!native()) return
  void Haptics.impact({ style: ImpactStyle.Light }).catch(() => undefined)
}

/** Medium thunk for committing an action (send, shield, unlock). */
export function hapticAction(): void {
  if (!native()) return
  void Haptics.impact({ style: ImpactStyle.Medium }).catch(() => undefined)
}

/** Success/failure notification pulses for flow results. */
export function hapticResult(ok: boolean): void {
  if (!native()) return
  void Haptics.notification({ type: ok ? NotificationType.Success : NotificationType.Error }).catch(() => undefined)
}
