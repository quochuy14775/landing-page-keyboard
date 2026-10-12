/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame by design */
import { useEffect, useMemo, useRef } from 'react'
import { useFrame, type ThreeEvent } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import * as THREE from 'three'
import { story } from '../lib/story'
import { playKey } from '../lib/sound'

const MODEL_URL = '/models/aula_f75.glb'

// Layer stack, top -> bottom, with the lift (in "steps") each layer travels when exploded.
const LAYERS: [string, number][] = [
  ['L_Knob', 12],
  ['L_Keycaps', 11],
  ['L_UpperCover', 10.2],
  ['L_Switches', 8],
  ['L_Plate', 7],
  ['L_PO_Foam', 6],
  ['L_IXPE_Pad', 5],
  ['L_PET_Pad', 4],
  ['L_PCB', 3],
  ['L_PO_BaseFoam', 2],
  ['L_Silicone_Mat', 1],
  ['L_BottomCase', 0],
]
const STEP = 0.028 // metres per step, same spacing as the Blender animation
const STAGGER = 0.045
const KEY_TRAVEL = 0.0038
const HOVER_HINT = 0.16 // fraction of travel a key dips when hovered

// Key press/release motion is authored in Blender (scene "KeyPressAnim", actions
// KeyPress / KeyRelease on the KeyPressCurve empty) and exported as two tiny
// cubic-spline clips. Every key plays them on demand, so 80 keys share one curve.
const KEY_ANIM_URL = '/models/key_press.glb'
type Curve = { duration: number; at: (t: number) => number }
function toCurve(clip: THREE.AnimationClip | undefined): Curve | null {
  const track = clip?.tracks.find((t) => t.name.endsWith('.position'))
  if (!clip || !track) return null
  // createInterpolant is public at runtime (GLTFLoader swaps in a cubic-spline one) but untyped
  const interp = (track as THREE.KeyframeTrack & { createInterpolant(): THREE.Interpolant }).createInterpolant()
  // Blender Z (down = negative) arrives as glTF Y; normalise to 0 (rest) .. 1 (bottom-out)
  return { duration: clip.duration, at: (t) => -(interp.evaluate(Math.min(t, clip.duration))[1] as number) / KEY_TRAVEL }
}
type KeyState = { mode: 'idle' | 'down' | 'up'; t: number; from: number; x: number }
const FOCUS_LIFT = 0.008

// see-through parts: transmission is too expensive for the web, fake it with opacity
const SEE_THROUGH: Record<string, number> = {
  Plate_PC: 0.6,
  Switch_Top: 0.5,
  Pad_PET: 0.8,
  Silicone: 0.85,
}

type KeyRig = { parts: THREE.Object3D[]; base: number[] }

const glowVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const glowFrag = /* glsl */ `
uniform float uTime; uniform float uIntensity; uniform sampler2D uMask; varying vec2 vUv;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  // per-LED light pools: brightest right under each switch, dark between them
  float m = texture2D(uMask, vUv).r;
  vec3 c = hue(vUv.x * 0.9 - uTime * 0.08);
  gl_FragColor = vec4(c * m * uIntensity * 1.8, 1.0);
}
`

