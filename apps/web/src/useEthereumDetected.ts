import { useEffect, useState } from 'react'
import { providerAvailable } from './ethereum-provider'

const ethereumDetectionDelayMs = 500
const ethereumDetectionIntervalMs = 1_000

export function useEthereumDetected(): boolean {
  const [ethereumDetected, setEthereumDetected] = useState(false)

  useEffect(() => {
    const update = () => setEthereumDetected(providerAvailable())
    update()
    const timer = window.setTimeout(update, ethereumDetectionDelayMs)
    const interval = window.setInterval(update, ethereumDetectionIntervalMs)
    window.addEventListener('ethereum#initialized', update, { once: true })
    window.addEventListener('eip6963:announceProvider', update)
    return () => {
      window.clearTimeout(timer)
      window.clearInterval(interval)
      window.removeEventListener('ethereum#initialized', update)
      window.removeEventListener('eip6963:announceProvider', update)
    }
  }, [])

  return ethereumDetected
}
