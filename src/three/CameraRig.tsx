import { useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { story } from '../lib/story'

const target = new THREE.Vector3()
const offset = new THREE.Vector3()
let lastDark = -1
const anchor = new THREE.Vector3()
let lastAnchor = ''

const damp = (x: number, to: number, lambda: number, dt: number) => x + (to - x) * (1 - Math.exp(-lambda * dt))

/** Damps the current shot toward the scroll-driven goal and frames the camera. */
export function CameraRig() {
  const invalidate = useThree((s) => s.invalidate)
  const camera = useThree((s) => s.camera)
  const size = useThree((s) => s.size)

  useEffect(() => {
    story.invalidate = () => invalidate()
    invalidate()
  }, [invalidate])

  // Portrait phones: the copy sits in the lower half, so shift the rendered view
  // up and keep the board in the upper part of the screen.
  useEffect(() => {
    const cam = camera as THREE.PerspectiveCamera
    if (size.width < size.height) cam.setViewOffset(size.width, size.height, 0, size.height * 0.17, size.width, size.height)
    else cam.clearViewOffset()
    invalidate()
  }, [camera, size.width, size.height, invalidate])

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20)
    const { cur, goal } = story
    const lambda = story.reducedMotion ? 60 : 5
    let delta = 0
    for (let i = 0; i < 3; i++) {
      const c = damp(cur.cam[i], goal.cam[i], lambda, dt)
      const t = damp(cur.target[i], goal.target[i], lambda, dt)
      delta += Math.abs(c - goal.cam[i]) + Math.abs(t - goal.target[i])
      cur.cam[i] = c
      cur.target[i] = t
    }
    cur.px = damp(cur.px ?? cur.target[0], goal.px ?? goal.target[0], lambda, dt)
    for (const k of ['explode', 'knob', 'led', 'dark'] as const) {
      cur[k] = damp(cur[k], goal[k], lambda, dt)
      delta += Math.abs(cur[k] - goal[k])
    }

    // portrait screens: pull the camera back until the board's full width fits
    const aspect = size.width / size.height
    const pull = aspect < 1 ? Math.min(2.6, 1.12 / aspect) : 1
    target.set(...cur.target)
    offset.set(...cur.cam).sub(target).multiplyScalar(pull)
    if (aspect < 1) target.x = cur.px ?? target.x // re-centre the board horizontally on phones
    camera.position.copy(target).add(offset)
    camera.lookAt(target)

    // structure callout: screen position of the layer being described (right edge, mid
    // height), published as CSS variables for the DOM leader line. Read-only, the camera
    // and layer animation are untouched.
    const fl = story.focusLayer
    const b = fl >= 0 && cur.explode > 0.9 && story.layerBounds ? story.layerBounds(fl) : null
    let key = 'off'
    if (b) {
      anchor.set(b.max.x - (b.max.x - b.min.x) * 0.08, (b.min.y + b.max.y) / 2, (b.min.z + b.max.z) / 2).project(camera)
      if (anchor.z < 1) key = `${(((anchor.x + 1) / 2) * size.width).toFixed(1)},${(((1 - anchor.y) / 2) * size.height).toFixed(1)}`
    }
    if (key !== lastAnchor) {
      lastAnchor = key
      const st = document.documentElement.style
      if (key === 'off') st.setProperty('--callout-on', '0')
      else {
        const [x, y] = key.split(',')
        st.setProperty('--callout-x', x)
        st.setProperty('--callout-y', y)
        st.setProperty('--callout-on', '1')
      }
    }

    if (Math.abs(cur.dark - lastDark) > 0.002) {
      lastDark = cur.dark
      document.documentElement.style.setProperty('--dark', cur.dark.toFixed(3))
    }

    if (delta > 1e-4) story.invalidate()
  })

  return null
}
