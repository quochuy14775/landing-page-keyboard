// Shared, mutable scene state. Scroll handlers write `goal`; the 3D loop damps
// `cur` toward it. Nothing here goes through React state, so scrolling never
// re-renders the component tree.

export type Vec3 = [number, number, number]

export type Shot = {
  cam: Vec3
  target: Vec3
  /** target X on portrait phones, where copy sits below the board instead of beside it */
  px?: number
  explode: number
  knob: number
  led: number
  dark: number
}

export const SHOTS = {
  hero: { cam: [0.2, 0.3, 0.46], target: [0.02, 0.0, 0.0], explode: 0, knob: 0, led: 0, dark: 0 },
  heroOut: { cam: [0.02, 0.24, 0.3], target: [-0.02, 0.02, 0.0], explode: 0, knob: 0, led: 0, dark: 0 },
  keys: { cam: [-0.12, 0.13, 0.17], target: [-0.04, 0.025, 0.01], explode: 0, knob: 0, led: 0, dark: 0 },
  keysEnd: { cam: [-0.02, 0.12, 0.19], target: [0.02, 0.025, 0.0], explode: 0, knob: 0, led: 0, dark: 0 },
  knob: { cam: [0.24, 0.11, 0.07], target: [0.12, 0.04, -0.045], explode: 0, knob: 0, led: 0, dark: 0 },
  knobEnd: { cam: [0.22, 0.14, 0.02], target: [0.12, 0.04, -0.045], explode: 0, knob: Math.PI * 1.5, led: 0, dark: 0 },
  structure: { cam: [0.62, 0.36, 0.62], target: [0.14, 0.07, 0.0], px: 0.0, explode: 0, knob: Math.PI * 1.5, led: 0, dark: 0 },
  structureEnd: { cam: [0.8, 0.5, 0.74], target: [0.2, 0.19, 0.0], px: 0.03, explode: 1, knob: Math.PI * 1.5, led: 0, dark: 0 },
  sound: { cam: [0.0, 0.1, 0.5], target: [0.0, 0.03, 0.0], explode: 0, knob: 0, led: 0, dark: 0 },
  connect: { cam: [0.12, 0.13, -0.42], target: [-0.04, 0.015, 0.0], explode: 0, knob: 0, led: 0, dark: 0 },
  connectEnd: { cam: [-0.14, 0.11, -0.38], target: [-0.04, 0.015, 0.0], explode: 0, knob: 0, led: 0, dark: 0 },
  rgb: { cam: [0.0, 0.42, 0.34], target: [0.0, 0.0, 0.0], explode: 0, knob: 0, led: 0, dark: 1 },
  rgbEnd: { cam: [0.08, 0.3, 0.4], target: [0.0, 0.0, 0.0], explode: 0, knob: 0, led: 1, dark: 1 },
  outro: { cam: [0.26, 0.34, 0.5], target: [0.0, 0.0, 0.0], explode: 0, knob: 0, led: 0.15, dark: 0 },
} satisfies Record<string, Shot>

const clone = (s: Shot): Shot => ({ ...s, cam: [...s.cam] as Vec3, target: [...s.target] as Vec3, px: s.px ?? s.target[0] })

export const story = {
  goal: clone(SHOTS.hero),
  cur: clone(SHOTS.hero),
  /** key object name -> 0..1 press amount wanted */
  press: new Map<string, number>(),
  /** key under the pointer (gets a small pre-travel hint) */
  hover: null as string | null,
  /** key held down with the pointer */
  held: null as string | null,
  /** 0..11 index of the layer the structure section is talking about, -1 none */
  focusLayer: -1,
  interactive: true,
  reducedMotion: false,
  invalidate: () => {},
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * t
const ease = (t: number) => t * t * (3 - 2 * t)

export function setShot(a: Shot, b: Shot, t: number) {
  const k = ease(Math.min(1, Math.max(0, t)))
  const g = story.goal
  for (let i = 0; i < 3; i++) g.target[i] = lerp(a.target[i], b.target[i], k)
  // orbit the camera around the target (radius / azimuth / elevation) instead of a
  // straight line, so front-to-back moves arc around the board rather than skim its keys
  const sph = (s: Shot) => {
    const x = s.cam[0] - s.target[0]
    const y = s.cam[1] - s.target[1]
    const z = s.cam[2] - s.target[2]
    const r = Math.hypot(x, y, z)
    return { r, az: Math.atan2(x, z), el: Math.asin(y / r) }
  }
  const sa = sph(a)
  const sb = sph(b)
  let dAz = sb.az - sa.az
  if (dAz > Math.PI) dAz -= Math.PI * 2
  if (dAz < -Math.PI) dAz += Math.PI * 2
  const r = lerp(sa.r, sb.r, k)
  const az = sa.az + dAz * k
  const el = lerp(sa.el, sb.el, k)
  g.cam[0] = g.target[0] + r * Math.cos(el) * Math.sin(az)
  g.cam[1] = g.target[1] + r * Math.sin(el)
  g.cam[2] = g.target[2] + r * Math.cos(el) * Math.cos(az)
  g.px = lerp(a.px ?? a.target[0], b.px ?? b.target[0], k)
  g.explode = lerp(a.explode, b.explode, k)
  g.knob = lerp(a.knob, b.knob, k)
  g.led = lerp(a.led, b.led, k)
  g.dark = lerp(a.dark, b.dark, k)
  story.invalidate()
}

if (import.meta.env.DEV) (window as unknown as { __story: typeof story }).__story = story
