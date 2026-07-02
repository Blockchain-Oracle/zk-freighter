import type { DemoEvidenceArtifact, DemoEvidenceTransaction } from './demo-evidence'

export interface MainnetPrivateLoopEvidence {
  readonly recordedAtUtc: string
  readonly network: 'Stellar Mainnet'
  readonly asset: 'XLM' | 'USDC'
  readonly poolContractId: string
  readonly publicAccount: string
  readonly boundaryCopy: readonly string[]
  readonly transactions: readonly DemoEvidenceTransaction[]
  readonly artifacts: readonly DemoEvidenceArtifact[]
}

export const mainnetXlmPrivateLoopEvidence = {
  recordedAtUtc: '2026-06-25 13:35 UTC',
  network: 'Stellar Mainnet',
  asset: 'XLM',
  poolContractId: 'CCE3VBWTMGS7TZBOMBXVMPZFD4RUWAJDQHV7L2FT5BHMZKHLQUJKHECE',
  publicAccount: 'GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32',
  boundaryCopy: [
    'This is real mainnet evidence from the extension offscreen prover, not the default live demo path.',
    'Shielded transfer happened inside the XLM pool and is proven by an accepted mainnet pool transaction.',
    'Unshield/withdraw is a public boundary: destination, amount, and transaction are visible on mainnet.',
  ],
  transactions: [
    {
      kind: 'transfer',
      title: 'Mainnet XLM shielded transfer',
      txHash: '5a1523cfe48c3cab8adca44ca1d6518585b8d5bfa20afa8e2372f59fdb2548cd',
      explorerUrl:
        'https://stellar.expert/explorer/public/tx/5a1523cfe48c3cab8adca44ca1d6518585b8d5bfa20afa8e2372f59fdb2548cd',
      ledger: 63192150,
      createdAtUtc: '2026-06-25T13:35:06Z',
      amount: '0.0100000 XLM',
      sourceAccount: 'GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32',
      feeChargedStroops: '459714',
    },
    {
      kind: 'unshield',
      title: 'Mainnet XLM unshield',
      txHash: 'df5440dd80e45daf7068c66fa225a20f8167c686244ee084268df8db3f4e1a70',
      explorerUrl:
        'https://stellar.expert/explorer/public/tx/df5440dd80e45daf7068c66fa225a20f8167c686244ee084268df8db3f4e1a70',
      ledger: 63192156,
      createdAtUtc: '2026-06-25T13:35:41Z',
      amount: '0.0050000 XLM',
      sourceAccount: 'GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32',
      feeChargedStroops: '468899',
    },
  ],
  artifacts: [
    {
      label: 'Harness',
      value: 'pnpm extension:private-loop:mainnet',
    },
    {
      label: 'Proof timing',
      value: 'transfer 15335 ms; unshield 14900 ms',
    },
    {
      label: 'Claim boundary',
      value: 'Mainnet bridge-to-shield still not claimed',
    },
  ],
} as const satisfies MainnetPrivateLoopEvidence

export const mainnetUsdcPrivateLoopEvidence = {
  recordedAtUtc: '2026-06-25 15:08 UTC',
  network: 'Stellar Mainnet',
  asset: 'USDC',
  poolContractId: 'CDV45TTXDDUKBMK2IWPJRUYQSRVEWHTRPKCN2VZ7GEV2HVMRPBOD2KR7',
  publicAccount: 'GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32',
  boundaryCopy: [
    'This is real mainnet evidence from the extension offscreen prover, not the default live demo path.',
    'Shielded transfer happened inside the USDC pool and is proven by an accepted mainnet pool transaction.',
    'Unshield/withdraw is a public boundary: destination, amount, and transaction are visible on mainnet.',
  ],
  transactions: [
    {
      kind: 'transfer',
      title: 'Mainnet USDC shielded transfer',
      txHash: '5317b8266ef93b84a6ab9f40eb5b157c5838b6b9a0826d60a6d6daf36a221aa1',
      explorerUrl:
        'https://stellar.expert/explorer/public/tx/5317b8266ef93b84a6ab9f40eb5b157c5838b6b9a0826d60a6d6daf36a221aa1',
      ledger: 63193096,
      createdAtUtc: '2026-06-25T15:08:10Z',
      amount: '0.0050000 USDC',
      sourceAccount: 'GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32',
      feeChargedStroops: '459634',
    },
    {
      kind: 'unshield',
      title: 'Mainnet USDC unshield',
      txHash: '2dd8955cd57aa35b46a0ac944380afb12ac1b82da44f8cf8ab6a9d283064531b',
      explorerUrl:
        'https://stellar.expert/explorer/public/tx/2dd8955cd57aa35b46a0ac944380afb12ac1b82da44f8cf8ab6a9d283064531b',
      ledger: 63193101,
      createdAtUtc: '2026-06-25T15:08:42Z',
      amount: '0.0010000 USDC',
      sourceAccount: 'GAWDQREHIKPLF6KR7XXNYNANXG7PW2IG5N4HWFB2H3M3J3OFC7SHWH32',
      feeChargedStroops: '469262',
    },
  ],
  artifacts: [
    {
      label: 'Harness',
      value: 'ZKF_PRIVATE_LOOP_ASSET=USDC pnpm extension:private-loop:mainnet',
    },
    {
      label: 'Proof timing',
      value: 'transfer 12464 ms; unshield 11748 ms',
    },
    {
      label: 'Final public balance',
      value: 'USDC 0.0010000; XLM 4.7289441',
    },
  ],
} as const satisfies MainnetPrivateLoopEvidence

export const mainnetPrivateLoopEvidence = [
  mainnetXlmPrivateLoopEvidence,
  mainnetUsdcPrivateLoopEvidence,
] as const

export function mainnetPrivateLoopDigest(evidence: MainnetPrivateLoopEvidence): string {
  return [
    `ZK Freighter ${evidence.asset} mainnet private-loop evidence (${evidence.recordedAtUtc})`,
    `Pool: ${evidence.poolContractId}`,
    `Public account: ${evidence.publicAccount}`,
    ...evidence.transactions.map(
      (tx) => `${tx.title}: ${tx.amount}, ledger ${tx.ledger}, tx ${tx.txHash}, ${tx.explorerUrl}`,
    ),
    ...evidence.artifacts.map((artifact) => `${artifact.label}: ${artifact.value}`),
  ].join('\n')
}

export function mainnetPrivateLoopsDigest(): string {
  return mainnetPrivateLoopEvidence.map((evidence) => mainnetPrivateLoopDigest(evidence)).join('\n\n')
}
