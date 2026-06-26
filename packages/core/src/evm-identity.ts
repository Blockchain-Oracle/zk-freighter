import { mnemonicToAccount, type HDAccount } from 'viem/accounts'

// ZK Fighter is its own EVM wallet: the same recovery phrase that controls the
// Stellar/shielded keys also derives a standard Ethereum account (BIP44
// m/44'/60'/0'/0/0). The wallet signs CCTP bridge burns with this key itself, so
// no external EVM wallet (MetaMask / WalletConnect) is ever required.

/** Derives the seed-backed EVM account (signer) from the wallet mnemonic. */
export function deriveEvmAccount(mnemonic: string): HDAccount {
  return mnemonicToAccount(mnemonic)
}

/** Checksummed EVM address of the seed-backed account. */
export function deriveEvmAddress(mnemonic: string): string {
  return deriveEvmAccount(mnemonic).address
}
