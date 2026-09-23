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
import {
  SWARM_ATTACK,
  SWARM_BITE,
  SWARM_ENTER,
  SWARM_LEAVE,
  SWARM_RETREAT,
  SWARM_TOUCH,
} from '../lib/swarmEvents'

const raycaster = new Raycaster()
const ndc = new Vector2()
const localHit = new Vector3()
const lastHit = new Vector3()
const view = new Vector3()
const groupRot = new Quaternion()
const chase = new Vector3()
const center = new Vector3()

/** Seconds between the light pulses a moving pointer sends out, min and spread. */
const PULSE_GAP = 0.8
const PULSE_JITTER = 0.9
/** Distance the pointer has to travel on the cloud before it sends another. */
const PULSE_TRAVEL = 0.5

/*
 * Raids. Time on the cloud before the swarm first goes for the cursor, and
 * between raids after that (min, spread). A click provokes one sooner.
 */
const RAID_FIRST = 3.5
const RAID_FIRST_JITTER = 2.5
const RAID_EVERY = 7
const RAID_EVERY_JITTER = 5
/** The raid's beats, seconds from its start. Mirrors attackPos in shaders.ts. */
const RAID_ARRIVE = 0.9
const RAID_RETREAT = 2.35
const RAID_END = 4.0
/** How fast the attackers' target follows the cursor; lower lags more. */
const CHASE = 5

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
    // Raids need a cursor to go after, so touch screens never get them
    canRaid:
      typeof matchMedia !== 'undefined' &&
      matchMedia('(hover: hover) and (pointer: fine)').matches &&
      !matchMedia('(prefers-reduced-motion: reduce)').matches,
    onTime: 0,
    nextRaid: RAID_FIRST + Math.random() * RAID_FIRST_JITTER,
    raidAt: -1,
    raidStage: 0,
    nextBite: 0,
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
      // Unmounted with the pointer still on the cloud, or mid-raid: tell the UI
      if (feelRef.current.on) dispatchEvent(new Event(SWARM_LEAVE))
      if (feelRef.current.raidAt >= 0) dispatchEvent(new Event(SWARM_RETREAT))
    }
  }, [])

  useFrame((_, delta) => {
    // Capped only against a tab-switch jump, so the timing holds on slow devices
    const dt = Math.min(delta, 0.25)
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
      f.onTime += dt
      if (f.clicked) {
        // Reduced motion keeps the light and skips the swarm's movement
        if (!f.reduced) {
          uniforms.uRipple.value[f.rippleSlot].set(localHit.x, localHit.y, localHit.z, now)
          f.rippleSlot = (f.rippleSlot + 1) % RIPPLE_SLOTS
        }
        pulse()
        // Poked, it hits back: a raid just after the startle
        if (f.raidAt < 0) f.onTime = Math.max(f.onTime, f.nextRaid - 0.35)
        // Tells the UI the cloud was touched (the cursor and the hint answer it)
        dispatchEvent(new Event(SWARM_TOUCH))
      }
    } else if (f.on) {
      f.on = false
      dispatchEvent(new Event(SWARM_LEAVE))
    }
    f.clicked = false

    /*
     * The raid. It starts from wherever the pointer is on the cloud; the
     * attackers' target then follows the cursor, at the cloud's depth along
     * the pointer's ray, so it holds even when the cursor runs off the cloud.
     * The UI hears the beats: arrival, each bite, the retreat.
     */
    if (!f.canRaid) return
    const attack = uniforms.uAttack.value
    if (f.raidAt < 0 && hit && f.onTime >= f.nextRaid) {
      f.raidAt = now
      f.raidStage = 0
      attack.set(localHit.x, localHit.y, localHit.z, now)
      uniforms.uAttackTarget.value.copy(localHit)
    }
    if (f.raidAt < 0) return

    ndc.set(mouse.x, mouse.y)
    raycaster.setFromCamera(ndc, camera)
    if (clusterState.group) clusterState.group.getWorldPosition(center)
    else center.set(0, 0, 0)
    raycaster.ray.at(camera.position.distanceTo(center), chase)
    if (clusterState.group) clusterState.group.worldToLocal(chase)
    uniforms.uAttackTarget.value.lerp(chase, Math.min(1, dt * CHASE))

    const t = now - f.raidAt
    if (f.raidStage === 0 && t >= RAID_ARRIVE) {
      f.raidStage = 1
      f.nextBite = t
      dispatchEvent(new Event(SWARM_ATTACK))
    }
    if (f.raidStage === 1) {
      if (t >= f.nextBite) {
        dispatchEvent(new Event(SWARM_BITE))
        f.nextBite = t + 0.18 + Math.random() * 0.2
      }
      if (t >= RAID_RETREAT) {
        f.raidStage = 2
        dispatchEvent(new Event(SWARM_RETREAT))
      }
    }
    if (t >= RAID_END) {
      attack.w = -1
      f.raidAt = -1
      f.onTime = 0
      f.nextRaid = RAID_EVERY + Math.random() * RAID_EVERY_JITTER
    }
  })

  return (
    <mesh ref={meshRef} visible={false} position={[0, 0.12, 0]}>
      <sphereGeometry args={[3.35, 20, 16]} />
      <meshBasicMaterial />
    </mesh>
  )
}
