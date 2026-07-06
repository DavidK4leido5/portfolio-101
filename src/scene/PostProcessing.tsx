import { useMemo } from 'react'
import { Vector2 } from 'three'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise } from '@react-three/postprocessing'
import { QUALITY } from '../lib/quality'
import { useSceneStore } from '../store/sceneStore'

export function PostProcessing() {
  const cfg = QUALITY[useSceneStore((s) => s.qualityTier)]
  const caOffset = useMemo(() => new Vector2(0.0006, 0.0009), [])
  if (!cfg.bloom) return null
  return (
    <EffectComposer>
      <Bloom intensity={cfg.bloomIntensity} luminanceThreshold={0.62} mipmapBlur />
      {cfg.ca ? <ChromaticAberration offset={caOffset} /> : <></>}
      {cfg.grain ? <Noise opacity={0.035} /> : <></>}
      <Vignette offset={0.26} darkness={0.72} />
    </EffectComposer>
  )
}
