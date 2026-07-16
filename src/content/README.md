# Portfolio content

Edit **`portfolio.ts`** only when updating your personal copy, project list, skills, or image URLs.

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
```

Projects are text-only (no preview images) — edit the `projects` array in `portfolio.ts`.

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
