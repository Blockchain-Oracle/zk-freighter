import { createFromSource } from 'fumadocs-core/search/server'
import { source } from '@/lib/source'

// Static search: the whole Orama index is exported at build time as
// /static.json and queried client-side — no server needed on the host.
const server = createFromSource(source, {
  language: 'english',
})

export async function loader() {
  return server.staticGET()
}
