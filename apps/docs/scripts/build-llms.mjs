// Generates llms.txt (index) and llms-full.txt (all content) from content/docs,
// so AI agents can consume the documentation directly.
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs'
import { glob } from 'node:fs/promises'
import path from 'node:path'

const root = new URL('..', import.meta.url).pathname
const contentDir = path.join(root, 'content/docs')
const site = 'https://docs.zkfreighter.dev'

const pages = []
for await (const entry of glob('**/*.mdx', { cwd: contentDir })) {
  const raw = readFileSync(path.join(contentDir, entry), 'utf8')
  const fm = raw.match(/^---\n([\s\S]*?)\n---\n/u)
  const title = fm?.[1].match(/^title:\s*(.+)$/mu)?.[1] ?? entry
  const description = fm?.[1].match(/^description:\s*(.+)$/mu)?.[1] ?? ''
  const body = raw.replace(/^---\n[\s\S]*?\n---\n/u, '').trim()
  const slug = entry.replace(/\.mdx$/u, '').replace(/(^|\/)index$/u, '')
  const url = `${site}/docs${slug ? `/${slug}` : ''}`
  pages.push({ title, description, body, url, entry })
}
pages.sort((a, b) => a.entry.localeCompare(b.entry))

const index = [
  '# ZK Freighter',
  '',
  '> A self-custody wallet for shielded XLM and USDC payments on Stellar. Zero-knowledge proofs on-device; shield, unshield, and bridge arrivals are public boundaries.',
  '',
  '## Docs',
  '',
  ...pages.map((page) => `- [${page.title}](${page.url}): ${page.description}`),
  '',
  '## Source',
  '',
  '- [GitHub repository](https://github.com/Blockchain-Oracle/zk-freighter): monorepo with apps, core engine, circuits, and contracts',
].join('\n')

const full = pages
  .map((page) => `# ${page.title}\nURL: ${page.url}\n${page.description}\n\n${page.body}`)
  .join('\n\n---\n\n')

for (const dir of ['public', 'build/client']) {
  const target = path.join(root, dir)
  if (dir === 'public' && !existsSync(target)) mkdirSync(target, { recursive: true })
  if (!existsSync(target)) continue
  writeFileSync(path.join(target, 'llms.txt'), `${index}\n`)
  writeFileSync(path.join(target, 'llms-full.txt'), `${full}\n`)
}

console.log(`llms.txt: ${pages.length} pages indexed`)
