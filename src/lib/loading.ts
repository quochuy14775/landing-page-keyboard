import { useSyncExternalStore } from 'react'

// Tiny load-progress store so the preloader can live in the main bundle
// without importing three.js (the 3D chunk reports into it once it loads).
let state = { progress: 0, done: false }
const listeners = new Set<() => void>()

export function reportLoading(progress: number, done: boolean) {
  if (progress === state.progress && done === state.done) return
  state = { progress, done }
  listeners.forEach((l) => l())
}

export function useLoading() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}
