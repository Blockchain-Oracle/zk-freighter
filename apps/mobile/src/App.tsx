import { MobileApp } from './MobileApp'

export function App({ initialChoice }: { initialChoice?: 'create' | 'import' } = {}) {
  return <MobileApp initialChoice={initialChoice} />
}
