import { describe, expect, it } from 'vitest'
import { runExclusive } from './private-job-gate'

function deferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })
  return { promise, resolve, reject }
}

// Flush the microtask + macrotask queue so chained jobs get a chance to start.
const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0))

describe('runExclusive', () => {
  it('runs queued jobs one at a time in order', async () => {
    const events: string[] = []
    const first = deferred<void>()
    const second = deferred<void>()

    const p1 = runExclusive(async () => {
      events.push('start-1')
      await first.promise
      events.push('end-1')
    })
    const p2 = runExclusive(async () => {
      events.push('start-2')
      await second.promise
      events.push('end-2')
    })

    await tick()
    // Second job must not start until the first finishes.
    expect(events).toEqual(['start-1'])

    first.resolve()
    await p1
    await tick()
    expect(events).toEqual(['start-1', 'end-1', 'start-2'])

    second.resolve()
    await p2
    expect(events).toEqual(['start-1', 'end-1', 'start-2', 'end-2'])
  })

  it('does not let a rejected job break the chain', async () => {
    const failing = runExclusive(async () => {
      throw new Error('boom')
    })
    await expect(failing).rejects.toThrow('boom')

    const order: string[] = []
    const ok = await runExclusive(async () => {
      order.push('ran')
      return 42
    })
    expect(ok).toBe(42)
    expect(order).toEqual(['ran'])
  })

  it('serializes even when a later job is queued before an earlier one rejects', async () => {
    const gate = deferred<void>()
    const results: string[] = []

    const failing = runExclusive(async () => {
      await gate.promise
      throw new Error('nope')
    }).catch(() => results.push('failed'))

    const following = runExclusive(async () => {
      results.push('following')
    })

    gate.resolve()
    await Promise.all([failing, following])
    expect(results).toEqual(['failed', 'following'])
  })
})
