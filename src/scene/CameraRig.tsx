import { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Vector3 } from 'three'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { SECTION_IDS, sections } from '../data/sections'
import { QUALITY } from '../lib/quality'
import { CAM_BASE, clusterState, dofState, hotspotWorld, rotateY, uniforms } from './shared'

// time-accurate transitions even when the frame rate tanks
gsap.ticker.lagSmoothing(0)

const ORIGIN = new Vector3()
const tmpPos = new Vector3()
const tmpOff = new Vector3()

export function CameraRig() {
  const camera = useThree((s) => s.camera)
  const active = useSceneStore((s) => s.activeSection)
  const returning = useSceneStore((s) => s.returning)
  const tlRef = useRef<gsap.core.Timeline | null>(null)
  const lookRef = useRef(new Vector3())

  useFrame((_, delta) => {
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
    const store = useSceneStore.getState()
    const cfg = QUALITY[store.qualityTier]
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dur = reduced ? 0.3 : cfg.travelSec

    if (returning) {
      tlRef.current?.kill()
      const tl = gsap.timeline({ onComplete: () => useSceneStore.getState().settleHome() })
      tl.to(camera.position, { x: CAM_BASE.x, y: CAM_BASE.y, z: CAM_BASE.z, duration: dur * 0.85, ease: 'power3.inOut' })
        .to(look, { x: 0, y: 0, z: 0, duration: dur * 0.8, ease: 'power2.inOut' }, '<')
        .to(uniforms.uTravel, { value: 0, duration: dur * 0.6, ease: 'power2.out' }, '<')
        .to(uniforms.uDim, { value: 0, duration: 0.9, ease: 'power2.out' }, '<')
        .to(uniforms.uConstel, { value: 0, duration: 0.5, ease: 'power2.in' }, 0)
        .to(dofState, { bokeh: 0, duration: 0.8, ease: 'power2.out' }, 0)
      tl.eventCallback('onUpdate', () => camera.lookAt(look))
      tlRef.current = tl
      return
    }

    if (active) {
      tlRef.current?.kill()
      const i = SECTION_IDS.indexOf(active)
      const lookT = hotspotWorld(i, new Vector3())
      const dest = lookT.clone().add(rotateY(sections[i].cameraOffset, tmpOff))
      const tl = gsap.timeline({ onComplete: () => useSceneStore.getState().arrive() })
      dofState.focus = dest.distanceTo(lookT)
      tl.to(camera.position, { z: `+=${reduced ? 0 : 0.9}`, duration: reduced ? 0.01 : 0.5, ease: 'power2.out' })
        .to(camera.position, { x: dest.x, y: dest.y, z: dest.z, duration: dur, ease: 'power4.inOut' })
        .to(look, { x: lookT.x, y: lookT.y, z: lookT.z, duration: dur * 0.85, ease: 'power3.inOut' }, '<')
        .to(uniforms.uTravel, { value: 1, duration: dur * 0.7, ease: 'power2.in' }, '<')
        .to(uniforms.uDim, { value: 0.85, duration: 0.8, ease: 'power2.out' }, '<')
        .to(uniforms.uConstel, { value: 1, duration: 1.1, ease: 'power2.out' }, 0.5 + dur * 0.55)
      if (cfg.dof) tl.to(dofState, { bokeh: cfg.dofBokeh, duration: 1.2, ease: 'power2.out' }, 0.5 + dur * 0.5)
      tl.eventCallback('onUpdate', () => camera.lookAt(look))
      tlRef.current = tl
    }
  }, [active, returning, camera])

  useEffect(() => () => { tlRef.current?.kill() }, [])

  return null
}
