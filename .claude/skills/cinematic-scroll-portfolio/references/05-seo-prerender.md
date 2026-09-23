# 05. SEO: copy in the HTML, head tags, structured data

A client-rendered page ships `<div id="root"></div>`. Crawlers that do not run JS
(most social previews, many search engines, some AI crawlers) see nothing. Heavy
WebGL also delays Google's render. So the copy must be in the served HTML.

## Approach: build-time prerender, no hydration

1. Normal client build (`vite build`).
2. A second SSR build of one small entry that exports `render()` functions.
3. A node script renders them and writes the markup into `dist/index.html` inside
   `#root`.
4. The client keeps using `createRoot(...).render(<App/>)`. React clears the
   container on its first render, so there is no hydration mismatch to manage.

Why this is safe for users and not cloaking:
- The prerendered hero is painted the same black as the loading screen, so the swap
  is not seen.
- Every hidden animation state hangs off `html.reveal-armed`, which only the script
  adds, so the static markup is fully visible and identical in content to the app.

Only prerender components that do not touch `window`, `document`, `matchMedia` or
`innerWidth` at module load or during render. Effects are fine: they do not run on
the server. Keep stores that detect device features at import time out of the entry.

### `src/prerender.tsx`

```tsx
import { renderToString } from 'react-dom/server'
import { Sections } from './ui/Sections'
import { Footer } from './ui/Footer'
import { profile, projects, stages } from './content'

export const render = () => renderToString(<><Sections /><Footer /></>)

/** Stand-in for the WebGL hero: the h1 and the hero's copy as real headings. */
export function renderHero() {
  return renderToString(
    <header style={{ minHeight: '100dvh', padding: '8vh 6vw', background: '#020204', color: 'rgba(235,235,255,.62)' }}>
      <h1 style={{ margin: 0, color: '#e8e8f0' }}>{profile.fullName}</h1>
      {/* One template string per element: adjacent JSX text nodes render with <!-- --> between them */}
      <p>{`${profile.title}. ${profile.summary}`}</p>
      <ol>
        {stages.map((s) => (
          <li key={s.title}><h2>{`${s.title} layer: ${s.headline}`}</h2><p>{s.lede}</p></li>
        ))}
      </ol>
    </header>,
  )
}

const SITE = 'https://example.com/'
export const projectsLd = () => ({
  '@type': 'ItemList',
  '@id': `${SITE}#projects`,
  itemListElement: projects.map((p, i) => ({
    '@type': 'ListItem', position: i + 1,
    item: { '@type': 'CreativeWork', '@id': `${SITE}#project-${p.id}`, name: p.title,
      description: p.description, ...(p.domain ? { url: p.domain } : {}),
      keywords: p.skills.join(', '), creator: { '@id': `${SITE}#person` } },
  })),
})
```

### `scripts/prerender.mjs`

```js
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const htmlPath = `${root}dist/index.html`
const { render, renderHero, projectsLd } = await import(pathToFileURL(`${root}.ssr/prerender.js`).href)

const html = await readFile(htmlPath, 'utf8')
const EMPTY = '<div id="root"></div>'
if (!html.includes(EMPTY)) throw new Error('no empty #root to fill')

