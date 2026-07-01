import { createRoot } from 'react-dom/client'
import './runtime-env'
import '@zk-fighter/ui/theme.css'
import App from './App.tsx'

createRoot(document.getElementById('root')!).render(<App />)
