import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/runtime-env'
import '@zk-freighter/ui/theme.css'

import { ExtensionOnboarding } from '../../src/ExtensionOnboarding'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ExtensionOnboarding />
  </React.StrictMode>,
)
