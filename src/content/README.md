# Portfolio content

Edit **`portfolio.ts`** only when updating your personal copy, project list, skills, or image URLs.

## Contact form

The Contact panel posts to [Formspree](https://formspree.io). Copy `.env.example` → `.env` and set:

```
VITE_FORMSPREE_ID=your_form_id
```

Restart `pnpm dev` after changing env. Update `contact.email` / links in `portfolio.ts` for the mailto fallback.

## Images

Each entry supports two sources (first non-empty wins via `resolveImage`):

| Field | Use |
|-------|-----|
| `cdnUrl` | Full HTTPS URL (Cloudinary, S3, GitHub raw, etc.) |
| `localPath` | File under `assets/` — drop files in the matching subfolder |

Suggested layout:

```
assets/
  avatar.jpg
  about.jpg
  contact.jpg
  experience/
  client-work/   ← cover section screenshots (auto-loaded)
```

### Client work (cover marquee)

Drop image files into `assets/client-work/` — they appear automatically (no URLs, no `portfolio.ts` edits).

**Naming (required for ordering):** `projectname (n).ext`

| Example | Project label | Order |
|---------|---------------|-------|
| `revivepharmacy (1).png` | Revive Pharmacy | 1st shot |
| `revivepharmacy (2).png` | Revive Pharmacy | 2nd shot |
| `agentsly (1).avif` | Agentsly | … |

Shots are grouped by project, sorted by `(n)`, then split across the two slider rows (first half of projects on top, second half on bottom). Each group shows the project name plus the matching role from `experience`, so companies you add here should use the same name in both places.

Supported: `.png` `.jpg` `.webp` `.avif` `.svg` `.gif`

Optional pretty names live in `clientWorks.ts` (`PROJECT_LABELS`).

**Run `pnpm bake:shots` after adding PNG or JPG shots.** It rewrites them as 1024 px WebP in place. Raw 1080p screenshots decode to about 7 MB of pixels each, and the marquee mounts roughly 160 `<img>` tags, which stalled the main thread on decode and made the sticky 3D scene stutter while scrolling.

Personal projects stay in the Projects overlay — edit the `projects` array in `portfolio.ts` (text-only cards).

## Scene vs content

- **`src/content/portfolio.ts`** — your data (this folder)
- **`src/data/sections.ts`** — 3D hotspot positions and camera offsets (scene wiring; imports section ids from content)

Do not put 3D coordinates in this folder.

## Hero reel copy

`profile.hero.beats` is an array of `{ text, shape }` lines cycled in idle:

- `text` — short promo line (shown one at a time)
- `shape` — `brain` | `network` | `stack` (synced 3D morph; desktop/tablet only)

Tune timing via `holdSec`, `morphSec`, `textInSec`, `textOutSec` on the same object.

## Skills radar

`skills` is an array of categories (hex radar vertices). Each category:

| Field | Use |
|-------|-----|
| `id` | Stable key |
| `label` | Detail card title |
| `score` | 0–100, drives the radar polygon vertex |
| `icon` | Key in `src/ui/skillIcons.tsx` |
| `tech` | Rows in the detail card |

Each `tech` entry: `{ name, score (0–10), icon }`. Bar width = `score * 10%`.
Keep about **6 primary skills per category** so the detail card fits without scrolling.

## Projects

`projects` is an array of cards (no preview images). Each entry:

| Field | Use |
|-------|-----|
| `id` | Stable key |
| `title` | Project name |
| `description` | Short blurb |
| `skills` | String chips (e.g. `['React', 'Next.js']`) |
| `liveUrl` | Optional live demo — omit / empty to hide |
| `githubUrl` | Optional repo — omit / empty to hide |
| `status` | Optional `'live'` \| `'wip'` status pill |

Add or edit objects in `portfolio.ts` — the overlay reads the array as-is.
