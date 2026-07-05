import { useEffect, useMemo } from 'react'
import { AdditiveBlending, ShaderMaterial } from 'three'
import { sections } from '../data/sections'
import { uniforms } from './shared'
import { particleVert, particleFrag } from './shaders'

// new ShaderMaterial({ uniforms }) shares the object by reference;
// the R3F uniforms prop clones holders, silently disconnecting shared updates.
export function makeMaterial(vertexShader: string, fragmentShader: string): ShaderMaterial {
  return new ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms,
    transparent: true,
    depthWrite: false,
    blending: AdditiveBlending,
  })
}

export interface Cloud {
  positions: Float32Array
  seeds: Float32Array
  affinity: Float32Array
  count: number
}

function gauss(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const LOBES: [number, number, number][] = [[0.9, 0.3, -0.5], [-1.0, -0.2, 0.6], [0.2, 0.7, 0.9]]

export function makeCloud(count: number): Cloud {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const affinity = new Float32Array(count)
  const perHot = Math.floor((count * 0.15) / sections.length)
  const nShell = Math.floor(count * 0.1)
  let i = 0

  for (let s = 0; s < sections.length; s++) {
    const [hx, hy, hz] = sections[s].position
    const sig = sections[s].radius * 0.5
    for (let k = 0; k < perHot; k++, i++) {
      positions[i * 3] = hx + gauss() * sig
      positions[i * 3 + 1] = hy + gauss() * sig
      positions[i * 3 + 2] = hz + gauss() * sig
      affinity[i] = s
    }
  }
  for (let k = 0; k < nShell; k++, i++) {
    const th = Math.random() * Math.PI * 2
    const ph = Math.acos(2 * Math.random() - 1)
    const r = 3.4 + Math.random() * 2.2
    positions[i * 3] = r * Math.sin(ph) * Math.cos(th)
    positions[i * 3 + 1] = r * Math.cos(ph) * 0.72
    positions[i * 3 + 2] = r * Math.sin(ph) * Math.sin(th)
    affinity[i] = -1
  }
  for (; i < count; i++) {
    const lobe = LOBES[(Math.random() * LOBES.length) | 0]
    const w = Math.random() * 0.55
    positions[i * 3] = gauss() * 1.9 + lobe[0] * w
    positions[i * 3 + 1] = gauss() * 1.35 + lobe[1] * w
    positions[i * 3 + 2] = gauss() * 1.7 + lobe[2] * w
    affinity[i] = -1
  }
  for (let k = 0; k < count; k++) seeds[k] = Math.random()
  return { positions, seeds, affinity, count }
}

export function NeuralCluster({ cloud }: { cloud: Cloud }) {
  const material = useMemo(() => makeMaterial(particleVert, particleFrag), [])
  useEffect(() => () => material.dispose(), [material])
  return (
    <points frustumCulled={false} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[cloud.seeds, 1]} />
        <bufferAttribute attach="attributes-aAffinity" args={[cloud.affinity, 1]} />
      </bufferGeometry>
    </points>
  )
}
