import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'

const roots = ['apps', 'packages', 'scripts']
const ignoredDirs = new Set([
  'node_modules',
  'dist',
  'public',
  '.vite',
  '.tmp',
  '.wxt',
  '.output',
  'coverage',
])
const checkedExtensions = new Set(['.cjs', '.js', '.jsx', '.mjs', '.ts', '.tsx'])
const maxLines = 300

const failures = []

function extensionOf(file) {
  const match = file.match(/\.[^.]+$/)
  return match?.[0] ?? ''
}

function walk(path) {
  for (const entry of readdirSync(path)) {
    const fullPath = join(path, entry)
    const stats = statSync(fullPath)

    if (stats.isDirectory()) {
      if (!ignoredDirs.has(entry)) {
        walk(fullPath)
      }
      continue
    }

    if (!stats.isFile() || !checkedExtensions.has(extensionOf(entry))) {
      continue
    }

    const lineCount = readFileSync(fullPath, 'utf8').split('\n').length
    if (lineCount > maxLines) {
      failures.push(`${relative(process.cwd(), fullPath)} has ${lineCount} lines; max is ${maxLines}`)
    }
  }
}

for (const root of roots) {
  walk(root)
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`File-size check passed: no checked source file exceeds ${maxLines} lines.`)
