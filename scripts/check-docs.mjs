import { readFileSync } from 'node:fs'

const files = [
  'AGENTS.md',
  'README.md',
  '.thoughts/specs/2026-06-22-zk-freighter-product-spec.md',
  '.thoughts/stories/2026-06-22-zk-freighter-mvp-stories.md',
  '.thoughts/quality/2026-06-22-project-quality-profile.md',
  '.thoughts/plans/2026-06-22-zk-freighter-implementation-plan.md',
  '.thoughts/handoffs/2026-06-22-codex-build-prompts.md',
]

const stalePatterns = [
  /zkFreighter/i,
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
