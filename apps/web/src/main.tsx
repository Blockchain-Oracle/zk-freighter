import { createRoot } from 'react-dom/client'
import './runtime-env'
import '@zk-freighter/ui/theme.css'
import App from './App.tsx'
import { runPendingPrivateEngineStorageReset } from './privateEngineStorage'

void (async () => {
  const reset = await runPendingPrivateEngineStorageReset()
  if (reset && !reset.ok) {
    console.warn('[private-engine-storage] reset failed', reset.error)
  }
  createRoot(document.getElementById('root')!).render(<App />)
})()
