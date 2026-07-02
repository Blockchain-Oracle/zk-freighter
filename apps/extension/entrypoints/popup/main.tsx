import React from 'react'
import { createRoot } from 'react-dom/client'
import '../../src/runtime-env'
import '@zk-freighter/ui/theme.css'
import { BrandIntro } from '@zk-freighter/ui'

import { ExtensionApp } from '../../src/ExtensionApp'

createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <BrandIntro storageKey="zkf.intro.extension.v1" />
    <ExtensionApp />
  </React.StrictMode>,
)