// With `base: './'` the client build emits ./assets/... but the SSR build emits
// /assets/... for the same hashed files. Rewrite the prefix, including inside
// escaped inline styles (url(&quot;/assets/...&quot;)).
const relative = (s) => s.replace(/(["(]|&quot;)\/assets\//g, '$1./assets/')
const ld = `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...projectsLd() })
  .replaceAll('<', '\\u003c')}</script>`

await writeFile(htmlPath, html
  .replace(EMPTY, `<div id="root">${relative(renderHero())}${relative(render())}</div>`)
  .replace('</head>', `  ${ld}\n</head>`))
await rm(`${root}.ssr`, { recursive: true, force: true })
```

### `package.json` and `vite.config.ts`

```json
"build": "tsc --noEmit && vite build && pnpm prerender",
"prerender": "vite build --ssr src/prerender.tsx --outDir .ssr && node scripts/prerender.mjs",
"test:prerender": "node tests/prerender-check.mjs"
```

```ts
export default defineConfig(({ isSsrBuild }) => ({
  plugins: [react()],
  base: './',
  publicDir: isSsrBuild ? false : 'public',   // the SSR bundle needs no public/ copy
}))
```

Add `.ssr` to `.gitignore`. Run the check in CI right after the production build so a
broken prerender cannot deploy.

## Head tags

```html
<title>Full Name | Full-Stack Engineer Portfolio</title>
<meta name="description" content="What you build, with what, for whom. Name real clients or products." />
<link rel="canonical" href="https://example.com/" />
<meta name="robots" content="index, follow, max-image-preview:large" />
<meta property="og:type" content="website" />
<meta property="og:site_name" content="Brand name" />
<meta property="og:title" content="Full Name | Full-Stack Engineer Portfolio" />
<meta property="og:description" content="Same as the description." />
<meta property="og:url" content="https://example.com/" />
<meta property="og:image" content="https://example.com/og.jpg" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta property="og:image:alt" content="Describe the image, not the brand." />
<meta name="twitter:card" content="summary_large_image" />
<meta name="twitter:image" content="https://example.com/og.jpg" />
```

Plus a `WebSite` and a `Person` node in JSON-LD (`@id`s `#website` and `#person`,
`sameAs` with GitHub and LinkedIn, `jobTitle`, `knowsAbout`). The projects `ItemList`
above references the person by `@id`.

Share image: screenshot the hero at exactly 1200x630 with interactive chrome hidden,
save as JPEG quality ~86 (a PNG of a particle scene is 10x the size):

```js
const page = await (await browser.newContext({ viewport: { width: 1200, height: 630 } })).newPage()
await page.goto(URL); await page.waitForSelector('[data-ready]')
await page.addStyleTag({ content: '.cta,.slider,.hud{visibility:hidden!important}' })
await page.waitForTimeout(4000)
await page.screenshot({ path: 'public/og.jpg', type: 'jpeg', quality: 86 })
```

## Semantics checklist

- Exactly one `h1`, naming the person or product. A logo text like "The Adaptive
  Mind" can stay visible as a small line; the h1 carries the name.
- One `h2` per section (the fitted word), `h3` per project chapter and per row.
- Hero stage headings include the keyword: "Interface layer: what the person touches",
  not just the tagline. Show the keyword visibly as a small label above the line.
- Each project chapter is an `<article id="project-slug" aria-labelledby>`. Index rows
  link to `#project-slug`, which gives crawlers internal links.
- Every image: real `alt`, explicit `width` and `height`.
- Split-word copy appears once. No `sr-only` duplicate next to `aria-hidden` spans.
- Decorative giants and marquees are `aria-hidden`.
- `sitemap.xml` `lastmod` updated; `robots.txt` points at it.

## The prerender check

```js
import { readFileSync } from 'node:fs'
const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
const root = html.slice(html.indexOf('<div id="root">'), html.lastIndexOf('</body>'))
const text = root.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ')
const fails = []
const check = (ok, msg) => ok ? console.log('ok:', msg) : (fails.push(msg), console.error('FAIL:', msg))
check(/<h1[^>]*>\s*Full Name/.test(root), 'h1 names the person')
for (const id of ['about', 'projects', 'experience', 'skills', 'contact']) check(root.includes(`id="section-${id}-title"`), `h2 for ${id}`)
for (const p of ['Project A', 'Project B']) check(text.includes(p), `${p} in markup`)
check(text.split('A sentence from a chapter.').length === 2, 'chapter copy appears once')
check(!/(["(]|&quot;)\/assets\//.test(root), 'asset URLs are relative')
const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]))
check(ld.some((d) => d['@type'] === 'ItemList'), 'ItemList JSON-LD present')
if (fails.length) process.exit(1)
```
