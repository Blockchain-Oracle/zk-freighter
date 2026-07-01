import { restartNethermindWebClientCache } from './nethermind-runtime'

let timeoutRestart: Promise<void> | null = null

export async function withPrivateRuntimeTimeout<T>(
  work: Promise<T>,
  timeoutMs: number,
  label: string,
): Promise<T> {
  if (timeoutMs <= 0) return work
  let timer: ReturnType<typeof setTimeout> | undefined
  return Promise.race([
    work,
    new Promise<T>((_resolve, reject) => {
      timer = setTimeout(() => {
        console.warn('[private-runtime] timeout', { label, timeoutMs })
        if (!timeoutRestart) {
          timeoutRestart = restartNethermindWebClientCache()
            .catch((error) => console.warn('[private-runtime] restart after timeout failed', error))
            .finally(() => {
              timeoutRestart = null
            })
        }
        reject(new Error(`ZKF_RUNTIME_TIMEOUT: ${label} after ${Math.round(timeoutMs / 1000)}s. The local private engine is being restarted.`))
      }, timeoutMs)
    }),
  ]).finally(() => {
    if (timer) clearTimeout(timer)
  })
}
