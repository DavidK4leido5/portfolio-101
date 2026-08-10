import { useEffect, useRef, type MutableRefObject } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3, type Camera } from 'three'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, sections, type SectionId } from '../data/sections'
import { QUALITY } from '../lib/quality'
import { clusterState, hotspotWorld, rotateY, uniforms } from './shared'
import { sceneFraming } from '../lib/framing'

gsap.ticker.lagSmoothing(0)

const ORIGIN = new Vector3()
const UP = new Vector3(0, 1, 0)
const tmpPos = new Vector3()
const tmpOff = new Vector3()
const tmpDest0 = new Vector3()
const tmpDest1 = new Vector3()
const tmpLook0 = new Vector3()
const tmpLook1 = new Vector3()
const tmpCam = new Vector3()
const tmpLook = new Vector3()
const tmpHotspot = new Vector3()
const tmpRight = new Vector3()

function writeSectionCamera(id: SectionId, destOut: Vector3, lookOut: Vector3) {
  const i = SECTION_IDS.indexOf(id)
  hotspotWorld(i, tmpHotspot)
  destOut.copy(tmpHotspot).add(rotateY(sections[i].cameraOffset, tmpOff))
  tmpRight.subVectors(tmpHotspot, destOut).normalize().cross(UP).normalize()
  lookOut.copy(tmpHotspot).addScaledVector(tmpRight, 1.15)
}

/** Waypoint 0 = home framing; 1..N = sectors */
function writeWaypoint(index: number, destOut: Vector3, lookOut: Vector3, tier: Parameters<typeof sceneFraming>[0]) {
  if (index <= 0) {
    const home = sceneFraming(tier).cam
    destOut.set(home.x, home.y, home.z)
    lookOut.set(0, 0, 0)
    return
  }
  writeSectionCamera(SECTION_IDS[index - 1], destOut, lookOut)
}

function sectionCameraTarget(id: SectionId) {
  writeSectionCamera(id, tmpDest0, tmpLook0)
  return { dest: tmpDest0.clone(), lookT: tmpLook0.clone() }
}

