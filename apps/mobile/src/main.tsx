import React from 'react'
import ReactDOM from 'react-dom/client'
import '@zk-fighter/ui/theme.css'
import './mobile.css'
import './mobile-access.css'
import './mobile-receive-tools.css'
import './mobile-flows.css'
import './mobile-bridge.css'
import './mobile-confidential.css'
import './mobile-scan.css'
import { App } from './App'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
