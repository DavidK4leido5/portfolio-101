/**
 * The built page must carry its copy in the HTML, for crawlers that never run
 * the bundle. Reads dist/index.html after `pnpm build`; no browser needed.
 *
 *   node tests/prerender-check.mjs
 */
import { readFileSync } from 'node:fs'

const html = readFileSync(new URL('../dist/index.html', import.meta.url), 'utf8')
const errors = []
const check = (ok, msg) => {
  if (ok) console.log('ok:', msg)
  else { errors.push(msg); console.error('FAIL:', msg) }
}

const root = html.slice(html.indexOf('<div id="root">'), html.lastIndexOf('</body>'))
const text = root.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&#x27;/g, "'").replace(/\s+/g, ' ')
const count = (needle) => text.split(needle).length - 1

check(/<h1[^>]*>\s*David Remus Tribugenia/.test(root), 'h1 names the person')
for (const id of ['about', 'projects', 'experience', 'skills', 'contact']) {
  check(root.includes(`id="section-${id}-title"`), `section h2 for ${id}`)
}

for (const layer of ['Interface', 'API', 'Service', 'Data', 'Infrastructure']) {
  check(new RegExp(`<h2>${layer} layer:`).test(root), `hero stage "${layer}" is a heading`)
}

const projects = ['The Palace Manila', 'Revive Pharmacy', 'Volatility', 'Agentsly', 'TapUp', 'Codebility']
for (const p of projects) check(root.includes(`id="project-`) && text.includes(p), `project "${p}" is in the markup`)

// A sentence from the walkthrough copy: present, and present once
const beat = 'Revive Pharmacy ran as one system where a single failure took everything with it.'
check(count(beat) === 1, `walkthrough copy appears exactly once (found ${count(beat)})`)

check(!/(["(]|&quot;)\/assets\//.test(root), 'asset URLs are relative, matching the client build')

const ld = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) =>
  JSON.parse(m[1]))
const list = ld.find((d) => d['@type'] === 'ItemList')
check(list?.itemListElement?.length === projects.length, `ItemList JSON-LD lists ${projects.length} projects`)

if (errors.length) {
  console.error(`\n${errors.length} failure(s)`)
  process.exit(1)
}
console.log('\nPRERENDER PASS')