function idleOrbit(
  camera: Camera,
  lookRef: MutableRefObject<Vector3>,
  delta: number,
  amp = 1,
) {
  clusterState.rotation += delta * 0.015 * amp
  const t = uniforms.uTime.value
  const base = sceneFraming(useSceneStore.getState().qualityTier).cam
  tmpPos.set(
    base.x + Math.sin(t * 0.11) * 0.35 * amp + uniforms.uMouse.value.x * 0.5 * amp,
    base.y + Math.sin(t * 0.17 + 1.3) * 0.25 * amp + uniforms.uMouse.value.y * 0.3 * amp,
    base.z + Math.sin(t * 0.07 + 2.1) * 0.3 * amp,
  )
  camera.position.lerp(tmpPos, 0.035)
  lookRef.current.lerp(ORIGIN, 0.05)
  camera.lookAt(lookRef.current)
}

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const tier = useSceneStore((s) => s.qualityTier)
  const active = useSceneStore((s) => s.activeSection)
  const phase = useSceneStore((s) => s.phase)
  const returning = useSceneStore((s) => s.returning)
  const scrollZone = useSceneStore((s) => s.scrollZone)
  const travelTlRef = useRef<gsap.core.Timeline | null>(null)
  const focusTlRef = useRef<gsap.core.Timeline | null>(null)
  const homeTlRef = useRef<gsap.core.Timeline | null>(null)
  const lookRef = useRef(new Vector3())
  const wasJourneyRef = useRef(false)

  useFrame((_, delta) => {
    if (useSceneStore.getState().loadPhase !== 'ready') return
    const s = useSceneStore.getState()

    // Journey: home → sector0 → … → sectorN (scroll-scrubbed)
    if (s.scrollZone === 'journey') {
      wasJourneyRef.current = true
      travelTlRef.current?.kill()
      focusTlRef.current?.kill()
      homeTlRef.current?.kill()

      const n = SECTION_IDS.length
      const t = Math.min(1, Math.max(0, s.journeyProgress)) * n
      const clamped = Math.min(t, n - 1e-6)
      const i0 = Math.floor(clamped)
      const i1 = Math.min(n, i0 + 1)
      const f = clamped - i0

      writeWaypoint(i0, tmpDest0, tmpLook0, s.qualityTier)
      writeWaypoint(i1, tmpDest1, tmpLook1, s.qualityTier)
      tmpCam.lerpVectors(tmpDest0, tmpDest1, f)
      tmpLook.lerpVectors(tmpLook0, tmpLook1, f)
      camera.position.copy(tmpCam)
      lookRef.current.copy(tmpLook)
      camera.lookAt(lookRef.current)

      // Soft at home (i0===0), stronger lobe focus near sector centers
      const atHome = i0 === 0 ? 1 - f : 0
      const nearness = 1 - Math.abs(f - 0.5) * 2
      const focusAmt = atHome > 0.5 ? (1 - atHome) * 0.35 : 0.55 + nearness * 0.45
      uniforms.uFocus.value = focusAmt
      uniforms.uDim.value = atHome > 0.5 ? (1 - atHome) * 0.25 : 0.4 + focusAmt * 0.25
      return
    }

    // Settle bridge — cinematic home hold before journey
    if (s.scrollZone === 'settle') {
      wasJourneyRef.current = false
      travelTlRef.current?.kill()
      focusTlRef.current?.kill()
      uniforms.uFocus.value += (0 - uniforms.uFocus.value) * Math.min(1, delta * 3)
      uniforms.uDim.value += (0 - uniforms.uDim.value) * Math.min(1, delta * 3)
      idleOrbit(camera, lookRef, delta, 0.65)
      return
    }

    // Under cover — keep home framing (parallax is DOM-side)
    if (s.scrollZone === 'cover') {
      if (wasJourneyRef.current) {
        wasJourneyRef.current = false
      }
      uniforms.uFocus.value += (0 - uniforms.uFocus.value) * Math.min(1, delta * 2)
      uniforms.uDim.value += (0 - uniforms.uDim.value) * Math.min(1, delta * 2)
      idleOrbit(camera, lookRef, delta, 0.35)
      return
    }

    if (wasJourneyRef.current && s.scrollZone === 'hero') {
      wasJourneyRef.current = false
    }

    if (s.scrollZone === 'end') {
      wasJourneyRef.current = false
      return
    }

    if (s.scrollZone !== 'hero' || s.phase !== 'idle') return
    idleOrbit(camera, lookRef, delta, 1)
  })

  useEffect(() => {
    if (scrollZone === 'journey') return

    const look = lookRef.current
    const cfg = QUALITY[useSceneStore.getState().qualityTier]
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dur = reduced ? 0.3 : cfg.travelSec

    if (returning) {
      focusTlRef.current?.kill()
      travelTlRef.current?.kill()
      homeTlRef.current?.kill()
      uniforms.uFocus.value = 0
      uniforms.uDim.value = 0
      const tl = gsap.timeline({
        onComplete: () => {
          uniforms.uFocus.value = 0
          uniforms.uDim.value = 0
          useSceneStore.getState().settleHome()
        },
      })
      const home = sceneFraming(useSceneStore.getState().qualityTier).cam
      tl.to(uniforms.uFocus, { value: 0, duration: 0.45, ease: 'power2.out' }, 0)
        .to(uniforms.uDim, { value: 0, duration: 0.5, ease: 'power2.out' }, 0)
        .to(camera.position, { x: home.x, y: home.y, z: home.z, duration: dur * 0.85, ease: 'power3.inOut' }, 0.35)
        .to(look, { x: 0, y: 0, z: 0, duration: dur * 0.8, ease: 'power2.inOut' }, 0.35)
      tl.eventCallback('onUpdate', () => camera.lookAt(look))
      travelTlRef.current = tl
      return
    }

    if (active && (scrollZone === 'hero' || scrollZone === 'settle')) {
      focusTlRef.current?.kill()
      travelTlRef.current?.kill()
      homeTlRef.current?.kill()
      uniforms.uFocus.value = 0
      uniforms.uDim.value = 0
      uniforms.uTravel.value = 0

      const { dest, lookT } = sectionCameraTarget(active)

      const tl = gsap.timeline({ onComplete: () => useSceneStore.getState().arrive() })
      tl.to(camera.position, { z: `+=${reduced ? 0 : 0.9}`, duration: reduced ? 0.01 : 0.5, ease: 'power2.out' })
        .to(camera.position, { x: dest.x, y: dest.y, z: dest.z, duration: dur, ease: 'power4.inOut' })
        .to(look, { x: lookT.x, y: lookT.y, z: lookT.z, duration: dur * 0.85, ease: 'power3.inOut' }, '<')
        .to(uniforms.uDim, { value: 0.55, duration: dur * 0.6, ease: 'power2.out' }, dur * 0.35)
      tl.eventCallback('onUpdate', () => camera.lookAt(look))
      travelTlRef.current = tl
    }
  }, [active, returning, camera, tier, scrollZone])

  useEffect(() => {
    if (phase !== 'arrived' || !active || (scrollZone !== 'hero' && scrollZone !== 'settle')) {
      focusTlRef.current?.kill()
      return
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    focusTlRef.current?.kill()
    const tl = gsap.timeline({ delay: reduced ? 0.05 : 0.8 })
    tl.to(uniforms.uFocus, { value: 1, duration: 1.6, ease: 'power2.inOut' })
      .to(uniforms.uDim, { value: 0.65, duration: 1.6, ease: 'power2.inOut' }, '<')
    focusTlRef.current = tl
    return () => { focusTlRef.current?.kill() }
  }, [phase, active, scrollZone])

  useEffect(() => () => {
    travelTlRef.current?.kill()
    focusTlRef.current?.kill()
    homeTlRef.current?.kill()
  }, [])

  return null
}
