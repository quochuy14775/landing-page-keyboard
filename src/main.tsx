import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
// variable fonts: one file per script subset, the browser only fetches the subsets a page uses
import '@fontsource-variable/inter'
import '@fontsource-variable/bricolage-grotesque'
import '@fontsource-variable/jetbrains-mono'
import './index.css'
import Root from './Root.tsx'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
