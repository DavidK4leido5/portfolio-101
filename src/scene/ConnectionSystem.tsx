import { useEffect, useMemo, useRef, useCallback } from 'react'
import type { BufferGeometry } from 'three'
import { buildConnections } from '../lib/spatialHash'
import { QUALITY } from '../lib/quality'
import { useSceneStore } from '../store/sceneStore'
import { sections } from '../data/sections'
import {
  connectionVert, connectionFrag,
  constellationLineVert, constellationLineFrag,
  constellationStarVert, constellationStarFrag,
} from './shaders'
import { makeMaterial, type Cloud } from './NeuralCluster'

const STARS_PER_SECTION = 11

// Deterministic per session: farthest-point sampling spreads the figure, then a
// minimum spanning tree (Prim) connects it — every line ends on a star, no long
// crossing jumps, and Prim's insertion order doubles as the draw-in reveal order.
function buildConstellation(cloud: Cloud) {
  const P = cloud.positions
  const d2 = (a: number, b: number) => {
    const dx = P[a * 3] - P[b * 3], dy = P[a * 3 + 1] - P[b * 3 + 1], dz = P[a * 3 + 2] - P[b * 3 + 2]
    return dx * dx + dy * dy + dz * dz
  }

  interface Figure { nodes: number[]; nodeOrder: number[]; edges: [number, number][] }

  const figures: Figure[] = sections.map((sec, s) => {
    const [hx, hy, hz] = sec.position
    const maxR2 = (sec.radius * 1.0) ** 2
    const members: number[] = []
    for (let i = 0; i < cloud.count; i++) {
      if (cloud.affinity[i] !== s) continue
      const dx = P[i * 3] - hx, dy = P[i * 3 + 1] - hy, dz = P[i * 3 + 2] - hz
      // keep the figure compact around the hotspot
      if (dx * dx + dy * dy + dz * dz <= maxR2) members.push(i)
    }
    if (members.length < 2) return { nodes: [], nodeOrder: [], edges: [] }
    const k = Math.min(STARS_PER_SECTION, members.length)

    let first = members[0]
    let bd = Infinity
    for (const i of members) {
      const dx = P[i * 3] - hx, dy = P[i * 3 + 1] - hy, dz = P[i * 3 + 2] - hz
      const d = dx * dx + dy * dy + dz * dz
      if (d < bd) { bd = d; first = i }
    }

    const chosen = [first]
    const minD = new Map<number, number>()
    for (const i of members) minD.set(i, d2(i, first))
    while (chosen.length < k) {
      let cand = -1, cd = -1
      for (const [i, d] of minD) {
        if (d > cd) { cd = d; cand = i }
      }
      minD.delete(cand)
      chosen.push(cand)
      for (const [i, d] of minD) minD.set(i, Math.min(d, d2(i, cand)))
    }

    // Prim's MST over the chosen stars
    const inTree = [false, ...new Array(k - 1).fill(false)] as boolean[]
    const best = new Array<number>(k).fill(Infinity)
    const par = new Array<number>(k).fill(0)
    const nodeOrder = new Array<number>(k).fill(0)
    inTree[0] = true
    for (let i = 1; i < k; i++) best[i] = d2(chosen[i], chosen[0])
    const edges: [number, number][] = []
    for (let step = 1; step < k; step++) {
      let next = -1, bd2 = Infinity
      for (let i = 1; i < k; i++) {
        if (!inTree[i] && best[i] < bd2) { bd2 = best[i]; next = i }
      }
      inTree[next] = true
      nodeOrder[next] = step
      edges.push([par[next], next])
      for (let i = 1; i < k; i++) {
        if (inTree[i]) continue
        const d = d2(chosen[i], chosen[next])
        if (d < best[i]) { best[i] = d; par[i] = next }
      }
    }
    return { nodes: chosen, nodeOrder, edges }
  })

  const totalEdges = figures.reduce((n, f) => n + f.edges.length, 0)
  const totalStars = figures.reduce((n, f) => n + f.nodes.length, 0)
  const linePos = new Float32Array(totalEdges * 6)
  const lineSeed = new Float32Array(totalEdges * 2)
  const lineAff = new Float32Array(totalEdges * 2)
  const lineOrder = new Float32Array(totalEdges * 2)
  const starPos = new Float32Array(totalStars * 3)
  const starSeed = new Float32Array(totalStars)
  const starAff = new Float32Array(totalStars)
  const starOrder = new Float32Array(totalStars)

  // 0.85 scale keeps the last vertex fully revealed before uConstel reaches 1
  let e = 0, v = 0
  figures.forEach((f, s) => {
    const E = Math.max(f.edges.length, 1)
    f.nodes.forEach((idx, j) => {
      starPos.set(P.subarray(idx * 3, idx * 3 + 3), v * 3)
      starSeed[v] = cloud.seeds[idx]
      starAff[v] = s
      starOrder[v] = (f.nodeOrder[j] / E) * 0.85
      v++
    })
    f.edges.forEach(([ia, ib], j) => {
      const a = f.nodes[ia], b = f.nodes[ib]
      linePos.set(P.subarray(a * 3, a * 3 + 3), e * 6)
      linePos.set(P.subarray(b * 3, b * 3 + 3), e * 6 + 3)
      lineSeed[e * 2] = cloud.seeds[a]
      lineSeed[e * 2 + 1] = cloud.seeds[b]
      lineAff[e * 2] = s
      lineAff[e * 2 + 1] = s
      lineOrder[e * 2] = (j / E) * 0.85
      lineOrder[e * 2 + 1] = ((j + 1) / E) * 0.85
      e++
    })
  })

  return { linePos, lineSeed, lineAff, lineOrder, starPos, starSeed, starAff, starOrder }
}

export function Constellation({ cloud }: { cloud: Cloud }) {
  const d = useMemo(() => buildConstellation(cloud), [cloud])
  const lineMat = useMemo(() => makeMaterial(constellationLineVert, constellationLineFrag), [])
  const starMat = useMemo(() => makeMaterial(constellationStarVert, constellationStarFrag), [])
  useEffect(() => () => { lineMat.dispose(); starMat.dispose() }, [lineMat, starMat])
  return (
    <>
      <lineSegments frustumCulled={false} material={lineMat}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[d.linePos, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[d.lineSeed, 1]} />
          <bufferAttribute attach="attributes-aAffinity" args={[d.lineAff, 1]} />
          <bufferAttribute attach="attributes-aOrder" args={[d.lineOrder, 1]} />
        </bufferGeometry>
      </lineSegments>
      <points frustumCulled={false} material={starMat}>
        <bufferGeometry>
          <bufferAttribute attach="attributes-position" args={[d.starPos, 3]} />
          <bufferAttribute attach="attributes-aSeed" args={[d.starSeed, 1]} />
          <bufferAttribute attach="attributes-aAffinity" args={[d.starAff, 1]} />
          <bufferAttribute attach="attributes-aOrder" args={[d.starOrder, 1]} />
        </bufferGeometry>
      </points>
    </>
  )
}

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

  const material = useMemo(() => makeMaterial(connectionVert, connectionFrag), [])
  useEffect(() => () => material.dispose(), [material])

  return (
    <lineSegments frustumCulled={false} material={material}>
      <bufferGeometry ref={geoRef}>
        <bufferAttribute attach="attributes-position" args={[buffers.pos, 3]} />
        <bufferAttribute attach="attributes-aSeed" args={[buffers.seed, 1]} />
        <bufferAttribute attach="attributes-aAffinity" args={[buffers.aff, 1]} />
      </bufferGeometry>
    </lineSegments>
  )
}
