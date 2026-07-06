import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, sections } from '../data/sections'
import { QUALITY } from '../lib/quality'
import { CAM_BASE, clusterState, hotspotWorld, rotateY, uniforms } from './shared'

gsap.ticker.lagSmoothing(0)

const ORIGIN = new Vector3()
const UP = new Vector3(0, 1, 0)
const tmpPos = new Vector3()
const tmpOff = new Vector3()

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const active = useSceneStore((s) => s.activeSection)
  const phase = useSceneStore((s) => s.phase)
  const returning = useSceneStore((s) => s.returning)
  const travelTlRef = useRef<gsap.core.Timeline | null>(null)
  const focusTlRef = useRef<gsap.core.Timeline | null>(null)
  const lookRef = useRef(new Vector3())

  useFrame((_, delta) => {
    if (useSceneStore.getState().loadPhase !== 'ready') return
    if (useSceneStore.getState().phase !== 'idle') return
    clusterState.rotation += delta * 0.015
    const t = uniforms.uTime.value
    tmpPos.set(
      CAM_BASE.x + Math.sin(t * 0.11) * 0.35 + uniforms.uMouse.value.x * 0.5,
      CAM_BASE.y + Math.sin(t * 0.17 + 1.3) * 0.25 + uniforms.uMouse.value.y * 0.3,
      CAM_BASE.z + Math.sin(t * 0.07 + 2.1) * 0.3,
    )
    camera.position.lerp(tmpPos, 0.035)
    lookRef.current.lerp(ORIGIN, 0.05)
    camera.lookAt(lookRef.current)
  })

  useEffect(() => {
    const look = lookRef.current
    const cfg = QUALITY[useSceneStore.getState().qualityTier]
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dur = reduced ? 0.3 : cfg.travelSec

    if (returning) {
      focusTlRef.current?.kill()
      travelTlRef.current?.kill()
      uniforms.uFocus.value = 0
      uniforms.uDim.value = 0
      const tl = gsap.timeline({
        onComplete: () => {
          uniforms.uFocus.value = 0
          uniforms.uDim.value = 0
          useSceneStore.getState().settleHome()
        },
      })
      tl.to(uniforms.uFocus, { value: 0, duration: 0.45, ease: 'power2.out' }, 0)
        .to(uniforms.uDim, { value: 0, duration: 0.5, ease: 'power2.out' }, 0)
        .to(camera.position, { x: CAM_BASE.x, y: CAM_BASE.y, z: CAM_BASE.z, duration: dur * 0.85, ease: 'power3.inOut' }, 0.35)
        .to(look, { x: 0, y: 0, z: 0, duration: dur * 0.8, ease: 'power2.inOut' }, 0.35)
      tl.eventCallback('onUpdate', () => camera.lookAt(look))
      travelTlRef.current = tl
      return
    }

    if (active) {
      focusTlRef.current?.kill()
      travelTlRef.current?.kill()
      uniforms.uFocus.value = 0
      uniforms.uDim.value = 0
      uniforms.uTravel.value = 0

      const i = SECTION_IDS.indexOf(active)
      const hotspot = hotspotWorld(i, new Vector3())
      const dest = hotspot.clone().add(rotateY(sections[i].cameraOffset, tmpOff))
      const right = new Vector3().subVectors(hotspot, dest).normalize().cross(UP).normalize()
      const lookT = hotspot.clone().addScaledVector(right, 1.15)

      const tl = gsap.timeline({ onComplete: () => useSceneStore.getState().arrive() })
      tl.to(camera.position, { z: `+=${reduced ? 0 : 0.9}`, duration: reduced ? 0.01 : 0.5, ease: 'power2.out' })
        .to(camera.position, { x: dest.x, y: dest.y, z: dest.z, duration: dur, ease: 'power4.inOut' })
        .to(look, { x: lookT.x, y: lookT.y, z: lookT.z, duration: dur * 0.85, ease: 'power3.inOut' }, '<')
        .to(uniforms.uDim, { value: 0.55, duration: dur * 0.6, ease: 'power2.out' }, dur * 0.35)
      tl.eventCallback('onUpdate', () => camera.lookAt(look))
      travelTlRef.current = tl
    }
  }, [active, returning, camera])

  // After modal visible: lobe nodes brighten, rest dims
  useEffect(() => {
    if (phase !== 'arrived' || !active) {
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
  }, [phase, active])

  useEffect(() => () => {
    travelTlRef.current?.kill()
    focusTlRef.current?.kill()
  }, [])

  return null
}
