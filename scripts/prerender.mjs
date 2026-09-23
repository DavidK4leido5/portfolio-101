/**
 * Writes the rendered sections into dist/index.html so the copy is in the
 * served HTML, not only in the JS bundle. Run after both builds:
 *   vite build && vite build --ssr src/prerender.tsx --outDir .ssr
 */
import { readFile, rm, writeFile } from 'node:fs/promises'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const htmlPath = `${root}dist/index.html`
const { render, renderHero, projectsLd } = await import(pathToFileURL(`${root}.ssr/prerender.js`).href)

const html = await readFile(htmlPath, 'utf8')
const EMPTY_ROOT = '<div id="root"></div>'
if (!html.includes(EMPTY_ROOT)) throw new Error('dist/index.html has no empty #root to fill')

// The SSR build resolves assets against '/', the client build against './'
// (see vite.config.ts). The hashes match, only the prefix differs.
// Covers src="…", url(…) and url(&quot;…&quot;) in escaped inline styles.
const relative = (html) => html.replace(/(["(]|&quot;)\/assets\//g, '$1./assets/')
const body = relative(render())
const hero = relative(renderHero())

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
