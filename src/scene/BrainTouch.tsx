import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Mesh, Quaternion, Raycaster, Vector2, Vector3 } from 'three'
import {
  mouse,
  pointerOnScene,
  uniforms,
  clusterState,
  PULSE_SLOTS,
  RIPPLE_SLOTS,
} from './shared'
import { useSceneStore } from '../store/sceneStore'
import { SWARM_ENTER, SWARM_LEAVE, SWARM_TOUCH } from '../lib/swarmEvents'

const raycaster = new Raycaster()
const ndc = new Vector2()
const localHit = new Vector3()
const lastHit = new Vector3()
const view = new Vector3()
const groupRot = new Quaternion()

/** Seconds between the light pulses a moving pointer sends out, min and spread. */
const PULSE_GAP = 0.8
const PULSE_JITTER = 0.9
/** Distance the pointer has to travel on the cloud before it sends another. */
const PULSE_TRAVEL = 0.5

/** Invisible proxy — ray hit ≈ cursor over the node cloud (local cluster space). */
export function BrainTouchProbe() {
  const meshRef = useRef<Mesh>(null)
  const { camera } = useThree()
  const feelRef = useRef({
    on: false,
    travel: 0,
    lastPulse: -Infinity,
    gap: PULSE_GAP,
    pulseSlot: 0,
    rippleSlot: 0,
    clicked: false,
    reduced: typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
  })

  /*
   * A click, not a pointerdown: on a phone every scroll starts with a
   * pointerdown, and a startle per swipe would be noise. The position is taken
   * from the click itself, since a tap sends no pointermove before it. Whether
   * it landed on the cloud is the next frame's raycast to decide.
   */
  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!pointerOnScene) return
      mouse.x = (e.clientX / innerWidth) * 2 - 1
      mouse.y = -((e.clientY / innerHeight) * 2 - 1)
      feelRef.current.clicked = true
    }
    addEventListener('click', onClick, { passive: true })
    return () => {
      removeEventListener('click', onClick)
      // Unmounted with the pointer still on the cloud: let the UI know it left
      if (feelRef.current.on) dispatchEvent(new Event(SWARM_LEAVE))
    }
  }, [])

  useFrame((_, delta) => {
    const { loadPhase, scrollZone } = useSceneStore.getState()
    const ready = loadPhase === 'ready' && pointerOnScene
    // The fabric dent is the hero's alone; the light answers on every shape
    // the trace morphs into, so it runs through the trace as well
    const canTouch = ready && scrollZone === 'hero'
    const canFeel = ready && (scrollZone === 'hero' || scrollZone === 'trace')
    let target = 0
    let hit = false

    if (canFeel && meshRef.current) {
      ndc.set(mouse.x, mouse.y)
      raycaster.setFromCamera(ndc, camera)
      const hits = raycaster.intersectObject(meshRef.current, false)
      if (hits.length > 0) {
        localHit.copy(hits[0].point)
        if (clusterState.group) clusterState.group.worldToLocal(localHit)
        hit = true
        if (canTouch) {
          uniforms.uTouchPos.value.copy(localHit)
          target = 0.62
        }
      }
    }

    const touch = uniforms.uTouch.value
    uniforms.uTouch.value = touch + (target - touch) * Math.min(1, delta * 5)

    camera.getWorldDirection(view)
    if (clusterState.group) view.applyQuaternion(clusterState.group.getWorldQuaternion(groupRot).invert())
    uniforms.uViewDir.value.copy(view.normalize())

    /*
     * Feel. A pointer arriving on the cloud sends a shockwave of light from
     * where it touched; while it keeps moving it sends another every second
     * or so, at irregular gaps so it reads as the cloud responding rather
     * than as a metronome. A click startles the swarm where it landed.
     */
    const f = feelRef.current
    const now = uniforms.uTime.value
    const pulse = () => {
      uniforms.uPulse.value[f.pulseSlot].set(localHit.x, localHit.y, localHit.z, now)
      f.pulseSlot = (f.pulseSlot + 1) % PULSE_SLOTS
      f.lastPulse = now
      f.travel = 0
      f.gap = PULSE_GAP + Math.random() * PULSE_JITTER
    }

    if (hit) {
      if (!f.on) {
        f.on = true
        dispatchEvent(new Event(SWARM_ENTER))
        lastHit.copy(localHit)
        if (now - f.lastPulse > 0.4) pulse()
      } else {
        f.travel += localHit.distanceTo(lastHit)
        lastHit.copy(localHit)
        if (now - f.lastPulse > f.gap && f.travel > PULSE_TRAVEL) pulse()
      }
      if (f.clicked) {
        // Reduced motion keeps the light and skips the swarm's movement
        if (!f.reduced) {
          uniforms.uRipple.value[f.rippleSlot].set(localHit.x, localHit.y, localHit.z, now)
          f.rippleSlot = (f.rippleSlot + 1) % RIPPLE_SLOTS
        }
        pulse()
        // Tells the UI the cloud was touched (the cursor and the hint answer it)
        dispatchEvent(new Event(SWARM_TOUCH))
      }
    } else if (f.on) {
      f.on = false
      dispatchEvent(new Event(SWARM_LEAVE))
    }
    f.clicked = false
  })

  return (
    <mesh ref={meshRef} visible={false} position={[0, 0.12, 0]}>
      <sphereGeometry args={[3.35, 20, 16]} />
      <meshBasicMaterial />
    </mesh>
  )
}
