import { lazy, Suspense } from 'react'
import { useSmoothScroll } from './lib/scroll'
import { Preloader, SectionRail, StickyBuy } from './components/Chrome'
import { Header } from './components/Navbar'
import { Buy, Connect, Hero, Keycaps, Knob, Rgb, Sound, Specs, Structure } from './components/Sections'

// three.js lives in its own chunk; the page shell and text render before it arrives
const Experience = lazy(() => import('./three/Experience'))

export default function App() {
  useSmoothScroll()
  return (
    <>
      {/* night backdrop for the RGB scene, faded by the camera rig through --dark */}
      <div className="pointer-events-none fixed inset-0 z-0 bg-night" style={{ opacity: 'var(--dark, 0)' }} />
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[radial-gradient(60%_50%_at_50%_45%,#ffffff_0%,transparent_70%)]"
        style={{ opacity: 'calc(1 - var(--dark, 0))' }}
      />
      <Suspense fallback={null}>
        <Experience />
      </Suspense>
      <Preloader />
      <Header />
      <main className="story relative">
        <Hero />
        <Keycaps />
        <Knob />
        <Structure />
        <Sound />
        <Connect />
        <Rgb />
        <Specs />
        <Buy />
      </main>
      <SectionRail />
      <StickyBuy />
    </>
  )
}
