import { useEffect, useMemo } from 'react'
import { AdditiveBlending, ShaderMaterial } from 'three'
import { brainSortedSurface, networkSurface, stackSurface, SHAPE_SURFACE_COUNT } from '../data/shapeClouds'
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
  scatter: Float32Array
  seeds: Float32Array
  affinity: Float32Array
  indices: Float32Array
  shapeNetwork: Float32Array
  shapeStack: Float32Array
  count: number
}

function gauss(): number {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const SURFACE_N = SHAPE_SURFACE_COUNT

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

function sampleAligned(
  order: Uint32Array,
  slot: number,
  surface: Float32Array,
  jitter = 0.006,
): [number, number, number] {
  const i = order[slot % SURFACE_N]
  const x = surface[i * 3] + gauss() * jitter
  const y = surface[i * 3 + 1] + gauss() * jitter
  const z = surface[i * 3 + 2] + gauss() * jitter
  return [x, y, z]
}

// Fills the intro camera frustum (fov 49, cam z ~14.6): nodes start anywhere on screen
function scatterAnywhere(): [number, number, number] {
  return [
    (Math.random() - 0.5) * 23,
    (Math.random() - 0.5) * 14,
    (Math.random() - 0.5) * 10 + 1.5,
  ]
}

function assignLobes(positions: Float32Array, affinity: Float32Array, count: number) {
  for (let i = 0; i < count; i++) {
    const x = positions[i * 3]
    const y = positions[i * 3 + 1]
    const z = positions[i * 3 + 2]
    let best = -1
    let bestD2 = Infinity
    for (let s = 0; s < sections.length; s++) {
      const [hx, hy, hz] = sections[s].position
      const dx = x - hx
      const dy = y - hy
      const dz = z - hz
      const d2 = dx * dx + dy * dy + dz * dz
      const r2 = sections[s].radius ** 2
      if (d2 <= r2 && d2 < bestD2) {
        bestD2 = d2
        best = s
      }
    }
    affinity[i] = best
  }
}

export function makeCloud(poolSize: number): Cloud {
  const positions = new Float32Array(poolSize * 3)
  const scatter = new Float32Array(poolSize * 3)
  const seeds = new Float32Array(poolSize)
  const affinity = new Float32Array(poolSize)
  const indices = new Float32Array(poolSize)
  const shapeNetwork = new Float32Array(poolSize * 3)
  const shapeStack = new Float32Array(poolSize * 3)
  const order = shuffledSurfaceOrder()

  for (let i = 0; i < poolSize; i++) {
    const p = sampleAligned(order, i, brainSortedSurface)
    positions[i * 3] = p[0]
    positions[i * 3 + 1] = p[1]
    positions[i * 3 + 2] = p[2]
    const n = sampleAligned(order, i, networkSurface, 0.004)
    shapeNetwork[i * 3] = n[0]
    shapeNetwork[i * 3 + 1] = n[1]
    shapeNetwork[i * 3 + 2] = n[2]
    const s = sampleAligned(order, i, stackSurface, 0.004)
    shapeStack[i * 3] = s[0]
    shapeStack[i * 3 + 1] = s[1]
    shapeStack[i * 3 + 2] = s[2]
    affinity[i] = -1
    seeds[i] = Math.random()
    indices[i] = i
  }

  assignLobes(positions, affinity, poolSize)

  for (let k = 0; k < poolSize; k++) {
    const sp = scatterAnywhere()
    scatter[k * 3] = sp[0]
    scatter[k * 3 + 1] = sp[1]
    scatter[k * 3 + 2] = sp[2]
  }

  return { positions, scatter, seeds, affinity, indices, shapeNetwork, shapeStack, count: poolSize }
}

export function NeuralCluster({ cloud }: { cloud: Cloud }) {
  const material = useMemo(() => makeMaterial(particleVert, particleFrag), [])
  useEffect(() => () => material.dispose(), [material])
  return (
    <points frustumCulled={false} material={material}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[cloud.positions, 3]} />
        <bufferAttribute attach="attributes-aScatter" args={[cloud.scatter, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[cloud.seeds, 1]} />
        <bufferAttribute attach="attributes-aAffinity" args={[cloud.affinity, 1]} />
        <bufferAttribute attach="attributes-aIndex" args={[cloud.indices, 1]} />
        <bufferAttribute attach="attributes-aShapeNetwork" args={[cloud.shapeNetwork, 3]} />
        <bufferAttribute attach="attributes-aShapeStack" args={[cloud.shapeStack, 3]} />
      </bufferGeometry>
    </points>
  )
}
