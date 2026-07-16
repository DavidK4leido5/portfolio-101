/**
 * Hero morph shapes → sorted surface point clouds (same pipeline as the brain bake:
 * structured source geometry → jittered surface samples → normalize → spherical sort).
 *
 * network — geodesic globe: three.js IcosahedronGeometry (MIT) hubs + mesh edges,
 *           lat/long wireframe rings, and lifted hub-to-hub flight arcs.
 * stack   — three architectural plates: superellipse outlines, circuit traces,
 *           corner pillars, floating data motes.
 *
 * Correspondence: every shape is sorted by spherical angle so slot i of each cloud
 * occupies the same angular rank — nodes travel to their nearest analogue when morphing.
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { IcosahedronGeometry } from 'three'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const BRAIN_CLOUD = join(ROOT, 'src', 'data', 'brainCloud.ts')
const OUT = join(ROOT, 'src', 'data', 'shapeClouds.ts')
const TARGET = 24000

function gauss() {
  let u = 0, v = 0
  while (u === 0) u = Math.random()
  while (v === 0) v = Math.random()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

const jit = (p, s) => [p[0] + gauss() * s, p[1] + gauss() * s, p[2] + gauss() * s]

function sortKey([x, y, z]) {
  return [Math.atan2(y, Math.hypot(x, z)), Math.atan2(z, x)]
}

function sphericalSort(points) {
  return points
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const ka = sortKey(a.p), kb = sortKey(b.p)
      return ka[0] - kb[0] || ka[1] - kb[1] || a.i - b.i
    })
    .map((x) => x.p)
}

function readBrainSurface() {
  const text = readFileSync(BRAIN_CLOUD, 'utf8')
  const m = text.match(/const _raw = \[([\d.,\s-]+)\]/)
  if (!m) throw new Error('Could not parse brainSurface from brainCloud.ts')
  const raw = m[1].split(',').map(Number)
  const pts = []
  for (let i = 0; i < raw.length; i += 3) pts.push([raw[i], raw[i + 1], raw[i + 2]])
  return pts
}

/** Weighted generators: pick one per point so proportions hold at any density. */
function sampleWeighted(generators, count) {
  const total = generators.reduce((s, g) => s + g.w, 0)
  const pts = []
  for (let i = 0; i < count; i++) {
    let r = Math.random() * total
    for (const g of generators) {
      r -= g.w
      if (r <= 0) { pts.push(g.fn()); break }
    }
  }
  return pts
}

// ---------------------------------------------------------------- network globe

// Subdiv 0 on purpose: only ~2200 of the pool render at default density, so the
// wireframe needs few, long edges to stay legible (120 edges reads as fog)
function icosahedronHubsAndEdges() {
  const geo = new IcosahedronGeometry(1, 0)
  const pos = geo.getAttribute('position')
  const verts = []
  const keyOf = (x, y, z) => `${x.toFixed(4)},${y.toFixed(4)},${z.toFixed(4)}`
  const indexByKey = new Map()
  const faceIdx = []
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), y = pos.getY(i), z = pos.getZ(i)
    const k = keyOf(x, y, z)
    if (!indexByKey.has(k)) {
      indexByKey.set(k, verts.length)
      verts.push([x, y, z])
    }
    faceIdx.push(indexByKey.get(k))
  }
  const edgeSet = new Set()
  const edges = []
  for (let f = 0; f < faceIdx.length; f += 3) {
    const tri = [faceIdx[f], faceIdx[f + 1], faceIdx[f + 2]]
    for (let e = 0; e < 3; e++) {
      const a = tri[e], b = tri[(e + 1) % 3]
      const k = a < b ? `${a}-${b}` : `${b}-${a}`
      if (!edgeSet.has(k)) {
        edgeSet.add(k)
        edges.push([a, b])
      }
    }
  }
  geo.dispose()
  return { verts, edges }
}

