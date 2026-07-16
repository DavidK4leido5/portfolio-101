# Third-Party Notices

Visual assets in this project include third-party works under their own licenses.

## Anatomical brain mesh (particle cloud source)

- **Title:** Human brain, Cerebrum & Brainstem
- **Author:** FrankJohansson ([@pranktoy](https://sketchfab.com/pranktoy))
- **Source:** https://sketchfab.com/3d-models/human-brain-cerebrum-brainstem-0aa0e33c5c854d1bab7bac9e1c7acaec
- **License:** [Creative Commons Attribution 4.0 International (CC BY 4.0)](https://creativecommons.org/licenses/by/4.0/)
- **Changes:** Exported to geometry-only OBJ, surface-sampled into a point cloud (`src/data/brainCloud.ts`), textures and materials removed.

Regenerate the baked cloud with:

```bash
node scripts/bake-brain-cloud.mjs
```

The OBJ source is downloaded to `scripts/brain.obj` from the [SAGE project](https://github.com/l33tdawg/sage) (same CC BY 4.0 asset).

## Hero morph shapes (network globe, layered stack)

The other hero shapes (`src/data/shapeClouds.ts`) are baked by `scripts/bake-shapes.mjs` from
[three.js](https://github.com/mrdoob/three.js) `IcosahedronGeometry` (MIT license) plus
parametric curves — no external mesh assets. Regenerate with:

```bash
pnpm bake:shapes
```
