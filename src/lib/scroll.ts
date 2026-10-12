import { useEffect, type RefObject } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { setShot, story, type Shot } from './story'

gsap.registerPlugin(ScrollTrigger)

export let lenis: Lenis | null = null

/** Lenis smooth scroll driven by GSAP's ticker so ScrollTrigger and Lenis share one RAF. */
export function useSmoothScroll() {
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    story.reducedMotion = reduce
    if (reduce) return
    const l = new Lenis({ lerp: 0.1, wheelMultiplier: 0.9 })
    lenis = l
    l.on('scroll', ScrollTrigger.update)
    const tick = (t: number) => l.raf(t * 1000)
    gsap.ticker.add(tick)
    gsap.ticker.lagSmoothing(0)
    return () => {
      gsap.ticker.remove(tick)
      l.destroy()
      lenis = null
    }
  }, [])
}

export function scrollToId(id: string) {
  const el = document.getElementById(id)
  if (!el) return
  if (lenis) lenis.scrollTo(el, { offset: 0, duration: 1.4 })
  else el.scrollIntoView({ behavior: 'smooth' })
}

type Opts = {
  /** shots visited in order while scrolling through the element */
  path: Shot[]
  /** relative length of each leg (path.length - 1 entries); equal by default */
  weights?: number[]
  start?: string
  end?: string
  /** raw 0..1 progress of the whole element */
  onProgress?: (p: number) => void
  /**
   * 'first': also own the scene above this element (top of the page);
   * 'last': also own it below (the tail of the page). Middle sections only
   * drive the scene while active, so a fast jump can't leave a stale shot.
   */
  edge?: 'first' | 'last'
}

/** Map the scroll progress through `ref` onto a sequence of camera/scene shots. */
export function useStoryTrigger(ref: RefObject<HTMLElement | null>, opts: Opts) {
  const { path, weights, start = 'top top', end = 'bottom bottom', onProgress, edge } = opts
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const w = weights ?? path.slice(1).map(() => 1)
    const total = w.reduce((a, b) => a + b, 0)
    const apply = (p: number) => {
      let acc = 0
      for (let i = 0; i < w.length; i++) {
        const len = w[i] / total
        if (p <= acc + len || i === w.length - 1) {
          setShot(path[i], path[i + 1], (p - acc) / len)
          break
        }
        acc += len
      }
      onProgress?.(p)
    }
    const st = ScrollTrigger.create({
      trigger: el,
      start,
      end,
      // only the section currently on screen may drive the scene; on refresh every
      // trigger reports once and the last one would otherwise win
      onUpdate: (self) => self.isActive && apply(self.progress),
      onToggle: (self) => self.isActive && apply(self.progress),
      onLeaveBack: edge === 'first' ? () => apply(0) : undefined,
      onLeave: edge === 'last' ? () => apply(1) : undefined,
    })
    // a reload in the middle/top of the page: let the owning section paint its shot
    if (st.isActive) apply(st.progress)
    else if (edge === 'first' && st.progress === 0) apply(0)
    else if (edge === 'last' && st.progress === 1) apply(1)
    return () => st.kill()
  }, [ref, path, weights, start, end, onProgress, edge])
}
