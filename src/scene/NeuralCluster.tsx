import { useEffect, useMemo } from 'react'
import { AdditiveBlending, ShaderMaterial } from 'three'
import { brainSurface } from '../data/brainCloud'
import { sections } from '../data/sections'
import { uniforms } from './shared'
import { particleVert, particleFrag } from './shaders'

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

const SURFACE = brainSurface
const SURFACE_N = SURFACE.length / 3

function shuffledSurfaceOrder(): Uint32Array {
  const order = new Uint32Array(SURFACE_N)
  for (let i = 0; i < SURFACE_N; i++) order[i] = i
  for (let i = SURFACE_N - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0
    const t = order[i]
    order[i] = order[j]
    order[j] = t
  }
  return order
}

function sampleSurface(order: Uint32Array, slot: number, jitter = 0.006): [number, number, number] {
  const i = order[slot % SURFACE_N]
  const x = SURFACE[i * 3] + gauss() * jitter
  const y = SURFACE[i * 3 + 1] + gauss() * jitter
  const z = SURFACE[i * 3 + 2] + gauss() * jitter
  return [x, y, z]
}

export function makeCloud(count: number): Cloud {
  const positions = new Float32Array(count * 3)
  const seeds = new Float32Array(count)
  const affinity = new Float32Array(count)
  const order = shuffledSurfaceOrder()
  const perHot = Math.floor((count * 0.14) / sections.length)
  let i = 0

  for (let s = 0; s < sections.length; s++) {
    const [hx, hy, hz] = sections[s].position
    const sig = sections[s].radius * 0.28
    for (let k = 0; k < perHot; k++, i++) {
      positions[i * 3] = hx + gauss() * sig
      positions[i * 3 + 1] = hy + gauss() * sig
      positions[i * 3 + 2] = hz + gauss() * sig
      affinity[i] = s
    }
  }

  for (; i < count; i++) {
    const p = sampleSurface(order, i - perHot * sections.length)
    positions[i * 3] = p[0]
    positions[i * 3 + 1] = p[1]
    positions[i * 3 + 2] = p[2]
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
