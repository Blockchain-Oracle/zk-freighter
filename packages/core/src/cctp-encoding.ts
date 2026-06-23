import { StrKey } from '@stellar/stellar-sdk'
import { encodeFunctionData, type Hex } from 'viem'
import { bytesToHex, utf8ToBytes } from './bytes'

const evmUsdcDecimals = 6
const hexPrefix = '0x'
const cctpHookHeaderBytes = 32
const cctpHookVersionOffset = 24
const cctpHookLengthOffset = 28

const erc20ApproveAbi = [
  {
    type: 'function',
    name: 'approve',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
  },
] as const

const depositForBurnWithHookAbi = [
  {
    type: 'function',
    name: 'depositForBurnWithHook',
    stateMutability: 'nonpayable',
    inputs: [
      { name: 'amount', type: 'uint256' },
      { name: 'destinationDomain', type: 'uint32' },
      { name: 'mintRecipient', type: 'bytes32' },
      { name: 'burnToken', type: 'address' },
      { name: 'destinationCaller', type: 'bytes32' },
      { name: 'maxFee', type: 'uint256' },
      { name: 'minFinalityThreshold', type: 'uint32' },
      { name: 'hookData', type: 'bytes' },
    ],
    outputs: [],
  },
] as const

export function bridgeAmountDisplay(amountAtomic: bigint): string {
  const scale = 10n ** BigInt(evmUsdcDecimals)
  const whole = amountAtomic / scale
  const fraction = (amountAtomic % scale).toString().padStart(evmUsdcDecimals, '0').replace(/0+$/, '')
  return `${whole.toString()}${fraction ? `.${fraction}` : ''} USDC`
}

export function stellarContractStrkeyToBytes32(strkey: string): Hex {
  if (!StrKey.isValidContract(strkey)) {
    throw new Error(`Invalid Stellar contract strkey: ${strkey}`)
  }

  return `${hexPrefix}${bytesToHex(StrKey.decodeContract(strkey))}` as Hex
}

export function buildCctpForwarderHookData(forwardRecipient: string): Hex {
  const valid =
    StrKey.isValidEd25519PublicKey(forwardRecipient) ||
    StrKey.isValidContract(forwardRecipient) ||
    StrKey.isValidMed25519PublicKey(forwardRecipient)

  if (!valid) {
    throw new Error('Forward recipient must be a Stellar G..., M..., or C... strkey.')
  }

  const recipientBytes = utf8ToBytes(forwardRecipient)
  const hookData = new Uint8Array(cctpHookHeaderBytes + recipientBytes.length)
  const view = new DataView(hookData.buffer)
  view.setUint32(cctpHookVersionOffset, 0)
  view.setUint32(cctpHookLengthOffset, recipientBytes.length)
  hookData.set(recipientBytes, cctpHookHeaderBytes)
  return `${hexPrefix}${bytesToHex(hookData)}` as Hex
}

export function encodeApproveUsdcData(spender: string, amountAtomic: bigint): Hex {
  return encodeFunctionData({
    abi: erc20ApproveAbi,
    functionName: 'approve',
    args: [spender as Hex, amountAtomic],
  })
}

export function encodeDepositForBurnWithHookData(options: {
  readonly amountAtomic: bigint
  readonly destinationDomain: number
  readonly cctpForwarderBytes32: Hex
  readonly burnToken: string
  readonly maxFeeAtomic: bigint
  readonly finalityThreshold: number
  readonly hookData: Hex
}): Hex {
  return encodeFunctionData({
    abi: depositForBurnWithHookAbi,
    functionName: 'depositForBurnWithHook',
    args: [
      options.amountAtomic,
      options.destinationDomain,
      options.cctpForwarderBytes32,
      options.burnToken as Hex,
      options.cctpForwarderBytes32,
      options.maxFeeAtomic,
      options.finalityThreshold,
      options.hookData,
    ],
  })
}
