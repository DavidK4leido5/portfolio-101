import { useMemo } from 'react'
import { Vector2 } from 'three'
import { EffectComposer, Bloom, Vignette, Noise, ChromaticAberration } from '@react-three/postprocessing'
import { POST_CA_OFFSET, QUALITY } from '../lib/quality'
import { useSceneStore } from '../store/sceneStore'

export function PostProcessing() {
  const cfg = QUALITY[useSceneStore((s) => s.qualityTier)]
  const caOffset = useMemo(() => new Vector2(POST_CA_OFFSET.x, POST_CA_OFFSET.y), [])

  if (!cfg.bloom) return null
  return (
    <EffectComposer>
      <Bloom intensity={cfg.bloomIntensity} luminanceThreshold={0.62} mipmapBlur />
      {cfg.ca ? <ChromaticAberration offset={caOffset} /> : <></>}
      {cfg.grain ? <Noise opacity={cfg.grainOpacity} /> : <></>}
      <Vignette offset={0.42} darkness={0.48} />
    </EffectComposer>
  )
}
