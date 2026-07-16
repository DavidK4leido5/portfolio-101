import { useEffect, useMemo, useRef, useCallback } from 'react'
import type { BufferGeometry } from 'three'
import { buildConnections } from '../lib/spatialHash'
import { QUALITY } from '../lib/quality'
import { useSceneStore } from '../store/sceneStore'
import { connectionVert, connectionFrag } from './shaders'
import { makeMaterial, type Cloud } from './NeuralCluster'
import { uniforms } from './shared'

export function ConnectionSystem({ cloud }: { cloud: Cloud }) {
  const cfg = QUALITY[useSceneStore((s) => s.qualityTier)]
  const geoRef = useRef<BufferGeometry>(null)

  const buffers = useMemo(
    () => ({
      pos: new Float32Array(cfg.maxConnections * 6),
      scatter: new Float32Array(cfg.maxConnections * 6),
      shapeNetwork: new Float32Array(cfg.maxConnections * 6),
      shapeStack: new Float32Array(cfg.maxConnections * 6),
      seed: new Float32Array(cfg.maxConnections * 2),
      aff: new Float32Array(cfg.maxConnections * 2),
      index: new Float32Array(cfg.maxConnections * 2),
    }),
    [cfg],
  )

  const rebuild = useCallback(() => {
    const geo = geoRef.current
    if (!geo) return
    if (uniforms.uConnect.value < 0.05) {
      geo.setDrawRange(0, 0)
      return
    }
    const active = Math.floor(uniforms.uNodeCount.value)
    const { pairs, count } = buildConnections(cloud.positions, {
      maxDist: cfg.maxDist,
      neighbors: cfg.neighbors,
      maxTotal: cfg.maxConnections,
      activeCount: active,
    })
    const P = cloud.positions, Sc = cloud.scatter, S = cloud.seeds, A = cloud.affinity, I = cloud.indices
    const N = cloud.shapeNetwork, St = cloud.shapeStack
    for (let k = 0; k < count; k++) {
      const a = pairs[k * 2], b = pairs[k * 2 + 1]
      for (let c = 0; c < 3; c++) {
        buffers.pos[k * 6 + c] = P[a * 3 + c]
        buffers.pos[k * 6 + 3 + c] = P[b * 3 + c]
        buffers.scatter[k * 6 + c] = Sc[a * 3 + c]
        buffers.scatter[k * 6 + 3 + c] = Sc[b * 3 + c]
        buffers.shapeNetwork[k * 6 + c] = N[a * 3 + c]
        buffers.shapeNetwork[k * 6 + 3 + c] = N[b * 3 + c]
        buffers.shapeStack[k * 6 + c] = St[a * 3 + c]
        buffers.shapeStack[k * 6 + 3 + c] = St[b * 3 + c]
      }
      buffers.seed[k * 2] = S[a]
      buffers.seed[k * 2 + 1] = S[b]
      buffers.aff[k * 2] = A[a]
      buffers.aff[k * 2 + 1] = A[b]
      buffers.index[k * 2] = I[a]
      buffers.index[k * 2 + 1] = I[b]
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aScatter.needsUpdate = true
    geo.attributes.aShapeNetwork.needsUpdate = true
    geo.attributes.aShapeStack.needsUpdate = true
    geo.attributes.aSeed.needsUpdate = true
    geo.attributes.aAffinity.needsUpdate = true
    geo.attributes.aIndex.needsUpdate = true
    geo.setDrawRange(0, count * 2)
  }, [cloud, cfg, buffers])

  useEffect(() => {
    rebuild()
    const id = setInterval(() => {
      if (uniforms.uConnect.value > 0.05) rebuild()
    }, cfg.rebuildMs)
    return () => clearInterval(id)
  }, [rebuild, cfg])

  const nodeCount = useSceneStore((s) => s.nodeCount)
  useEffect(() => { rebuild() }, [nodeCount, rebuild])

  const material = useMemo(() => makeMaterial(connectionVert, connectionFrag), [])
  useEffect(() => () => material.dispose(), [material])

  return (
    <lineSegments frustumCulled={false} material={material}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[buffers.pos, 3]} />
        <bufferAttribute attach="attributes-aScatter" args={[buffers.scatter, 3]} />
        <bufferAttribute attach="attributes-aShapeNetwork" args={[buffers.shapeNetwork, 3]} />
        <bufferAttribute attach="attributes-aShapeStack" args={[buffers.shapeStack, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[buffers.seed, 1]} />
        <bufferAttribute attach="attributes-aAffinity" args={[buffers.aff, 1]} />
        <bufferAttribute attach="attributes-aIndex" args={[buffers.index, 1]} />
      </bufferGeometry>
    </lineSegments>
  )
}
