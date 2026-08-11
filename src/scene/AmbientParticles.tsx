import { useEffect, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Color, NormalBlending, ShaderMaterial } from 'three'
import { QUALITY } from '../lib/quality'
import { useSceneStore } from '../store/sceneStore'
import { uniforms } from './shared'
import { ambientState } from './ambientState'
import { ambientVert, ambientFrag } from './shaders'

const INNER_R = 3.8
const OUTER_R = 11.5

function buildAmbient(count: number) {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  for (let i = 0; i < count; i++) {
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    const r = INNER_R + Math.random() * (OUTER_R - INNER_R)
    positions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta) * 0.68
    positions[i * 3 + 2] = r * Math.cos(phi)
    seeds[i] = Math.random()
  }
  return { positions, seeds }
}

function makeAmbientMaterial(): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader: ambientVert,
    fragmentShader: ambientFrag,
    uniforms: {
      uTime: { value: 0 },
      uSize: { value: 0.072 },
      uMotion: { value: 1 },
      uAccent: { value: new Color('#8b5cf6') },
      uFade: { value: 0 },
    },
    transparent: true,
    depthWrite: false,
    blending: NormalBlending,
  })
}

export function AmbientParticles() {
  const tier = useSceneStore((s) => s.qualityTier)
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const count = QUALITY[tier].ambient
  const cloud = useMemo(() => buildAmbient(count), [count])
  const material = useMemo(() => makeAmbientMaterial(), [])
  const reducedMotion = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => () => material.dispose(), [material])

  useFrame(() => {
    const u = material.uniforms
    u.uTime.value = uniforms.uTime.value
    ;(u.uAccent.value as Color).copy(uniforms.uAccent.value as Color)
    u.uMotion.value = reducedMotion ? 0 : 1

    const spawn = uniforms.uSpawn.value
    let fade = loadPhase === 'ready' || loadPhase === 'labels'
      ? 1
      : loadPhase === 'intro' ? Math.min(1, spawn * 1.1) : 0
    fade *= 1 - uniforms.uDim.value * 0.4
    u.uFade.value = Math.max(0, Math.min(1, fade))
    ambientState.count = count
    ambientState.fade = u.uFade.value
    ambientState.motion = u.uMotion.value as number
  })

  if (!count) return null

  return (
    <points frustumCulled={false} renderOrder={-10} material={material} key={count}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[cloud.seeds, 1]} />
      </bufferGeometry>
    </points>
  )
}
