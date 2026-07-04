import { useEffect, useMemo, useRef, useCallback } from 'react'
import { AdditiveBlending, BufferGeometry } from 'three'
import { buildConnections } from '../lib/spatialHash'
import { QUALITY } from '../lib/quality'
import { useSceneStore } from '../store/sceneStore'
import { uniforms } from './shared'
import { connectionVert, connectionFrag } from './shaders'
import type { Cloud } from './NeuralCluster'

export function ConnectionSystem({ cloud }: { cloud: Cloud }) {
  const cfg = QUALITY[useSceneStore((s) => s.qualityTier)]
  const geoRef = useRef<BufferGeometry>(null)

  const buffers = useMemo(
    () => ({
      pos: new Float32Array(cfg.maxConnections * 6),
      seed: new Float32Array(cfg.maxConnections * 2),
      aff: new Float32Array(cfg.maxConnections * 2),
    }),
    [cfg],
  )

  const rebuild = useCallback(() => {
    const geo = geoRef.current
    if (!geo) return
    const { pairs, count } = buildConnections(cloud.positions, {
      maxDist: cfg.maxDist,
      neighbors: cfg.neighbors,
      maxTotal: cfg.maxConnections,
    })
    const P = cloud.positions, S = cloud.seeds, A = cloud.affinity
    for (let k = 0; k < count; k++) {
      const a = pairs[k * 2], b = pairs[k * 2 + 1]
      for (let c = 0; c < 3; c++) {
        buffers.pos[k * 6 + c] = P[a * 3 + c]
        buffers.pos[k * 6 + 3 + c] = P[b * 3 + c]
      }
      buffers.seed[k * 2] = S[a]
      buffers.seed[k * 2 + 1] = S[b]
      buffers.aff[k * 2] = A[a]
      buffers.aff[k * 2 + 1] = A[b]
    }
    geo.attributes.position.needsUpdate = true
    geo.attributes.aSeed.needsUpdate = true
    geo.attributes.aAffinity.needsUpdate = true
    geo.setDrawRange(0, count * 2)
  }, [cloud, cfg, buffers])

  useEffect(() => {
    rebuild()
    const id = setInterval(() => {
      if (useSceneStore.getState().phase === 'idle') rebuild()
    }, cfg.rebuildMs)
    return () => clearInterval(id)
  }, [rebuild, cfg])

  return (
    <lineSegments frustumCulled={false}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[buffers.pos, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[buffers.seed, 1]} />
        <bufferAttribute attach="attributes-aAffinity" args={[buffers.aff, 1]} />
      </bufferGeometry>
      <shaderMaterial
        vertexShader={connectionVert}
        fragmentShader={connectionFrag}
        uniforms={uniforms}
        transparent
        depthWrite={false}
        blending={AdditiveBlending}
      />
    </lineSegments>
  )
}
