import React from 'react'
import { createRoot } from 'react-dom/client'

import { ExtensionApp } from '../../src/ExtensionApp'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ExtensionApp surface="side panel" />
  </React.StrictMode>,
)
