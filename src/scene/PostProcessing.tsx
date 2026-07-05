import { useMemo, useRef } from 'react'
import { Vector2 } from 'three'
import { useFrame } from '@react-three/fiber'
import { EffectComposer, Bloom, Vignette, ChromaticAberration, Noise, DepthOfField } from '@react-three/postprocessing'
import type { DepthOfFieldEffect } from 'postprocessing'
import { QUALITY } from '../lib/quality'
import { useSceneStore } from '../store/sceneStore'
import { dofState } from './shared'

export function PostProcessing() {
  const cfg = QUALITY[useSceneStore((s) => s.qualityTier)]
  const caOffset = useMemo(() => new Vector2(0.0006, 0.0009), [])
  const dofRef = useRef<DepthOfFieldEffect>(null)

  useFrame(() => {
    const e = dofRef.current
    if (!e) return
    e.bokehScale = dofState.bokeh
    e.cocMaterial.worldFocusDistance = dofState.focus
    e.cocMaterial.worldFocusRange = 2.4
  })

  if (!cfg.bloom) return null
  return (
    <EffectComposer>
      {cfg.dof ? <DepthOfField ref={dofRef} worldFocusDistance={3} worldFocusRange={2.4} bokehScale={0} /> : <></>}
      <Bloom intensity={cfg.bloomIntensity} luminanceThreshold={0.32} mipmapBlur />
      {cfg.ca ? <ChromaticAberration offset={caOffset} /> : <></>}
      {cfg.grain ? <Noise opacity={0.045} /> : <></>}
      <Vignette offset={0.26} darkness={0.72} />
    </EffectComposer>
  )
}
