import { mainnetPrivateLoopsDigest } from './mainnet-demo-evidence'

export type DemoEvidenceKind = 'shield' | 'transfer' | 'unshield' | 'approval' | 'burn' | 'mint' | 'asp-insert'

export interface DemoEvidenceTransaction {
  readonly kind: DemoEvidenceKind
  readonly title: string
  readonly txHash: string
  readonly explorerUrl: string
  readonly ledger: number
  readonly createdAtUtc: string
  readonly amount: string
  readonly sourceAccount: string
  readonly feeChargedStroops: string
}

export interface DemoEvidenceArtifact {
  readonly label: string
  readonly value: string
}

export interface DemoEvidenceFlow {
  readonly recordedAtUtc: string
  readonly network: 'Stellar Testnet'
  readonly asset: 'USDC'
  readonly poolContractId: string
  readonly aspMembershipContractId: string
  readonly publicAccount: string
  readonly boundaryCopy: readonly string[]
  readonly transactions: readonly DemoEvidenceTransaction[]
  readonly noteResults: readonly string[]
  readonly artifacts: readonly DemoEvidenceArtifact[]
}

export interface BridgeEvidenceFlow {
  readonly recordedAtUtc: string
  readonly sourceNetwork: 'Ethereum Sepolia'
  readonly destinationNetwork: 'Stellar Testnet'
  readonly destinationAccount: string
  readonly poolContractId: string
  readonly boundaryCopy: readonly string[]
  readonly transactions: readonly DemoEvidenceTransaction[]
  readonly artifacts: readonly DemoEvidenceArtifact[]
}

export const phase4UsdcDemoEvidence = {
  recordedAtUtc: '2026-06-23 13:24 UTC',
  network: 'Stellar Testnet',
  asset: 'USDC',
  poolContractId: 'CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY',
  aspMembershipContractId: 'CA33KAHNZ3QIG2PSSNUGMGM73CYQD7RLQPRBONOZEOIHIQENX2GNC5XP',
  publicAccount: 'GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP',
  boundaryCopy: [
    'Shield/deposit is a public boundary: account, amount, pool, and transaction are visible.',
    'Shielded transfer happens inside the USDC pool and is proven by an accepted pool transaction.',
    'Unshield/withdraw is a public boundary: destination, amount, and transaction are visible.',
  ],
  transactions: [
    {
      kind: 'shield',
      title: 'USDC shield',
      txHash: '8800355227878c9dc227b6a69972619928421fd478a537bbc65b333929247405',
      explorerUrl:
        'https://stellar.expert/explorer/testnet/tx/8800355227878c9dc227b6a69972619928421fd478a537bbc65b333929247405',
      ledger: 3241138,
      createdAtUtc: '2026-06-23T12:58:18Z',
      amount: '1 USDC',
      sourceAccount: 'GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP',
      feeChargedStroops: '433340',
    },
    {
      kind: 'transfer',
      title: 'USDC shielded transfer',
      txHash: '3f20d183abccd9ddb0c7bfd437c5151772268a48eed1d28e3e023c5b422ce698',
      explorerUrl:
        'https://stellar.expert/explorer/testnet/tx/3f20d183abccd9ddb0c7bfd437c5151772268a48eed1d28e3e023c5b422ce698',
      ledger: 3241336,
      createdAtUtc: '2026-06-23T13:14:50Z',
      amount: '0.5 USDC',
      sourceAccount: 'GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP',
      feeChargedStroops: '162311',
    },
    {
      kind: 'unshield',
      title: 'USDC unshield',
      txHash: '9042a1e9936751c95e2578d96bb278098bdc43e28a73563b492a5b622cd413ed',
      explorerUrl:
        'https://stellar.expert/explorer/testnet/tx/9042a1e9936751c95e2578d96bb278098bdc43e28a73563b492a5b622cd413ed',
      ledger: 3241437,
      createdAtUtc: '2026-06-23T13:23:15Z',
      amount: '0.5 USDC',
      sourceAccount: 'GC2QXKJDIUNJMTTILUYVEPEXGWWCP4B36IHXQJFHIWVD7OBUAW6VRGTP',
      feeChargedStroops: '171936',
    },
  ],
  noteResults: [
    'After shield: sender discovered 1 USDC unspent at ledger 3241138.',
    'After transfer: sender change note was 0.5 USDC at ledger 3241336.',
    'After transfer: recipient discovered 0.5 USDC at ledger 3241336.',
    'After unshield: sender showed 0 USDC unspent; public USDC balance was 19.5000000.',
  ],
  artifacts: [
    {
      label: 'web_bg.wasm',
      value: '15a9c74f68202841dbd7344271f8caf76e3d2e792c59697b6727b139b0980f8d',
    },
    {
      label: 'prover-worker_bg.wasm',
      value: '9ee90256eb7fd295f12c3f46b74b4707a09c625c3a9c478e1736ce9a3e156e80',
    },
    {
      label: 'storage-worker_bg.wasm',
      value: 'e3d05a279f93e37586d27a79c6ab047790e5a834d3a36c607fac5dd38d47fd83',
    },
  ],
} as const satisfies DemoEvidenceFlow

