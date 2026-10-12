/* eslint-disable react-hooks/immutability -- three.js objects are mutated imperatively inside useFrame by design */
import { useMemo, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { story } from '../lib/story'

// Studio light levels for the bright page. They fade toward NIGHT_KEEP as the
// RGB scene darkens, so the LEDs become the main light source.
const AMBIENT = 0.18
const KEY = 1.05
const ENV = 0.7
const NIGHT_KEEP = 0.32

/** Studio lights that dim in the RGB scene. */
export function StudioLights() {
  const ambient = useRef<THREE.AmbientLight>(null)
  const key = useRef<THREE.DirectionalLight>(null)
  const scene = useThree((s) => s.scene)

  useFrame(() => {
    const k = 1 - (1 - NIGHT_KEEP) * story.cur.dark
    if (ambient.current) ambient.current.intensity = AMBIENT * k
    if (key.current) key.current.intensity = KEY * k
    scene.environmentIntensity = ENV * k
  })

  return (
    <>
      <ambientLight ref={ambient} intensity={AMBIENT} />
      <directionalLight ref={key} position={[0.4, 0.8, 0.5]} intensity={KEY} />
    </>
  )
}

const haloVert = /* glsl */ `
varying vec2 vUv;
void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }
`
const haloFrag = /* glsl */ `
uniform float uTime; uniform float uIntensity; varying vec2 vUv;
vec3 hue(float h) { return clamp(abs(mod(h * 6.0 + vec3(0.0, 4.0, 2.0), 6.0) - 3.0) - 1.0, 0.0, 1.0); }
void main() {
  vec2 p = (vUv - 0.5) * vec2(2.0, 2.0);
  // soft rounded-rect falloff that hugs the keyboard footprint
  vec2 q = abs(p) - vec2(0.62, 0.42);
  float d = length(max(q, 0.0)) + min(max(q.x, q.y), 0.0);
  float a = exp(-max(d, 0.0) * 18.0) * smoothstep(0.9, 0.6, length(p * vec2(0.85, 1.1)));
  vec3 c = hue(vUv.x * 0.9 - uTime * 0.12);
  gl_FragColor = vec4(c * a * uIntensity * 0.28, 1.0);
}
`

/** Faint light spill on the desk right at the case edge, visible only when the LEDs are on. */
export function RgbHalo() {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: haloVert,
        fragmentShader: haloFrag,
        uniforms: { uTime: { value: 0 }, uIntensity: { value: 0 } },
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        transparent: true,
        toneMapped: false,
      }),
    [],
  )
  const mesh = useRef<THREE.Mesh>(null)
  const t = useRef(0)

  useFrame((_, dt) => {
    const led = story.cur.led
    if (!mesh.current) return
    mesh.current.visible = led > 0.01
    if (!mesh.current.visible) return
    t.current += dt
    mat.uniforms.uTime.value = t.current
    mat.uniforms.uIntensity.value = led * story.cur.dark
  })

  return (
    <mesh ref={mesh} material={mat} rotation-x={-Math.PI / 2} position={[0, 0.0004, 0]} visible={false} renderOrder={-1}>
      <planeGeometry args={[0.62, 0.36]} />
    </mesh>
  )
}