function slerp(a, b, t) {
  const dot = Math.min(1, Math.max(-1, a[0] * b[0] + a[1] * b[1] + a[2] * b[2]))
  const om = Math.acos(dot)
  if (om < 1e-4) return [...a]
  const sa = Math.sin((1 - t) * om) / Math.sin(om)
  const sb = Math.sin(t * om) / Math.sin(om)
  return [a[0] * sa + b[0] * sb, a[1] * sa + b[1] * sb, a[2] * sa + b[2] * sb]
}

function buildNetwork(count) {
  const R = 2.7
  const CY = 0.08
  const { verts, edges } = icosahedronHubsAndEdges()
  const scale = ([x, y, z], r) => [x * r, y * r + CY, z * r]

  // Long-haul arcs between non-adjacent hubs, lifted off the surface like flight paths
  const adjacent = new Set(edges.map(([a, b]) => (a < b ? `${a}-${b}` : `${b}-${a}`)))
  const candidates = []
  for (let a = 0; a < verts.length; a++) {
    for (let b = a + 1; b < verts.length; b++) {
      if (adjacent.has(`${a}-${b}`)) continue
      const dot = verts[a][0] * verts[b][0] + verts[a][1] * verts[b][1] + verts[a][2] * verts[b][2]
      // non-adjacent but not antipodal (slerp is degenerate at dot=-1)
      if (dot > -0.9 && dot < 0.2) candidates.push([verts[a], verts[b]])
    }
  }
  const arcs = []
  const step = Math.max(1, Math.floor(candidates.length / 6))
  for (let i = 0; i < candidates.length && arcs.length < 6; i += step) arcs.push(candidates[i])
  if (arcs.length === 0) throw new Error('network bake: no flight arcs found')

  const generators = [
    { // glowing hubs on the icosahedron vertices
      w: 22,
      fn: () => {
        const v = verts[(Math.random() * verts.length) | 0]
        return jit(scale(v, R), 0.075)
      },
    },
    { // geodesic mesh edges (great arcs between adjacent hubs)
      w: 42,
      fn: () => {
        const [a, b] = edges[(Math.random() * edges.length) | 0]
        return jit(scale(slerp(verts[a], verts[b], Math.random()), R), 0.02)
      },
    },
    { // equator ring for orientation
      w: 10,
      fn: () => {
        const th = Math.random() * Math.PI * 2
        return jit(scale([Math.cos(th), 0, Math.sin(th)], R * 1.04), 0.016)
      },
    },
    { // lifted flight arcs between distant hubs
      w: 16,
      fn: () => {
        const [a, b] = arcs[(Math.random() * arcs.length) | 0]
        const t = Math.random()
        const lift = 1 + 0.26 * Math.sin(t * Math.PI)
        return jit(scale(slerp(a, b, t), R * lift), 0.022)
      },
    },
    { // sparse satellite specks around the globe
      w: 10,
      fn: () => {
        const v = [gauss(), gauss(), gauss()]
        const l = Math.hypot(...v) || 1
        const r = R * (1.1 + Math.random() * 0.3)
        return scale([v[0] / l, v[1] / l, v[2] / l], r)
      },
    },
  ]

  return sampleWeighted(generators, count)
}

// ---------------------------------------------------------------- layered stack

