const ethereumReceiptPolls = 120
const ethereumReceiptPollIntervalMs = 2_500

interface EthereumProvider {
  request(args: { readonly method: string; readonly params?: readonly unknown[] }): Promise<unknown>
}

declare global {
  interface Window {
    ethereum?: EthereumProvider
  }
}

export function providerAvailable(): boolean {
  return typeof window !== 'undefined' && Boolean(window.ethereum)
}

export async function createInjectedEthereumClient(chainIdHex: string) {
  const provider = window.ethereum
  if (!provider) {
    throw new Error('No injected Ethereum wallet was found in this browser.')
  }

  const accounts = await provider.request({ method: 'eth_requestAccounts' })
  const account = Array.isArray(accounts) ? asString(accounts[0], 'Ethereum account') : ''
  if (!account) {
    throw new Error('Connect an Ethereum Sepolia account before starting the bridge.')
  }

  const activeChain = asString(await provider.request({ method: 'eth_chainId' }), 'Ethereum chain')
  if (activeChain.toLowerCase() !== chainIdHex.toLowerCase()) {
    await provider.request({ method: 'wallet_switchEthereumChain', params: [{ chainId: chainIdHex }] })
    const switchedChain = asString(await provider.request({ method: 'eth_chainId' }), 'Ethereum chain')
    if (switchedChain.toLowerCase() !== chainIdHex.toLowerCase()) {
      throw new Error('Ethereum wallet is not on Sepolia.')
    }
  }

  return {
    accountAddress: account,
    sendTransaction: async (transaction: { readonly to: string; readonly data: string; readonly chainIdHex: string }) => {
      const currentChain = asString(await provider.request({ method: 'eth_chainId' }), 'Ethereum chain')
      if (currentChain.toLowerCase() !== transaction.chainIdHex.toLowerCase()) {
        throw new Error('Ethereum wallet switched away from Sepolia before signing.')
      }
      return asString(
        await provider.request({
          method: 'eth_sendTransaction',
          params: [{ from: account, to: transaction.to, data: transaction.data, chainId: transaction.chainIdHex }],
        }),
        'Ethereum transaction hash',
      )
    },
    waitForTransaction: async (txHash: string) => {
      for (let attempt = 0; attempt < ethereumReceiptPolls; attempt += 1) {
        const receipt = await provider.request({ method: 'eth_getTransactionReceipt', params: [txHash] })
        if (receipt && typeof receipt === 'object' && 'status' in receipt) {
          const status = (receipt as { status?: unknown }).status
          if (status === '0x1') {
            return
          }
          if (status === '0x0') {
            throw new Error(`Ethereum transaction ${txHash} reverted.`)
          }
        }
        await sleep(ethereumReceiptPollIntervalMs)
      }
      throw new Error(`Ethereum transaction ${txHash} was not confirmed in time.`)
    },
  }
}

function asString(value: unknown, label: string): string {
  if (typeof value !== 'string') {
    throw new Error(`${label} was not returned by the Ethereum wallet.`)
  }
  return value
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => {
    setTimeout(resolve, ms)
  })
}
