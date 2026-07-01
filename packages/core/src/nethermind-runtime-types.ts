export interface NethermindWebModule {
  readonly default: () => Promise<unknown>
  readonly Config: new (rpcUrl: string, bootnodeUrl?: string, backgroundEvents?: boolean) => unknown
  readonly mainThread: (config: unknown) => Promise<NethermindMainThreadHandle>
}

export interface NethermindMainThreadHandle {
  readonly webClient: NethermindWebClient
  free?(): void
}

export interface PreparedSorobanTx {
  readonly txXdr: string
  readonly authEntries: readonly string[]
  readonly latestLedger: number
}

export interface NethermindPreparedProverTx {
  readonly proofUncompressed: readonly number[]
  readonly extData: unknown
  readonly prepared: unknown
  readonly sorobanTx: PreparedSorobanTx
}

export interface NethermindWebClient {
  free?(): void
  deriveAndSaveUserKeys(address: string, signature: Uint8Array): Promise<void>
  syncPoolEvents?(): Promise<void>
  getUserNotes?(address: string, limit: number): Promise<unknown>
  getUnspentUserNotes?(poolContractId: string, address: string): Promise<unknown>
  prepareRegisterPublicKeys?(
    poolContractId: string,
    userAddress: string,
    notePublicKeyHex: string,
    encryptionPublicKeyHex: string,
  ): Promise<PreparedSorobanTx>
  getRecentPublicKeys?(limit: number): Promise<unknown>
  generateSelectiveDisclosure?(
    poolContractId: string,
    userAddress: string,
    selectedCommitmentHex: string,
    authorityLabel: string,
    authorityIdentityPayloadHex: string,
    purpose: string,
    contextNonce: bigint,
    onStatus: (event: unknown) => void,
  ): Promise<unknown | null>
  verifySelectiveDisclosure?(receiptJson: string, expectedVkHash: string): Promise<unknown>
  executeDeposit?(
    poolContractId: string,
    userAddress: string,
    amount: bigint,
    outputAmounts: readonly bigint[],
    submit: (prepared: NethermindPreparedProverTx) => Promise<string>,
    onStatus: (event: unknown) => void,
  ): Promise<readonly string[] | null>
  executeTransfer?(
    poolContractId: string,
    userAddress: string,
    amount: bigint,
    recipientNoteKeyHex: string,
    recipientEncryptionKeyHex: string,
    submit: (prepared: NethermindPreparedProverTx) => Promise<string>,
    onStatus: (event: unknown) => void,
  ): Promise<readonly string[] | null>
  executeWithdraw?(
    poolContractId: string,
    userAddress: string,
    withdrawRecipient: string,
    amount: bigint,
    submit: (prepared: NethermindPreparedProverTx) => Promise<string>,
    onStatus: (event: unknown) => void,
  ): Promise<readonly string[] | null>
  aspState?(): Promise<unknown>
  deriveAspUserLeaf?(membershipBlinding: bigint, notePublicKeyHex: string): Promise<unknown>
  getASPSecret(address: string): Promise<unknown>
  getUserKeys(address: string): Promise<unknown>
}

export type NethermindModuleImporter = () => Promise<NethermindWebModule>
