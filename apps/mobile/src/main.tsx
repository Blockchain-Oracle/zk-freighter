import React from 'react'
import ReactDOM from 'react-dom/client'
import '@zk-freighter/ui/theme.css'
import './mobile.css'
import './mobile-access.css'
import './mobile-receive-tools.css'
import './mobile-flows.css'
import './mobile-bridge.css'
import './mobile-confidential.css'
import './mobile-scan.css'
import { BrandIntro } from '@zk-freighter/ui'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrandIntro storageKey="zkf.intro.mobile.v1" soundSrc="/intro-welcome.mp3" />
    <App />
  </React.StrictMode>,
)
