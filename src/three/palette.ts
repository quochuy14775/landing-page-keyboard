import * as THREE from 'three'
import { story } from '../lib/story'

// LED colours are designed in Blender (scene "RGB_Design", materials LED_Palette_*)
// and exported by the "export_led_palettes.py" text block as 256x1 PNG strips in
// /public/led. Shaders sample the strip; the motion (effects below) stays in code.

export const DEFAULT_PALETTE = 'rainbow'

const white = new THREE.DataTexture(new Uint8Array([255, 255, 255, 255]), 1, 1)
white.needsUpdate = true

/** Shared uniform: every LED shader references this object, so swapping .value recolours all of them. */
export const ledPalette = { value: white as THREE.Texture }

const loader = new THREE.TextureLoader()
const cache = new Map<string, Promise<THREE.Texture>>()

function load(id: string) {
  let p = cache.get(id)
  if (!p) {
    p = loader.loadAsync(`/led/${id}.png`).then((t) => {
      t.colorSpace = THREE.SRGBColorSpace
      t.wrapS = THREE.RepeatWrapping // the sweep scrolls past the end of the strip
      t.wrapT = THREE.ClampToEdgeWrapping
      t.generateMipmaps = false
      t.minFilter = THREE.LinearFilter
      t.magFilter = THREE.LinearFilter
      return t
    })
    cache.set(id, p)
  }
  return p
}

export function setPalette(id: string) {
  load(id)
    .then((t) => {
      ledPalette.value = t
      story.invalidate()
    })
    .catch(() => {})
}

setPalette(DEFAULT_PALETTE)

// ---------------------------------------------------------------- effects

export const LED_EFFECTS = [
  { id: 'wave', label: 'Sóng âm' },
  { id: 'ripple', label: 'Gợn sóng' },
  { id: 'sweep', label: 'Dải màu' },
] as const
export type LedEffect = (typeof LED_EFFECTS)[number]['id']

// plate-space footprint of the key area (metres): x left->right, y front->back
export const PLATE_W = 0.305
export const PLATE_D = 0.119
const BARS = 16
const RIPPLES = 8

/** Shared effect uniforms (same objects in every LED shader). */
export const ledFx = {
  uPalette: ledPalette,
  uMode: { value: 0 },
  uFxTime: { value: 0 },
  uBars: { value: new Float32Array(BARS) },
  uRipples: { value: Array.from({ length: RIPPLES }, () => new THREE.Vector4(0, 0, -99, 0)) },
}

export function setLedEffect(id: LedEffect) {
  ledFx.uMode.value = id === 'wave' ? 0 : id === 'ripple' ? 1 : 2
  story.invalidate()
}

// simulation state
const energy = new Float32Array(BARS)
let nextRipple = 0

/** A key went down at plate-space (x, back): kick the equaliser columns and spawn a ripple. */
export function ledKeyHit(x: number, back: number, strength = 1) {
  const col = (x / PLATE_W + 0.5) * BARS
  for (let c = 0; c < BARS; c++) energy[c] = Math.min(1.2, energy[c] + 0.85 * strength * Math.exp(-((c + 0.5 - col) ** 2) / 3))
  ledFx.uRipples.value[nextRipple].set(x, back, ledFx.uFxTime.value, strength)
  nextRipple = (nextRipple + 1) % RIPPLES
}

/** Advance the effect clock and the equaliser; call once per frame while the LEDs are on. */
export function stepLedFx(dt: number) {
  const t = (ledFx.uFxTime.value += dt)
  const bars = ledFx.uBars.value
  for (let c = 0; c < BARS; c++) {
    // idle "music": a few detuned sines per column, so the bars always dance a little
    const idle = 0.42 + 0.2 * Math.sin(t * 2.3 + c * 0.75) + 0.14 * Math.sin(t * 3.9 - c * 1.31) + 0.1 * Math.sin(t * 6.1 + c * 2.17)
    energy[c] *= Math.exp(-dt * 2.6)
    const target = Math.min(1, Math.max(0.04, idle + energy[c]))
    // VU-meter ballistics: jump up fast, fall back slowly
    const k = target > bars[c] ? 1 - Math.exp(-dt * 30) : 1 - Math.exp(-dt * 5)
    bars[c] += (target - bars[c]) * k
  }
}

/**
 * GLSL: palette lookup + effect evaluation.
 * ledFx(uv, p): uv = position over the key area (0..1, x left->right, y front->back),
 *               p  = the same position in metres from the centre.
 */
export const PALETTE_GLSL = /* glsl */ `
uniform sampler2D uPalette;
uniform int uMode;
uniform float uFxTime;
uniform float uBars[${BARS}];
uniform vec4 uRipples[${RIPPLES}];
vec3 ledColor(float h) { return texture2D(uPalette, vec2(fract(h), 0.5)).rgb; }
vec3 ledFx(vec2 uv, vec2 p) {
  if (uMode == 0) {
    // equaliser: each of the ${BARS} columns lights from the front row up to its bar height
    float col = clamp(floor(uv.x * ${BARS}.0), 0.0, ${BARS - 1}.0);
    float h = uBars[int(col)];
    float fromFront = clamp(1.0 - uv.y, 0.0, 1.0);
    float lit = smoothstep(h + 0.05, h - 0.05, fromFront);
    float cap = exp(-pow((fromFront - h) / 0.035, 2.0)) * 0.6; // bright tip at the top of the bar
    return ledColor(fromFront * 0.8 + col * 0.012) * (0.05 + lit + cap);
  }
  if (uMode == 1) {
    // ripples: a ring of light expanding from every key hit
    vec3 c = ledColor(uv.x * 0.6 - uFxTime * 0.05) * 0.06;
    for (int i = 0; i < ${RIPPLES}; i++) {
      vec4 r = uRipples[i];
      float age = uFxTime - r.z;
      if (age < 0.0 || age > 1.4) continue;
      float d = distance(p, r.xy);
      float ring = exp(-pow((d - age * 0.24) / 0.016, 2.0)) * (1.0 - age / 1.4) * r.w;
      c += ledColor(d * 2.5 + float(i) * 0.13) * ring * 1.6;
    }
    return c;
  }
  return ledColor(uv.x * 0.9 - uFxTime * 0.08);
}
`

if (import.meta.env.DEV) (window as unknown as { __ledFx: typeof ledFx }).__ledFx = ledFx
