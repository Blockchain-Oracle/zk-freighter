import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/runtime-env'
import '@zk-fighter/ui/theme.css'

import { ExtensionApp } from '../../src/ExtensionApp'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ExtensionApp />
  </React.StrictMode>,
)
