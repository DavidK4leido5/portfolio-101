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
  about.jpg      ← About sector portrait (square crop; rendered as a circle)
  contact.jpg
  client-work/   ← cover, project, and experience screenshots (auto-loaded)
  testimonials/
```

The About circle applies `object-fit: cover` and `filter: grayscale(1)`, so drop
in a square colour crop and it renders black and white at the right size. Until
the file exists the circle shows `profile.about.initials`.

Experience cards take their image from `client-work/` via the entry's `slug`,
so there is no per-role image path to maintain.

### Client work (cover marquee)

Drop image files into `assets/client-work/` — they appear automatically (no URLs, no `portfolio.ts` edits).

**Naming (required for ordering):** `projectname (n).ext`

| Example | Project label | Order |
|---------|---------------|-------|
| `revivepharmacy (1).png` | Revive Pharmacy | 1st shot |
| `revivepharmacy (2).png` | Revive Pharmacy | 2nd shot |
| `agentsly (1).avif` | Agentsly | … |

Shots are grouped by project, sorted by `(n)`, then split across the two slider rows (first half of projects on top, second half on bottom). Each group shows the project name and its first shot.

Supported: `.png` `.jpg` `.webp` `.avif` `.svg` `.gif`

Optional pretty names live in `clientWorks.ts` (`PROJECT_LABELS`).

**Run `pnpm bake:shots` after adding PNG or JPG shots.** It rewrites them as 1024 px WebP in place. Raw 1080p screenshots decode to about 7 MB of pixels each, and the marquee mounts roughly 160 `<img>` tags, which stalled the main thread on decode and made the sticky 3D scene stutter while scrolling.

The same files feed the Projects sector cards, the Experience cards, and the scroll walkthrough. See **Projects** below.

## Sitemap

`public/sitemap.xml` lists the one real URL this site has. Every section is an overlay on the
same page, so there is nothing else to list. Fragment URLs like `/#projects` do not belong in a
sitemap because search engines strip the fragment and see the homepage again.

Bump `<lastmod>` when you ship a real content change. Leave it alone for dependency bumps and
refactors: a `lastmod` that moves on every build stops being a useful signal. `changefreq` and
`priority` are deliberately absent, Google ignores both.

If you ever give the sections their own routes, add one `<url>` entry each.

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

## Projects vs Experience

Two lists, two sections, and they do not borrow from each other.

| List | Section | Holds |
|------|---------|-------|
| `experience` | Experience | Jobs held: role, company, period, what the role did, plus its walkthrough chapter |
| `projects` | Projects | Client work outside those jobs. One entry today: TapUp |

Anything shipped *inside* a job (Palace, Revive, Volatility, Agentsly,
Codebility) is an `experience` entry and gets its chapter in the Experience
walkthrough. It is not also a project. `projects` is only for client work you
never held a job for, which is why it holds TapUp alone. A project row links
straight to its live domain and shows no role or dates.

### Role chapters (the scroll journey)

The walkthrough closes the **Experience** section, one chapter per role that has
copy in `projects.ts`, in `experience` order. Each block is keyed by the role's
`id` (`exp-revive`), not by company name, so renaming a company cannot silently
move a chapter onto a different job. Copy is three blocks (`intro`, `tech`,
`build`) plus `stack` chips and an optional `domain`. The journey renders one
viewport-tall beat per block and crossfades that role's screenshots across its
three beats, in filename order.

Adding a chapter is one edit: a `STORIES` block in `projects.ts` under the
role's id. A role with no block is skipped by the walkthrough, which is how
COMELEC stays an Experience row with no product story.

## Projects

`projects` is the client work outside the roles. Each entry:

| Field | Use |
|-------|-----|
| `id` | Stable key |
| `title` | Project name |
| `description` | Short blurb for the index row |
| `skills` | String chips (e.g. `['React', 'Next.js']`) |
| `domain` | Optional live client URL. Omit when the work is not public |
| `slug` | `client-work/` filename prefix, e.g. `tapup` |

No repo links. Client repositories are private or company-owned, so a row links
the live domain or nothing.

`slug` is what attaches the screenshots.