export const phase8CctpBridgeEvidence = {
  recordedAtUtc: '2026-06-23 22:57 UTC',
  sourceNetwork: 'Ethereum Sepolia',
  destinationNetwork: 'Stellar Testnet',
  destinationAccount: 'GB4PZPDDY7EB4FF6RYAJYBRG6JZ3AA2JUQKE577VVUFJRHASVHIMCCBH',
  poolContractId: 'CCY6R2BJQ2LAYINOZZLDLHJCWRRPVQNRTWEWCWO7FIDD3BRDQJCAOHKY',
  boundaryCopy: [
    'The CCTP bridge leg is public: approval, burn, attestation, and Stellar mint are visible.',
    'Privacy starts after the separate ZK Freighter USDC shield/deposit transaction lands.',
    'Atomic bridge-and-shield is deferred until a custom adapter passes real tests.',
  ],
  transactions: [
    {
      kind: 'approval',
      title: 'Sepolia USDC approval',
      txHash: '0xb36509d192cf20d7c8dfd60e66044e603af7ae3c09b4118f3be0e0a437fb210e',
      explorerUrl:
        'https://sepolia.etherscan.io/tx/0xb36509d192cf20d7c8dfd60e66044e603af7ae3c09b4118f3be0e0a437fb210e',
      ledger: 0,
      createdAtUtc: '2026-06-23T22:57:00Z',
      amount: '1 USDC allowance',
      sourceAccount: 'MetaMask Sepolia signer',
      feeChargedStroops: 'n/a',
    },
    {
      kind: 'burn',
      title: 'Sepolia CCTP burn',
      txHash: '0x526f2961da88156fef643e630b92df7a2b35be96e22a6c810927f200f405798f',
      explorerUrl:
        'https://sepolia.etherscan.io/tx/0x526f2961da88156fef643e630b92df7a2b35be96e22a6c810927f200f405798f',
      ledger: 0,
      createdAtUtc: '2026-06-23T22:57:00Z',
      amount: '1 USDC',
      sourceAccount: 'MetaMask Sepolia signer',
      feeChargedStroops: 'n/a',
    },
    {
      kind: 'mint',
      title: 'Stellar CCTP mint_and_forward',
      txHash: '3af0d0be38b048db1009a59c521ddf191a8c02a5b68047620f27d38949158790',
      explorerUrl:
        'https://stellar.expert/explorer/testnet/tx/3af0d0be38b048db1009a59c521ddf191a8c02a5b68047620f27d38949158790',
      ledger: 0,
      createdAtUtc: '2026-06-23T22:57:00Z',
      amount: '1 USDC',
      sourceAccount: 'GB4PZPDDY7EB4FF6RYAJYBRG6JZ3AA2JUQKE577VVUFJRHASVHIMCCBH',
      feeChargedStroops: 'recorded in explorer',
    },
    {
      kind: 'asp-insert',
      title: 'ASP membership insertion',
      txHash: 'b42049373d26d0f1120c3c339cae5de5a8870511710ae10625124aee18776a64',
      explorerUrl:
        'https://stellar.expert/explorer/testnet/tx/b42049373d26d0f1120c3c339cae5de5a8870511710ae10625124aee18776a64',
      ledger: 0,
      createdAtUtc: '2026-06-23T22:57:00Z',
      amount: 'ASP leaf',
      sourceAccount: 'ZK Freighter testnet account',
      feeChargedStroops: 'recorded in explorer',
    },
    {
      kind: 'shield',
      title: 'Post-bridge USDC shield',
      txHash: '30dd198bebec377e4589240073fd22d6eb7f5041de0753ddc8f9e856be6b911d',
      explorerUrl:
        'https://stellar.expert/explorer/testnet/tx/30dd198bebec377e4589240073fd22d6eb7f5041de0753ddc8f9e856be6b911d',
      ledger: 0,
      createdAtUtc: '2026-06-23T22:57:00Z',
      amount: '1 USDC',
      sourceAccount: 'GB4PZPDDY7EB4FF6RYAJYBRG6JZ3AA2JUQKE577VVUFJRHASVHIMCCBH',
      feeChargedStroops: 'recorded in explorer',
    },
  ],
  artifacts: [
    {
      label: 'Iris eventNonce',
      value: '0x9e614414d627f63ef264ddb54fcbe17318ea8c16670cdbf8bbe4f690256504e7',
    },
    {
      label: 'CCTP amount',
      value: '1000000 atomic USDC',
    },
    {
      label: 'Public balance after shield',
      value: 'USDC 0.0000000; XLM 9999.9651591',
    },
  ],
} as const satisfies BridgeEvidenceFlow

export function phase4UsdcDemoDigest(evidence: DemoEvidenceFlow = phase4UsdcDemoEvidence): string {
  return [
    `ZK Freighter ${evidence.asset} evidence (${evidence.network}, ${evidence.recordedAtUtc})`,
    `Pool: ${evidence.poolContractId}`,
    `ASP: ${evidence.aspMembershipContractId}`,
    ...evidence.transactions.map(
      (tx) => `${tx.title}: ${tx.amount}, ledger ${tx.ledger}, tx ${tx.txHash}, ${tx.explorerUrl}`,
    ),
    ...evidence.noteResults,
  ].join('\n')
}

export function phase8BridgeDemoDigest(evidence: BridgeEvidenceFlow = phase8CctpBridgeEvidence): string {
  return [
    `ZK Freighter CCTP evidence (${evidence.sourceNetwork} -> ${evidence.destinationNetwork}, ${evidence.recordedAtUtc})`,
    `Destination: ${evidence.destinationAccount}`,
    `USDC pool: ${evidence.poolContractId}`,
    ...evidence.transactions.map((tx) => `${tx.title}: ${tx.amount}, tx ${tx.txHash}, ${tx.explorerUrl}`),
    ...evidence.artifacts.map((artifact) => `${artifact.label}: ${artifact.value}`),
  ].join('\n')
}

export function submissionEvidenceDigest(): string {
  return [phase4UsdcDemoDigest(), '', phase8BridgeDemoDigest(), '', mainnetPrivateLoopsDigest()].join('\n')
}