// Plate-sized mask with one soft light pool per switch LED. South-facing PCB:
// the LED sits ~4.7 mm in front of the switch centre, one per key (wide keys too).
const GLOW_W = 0.305
const GLOW_D = 0.119
function buildLedMask(keyCenters: { x: number; back: number }[]) {
  const W = 1024
  const H = Math.round((W * GLOW_D) / GLOW_W)
  const canvas = document.createElement('canvas')
  canvas.width = W
  canvas.height = H
  const g = canvas.getContext('2d')!
  g.fillStyle = 'rgb(10,10,10)'
  g.fillRect(0, 0, W, H)
  g.globalCompositeOperation = 'lighter'
  const r = (0.0085 / GLOW_W) * W
  for (const k of keyCenters) {
    const px = ((k.x + GLOW_W / 2) / GLOW_W) * W
    const py = (1 - (k.back - 0.0047 + GLOW_D / 2) / GLOW_D) * H
    const grad = g.createRadialGradient(px, py, 0, px, py, r)
    grad.addColorStop(0, 'rgba(255,255,255,0.95)')
    grad.addColorStop(0.3, 'rgba(255,255,255,0.5)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(px - r, py - r, r * 2, r * 2)
  }
  const tex = new THREE.CanvasTexture(canvas)
  tex.colorSpace = THREE.NoColorSpace
  return tex
}

// The translucent switch housings carry the LED colour: this is what you mostly
// see through the gaps on a real board. Same hue sweep as the light pools.
const ledGlow = { uLed: { value: 0 }, uRgbTime: { value: 0 } }
function addSwitchGlow(m: THREE.MeshStandardMaterial) {
  m.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, ledGlow)
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', `#include <common>
varying float vWX;`)
      .replace(
        '#include <project_vertex>',
        `#include <project_vertex>
vWX = (modelMatrix * vec4(position, 1.0)).x;`,
      )
    shader.fragmentShader = shader.fragmentShader
      .replace(
        '#include <common>',
        `#include <common>
uniform float uLed; uniform float uRgbTime; varying float vWX;
vec3 ledHue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }`,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `#include <emissivemap_fragment>
totalEmissiveRadiance += ledHue((vWX + 0.1524) / 0.3048 * 0.9 - uRgbTime * 0.08) * uLed * 1.4;`,
      )
  }
  m.customProgramCacheKey = () => 'switchglow'
}

const smooth = (t: number) => t * t * (3 - 2 * t)
const damp = (x: number, to: number, lambda: number, dt: number) => x + (to - x) * (1 - Math.exp(-lambda * dt))

export function Keyboard() {
  const { scene } = useGLTF(MODEL_URL)
  const { animations } = useGLTF(KEY_ANIM_URL)
  const curves = useMemo(
    () => ({
      press: toCurve(animations.find((a) => a.name === 'KeyPress')),
      release: toCurve(animations.find((a) => a.name === 'KeyRelease')),
    }),
    [animations],
  )

  const rig = useMemo(() => {
    scene.updateMatrixWorld(true)
    const layers = LAYERS.map(([name, k]) => {
      const obj = scene.getObjectByName(name)!
      return { obj, k, base: obj.position.y }
    })

    let ledSlot: THREE.MeshStandardMaterial | null = null
    scene.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (!mesh.isMesh) return
      const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
      for (const m of mats as THREE.MeshPhysicalMaterial[]) {
        const opacity = SEE_THROUGH[m.name]
        if (opacity !== undefined) {
          m.transmission = 0
          m.transparent = true
          m.opacity = opacity
        }
        if (m.name.startsWith('Keycap_')) m.roughness = 0.62
        if (m.name === 'Switch_Top') addSwitchGlow(m)
        if (m.name === 'LED_Slot') {
          m.emissive = new THREE.Color('#a8d8ff')
          m.emissiveIntensity = 0
          ledSlot = m
        }
        m.envMapIntensity = 1
      }
    })

    // keycaps + their legends/homing bars move together when pressed
    const keyLayer = scene.getObjectByName('L_Keycaps')!
    const keys = new Map<string, KeyRig>()
    for (const child of keyLayer.children) {
      if (!child.name.startsWith('Key_')) continue
      const id = child.name.slice(4)
      const parts = [child]
      for (const prefix of ['Leg_', 'Homing_']) {
        const p = keyLayer.getObjectByName(prefix + id)
        if (p) parts.push(p)
      }
      keys.set(child.name, { parts, base: parts.map((p) => p.position.y) })
    }

    // re-pivot the knob around its own axis so it can spin in place
    const knob = scene.getObjectByName('VolumeKnob')!
    const knobParent = knob.parent!
    const center = new THREE.Box3().setFromObject(knob).getCenter(new THREE.Vector3())
    const pivot = new THREE.Group()
    knobParent.add(pivot)
    pivot.position.copy(knobParent.worldToLocal(center.clone()))
    pivot.updateMatrixWorld(true)
    pivot.attach(knob)

    // RGB underglow: an additive sheet just above the plate, seen through the key gaps
    const glowMat = new THREE.ShaderMaterial({
      vertexShader: glowVert,
      fragmentShader: glowFrag,
      uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },
        uMask: { value: buildLedMask([...keys.values()].map((k) => ({ x: k.parts[0].position.x, back: -k.parts[0].position.z }))) },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
      toneMapped: false,
    })
    const glow = new THREE.Mesh(new THREE.PlaneGeometry(GLOW_W, GLOW_D), glowMat)
    glow.rotation.x = -Math.PI / 2
    glow.position.y = -0.0088
    glow.visible = false
    scene.getObjectByName('L_Plate')!.add(glow)

    return { layers, keys, pivot, glow, glowMat, ledSlot: ledSlot as THREE.MeshStandardMaterial | null }
  }, [scene])

  const clock = useRef(0)
  const keyState = useRef(new Map<string, KeyState>())
  const down = useRef(new Set<string>())

  useFrame((_, dt) => {
    const { cur } = story
    let busy = false

    const span = 1 - STAGGER * (rig.layers.length - 1)
    for (let i = 0; i < rig.layers.length; i++) {
      const { obj, k, base } = rig.layers[i]
      const p = smooth(Math.min(1, Math.max(0, (cur.explode - i * STAGGER) / span)))
      const focus = story.focusLayer === i && cur.explode > 0.95 ? FOCUS_LIFT : 0
      const to = base + k * STEP * p + focus
      const y = damp(obj.position.y, to, 10, dt)
      if (Math.abs(y - to) > 1e-5) busy = true
      obj.position.y = y
    }

    const step = Math.min(dt, 1 / 30) // a long idle gap must not explode the integration
    for (const [name, key] of rig.keys) {
      const held = story.held === name
      const want = Math.max(story.press.get(name) ?? 0, held ? 1 : story.hover === name ? HOVER_HINT : 0)
      // sound on the edge of each press/release
      if (want > 0.5 && !down.current.has(name)) {
        down.current.add(name)
        playKey(name === 'Key_SPACE' ? 'space' : 'down')
      } else if (want <= 0.5 && down.current.has(name)) {
        down.current.delete(name)
        playKey('up')
      }
      let ks = keyState.current.get(name)
      if (!ks) {
        if (want === 0) continue
        ks = { mode: 'idle', t: 0, from: 0, x: 0 }
        keyState.current.set(name, ks)
      }
      const full = want > 0.5
      // start the Blender clips on the press / release edges, blending from where the cap is
      if (full && ks.mode !== 'down') Object.assign(ks, { mode: 'down', t: 0, from: ks.x })
      else if (!full && ks.mode === 'down') Object.assign(ks, { mode: 'up', t: 0, from: ks.x })
      ks.t += step
      if (ks.mode === 'down' && curves.press) {
        ks.x = ks.from + (1 - ks.from) * curves.press.at(ks.t)
        if (ks.t < curves.press.duration) busy = true
      } else if (ks.mode === 'up' && curves.release) {
        ks.x = ks.from * curves.release.at(ks.t)
        if (ks.t >= curves.release.duration) ks.mode = 'idle'
        busy = true
      } else {
        // idle: ease toward the hover hint (or rest); also the fallback if the clips are missing
        ks.mode = full ? 'down' : 'idle'
        ks.x = damp(ks.x, want, full ? 40 : 18, step)
        if (Math.abs(ks.x - want) > 1e-4) busy = true
        else if (want === 0) keyState.current.delete(name)
      }
      for (let i = 0; i < key.parts.length; i++) key.parts[i].position.y = key.base[i] - KEY_TRAVEL * ks.x
    }

    rig.pivot.rotation.y = -cur.knob

    const led = cur.led
    rig.glow.visible = led > 0.01
    rig.glowMat.uniforms.uIntensity.value = led
    if (rig.ledSlot) rig.ledSlot.emissiveIntensity = led * 4
    ledGlow.uLed.value = led
    if (rig.glow.visible) {
      clock.current += dt
      rig.glowMat.uniforms.uTime.value = clock.current
      ledGlow.uRgbTime.value = clock.current
      busy = true
    }

    if (busy) story.invalidate()
  })

  const onMove = (e: ThreeEvent<PointerEvent>) => {
    if (!story.interactive) return
    e.stopPropagation()
    const n = e.object.name
    const name = n.startsWith('Key_') ? n : n.startsWith('Leg_') ? 'Key_' + n.slice(4) : null
    if (name && rig.keys.has(name) && story.hover !== name) {
      story.hover = name
      document.body.style.cursor = 'pointer'
      story.invalidate()
    }
  }
  const onOut = () => {
    if (story.hover) {
      story.hover = null
      document.body.style.cursor = ''
      story.invalidate()
    }
  }
  const onDown = (e: ThreeEvent<PointerEvent>) => {
    if (!story.interactive) return
    const n = e.object.name
    const name = n.startsWith('Key_') ? n : n.startsWith('Leg_') ? 'Key_' + n.slice(4) : null
    if (name && rig.keys.has(name)) {
      e.stopPropagation()
      story.held = name
      story.invalidate()
    }
  }
  // release anywhere, even if the pointer slid off the key
  useEffect(() => {
    const up = () => {
      if (!story.held) return
      story.held = null
      story.invalidate()
    }
    window.addEventListener('pointerup', up)
    window.addEventListener('pointercancel', up)
    return () => {
      window.removeEventListener('pointerup', up)
      window.removeEventListener('pointercancel', up)
    }
  }, [])

  return <primitive object={scene} onPointerMove={onMove} onPointerOut={onOut} onPointerDown={onDown} />
}

useGLTF.preload(MODEL_URL)
useGLTF.preload(KEY_ANIM_URL)
