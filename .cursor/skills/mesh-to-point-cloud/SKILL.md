---
name: mesh-to-point-cloud
description: >-
  Bakes 3D mesh OBJ files into surface-sampled point clouds for WebGL particle
  systems. Use when converting anatomical models, scanned meshes, or any triangle
  soup into particle target positions, lobe hotspots, or baked Float32Array assets.
---

# Mesh to Point Cloud

Offline bake pipeline: triangle mesh → area-weighted surface samples → centered/scaled Float32Array + optional region centroids.

## Pipeline

```
scripts/model.obj  →  scripts/bake-cloud.mjs  →  src/data/cloud.ts (committed)
```

Run at build/dev time, not runtime. Commit the baked output; add source OBJ + license to repo.

## Bake script pattern

```javascript
// 1. Parse OBJ verts + faces
// 2. Area-weighted triangle sampling (TARGET count, e.g. 24k)
// 3. Center to origin, scale to desired extent (SCALE constant)
// 4. Optional: region centroids via spatial filters on normalized surface
// 5. Emit Float32Array + metadata as TypeScript module
```

### Area-weighted sample

```javascript
function sampleTri(a, b, c) {
  let u = Math.random(), v = Math.random()
  if (u + v > 1) { u = 1 - u; v = 1 - v }
  const w = 1 - u - v
  return [a[0]*u + b[0]*v + c[0]*w, ...]
}
// Pick triangle by cumulative area, sample point inside
```

### Normalize

```javascript
// Center
const norm = raw.map(([x,y,z]) => [x-cx, y-cy, z-cz])
// Scale so max extent fits SCALE (e.g. 6.8 baked; × CLUSTER_SCALE at runtime)
const s = SCALE / (maxExt * 2)
const surface = norm.map(([x,y,z]) => [x*s, y*s, flipZ*z])
```

## Runtime usage (makeCloud)

```typescript
// Shuffle surface indices so pool nodes don't cluster on same triangles
function sampleSurface(order, slot, jitter = 0.006): [x,y,z]
// All target positions from surface; scatter positions separate (see glsl-spawn-morph)
// Lobe/group membership: proximity to baked centroids + radius (not extra blobs)
```

## Hotspot / region centroids

Filter baked surface by axis bounds, compute mean position:

```javascript
projects: regionCentroid(p => p[0] > 1.3 && p[1] > 0.65 && p[2] > 1.15)
```

Tune filters against baked coordinates after normalize. Wire centroids into section definitions, not content files.

## Attribution

Always document third-party meshes in `THIRD_PARTY_NOTICES.md`:
- Title, author, source URL, license (e.g. CC BY 4.0)
- Note changes: "surface-sampled to point cloud, textures removed"

## Package script

```json
"bake:brain": "node scripts/bake-brain-cloud.mjs"
```

## Do not

- Hand-edit generated `brainCloud.ts` / `cloud.ts`
- Sample volume interior ( loses silhouette )
- Place separate gaussian clusters at hotspots — use surface samples + affinity radius instead

## Related skills

- Particle rendering: `r3f-particle-cloud`
- Project example: `neural-portfolio/reference.md`
