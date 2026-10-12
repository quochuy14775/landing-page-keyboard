import { useSyncExternalStore } from 'react'

export const CHAPTERS = [
  { id: 'top', label: 'Mở đầu' },
  { id: 'keycap', label: 'Keycap' },
  { id: 'knob', label: 'Núm nhôm' },
  { id: 'cau-truc', label: 'Cấu trúc' },
  { id: 'am-thanh', label: 'Âm thanh' },
  { id: 'ket-noi', label: 'Kết nối' },
  { id: 'rgb', label: 'RGB' },
  { id: 'thong-so', label: 'Thông số' },
  { id: 'mua-ngay', label: 'Mua ngay' },
] as const

export type ChapterId = (typeof CHAPTERS)[number]['id']

// One passive scroll listener for the whole app; section offsets are cached and
// only re-measured on resize, so scrolling never forces layout.
let tops: number[] = []
let active = 0
const listeners = new Set<() => void>()
let raf = 0

function measure() {
  tops = CHAPTERS.map((c) => document.getElementById(c.id)?.getBoundingClientRect().top ?? 0).map(
    (t) => t + window.scrollY,
  )
}

function update() {
  raf = 0
  if (!tops.length) measure()
  const probe = window.scrollY + window.innerHeight * 0.45
  let idx = 0
  for (let i = 0; i < tops.length; i++) if (tops[i] <= probe) idx = i
  if (idx !== active) {
    active = idx
    listeners.forEach((l) => l())
  }
}

const schedule = () => {
  if (!raf) raf = requestAnimationFrame(update)
}

function subscribe(l: () => void) {
  if (!listeners.size) {
    window.addEventListener('scroll', schedule, { passive: true })
    window.addEventListener('resize', remeasure)
    // fonts and lazy sections change heights after first paint
    setTimeout(remeasure, 600)
    setTimeout(remeasure, 2500)
  }
  listeners.add(l)
  return () => {
    listeners.delete(l)
    if (!listeners.size) {
      window.removeEventListener('scroll', schedule)
      window.removeEventListener('resize', remeasure)
    }
  }
}

function remeasure() {
  measure()
  schedule()
}

/** Index into CHAPTERS of the section currently in view. */
export function useActiveChapter() {
  return useSyncExternalStore(subscribe, () => active)
}
