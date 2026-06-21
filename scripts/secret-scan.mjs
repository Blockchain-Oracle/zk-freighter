import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const ignoredDirs = new Set([
  '.git',
  '.cache',
  '.output',
  '.vite',
  '.wxt',
  'coverage',
  'dist',
  'node_modules',
  'reference',
])
const ignoredFiles = new Set(['pnpm-lock.yaml'])
const textExtensions = new Set([
  '.css',
  '.env',
  '.html',
  '.js',
  '.json',
  '.md',
  '.mjs',
  '.ts',
  '.tsx',
  '.txt',
  '.yaml',
  '.yml',
])

const highConfidencePatterns = [
  { name: 'Stellar secret seed', pattern: /\bS[A-Z2-7]{55}\b/ },
  { name: 'GitHub token', pattern: /\b(?:ghp|gho|ghu|ghs|ghr|github_pat)_[A-Za-z0-9_]{20,}\b/ },
  { name: 'AWS access key', pattern: /\bAKIA[0-9A-Z]{16}\b/ },
  { name: 'OpenAI API key', pattern: /\bsk-[A-Za-z0-9_-]{32,}\b/ },
]

const assignmentPattern =
  /\b(?:PRIVATE_KEY|SECRET_KEY|SEED_PHRASE|MNEMONIC|WALLET_SECRET)\b\s*[:=]\s*['"]?([^'"\s#]{16,})/i
const placeholderPattern = /^(?:redacted|example|placeholder|replace_me|your_|tbd|xxx)/i
const failures = []

function extensionOf(file) {
  const match = file.match(/\.[^.]+$/)
  return match?.[0] ?? ''
}

function scanFile(path) {
  const content = readFileSync(path, 'utf8')
  const lines = content.split('\n')

  lines.forEach((line, index) => {
    for (const { name, pattern } of highConfidencePatterns) {
      if (pattern.test(line)) {
        failures.push(`${relative(process.cwd(), path)}:${index + 1}: possible ${name}`)
      }
    }

    const assignment = line.match(assignmentPattern)
    if (assignment && !placeholderPattern.test(assignment[1])) {
      failures.push(`${relative(process.cwd(), path)}:${index + 1}: possible secret assignment`)
    }
  })
}

function walk(path) {
  for (const entry of readdirSync(path)) {
    if (ignoredFiles.has(entry)) {
      continue
    }

    const fullPath = join(path, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      if (!ignoredDirs.has(entry)) {
        walk(fullPath)
      }
      continue
    }

    if (stats.isFile() && textExtensions.has(extensionOf(entry))) {
      scanFile(fullPath)
    }
  }
}

if (existsSync(process.cwd())) {
  walk(process.cwd())
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log('Secret scan passed.')
