import {
  submitXlmUnshieldWithdrawal,
  type NetworkKey,
  type WalletIdentity,
} from '@zk-fighter/core'
import { truncateMiddle } from '@zk-fighter/ui'
import type { ShieldedBalanceState } from './useShieldedBalance'
import { BoundaryPill } from './flowChrome'
import { PrivateFlowScreen, type PrivateFlowConfig } from './PrivateFlowScreen'
import type { WalletScreen } from './screens'

// Stellar public keys are 56-char base32 (Crockford, no 0/1/8/9) starting with 'G'.
const STELLAR_ADDRESS = /^G[A-Z2-7]{55}$/

function validateStellarAddress(value: string): string | null {
  return STELLAR_ADDRESS.test(value.trim()) ? null : 'Enter a valid public Stellar address (G…, 56 characters).'
}

const UNSHIELD_CONFIG: PrivateFlowConfig = {
  title: 'Unshield · withdraw',
  badge: <BoundaryPill label="REVEALS INFO" color="var(--warn)" />,
  intro: {
    tone: 'warn',
    title: 'Public boundary.',
    body: 'Move shielded funds back to a public Stellar address. The destination and amount become visible on-chain; your remaining shielded balance stays private.',
  },
  recipient: {
    label: 'Public Stellar destination',
    placeholder: 'G…',
    multiline: false,
    initial: (identity) => identity.stellarPublicKey,
    validate: (value) => validateStellarAddress(value),
    reviewLabel: 'To (public)',
    reviewValue: (value) => truncateMiddle(value, 8, 8),
  },
  ack: 'I understand the destination and amount will be visible on Stellar.',
  reviewWarn: {
    title: 'Reveals info.',
    body: 'This withdrawal is public — the destination address and amount are visible on Stellar. Your remaining shielded balance stays private.',
  },
  submitVerb: 'Unshield',
  run: ({ asset, identity, network, amountStroops, recipient, onStatus }) =>
    submitXlmUnshieldWithdrawal({ asset, identity, network, amountStroops, recipientAddress: recipient, onStatus }),
  proofCopy: (amountLabel, recipient) => ({
    provingHint: 'Proving on your device, then submitting to Stellar — keep this tab open.',
    successTitle: 'Unshield submitted',
    successBody: (
      <>{amountLabel} is being withdrawn to {truncateMiddle(recipient, 6, 6)} — it becomes visible on Stellar once it confirms.</>
    ),
    failedTitle: 'Unshield failed',
    unconfirmedTitle: 'Unshield status unconfirmed',
    blockedTitle: 'Couldn’t unshield yet',
  }),
}

export function UnshieldScreen(props: {
  identity: WalletIdentity
  network: NetworkKey
  balance: ShieldedBalanceState
  onNav: (screen: WalletScreen) => void
}) {
  return <PrivateFlowScreen config={UNSHIELD_CONFIG} {...props} />
}
