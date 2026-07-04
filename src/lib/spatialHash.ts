export interface ConnectionOpts {
  maxDist: number
  neighbors: number
  maxTotal: number
}

// ponytail: string cell keys + full rebuild each pass; fine at <=4k points / ~600ms.
// Upgrade path: numeric keys + persistent buffers if profiling ever flags it.
export function buildConnections(pos: Float32Array, opts: ConnectionOpts): { pairs: Uint32Array; count: number } {
  const n = pos.length / 3
  const cell = opts.maxDist
  const maxD2 = opts.maxDist * opts.maxDist
  const map = new Map<string, number[]>()

  for (let i = 0; i < n; i++) {
    const key = `${Math.floor(pos[i * 3] / cell)},${Math.floor(pos[i * 3 + 1] / cell)},${Math.floor(pos[i * 3 + 2] / cell)}`
    const arr = map.get(key)
    if (arr) arr.push(i)
    else map.set(key, [i])
  }

  const pairs = new Uint32Array(opts.maxTotal * 2)
  let m = 0
  const cand: { j: number; d: number }[] = []

  for (let i = 0; i < n && m < opts.maxTotal; i++) {
    const x = pos[i * 3], y = pos[i * 3 + 1], z = pos[i * 3 + 2]
    const cx = Math.floor(x / cell), cy = Math.floor(y / cell), cz = Math.floor(z / cell)
    cand.length = 0
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) for (let dz = -1; dz <= 1; dz++) {
      const arr = map.get(`${cx + dx},${cy + dy},${cz + dz}`)
      if (!arr) continue
      for (const j of arr) {
        if (j <= i) continue
        const ddx = pos[j * 3] - x, ddy = pos[j * 3 + 1] - y, ddz = pos[j * 3 + 2] - z
        const d2 = ddx * ddx + ddy * ddy + ddz * ddz
        // random weight makes some edges reroute on each rebuild
        if (d2 <= maxD2) cand.push({ j, d: d2 * (0.85 + Math.random() * 0.3) })
      }
    }
    cand.sort((a, b) => a.d - b.d)
    const take = Math.min(opts.neighbors, cand.length)
    for (let k = 0; k < take && m < opts.maxTotal; k++) {
      pairs[m * 2] = i
      pairs[m * 2 + 1] = cand[k].j
      m++
    }
  }
  return { pairs, count: m }
}
