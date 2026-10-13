/* eslint-disable react-hooks/immutability -- the viewer mutates three.js objects and the shared scene state imperatively, by design */
import { memo, Suspense, useEffect, useRef, useState, type ReactNode } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Environment, Lightformer, OrbitControls, PerformanceMonitor } from '@react-three/drei'
import { AnimatePresence, motion } from 'motion/react'
import * as THREE from 'three'
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib'
import { Keyboard } from '../three/Keyboard'
import { RgbHalo, StudioLights } from '../three/Lighting'
import { story } from '../lib/story'
import { SoundToggle } from '../components/Chrome'
import { LAYERS, PRODUCT } from '../config/product'
import { keyNameForCode } from './keymap'
import { DEFAULT_PALETTE, LED_EFFECTS, setLedEffect, setPalette, type LedEffect } from '../three/palette'

type View = { id: string; label: string; pos: [number, number, number]; target: [number, number, number]; abs?: boolean }
const VIEWS: View[] = [
  { id: 'front', label: 'Trước', pos: [0.05, 0.24, 0.42], target: [0, 0.01, 0] },
  { id: 'top', label: 'Trên', pos: [0, 0.52, 0.03], target: [0, 0, 0] },
  { id: 'back', label: 'Cổng', pos: [-0.05, 0.12, -0.4], target: [-0.03, 0.015, 0] },
  { id: 'side', label: 'Cạnh', pos: [0.45, 0.1, 0.02], target: [0, 0.02, 0] },
  { id: 'knob', label: 'Núm', pos: [0.24, 0.12, 0.07], target: [0.13, 0.04, -0.045] },
]

// camera flight request, consumed by <Rig/>
const fly = { to: null as View | null }
// explode-driven framing currently applied on top of the orbit
const framing = { lift: 0, scale: 1 }
// layer explorer: canvas -> UI callbacks and the current mode, shared with the memoised scene
const layerUi = {
  active: false,
  setHover: (() => {}) as (i: number) => void,
  pick: (() => {}) as (i: number) => void,
}
const DRAG_SLOP = 6

