import { useSyncExternalStore } from 'react'

// Keyboard sounds. Off by default (browsers block audio before a user gesture,
// and an unexpected sound on page load is hostile). Real recordings in
// /public/sounds/ are used when present; otherwise a synthesized "thock" plays.
const SAMPLE_URLS = {
  down: '/sounds/key-down.mp3',
  up: '/sounds/key-up.mp3',
  space: '/sounds/space-down.mp3',
}
type Kind = keyof typeof SAMPLE_URLS

let ctx: AudioContext | null = null
let master: GainNode | null = null
let noise: AudioBuffer | null = null
let enabled = false
const samples: Partial<Record<Kind, { buf: AudioBuffer; start: number }>> = {}

/** Seconds of silence before the hit, so playback starts right on the transient. */
function findOnset(buf: AudioBuffer) {
  const d = buf.getChannelData(0)
  let peak = 0
  for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]))
  const thr = peak * 0.1
  for (let i = 0; i < d.length; i++) if (Math.abs(d[i]) > thr) return Math.max(0, i / buf.sampleRate - 0.002)
  return 0
}

// how a missing sample is derived from the key-down recording
const FALLBACK: Record<Kind, { rate: number; gain: number }> = {
  down: { rate: 1, gain: 1 },
  up: { rate: 1.3, gain: 0.3 },
  space: { rate: 0.82, gain: 1.15 },
}
const MAX_LEN = 0.15
const listeners = new Set<() => void>()

function init() {
  if (ctx) return
  ctx = new AudioContext()
  master = ctx.createGain()
  master.gain.value = 0.55
  master.connect(ctx.destination)
  noise = ctx.createBuffer(1, ctx.sampleRate * 0.2, ctx.sampleRate)
  const d = noise.getChannelData(0)
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
  for (const [kind, url] of Object.entries(SAMPLE_URLS) as [Kind, string][]) {
    fetch(url)
      .then((r) => (r.ok && r.headers.get('content-type')?.startsWith('audio') ? r.arrayBuffer() : null))
      .then((b) => (b ? ctx!.decodeAudioData(b) : null))
      .then((buf) => buf && (samples[kind] = { buf, start: findOnset(buf) }))
      .catch(() => {})
  }
}

function synth(kind: Kind, t: number) {
  const c = ctx!
  const out = c.createGain()
  out.connect(master!)
  const low = kind === 'space' ? 0.75 : 1
  // body: short filtered noise burst
  const src = c.createBufferSource()
  src.buffer = noise
  src.playbackRate.value = 0.9 + Math.random() * 0.2
  const bp = c.createBiquadFilter()
  bp.type = 'bandpass'
  bp.frequency.value = (kind === 'up' ? 2600 : 1500) * low * (0.9 + Math.random() * 0.2)
  bp.Q.value = 1.4
  const env = c.createGain()
  const peak = kind === 'up' ? 0.18 : 0.5
  env.gain.setValueAtTime(0, t)
  env.gain.linearRampToValueAtTime(peak, t + 0.002)
  env.gain.exponentialRampToValueAtTime(0.001, t + (kind === 'up' ? 0.03 : 0.06))
  src.connect(bp).connect(env).connect(out)
  src.start(t)
  src.stop(t + 0.1)
  if (kind === 'up') return
  // thock: low resonant thump from the case
  const osc = c.createOscillator()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(260 * low, t)
  osc.frequency.exponentialRampToValueAtTime(120 * low, t + 0.05)
  const og = c.createGain()
  og.gain.setValueAtTime(0, t)
  og.gain.linearRampToValueAtTime(0.35, t + 0.003)
  og.gain.exponentialRampToValueAtTime(0.001, t + 0.09)
  osc.connect(og).connect(out)
  osc.start(t)
  osc.stop(t + 0.12)
}

export function playKey(kind: Kind) {
  if (!enabled || !ctx || ctx.state !== 'running') return
  const t = ctx.currentTime
  const own = samples[kind]
  const sample = own ?? samples.down
  if (sample) {
    const f = own ? FALLBACK.down : FALLBACK[kind]
    const s = ctx.createBufferSource()
    s.buffer = sample.buf
    s.playbackRate.value = f.rate * (0.96 + Math.random() * 0.08)
    const g = ctx.createGain()
    const level = f.gain * (0.85 + Math.random() * 0.3)
    g.gain.setValueAtTime(level, t)
    g.gain.setValueAtTime(level, t + MAX_LEN * 0.7)
    g.gain.linearRampToValueAtTime(0, t + MAX_LEN) // short fade, no click at the cut
    s.connect(g).connect(master!)
    s.start(t, sample.start, MAX_LEN * f.rate)
  } else synth(kind, t)
}

export function setSoundEnabled(on: boolean) {
  if (on) {
    init()
    void ctx!.resume()
  }
  enabled = on
  listeners.forEach((l) => l())
}

export const hasRealSamples = () => Boolean(samples.down)

export function useSoundEnabled() {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => enabled,
  )
}
