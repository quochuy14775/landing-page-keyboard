import { lazy, Suspense } from 'react'
import App from './App.tsx'

// Tiny path switch: the interactive 3D viewer lives on its own page and in its own chunk.
const Viewer = lazy(() => import('./viewer/Viewer.tsx'))
const isViewer = window.location.pathname.replace(/\/$/, '') === '/trai-nghiem-3d'

export default function Root() {
  return isViewer ? (
    <Suspense fallback={null}>
      <Viewer />
    </Suspense>
  ) : (
    <App />
  )
}
