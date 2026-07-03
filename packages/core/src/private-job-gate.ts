/**
 * Module-level serialization gate for privacy jobs (shield, unshield, send, auto-shield).
 * The underlying proving runtime is not safe to drive concurrently, and MV3 background
 * handlers can interleave, so every entry point routes through `runExclusive` to force a
 * single in-flight job at a time via a shared promise chain.
 */

let chain: Promise<unknown> = Promise.resolve()

/**
 * Queues `job` behind any jobs already running on the shared chain and resolves (or
 * rejects) with its result. A rejected job never breaks the chain — later jobs still run.
 */
export function runExclusive<T>(job: () => Promise<T>): Promise<T> {
  const result = chain.then(job, job)
  chain = result.then(noop, noop)
  return result
}

function noop(): void {}
