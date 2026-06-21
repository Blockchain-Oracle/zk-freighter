import { ensureLocalTestnetUsdcFunder } from './testnet-usdc-funder.mjs'

async function main() {
  const funder = await ensureLocalTestnetUsdcFunder()
  console.log(JSON.stringify({
    ok: true,
    publicKey: funder.publicKey,
    balance: funder.balance,
    friendbotTx: funder.friendbotTx,
    trustlineTx: funder.trustlineTx,
    walletPath: funder.walletPath,
    instruction: `Fund ${funder.publicKey} with Stellar testnet USDC. The harness will auto-transfer from it.`,
  }, null, 2))
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
