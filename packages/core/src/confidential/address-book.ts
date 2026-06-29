// A small local address book for confidential transfer recipients — label a
// Stellar address once, pick it from a list later. Light (localStorage only),
// scoped per network so testnet/mainnet entries don't mix.

const BOOK_PREFIX = 'zkf:confidential:address-book:v1'

export interface AddressBookEntry {
  readonly label: string
  readonly address: string
}

interface KeyValueStore {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}
function browserStore(): KeyValueStore | null {
  return typeof localStorage === 'undefined' ? null : localStorage
}
const bookKey = (network: string) => `${BOOK_PREFIX}:${network}`

const isStellarAddress = (value: string) => /^G[A-Z2-7]{55}$/.test(value)

export function loadAddressBook(network: string, store: KeyValueStore | null = browserStore()): AddressBookEntry[] {
  const raw = store?.getItem(bookKey(network))
  if (!raw) return []
  try {
    return JSON.parse(raw) as AddressBookEntry[]
  } catch {
    return []
  }
}

/** Add or update (by address) a labeled entry. Ignores invalid addresses/empty labels. */
export function saveAddressBookEntry(
  network: string,
  label: string,
  address: string,
  store: KeyValueStore | null = browserStore(),
): AddressBookEntry[] {
  const trimmedLabel = label.trim()
  const trimmedAddress = address.trim()
  if (!trimmedLabel || !isStellarAddress(trimmedAddress)) return loadAddressBook(network, store)
  const others = loadAddressBook(network, store).filter((entry) => entry.address !== trimmedAddress)
  const updated = [{ label: trimmedLabel, address: trimmedAddress }, ...others]
  store?.setItem(bookKey(network), JSON.stringify(updated))
  return updated
}

export function removeAddressBookEntry(
  network: string,
  address: string,
  store: KeyValueStore | null = browserStore(),
): AddressBookEntry[] {
  const remaining = loadAddressBook(network, store).filter((entry) => entry.address !== address)
  store?.setItem(bookKey(network), JSON.stringify(remaining))
  return remaining
}
