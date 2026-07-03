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
import { Root } from './Root'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>,
)