function buildStack(count) {
  const W = 5.6, D = 4.0
  // Tiered: each plate smaller than the one below so it reads as a stack, not a box
  const tiers = [
    { y: -1.55, s: 1.0 },
    { y: 0.05, s: 0.74 },
    { y: 1.6, s: 0.5 },
  ]
  const pickTier = () => tiers[(Math.random() * tiers.length) | 0]

  const outlinePoint = (tier, inset = 1) => {
    const th = Math.random() * Math.PI * 2
    const p = 0.62
    const s = tier.s * inset
    const x = Math.sign(Math.cos(th)) * Math.abs(Math.cos(th)) ** p * (W / 2) * s
    const z = Math.sign(Math.sin(th)) * Math.abs(Math.sin(th)) ** p * (D / 2) * s
    return jit([x, tier.y, z], 0.022)
  }

  const generators = [
    { // outer plate outlines — the architectural silhouette
      w: 40,
      fn: () => outlinePoint(pickTier()),
    },
    { // inner outline (double-line plate edge)
      w: 14,
      fn: () => {
        const tier = pickTier()
        return outlinePoint(tier, 0.8)
      },
    },
    { // circuit traces across each plate
      w: 14,
      fn: () => {
        const tier = pickTier()
        if (Math.random() < 0.6) {
          const z = [-0.5, 0, 0.5][(Math.random() * 3) | 0] * (D / 2) * tier.s * 0.66
          return jit([(Math.random() - 0.5) * W * tier.s * 0.74, tier.y, z], 0.016)
        }
        const x = [-0.55, 0.55][(Math.random() * 2) | 0] * (W / 2) * tier.s * 0.74
        return jit([x, tier.y, (Math.random() - 0.5) * D * tier.s * 0.66], 0.016)
      },
    },
    { // sparse plate fill
      w: 8,
      fn: () => {
        const tier = pickTier()
        const ang = Math.random() * Math.PI * 2
        const rad = Math.sqrt(Math.random())
        return jit([
          Math.cos(ang) * (W / 2) * tier.s * 0.86 * rad,
          tier.y,
          Math.sin(ang) * (D / 2) * tier.s * 0.86 * rad,
        ], 0.02)
      },
    },
    { // short connectors between adjacent tiers, inset to the smaller plate
      w: 16,
      fn: () => {
        const i = Math.random() < 0.5 ? 0 : 1
        const lo = tiers[i], hi = tiers[i + 1]
        const cx = [1, -1][(Math.random() * 2) | 0] * (W / 2) * hi.s * 0.7
        const cz = [1, -1][(Math.random() * 2) | 0] * (D / 2) * hi.s * 0.7
        const y = lo.y + Math.random() * (hi.y - lo.y)
        return jit([cx, y, cz], 0.026)
      },
    },
    { // floating data motes drifting up the stack
      w: 8,
      fn: () => [
        (Math.random() - 0.5) * W * 0.6,
        tiers[0].y + Math.random() * (tiers[2].y - tiers[0].y),
        (Math.random() - 0.5) * D * 0.6,
      ],
    },
  ]

  return sampleWeighted(generators, count)
}

// ---------------------------------------------------------------- emit

function toFlat(points) {
  const flat = new Float32Array(points.length * 3)
  for (let i = 0; i < points.length; i++) {
    flat[i * 3] = points[i][0]
    flat[i * 3 + 1] = points[i][1]
    flat[i * 3 + 2] = points[i][2]
  }
  return flat
}

const brain = sphericalSort(readBrainSurface().slice(0, TARGET))
const network = sphericalSort(buildNetwork(TARGET))
const stack = sphericalSort(buildStack(TARGET))

const n = Math.min(brain.length, network.length, stack.length)
const fmt = (arr) => Array.from(arr).map((v) => +v.toFixed(4)).join(',')

const body = `// Auto-generated by scripts/bake-shapes.mjs — do not edit by hand.
// network: geodesic globe from three.js IcosahedronGeometry (MIT) + wireframe rings.
// stack: layered plates with outlines, traces, and pillars.
// All shapes spherical-sorted for morph correspondence with the brain.

export const SHAPE_SURFACE_COUNT = ${n}

const _network = [${fmt(toFlat(network.slice(0, n)))}]
const _stack = [${fmt(toFlat(stack.slice(0, n)))}]

export const networkSurface = new Float32Array(_network)
export const stackSurface = new Float32Array(_stack)

/** Sorted brain surface copy for index-aligned morph (matches bake order). */
const _brainSorted = [${fmt(toFlat(brain.slice(0, n)))}]
export const brainSortedSurface = new Float32Array(_brainSorted)
`

writeFileSync(OUT, body)
console.log('Wrote', OUT, `(${n} points per shape)`)
