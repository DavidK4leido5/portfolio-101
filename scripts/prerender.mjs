/**
 * Writes the rendered sections into dist/index.html so the copy is in the
 * served HTML, not only in the JS bundle. Run after both builds:
 *   vite build && vite build --ssr src/prerender.tsx --outDir .ssr
 */
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const htmlPath = `${root}dist/index.html`
const { render, projectsLd, heroLd } = await import(pathToFileURL(`${root}.ssr/prerender.js`).href)

const html = await readFile(htmlPath, 'utf8')
const EMPTY_ROOT = '<div id="root"></div>'
if (!html.includes(EMPTY_ROOT)) throw new Error('dist/index.html has no empty #root to fill')

// The SSR build resolves assets against '/', the client build against './'
// (see vite.config.ts). The hashes match, only the prefix differs.
// Covers src="…", url(…) and url(&quot;…&quot;) in escaped inline styles.
const body = render().replace(/(["(]|&quot;)\/assets\//g, '$1./assets/')

// Stands in for the WebGL hero until the app mounts: the same black the
// loading screen paints, carrying the page's h1.
const { name, role, summary } = heroLd()
const hero =
  '<header class="prerender-hero" style="min-height:100dvh;display:grid;align-content:end;padding:8vh 6vw;background:#020204;color:rgba(235,235,255,.62)">' +
  `<h1 style="margin:0;font:800 clamp(40px,8vw,120px)/.9 'Inter Tight',sans-serif;color:#e8e8f0;text-transform:uppercase">${name}</h1>` +
  `<p style="margin:1rem 0 0;max-width:46ch">${role}. ${summary}</p></header>`

const ld = `<script type="application/ld+json">${JSON.stringify({
  '@context': 'https://schema.org',
  ...projectsLd(),
}).replaceAll('<', '\\u003c')}</script>`

await writeFile(
  htmlPath,
  html
    .replace(EMPTY_ROOT, `<div id="root">${hero}${body}</div>`)
    .replace('</head>', `    ${ld}\n  </head>`),
)
await rm(`${root}.ssr`, { recursive: true, force: true })
console.log(`prerender: wrote ${(body.length / 1024).toFixed(0)} KB of section markup`)
