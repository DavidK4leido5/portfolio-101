import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../store/sceneStore'
import { NODE_LIMITS } from '../lib/nodes'
import { CAM_BASE, clusterState, uniforms } from './shared'
import { runIntroSpawn } from './nodeAnimator'

export function IntroSequence() {
  const camera = useThree((s) => s.camera)
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const tier = useSceneStore((s) => s.qualityTier)
  const ran = useRef(false)

  useEffect(() => {
    if (loadPhase !== 'intro' || ran.current) return
    ran.current = true

    const limits = NODE_LIMITS[tier]
    uniforms.uNodeCount.value = limits.default
    uniforms.uSpawn.value = 0
    uniforms.uSliderSpawn.value = 1
    uniforms.uConnect.value = 0
    useSceneStore.setState({ nodeCount: limits.default })

    camera.position.set(CAM_BASE.x - 1.4, CAM_BASE.y + 0.9, CAM_BASE.z + 6.4)
    clusterState.rotation = 0

    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    const dur = reduced ? 0.6 : 5.4

    const tl = runIntroSpawn(dur)
    gsap.to(camera.position, {
      x: CAM_BASE.x,
      y: CAM_BASE.y,
      z: CAM_BASE.z,
      duration: dur,
      ease: 'power2.inOut',
    })
    gsap.to(clusterState, {
      rotation: reduced ? 0 : 0.42,
      duration: dur,
      ease: 'power2.out',
    })
    tl.eventCallback('onComplete', () => {
      uniforms.uSpawn.value = 1
      uniforms.uConnect.value = 1
      useSceneStore.getState().finishIntro()
    })
  }, [loadPhase, tier, camera])

  return null
}
