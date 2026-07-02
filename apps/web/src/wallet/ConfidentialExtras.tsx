import { useState } from 'react'
import {
  getNetworkConfig,
  loadAddressBook,
  removeAddressBookEntry,
  saveAddressBookEntry,
  type AddressBookEntry,
  type IncomingHistoryEntry,
  type NetworkKey,
} from '@zk-freighter/core'
import { truncateMiddle } from '@zk-freighter/ui'

function formatUnits(value: bigint, decimals: number): string {
  const base = 10n ** BigInt(decimals)
  return `${value / base}.${(value % base).toString().padStart(decimals, '0').slice(0, 2)}`
}

/** Received confidential transfers, decrypted locally from the chain's events. */
export function IncomingHistory({ entries, decimals, code, network }: {
  entries: readonly IncomingHistoryEntry[]
  decimals: number
  code: string
  network: NetworkKey
}) {
  if (entries.length === 0) return null
  const explorer = getNetworkConfig(network).explorerTxUrl
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 11.5, color: 'var(--tx3)', textTransform: 'uppercase', letterSpacing: '.06em' }}>Received</div>
      {entries.slice(0, 6).map((entry) => (
        <div key={entry.eventId} style={{ display: 'flex', alignItems: 'baseline', gap: 10, fontSize: 13 }}>
          <span style={{ color: 'var(--pos)', fontWeight: 700, fontVariantNumeric: 'tabular-nums' }}>+{formatUnits(BigInt(entry.amount), decimals)} {code}</span>
          <span style={{ color: 'var(--tx3)', fontSize: 11.5 }}>ledger {entry.ledger}</span>
          {entry.txHash ? (
            <a href={`${explorer}/${entry.txHash}`} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', color: 'var(--ac2)', fontSize: 11.5 }}>tx ↗</a>
          ) : null}
        </div>
      ))}
    </div>
  )
}

/** Pick a saved recipient, or label + save the address currently entered. */
export function AddressBookPicker({ network, current, onPick }: {
  network: NetworkKey
  current: string
  onPick: (address: string) => void
}) {
  const [book, setBook] = useState<AddressBookEntry[]>(() => loadAddressBook(network))
  const [label, setLabel] = useState('')
  const trimmed = current.trim()
  const isValid = /^G[A-Z2-7]{55}$/.test(trimmed)
  const alreadySaved = book.some((entry) => entry.address === trimmed)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {book.length > 0 ? (
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {book.map((entry) => (
            <button
              key={entry.address}
              onClick={() => onPick(entry.address)}
              title={entry.address}
              style={{ padding: '5px 10px', borderRadius: 7, border: `1px solid ${entry.address === trimmed ? 'var(--ac)' : 'var(--bd)'}`, background: 'var(--card)', color: 'var(--tx2)', fontSize: 12, cursor: 'pointer' }}
            >
              {entry.label} · {truncateMiddle(entry.address, 4, 4)}
              <span
                onClick={(event) => { event.stopPropagation(); setBook(removeAddressBookEntry(network, entry.address)) }}
                style={{ marginLeft: 8, color: 'var(--tx3)' }}
              >×</span>
            </button>
          ))}
        </div>
      ) : null}
      {isValid && !alreadySaved ? (
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={label}
            onChange={(event) => setLabel(event.target.value)}
            placeholder="Label this address (e.g. Alice)"
            style={{ flex: 1, padding: '8px 11px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--bg)', color: 'var(--tx)', fontSize: 12.5 }}
          />
          <button
            disabled={!label.trim()}
            onClick={() => { setBook(saveAddressBookEntry(network, label, trimmed)); setLabel('') }}
            style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid var(--bd)', background: 'var(--card)', color: label.trim() ? 'var(--ac2)' : 'var(--tx3)', fontSize: 12.5, fontWeight: 600, cursor: label.trim() ? 'pointer' : 'default' }}
          >
            Save
          </button>
        </div>
      ) : null}
    </div>
  )
}
