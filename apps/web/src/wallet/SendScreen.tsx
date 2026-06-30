import {
  decodeReceiveCode,
  submitXlmPrivateTransfer,
  type NetworkKey,
  type WalletIdentity,
} from '@zk-fighter/core'
import { BoundaryBadge, truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { PrivateFlowScreen, type PrivateFlowConfig } from './PrivateFlowScreen'
import type { WalletScreen } from './screens'

function validateReceiveCode(value: string, network: NetworkKey): string | null {
  const decoded = decodeReceiveCode(value.trim())
  if (!decoded.ok) {
    return 'Enter a valid private receive code (zkf1…).'
  }
  if (decoded.value.network !== network) {
    return `This code is for ${decoded.value.network}, not ${network}.`
  }
  return null
}

const SEND_CONFIG: PrivateFlowConfig = {
  title: 'Send privately',
  badge: <BoundaryBadge kind="shielded" label="SHIELDED → SHIELDED" />,
  recipient: {
    label: 'Recipient private receive code',
    placeholder: 'zkf1…',
    multiline: true,
    initial: () => '',
    validate: validateReceiveCode,
    reviewLabel: 'To (private code)',
    reviewValue: (value) => truncateMiddle(value, 10, 8),
  },
  submitVerb: 'Send',
  run: ({ asset, identity, network, amountStroops, recipient, onStatus }) =>
    submitXlmPrivateTransfer({ asset, identity, network, amountStroops, receiveCode: recipient, onStatus }),
  proofCopy: (amountLabel) => ({
    provingHint: 'Proving on your device, then submitting to Stellar — keep this tab open.',
    successTitle: 'Payment sent',
    successBody: (
      <>{amountLabel} was delivered privately to the recipient’s shielded balance. The amount and counterparty stay inside the pool.</>
    ),
    failedTitle: 'Send failed',
    unconfirmedTitle: 'Send status unconfirmed',
    blockedTitle: 'Couldn’t send yet',
  }),
}

export function SendScreen(props: {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}) {
  return <PrivateFlowScreen config={SEND_CONFIG} {...props} />
}
