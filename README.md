# Neural Portfolio

An interactive 3D portfolio built as a cinematic neural brain. Thousands of particles scatter across the screen, converge into an anatomical brain shape, and map portfolio sections to brain lobes — Projects, Experience, Skills, About, and Contact.

**Live demo:** [https://davidk4leido5.github.io/portfolio-101/](https://davidk4leido5.github.io/portfolio-101/)

## Features

- **Cinematic intro** — particles start scattered across the viewport, drift, and arc inward to form a brain-shaped particle cloud
- **Anatomical brain mesh** — ~24k surface-sampled points from a CC BY 4.0 brain model, rendered as a WebGL particle system with custom GLSL shaders
- **Section navigation** — click or hover a sector label to fly the camera to that lobe; the matching nodes highlight in the section color
- **Hover shockwaves** — color pulses expand from the hovered lobe across the whole brain
- **Ambient brain activity** — subtle accent-colored waves fire from random surface points on a slow cycle
- **Neural density slider** — adjust active node count at runtime (quality-tier aware)
- **Responsive quality tiers** — desktop, tablet, and mobile presets for particles, connections, and post-processing
- **CI/CD** — GitHub Actions runs typecheck, build, Playwright smoke tests, and deploys to GitHub Pages on every push to `master`

## Tech stack

| Layer | Tools |
|---|---|
| UI | React 19, TypeScript |
| 3D | Three.js, React Three Fiber, custom GLSL shaders |
| Animation | GSAP |
| State | Zustand |
| Post-processing | `@react-three/postprocessing` (bloom, chromatic aberration, grain) |
| Build | Vite 8 |
| Testing | Playwright (smoke tests) |
| Deploy | GitHub Actions → GitHub Pages |

## Getting started

**Requirements:** Node.js 22+, pnpm 11+

```bash
git clone git@github.com:DavidK4leido5/portfolio-101.git
cd portfolio-101
pnpm install
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173).

### Scripts

| Command | Description |
|---|---|
| `pnpm dev` | Start Vite dev server (port 5173) |
| `pnpm build` | Typecheck + production build → `dist/` |
| `pnpm preview` | Serve the production build locally (port 4173) |
| `pnpm test` | Run Playwright smoke tests (starts against `localhost:5173` by default) |
| `pnpm bake:brain` | Regenerate the baked brain point cloud from `scripts/brain.obj` |

### Smoke tests

Smoke tests need Chromium. Install browsers once:

```bash
pnpm exec playwright install chromium
```

Run against the dev server:

```bash
pnpm dev          # in one terminal
pnpm test         # in another
```

Or against a production preview:

```bash
pnpm build && pnpm preview
SMOKE_URL=http://localhost:4173 pnpm test
```

## Customizing content

All personal copy lives in one file:

```
src/content/portfolio.ts
```

Edit your name, tagline, projects, skills, experience, and contact links there. Image sources support either a CDN URL or a local file under `src/content/assets/`. See [`src/content/README.md`](src/content/README.md) for the full layout.

Scene wiring (3D hotspot positions, camera offsets, section colors) is in `src/data/sections.ts` — only touch this if you need to reposition a lobe on the brain.

## Project structure

```
src/
  content/          Portfolio data (edit this)
  data/             Baked brain cloud + section definitions
  scene/            WebGL scene, shaders, camera, intro sequence
  store/            Zustand scene state
  ui/               HUD, sector labels, loading screen, overlay panel
  lib/              Quality tiers, spatial hash, accent color
scripts/
  bake-brain-cloud.mjs   OBJ → point cloud baker
  brain.obj              Source brain mesh (CC BY 4.0)
tests/
  smoke.mjs         End-to-end smoke tests
.github/workflows/
  ci-cd.yml         CI + GitHub Pages deploy
```

## Deployment

Pushes to `master` trigger the [CI/CD workflow](.github/workflows/ci-cd.yml):

1. Install dependencies
2. Typecheck and build
3. Run Playwright smoke tests against a preview server
4. Rebuild with the GitHub Pages base path (`/repo-name/`)
5. Deploy to GitHub Pages

### First-time setup

1. In your GitHub repo, go to **Settings → Pages → Build and deployment**
2. Set **Source** to **GitHub Actions**
3. Push to `master` — the workflow handles the rest

You can also trigger a manual deploy from **Actions → CI/CD → Run workflow**.

### Other hosts

For Vercel, Netlify, or a custom domain, build with the default base path:

```bash
pnpm build
```

Serve the `dist/` folder. No `VITE_BASE_PATH` is needed when the app lives at the domain root.

## Brain mesh attribution

The anatomical brain shape is derived from [Human brain, Cerebrum & Brainstem](https://sketchfab.com/3d-models/human-brain-cerebrum-brainstem-0aa0e33c5c854d1bab7bac9e1c7acaec) by FrankJohansson (CC BY 4.0). See [`THIRD_PARTY_NOTICES.md`](THIRD_PARTY_NOTICES.md) for details.

## License

Project code is private/personal unless otherwise noted. Third-party assets carry their own licenses — see `THIRD_PARTY_NOTICES.md`.
