import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { useSceneStore } from '../store/sceneStore'
import { measureBrainFit, sceneFraming } from '../lib/framing'
import { uniforms } from './shared'

/** Exposes camera + brain-fit probe for Playwright (smoke / dev builds only). */
export function SceneDebugBridge() {
  const camera = useThree((s) => s.camera)
  const tier = useSceneStore((s) => s.qualityTier)
  const { width, height } = useThree((s) => s.size)

  useEffect(() => {
    if (!import.meta.env.DEV && import.meta.env.VITE_SMOKE !== 'true') return
    const framing = sceneFraming(tier)
    ;(window as unknown as Record<string, unknown>).__scene = {
      uniforms,
      camera,
      qualityTier: tier,
      measureBrainFit: () => measureBrainFit(camera, framing.clusterScale),
      framing: {
        camZ: framing.cam.z,
        clusterScale: framing.clusterScale,
        fov: framing.fov,
        portrait: width / height < 0.85,
      },
    }
  }, [camera, tier, width, height])

  return null
}

/** Apply tier FOV when quality tier changes (mobile gets wider FOV). */
export function CameraFraming() {
  const camera = useThree((s) => s.camera)
  const tier = useSceneStore((s) => s.qualityTier)
  const { width, height } = useThree((s) => s.size)

  useEffect(() => {
    const { fov } = sceneFraming(tier)
    if (camera.type === 'PerspectiveCamera') {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [camera, tier, width, height])

  return null
}
