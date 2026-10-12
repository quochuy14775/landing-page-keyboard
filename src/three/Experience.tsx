import { Suspense, useEffect, useState } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows, Environment, Lightformer, PerformanceMonitor, useProgress } from '@react-three/drei'
import * as THREE from 'three'
import { Keyboard } from './Keyboard'
import { CameraRig } from './CameraRig'
import { RgbHalo, StudioLights } from './Lighting'
import { reportLoading } from '../lib/loading'

function LoadingBridge() {
  const { progress, active } = useProgress()
  useEffect(() => reportLoading(progress, !active && progress >= 100), [progress, active])
  return null
}

/** Fixed full-screen canvas behind the page. Renders on demand only. */
export default function Experience() {
  const [dpr, setDpr] = useState(1.5)

  return (
    <div className="pointer-events-none fixed inset-0 z-10">
      <LoadingBridge />
      <Canvas
        frameloop="demand"
        dpr={dpr}
        camera={{ fov: 32, near: 0.01, far: 20, position: [0.2, 0.3, 0.46] }}
        gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
        onCreated={({ gl }) => {
          gl.toneMapping = THREE.AgXToneMapping
          gl.toneMappingExposure = 0.88
        }}
        eventSource={document.getElementById('root')!}
        eventPrefix="client"
      >
        <PerformanceMonitor onDecline={() => setDpr(1)} onIncline={() => setDpr(1.5)} />
        <StudioLights />

        <Environment resolution={256} frames={1}>
          <color attach="background" args={['#8d98a6']} />
          {/* one strong soft key from above-front, weaker sides: shape over brightness */}
          <Lightformer form="rect" intensity={2.4} position={[0, 2, 1]} scale={[4, 2, 1]} />
          <Lightformer form="rect" intensity={0.8} position={[-3, 1, -1]} rotation-y={Math.PI / 2} scale={[3, 2, 1]} />
          <Lightformer form="rect" intensity={0.5} position={[3, 1, 1]} rotation-y={-Math.PI / 2} scale={[3, 2, 1]} />
          <Lightformer form="ring" intensity={1.2} position={[0, 3, -2]} scale={2} />
        </Environment>

        <Suspense fallback={null}>
          <Keyboard />
          <RgbHalo />
          <ContactShadows position={[0, -0.0005, 0]} scale={0.7} far={0.08} blur={2.4} opacity={0.6} resolution={512} frames={1} />
        </Suspense>

        <CameraRig />
      </Canvas>
    </div>
  )
}