function Rig({ controls }: { controls: React.RefObject<OrbitControlsImpl | null> }) {
  const camera = useThree((s) => s.camera)
  const invalidate = useThree((s) => s.invalidate)
  const gl = useThree((s) => s.gl)
  const lastIso = useRef(-1)

  // layer picking: hover lifts a layer, a click (not a drag) isolates it
  useEffect(() => {
    const el = gl.domElement
    const rc = new THREE.Raycaster()
    const ndc = new THREE.Vector2()
    let down: { x: number; y: number } | null = null
    const pickAt = (e: PointerEvent) => {
      const r = el.getBoundingClientRect()
      ndc.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      rc.setFromCamera(ndc, camera)
      return story.pickLayer?.(rc.ray) ?? -1
    }
    const move = (e: PointerEvent) => {
      if (!layerUi.active || story.isolate >= 0 || down) return
      const i = pickAt(e)
      if (i !== story.focusLayer) {
        story.focusLayer = i
        layerUi.setHover(i)
        invalidate()
      }
    }
    const press = (e: PointerEvent) => (down = { x: e.clientX, y: e.clientY })
    const release = (e: PointerEvent) => {
      const d = down
      down = null
      if (!d || !layerUi.active || story.isolate >= 0) return
      if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > DRAG_SLOP) return
      const i = pickAt(e)
      if (i >= 0) layerUi.pick(i)
    }
    const leave = () => {
      if (story.focusLayer < 0) return
      story.focusLayer = -1
      layerUi.setHover(-1)
      invalidate()
    }
    el.addEventListener('pointermove', move)
    el.addEventListener('pointerdown', press)
    window.addEventListener('pointerup', release)
    el.addEventListener('pointerleave', leave)
    return () => {
      el.removeEventListener('pointermove', move)
      el.removeEventListener('pointerdown', press)
      window.removeEventListener('pointerup', release)
      el.removeEventListener('pointerleave', leave)
    }
  }, [gl, camera, invalidate])

  useEffect(() => {
    story.invalidate = () => invalidate()
    framing.lift = 0 // fresh camera on mount
    framing.scale = 1
    // set the orbit centre once; passing it as a prop re-applied it on every re-render
    controls.current?.target.set(...VIEWS[0].target)
    controls.current?.update()
  }, [invalidate, controls])
  useFrame((_, dt) => {
    const c = controls.current
    if (!c) return

    // keep the exploded stack in frame: raise the orbit centre and back off as layers
    // separate, without touching the angle the visitor has chosen
    const e = story.cur.explode
    // layer explorer: the taller panel covers the lower screen, so aim lower (the stack
    // sits higher on screen) and back off a little more
    const lift = e * (layerUi.active ? 0.135 : 0.17)
    const scale = 1 + e * (layerUi.active ? 1.45 : 0.7)
    if (Math.abs(lift - framing.lift) > 1e-5 || Math.abs(scale - framing.scale) > 1e-5) {
      const dLift = lift - framing.lift
      const off = camera.position.clone().sub(c.target).multiplyScalar(scale / framing.scale)
      c.target.y += dLift
      camera.position.copy(c.target).add(off)
      framing.lift = lift
      framing.scale = scale
      c.update()
      invalidate()
    }
    // isolating a layer flies to it, keeping the current viewing angle; leaving flies home
    if (story.isolate !== lastIso.current) {
      lastIso.current = story.isolate
      const b = story.isolate >= 0 ? story.layerBounds?.(story.isolate) : null
      if (b) {
        const center = b.getCenter(new THREE.Vector3())
        const size = b.getSize(new THREE.Vector3())
        const dir = camera.position.clone().sub(c.target).normalize()
        if (dir.y < 0.35) dir.y = 0.35 // look down onto flat layers rather than edge-on
        dir.normalize()
        const dist = Math.max(size.x, size.z) * 1.45 + 0.05
        const pos = center.clone().addScaledVector(dir, dist)
        center.y -= dist * 0.1 // aim below the layer so it sits above the control panel
        fly.to = { id: 'layer', label: '', abs: true, target: center.toArray(), pos: pos.toArray() }
      } else fly.to = VIEWS[0]
    }

    const v = fly.to
    if (!v) return
    const k = 1 - Math.exp(-6 * Math.min(dt, 1 / 20))
    const tgt = new THREE.Vector3(...v.target)
    if (!v.abs) tgt.y += framing.lift
    const pos = v.abs
      ? new THREE.Vector3(...v.pos)
      : new THREE.Vector3(...v.pos).sub(new THREE.Vector3(...v.target)).multiplyScalar(framing.scale).add(tgt)
    camera.position.lerp(pos, k)
    c.target.lerp(tgt, k)
    c.update()
    if (camera.position.distanceTo(pos) < 0.001) fly.to = null
    invalidate()
  })
  return null
}

