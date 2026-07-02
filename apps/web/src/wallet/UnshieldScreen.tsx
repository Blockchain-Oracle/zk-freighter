import type { NetworkKey, WalletIdentity } from '@zk-freighter/core'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { ShieldScreen } from './ShieldScreen'
import type { WalletScreen } from './screens'

// Unshield lives inside the unified "Move funds" screen as a tab, so the user can
// always switch back to Shield. This wrapper just opens that screen on the unshield tab.
export function UnshieldScreen(props: {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}) {
  return <ShieldScreen {...props} initialTab="unshield" />
}
