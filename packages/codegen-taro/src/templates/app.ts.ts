export function generateAppTs(): string {
  return `import { PropsWithChildren } from 'react'
import './app.scss'

function App({ children }: PropsWithChildren) {
  return children
}

export default App
`
}