// memo: slider/typing state lives in <Viewer/>; re-rendering the canvas tree on every
// keystroke made the controls reset and the camera stutter
const Scene = memo(function Scene() {
  const controls = useRef<OrbitControlsImpl>(null)
  const [dpr, setDpr] = useState(1.5)
  return (
    <Canvas
      frameloop="demand"
      dpr={dpr}
      camera={{ fov: 32, near: 0.02, far: 6, position: VIEWS[0].pos }}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      onCreated={({ gl }) => {
        gl.toneMapping = THREE.AgXToneMapping
        gl.toneMappingExposure = 0.88
      }}
      className="touch-none"
    >
      {/* step down once on a slow device and stay there: every DPR change reallocates
            the canvas buffer, and flip-flopping during camera moves showed up as flashes */}
        <PerformanceMonitor flipflops={1} onDecline={() => setDpr(1)} onFallback={() => setDpr(1)} />
      <StudioLights />
      <Environment resolution={256} frames={1}>
        <color attach="background" args={['#8d98a6']} />
        <Lightformer form="rect" intensity={2.4} position={[0, 2, 1]} scale={[4, 2, 1]} />
        <Lightformer form="rect" intensity={0.8} position={[-3, 1, -1]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="rect" intensity={0.5} position={[3, 1, 1]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
        <Lightformer form="ring" intensity={1.2} position={[0, 3, -2]} scale={2} />
      </Environment>
      <Suspense fallback={null}>
        <Keyboard />
        <RgbHalo />
      </Suspense>
      <OrbitControls
        ref={controls}
        makeDefault
        enableDamping
        dampingFactor={0.08}
        minDistance={0.12}
        maxDistance={1.6}
        maxPolarAngle={Math.PI * 0.62}
        enablePan
        onStart={() => (fly.to = null)}
      />
      <Rig controls={controls} />
    </Canvas>
  )
})

function Pill({ children, active, onClick, dark }: { children: ReactNode; active?: boolean; onClick: () => void; dark: boolean }) {
  return (
    <motion.button
      whileTap={{ scale: 0.94 }}
      onClick={onClick}
      className={`relative rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors ${
        active ? (dark ? 'text-ink' : 'text-white') : dark ? 'text-white/70 hover:text-white' : 'text-mute hover:text-ink'
      }`}
    >
      {active && (
        <motion.span layoutId="view-pill" className={`absolute inset-0 rounded-lg ${dark ? 'bg-white' : 'bg-ink'}`} transition={{ type: 'spring', stiffness: 500, damping: 38 }} />
      )}
      <span className="relative">{children}</span>
    </motion.button>
  )
}

function Slider({ label, value, onChange, dark, format }: { label: string; value: number; onChange: (v: number) => void; dark: boolean; format: (v: number) => string }) {
  return (
    <label className="block">
      <span className={`mb-2 flex justify-between font-mono text-[11px] tracking-[0.14em] uppercase ${dark ? 'text-white/60' : 'text-mute'}`}>
        {label}
        <span className={`tabular-nums ${dark ? 'text-white' : 'text-ink'}`}>{format(value)}</span>
      </span>
      <input
        type="range"
        min={0}
        max={1}
        step={0.001}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-ice-200 accent-ice-600"
      />
    </label>
  )
}

export default function Viewer() {
  const [explode, setExplode] = useState(0)
  const [knob, setKnob] = useState(0.5)
  const [rgb, setRgb] = useState(false)
  const [view, setView] = useState('front')
  const [typed, setTyped] = useState<string[]>([])
  const [hint, setHint] = useState(true)
  // LED palettes designed in Blender (public/led/palettes.json is written by the export script)
  const [palettes, setPalettes] = useState<{ id: string; label: string }[]>([])
  const [palette, setPaletteId] = useState(DEFAULT_PALETTE)
  useEffect(() => {
    fetch('/led/palettes.json')
      .then((r) => (r.ok ? r.json() : []))
      .then(setPalettes)
      .catch(() => {})
  }, [])
  const [effect, setEffect] = useState<LedEffect>('wave')
  const chooseEffect = (id: LedEffect) => {
    setEffect(id)
    setLedEffect(id)
  }
  const choosePalette = (id: string) => {
    setPaletteId(id)
    setPalette(id)
  }
  // layer explorer
  const [layers, setLayers] = useState(false)
  const [iso, setIso] = useState(-1)
  const [hoverLayer, setHoverLayer] = useState(-1)
  const isoRef = useRef(-1)

  useEffect(() => {
    isoRef.current = iso
    layerUi.active = layers
    story.isolate = layers ? iso : -1
    // keys are pressable on the assembled board and on the isolated keycap layer, not on the stack
    story.interactive = !layers || iso === 1
    if (!layers || iso >= 0) story.focusLayer = -1
    story.invalidate()
  }, [layers, iso])
  useEffect(() => {
    layerUi.setHover = setHoverLayer
    layerUi.pick = (i) => setIso(i)
    return () => {
      layerUi.active = false
      story.isolate = -1
    }
  }, [])

  const toggleLayers = () => {
    const on = !layers
    setLayers(on)
    setIso(-1)
    setHoverLayer(-1)
    setExplode(on ? 1 : 0)
    setView('front')
    fly.to = VIEWS[0]
    story.invalidate()
  }
  const stepLayer = (d: number) => setIso((i) => (i + d + LAYERS.length) % LAYERS.length)

  // the viewer drives the scene state directly (no scroll story here)
  useEffect(() => {
    const s = story.cur
    s.explode = story.goal.explode = explode
    s.knob = story.goal.knob = knob * Math.PI * 3
    s.led = story.goal.led = rgb ? 1 : 0
    s.dark = story.goal.dark = rgb ? 0.85 : 0
    story.invalidate()
  }, [explode, knob, rgb])

  // type on your own keyboard -> the matching key presses on the model
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && isoRef.current >= 0) {
        setIso(-1) // Esc leaves an isolated layer instead of pressing the 3D Esc key
        return
      }
      const name = keyNameForCode(e.code)
      if (!name) return
      e.preventDefault()
      if (e.repeat) return
      story.press.set(name, 1)
      story.invalidate()
      setHint(false)
      setTyped((t) => [...t.slice(-13), e.key.length === 1 ? e.key : e.key === ' ' ? '␣' : `[${e.key}]`])
    }
    const up = (e: KeyboardEvent) => {
      const name = keyNameForCode(e.code)
      if (!name) return
      story.press.delete(name)
      story.invalidate()
    }
    const blur = () => {
      story.press.clear()
      story.invalidate()
    }
    window.addEventListener('keydown', down)
    window.addEventListener('keyup', up)
    window.addEventListener('blur', blur)
    return () => {
      window.removeEventListener('keydown', down)
      window.removeEventListener('keyup', up)
      window.removeEventListener('blur', blur)
      story.press.clear()
    }
  }, [])

  const go = (v: View) => {
    setView(v.id)
    fly.to = v
    story.invalidate()
  }

  const dark = rgb
  const panel = dark ? 'glass-dark ring-white/10 text-white' : 'glass ring-white/70'

  return (
    <div className={`fixed inset-0 overflow-hidden transition-colors duration-700 ${dark ? 'bg-night' : 'bg-paper'}`}>
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(55%_50%_at_50%_45%,#ffffff_0%,transparent_70%)] transition-opacity duration-700"
        style={{ opacity: dark ? 0 : 1 }}
      />
      <div
        className="absolute inset-0 cursor-grab active:cursor-grabbing [&_canvas]:!cursor-[inherit]"
        // leaving the canvas (onto the panels or off-window) must clear the hovered key,
        // otherwise orbiting stays locked until the next click
        onPointerLeave={() => {
          story.hover = null
          document.body.style.cursor = ''
          story.invalidate()
        }}
      >
        <Scene />
      </div>

      {/* top bar */}
      <header className="pointer-events-none absolute inset-x-0 top-0 flex items-center justify-between gap-3 p-3 md:p-5">
        <a
          href="/"
          className={`pointer-events-auto flex items-center gap-2 rounded-xl px-3.5 py-2.5 text-sm font-semibold ring-1 ${panel}`}
        >
          <span aria-hidden>←</span> Trang chủ
        </a>
        <p className={`hidden font-display text-lg font-bold tracking-tight sm:block ${dark ? 'text-white' : 'text-ink'}`}>
          {PRODUCT.name} <span className="font-mono text-xs font-medium tracking-[0.2em] text-ice-600 uppercase">· 3D</span>
        </p>
        <div className="pointer-events-auto">
          <SoundToggle dark={dark} />
        </div>
      </header>

      {/* typing readout / hint */}
      <div className="pointer-events-none absolute inset-x-0 top-20 flex justify-center px-4">
        <AnimatePresence mode="wait">
          {layers && iso < 0 ? (
            <motion.p
              key={'layer-hint-' + hoverLayer}
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`rounded-full px-4 py-2 text-center text-xs font-medium ring-1 sm:text-sm ${panel}`}
            >
              {hoverLayer >= 0 ? (
                <>
                  <span className="font-mono text-ice-600">{String(hoverLayer + 1).padStart(2, '0')}</span> {LAYERS[hoverLayer].name} · click để xem riêng
                </>
              ) : (
                'Rê chuột lên từng lớp · click để tách riêng lớp đó'
              )}
            </motion.p>
          ) : hint ? (
            <motion.p
              key="hint"
              initial={{ opacity: 0, y: -6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              className={`rounded-full px-4 py-2 text-center text-xs font-medium ring-1 sm:text-sm ${panel}`}
            >
              <span className="hidden sm:inline">Gõ trên bàn phím của bạn, kéo để xoay, cuộn để phóng to</span>
              <span className="sm:hidden">Chạm vào phím để nhấn · kéo để xoay · chụm để phóng to</span>
            </motion.p>
          ) : (
            <motion.p
              key="typed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className={`min-w-40 rounded-full px-4 py-2 text-center font-mono text-sm ring-1 ${panel}`}
            >
              {typed.join('')}
              <span className="ml-0.5 inline-block h-3.5 w-[2px] animate-pulse bg-ice-600 align-middle" />
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      {/* controls */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 flex justify-center p-3 md:p-5">
        <motion.div
          initial={{ y: 40, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
          className={`pointer-events-auto w-full max-w-3xl rounded-3xl p-4 ring-1 shadow-[0_20px_60px_-25px_rgba(15,27,45,0.45)] md:p-5 ${panel}`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`flex flex-wrap gap-0.5 rounded-xl p-1 ${dark ? 'bg-white/5' : 'bg-ink/[0.04]'}`}>
              {VIEWS.map((v) => (
                <Pill key={v.id} active={view === v.id} onClick={() => go(v)} dark={dark}>
                  {v.label}
                </Pill>
              ))}
            </div>
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={() => setRgb((r) => !r)}
              aria-pressed={rgb}
              className={`flex items-center gap-2 rounded-xl px-3.5 py-2 text-xs font-semibold ring-1 transition-colors ${
                rgb ? 'bg-white/10 text-white ring-white/15' : 'bg-white/70 text-ink ring-ice-100'
              }`}
            >
              <span
                className="h-3 w-3 rounded-full"
                style={{ background: rgb ? 'conic-gradient(#ff5f6d,#ffc371,#7ef29d,#5ec8ff,#b28dff,#ff5f6d)' : '#bcd5ea' }}
              />
              {rgb ? 'Tắt RGB' : 'Bật RGB'}
            </motion.button>
          </div>
          <AnimatePresence initial={false}>
            {rgb && palettes.length > 0 && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <span className="mr-1 font-mono text-[11px] tracking-[0.14em] text-white/60 uppercase">Hiệu ứng</span>
                  {LED_EFFECTS.map((fx) => (
                    <motion.button
                      key={fx.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => chooseEffect(fx.id)}
                      aria-pressed={effect === fx.id}
                      className={`rounded-xl px-3 py-1.5 text-xs font-semibold ring-1 transition-colors ${
                        effect === fx.id ? 'bg-white text-ink ring-white' : 'text-white/75 ring-white/15 hover:text-white'
                      }`}
                    >
                      {fx.label}
                    </motion.button>
                  ))}
                </div>
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <span className="mr-1 font-mono text-[11px] tracking-[0.14em] text-white/60 uppercase">Màu LED</span>
                  {palettes.map((p) => (
                    <motion.button
                      key={p.id}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => choosePalette(p.id)}
                      aria-pressed={palette === p.id}
                      className={`flex items-center gap-2 rounded-xl py-1.5 pr-3 pl-1.5 text-xs font-semibold ring-1 transition-colors ${
                        palette === p.id ? 'bg-white text-ink ring-white' : 'text-white/75 ring-white/15 hover:text-white'
                      }`}
                    >
                      <span
                        className="h-5 w-9 rounded-md ring-1 ring-black/10"
                        style={{ backgroundImage: `url(/led/${p.id}.png)`, backgroundSize: '100% 100%' }}
                      />
                      {p.label}
                    </motion.button>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-4 grid items-end gap-4 sm:grid-cols-[auto_1fr_1fr]">
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={toggleLayers}
              aria-pressed={layers}
              className={`flex h-10 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold ring-1 transition-colors ${
                layers ? 'bg-ice-600 text-white ring-ice-600' : dark ? 'bg-white/10 text-white ring-white/15' : 'bg-white/70 text-ink ring-ice-100'
              }`}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" aria-hidden>
                <path d="m12 3 9 4.5-9 4.5-9-4.5z" />
                <path d="m3 12 9 4.5 9-4.5M3 16.5 12 21l9-4.5" />
              </svg>
              {layers ? 'Ráp lại' : 'Tách lớp'}
            </motion.button>
            {layers ? (
              <div className="sm:col-span-2" />
            ) : (
              <Slider label="Tách lớp" value={explode} onChange={setExplode} dark={dark} format={(v) => `${Math.round(v * 12)} / 12`} />
            )}
            <div className={layers ? 'hidden' : ''}>
              <Slider label="Núm âm lượng" value={knob} onChange={setKnob} dark={dark} format={(v) => `${Math.round(v * 100)}%`} />
            </div>
          </div>

          <AnimatePresence initial={false}>
            {layers && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                {/* layer chips */}
                <div className="-mx-1 mt-4 flex gap-1.5 overflow-x-auto px-1 pb-1">
                  {LAYERS.map((l, i) => {
                    const on = i === iso || (iso < 0 && i === hoverLayer)
                    return (
                      <button
                        key={l.id}
                        onClick={() => setIso(i)}
                        onMouseEnter={() => {
                          if (iso >= 0) return
                          story.focusLayer = i
                          setHoverLayer(i)
                          story.invalidate()
                        }}
                        onMouseLeave={() => {
                          if (iso >= 0) return
                          story.focusLayer = -1
                          setHoverLayer(-1)
                          story.invalidate()
                        }}
                        className={`shrink-0 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap ring-1 transition-colors ${
                          on
                            ? 'bg-ice-600 text-white ring-ice-600'
                            : dark
                              ? 'text-white/70 ring-white/10 hover:text-white'
                              : 'bg-white/60 text-mute ring-ice-100 hover:text-ink'
                        }`}
                      >
                        <span className="mr-1 font-mono text-[10px] opacity-70">{String(i + 1).padStart(2, '0')}</span>
                        {l.name}
                      </button>
                    )
                  })}
                </div>

                {/* isolated layer card */}
                <AnimatePresence mode="wait">
                  {iso >= 0 && (
                    <motion.div
                      key={iso}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -8 }}
                      transition={{ duration: 0.25 }}
                      className={`mt-3 flex items-center gap-3 rounded-2xl p-3 ring-1 ${dark ? 'bg-white/5 ring-white/10' : 'bg-white/70 ring-ice-100'}`}
                    >
                      <button
                        onClick={() => stepLayer(-1)}
                        aria-label="Lớp phía trên"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${dark ? 'ring-white/15' : 'bg-white ring-ice-100'}`}
                      >
                        ←
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">
                          <span className="mr-1.5 font-mono text-xs text-ice-600">{String(iso + 1).padStart(2, '0')} / 12</span>
                          {LAYERS[iso].name}
                        </p>
                        <p className={`truncate text-xs ${dark ? 'text-white/60' : 'text-mute'}`}>
                          {LAYERS[iso].desc} {iso === 1 && 'Bấm thử từng phím.'}
                        </p>
                      </div>
                      <button
                        onClick={() => stepLayer(1)}
                        aria-label="Lớp phía dưới"
                        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ring-1 ${dark ? 'ring-white/15' : 'bg-white ring-ice-100'}`}
                      >
                        →
                      </button>
                      <button onClick={() => setIso(-1)} className="h-9 shrink-0 rounded-xl bg-ink px-3 text-xs font-semibold text-white">
                        Xem tất cả
                      </button>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </div>
  )
}
