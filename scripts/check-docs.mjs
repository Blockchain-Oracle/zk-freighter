import { readFileSync } from 'node:fs'

// Only public, tracked docs. AI-agent working files (.thoughts, AGENTS.md) are
// gitignored and must not be a build dependency.
const files = [
  'README.md',
  'docs/SUBMISSION-PACKAGE.md',
]

const stalePatterns = [
  // Case-sensitive: catches the stale camelCase brand without flagging the
  // all-lowercase domain zkfreighter.app.
  /zkFreighter/,
  /product name:\s*TBD/i,
  /brand pending/i,
  /brand TBD/i,
  /DEFAULT-OUT/i,
  /exact receive-code encoding\/copy/i,
  /receive-code encoding\/copy/i,
]

const overclaimPatterns = [/\banonymous\b/i, /\bfully private\b/i, /\buntraceable\b/i]

const allowedOverclaimContext = /not |never|avoid|forbidden|do not|must avoid|must not|no |claims?/i
const standaloneForbiddenTerm = /^\s*-\s*`(?:anonymous|fully private|untraceable)`\s*$/i

const failures = []

for (const file of files) {
  const lines = readFileSync(file, 'utf8').split('\n')

  lines.forEach((line, index) => {
    for (const pattern of stalePatterns) {
      if (pattern.test(line)) {
        failures.push(`${file}:${index + 1}: stale phrase matched ${pattern}`)
      }
    }

    for (const pattern of overclaimPatterns) {
      if (
        pattern.test(line) &&
        !allowedOverclaimContext.test(line) &&
        !standaloneForbiddenTerm.test(line)
      ) {
        failures.push(`${file}:${index + 1}: possible unsupported privacy claim: ${line.trim()}`)
      }
    }
  })
}

if (failures.length > 0) {
  console.error(failures.join('\n'))
  process.exit(1)
}

console.log(`Docs consistency check passed for ${files.length} files.`)
