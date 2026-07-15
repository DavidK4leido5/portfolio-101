import { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import { PerspectiveCamera } from 'three'
import { useSceneStore } from '../store/sceneStore'
import { measureBrainFit, sceneFraming } from '../lib/framing'
import { POST_CA_OFFSET, QUALITY } from '../lib/quality'
import { FABRIC_GAIN, pointerOnScene, uniforms } from './shared'
import { ambientState } from './ambientState'

/** Exposes camera + brain-fit probe for Playwright (smoke / dev builds only). */
export function SceneDebugBridge() {
  const camera = useThree((s) => s.camera)
  const tier = useSceneStore((s) => s.qualityTier)
  const { width, height } = useThree((s) => s.size)

  useEffect(() => {
    if (!import.meta.env.DEV && import.meta.env.VITE_SMOKE !== 'true') return
    const framing = sceneFraming(tier)
    const tierCfg = QUALITY[tier]
    ;(window as unknown as Record<string, unknown>).__scene = {
      uniforms,
      camera,
      qualityTier: tier,
      ambient: ambientState,
      post: {
        ca: tierCfg.ca,
        caOffset: [POST_CA_OFFSET.x, POST_CA_OFFSET.y],
        bloom: tierCfg.bloom,
        grain: tierCfg.grain,
      },
      touch: {
        gain: FABRIC_GAIN,
        get strength() { return uniforms.uTouch.value },
        get pointerOnScene() { return pointerOnScene },
        get x() { return uniforms.uTouchPos.value.x },
        get y() { return uniforms.uTouchPos.value.y },
        get z() { return uniforms.uTouchPos.value.z },
      },
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
    if (camera instanceof PerspectiveCamera) {
      camera.fov = fov
      camera.updateProjectionMatrix()
    }
  }, [camera, tier, width, height])

  return null
}
