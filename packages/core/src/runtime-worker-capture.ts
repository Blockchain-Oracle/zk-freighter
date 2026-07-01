const runtimeWorkerReleaseDelayMs = 75

type RuntimeWorker = { terminate?: () => void }
type WorkerGlobal = typeof globalThis & { Worker?: new (...args: readonly unknown[]) => RuntimeWorker }

export async function captureRuntimeWorkers<T>(
  create: () => Promise<T>,
): Promise<{ readonly result: T; readonly workers: readonly RuntimeWorker[] }> {
  const workerGlobal = globalThis as WorkerGlobal
  const OriginalWorker = workerGlobal.Worker
  const originalDescriptor = Object.getOwnPropertyDescriptor(workerGlobal, 'Worker')
  const workers: RuntimeWorker[] = []
  if (!OriginalWorker) {
    return { result: await create(), workers }
  }

  const trackedWorker = new Proxy(OriginalWorker, {
    construct(target, args, newTarget) {
      const worker = Reflect.construct(target, args, newTarget) as RuntimeWorker
      workers.push(worker)
      return worker
    },
  })

  try {
    Object.defineProperty(workerGlobal, 'Worker', {
      configurable: true,
      writable: true,
      value: trackedWorker,
    })
  } catch {
    return { result: await create(), workers }
  }

  try {
    const result = await create()
    return { result, workers }
  } catch (error) {
    terminateRuntimeWorkers(workers)
    throw error
  } finally {
    if (originalDescriptor) {
      Object.defineProperty(workerGlobal, 'Worker', originalDescriptor)
    } else {
      delete (workerGlobal as { Worker?: unknown }).Worker
    }
  }
}

export function terminateRuntimeWorkers(workers: readonly RuntimeWorker[]): number {
  let terminated = 0
  for (const worker of workers) {
    try {
      if (typeof worker.terminate === 'function') {
        worker.terminate()
        terminated += 1
      }
    } catch (error) {
      console.warn('[nethermind-runtime] worker termination failed', error)
    }
  }
  return terminated
}

export async function waitForRuntimeWorkersToClose(terminated: number): Promise<void> {
  if (terminated <= 0 || typeof setTimeout !== 'function') return
  await new Promise((resolve) => setTimeout(resolve, runtimeWorkerReleaseDelayMs))
}
