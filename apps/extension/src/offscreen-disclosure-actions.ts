import {
  deriveWalletIdentity,
  generateDisclosureArtifact,
  loadXlmShieldedNotes,
  type AssetCode,
  type GenerateDisclosureReport,
  type NetworkKey,
} from '@zk-fighter/core'

// Disclosure runs in the offscreen (it proves with the selectiveDisclosure circuit).
// We load the real notes, auto-pick the largest UNSPENT one (same rule as the web),
// and generate the read-only receipt — never a fabricated artifact.

function hexOf(value: string): string {
  return [...new TextEncoder().encode(value)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export async function runDisclosure(payload: { readonly [key: string]: unknown }): Promise<GenerateDisclosureReport> {
  const mnemonic = String(payload['mnemonic'] ?? '')
  const network = asNetworkKey(payload['network'])
  const asset: AssetCode = payload['asset'] === 'XLM' ? 'XLM' : 'USDC'
  const authority = String(payload['authority'] ?? '').trim()
  const purpose = String(payload['purpose'] ?? '').trim() || 'Disclosure'
  const identity = deriveWalletIdentity(mnemonic, network)

  const notesReport = await loadXlmShieldedNotes({ identity, network, asset })
  const note = [...notesReport.notes]
    .filter((entry) => !entry.spent)
    .sort((a, b) => Number(BigInt(b.amountStroops) - BigInt(a.amountStroops)))[0]

  if (!note) {
    return {
      status: 'blocked',
      durationMs: 0,
      network,
      asset,
      statusEvents: [],
      blockers: [notesReport.blockers[0] ?? `No unspent ${asset} note to disclose — shield some ${asset} first.`],
    }
  }

  return generateDisclosureArtifact({
    identity,
    network,
    asset,
    note,
    authorityLabel: authority,
    authorityIdentityPayloadHex: `0x${hexOf(authority)}`,
    purpose,
  })
}

function asNetworkKey(value: unknown): NetworkKey {
  if (value === 'testnet' || value === 'mainnet') return value
  throw new Error('Unsupported disclosure network.')
}
