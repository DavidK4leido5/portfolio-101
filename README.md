# Neural Portfolio

An interactive 3D portfolio built as a cinematic neural brain. Thousands of particles scatter across the screen, converge into an anatomical brain shape, and map portfolio sections to brain lobes — Projects, Experience, Skills, About, and Contact.

**Live demo:** [https://stackwithdavid.qd.je/](https://stackwithdavid.qd.je/)

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

1. **Path filter** — skip build/smoke when only docs/skills/README change
2. **Build** — typecheck + smoke build (artifact uploaded)
3. **Smoke** — Playwright against preview (Chromium cached between runs)
4. **Deploy** — production build + GitHub Pages (master only)

Use **Actions → CI/CD → Run workflow** to force a full run anytime.

### CI efficiency

This is a **single Vite app**, not a monorepo — **Turborepo** would not help here (it caches tasks across packages in monorepos). Instead we use:

| Optimization | Effect |
|---|---|
| **Path filters** | README/skills/docs-only pushes skip build + ~2 min smoke |
| **Playwright browser cache** | Chromium downloaded once per Playwright version, then restored from cache |
| **Split jobs** | Build artifact reused by smoke job; deploy is separate |
| **concurrency cancel-in-progress** | New push cancels an in-flight run on the same branch |

Smoke still runs on every push that touches `src/`, `tests/`, config, or workflows — that's intentional for a WebGL app where small shader changes can break rendering.

### First-time setup (required — fixes deploy 404)

If **build-and-test passes** but **deploy fails** with:

`Failed to create deployment (status: 404)` … `Ensure GitHub Pages has been enabled`

Pages is not configured yet. Do this **once** in the repo:

1. Open **[Settings → Pages](https://github.com/DavidK4leido5/portfolio-101/settings/pages)** for your repo  
   (replace `portfolio-101` if you renamed the repository)
2. Under **Build and deployment → Source**, change from **Deploy from a branch** to **GitHub Actions**
3. Save (no branch or folder selection needed when using Actions)
4. Re-run the failed workflow: **Actions → CI/CD → Re-run all jobs**  
   Or push an empty commit / use **Run workflow**

After the deploy job succeeds, the site is live at:

**https://stackwithdavid.qd.je/**

Custom domain deploys with `base: '/'`. Do not set `VITE_BASE_PATH=/repo-name/` — that prefixes JS/CSS as `/portfolio-101/assets/...` and 404s on the custom domain. `public/CNAME` keeps GitHub Pages pointed at `stackwithdavid.qd.je`.

> **Note:** GitHub Pages on free accounts requires a **public** repository. Private repos need GitHub Pro/Team for Pages.

> **Node 20 warnings** in the Actions log (`Node 20 is being deprecated…`) come from GitHub’s internal action runtime, not this workflow. We pin **Node 22** for build/test steps; those warnings are safe to ignore unless a step actually fails.

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
