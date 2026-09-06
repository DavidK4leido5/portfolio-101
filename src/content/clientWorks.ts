/**
 * Drop screenshots into `assets/client-work/` — they show up automatically.
 *
 * Name files `project (n).ext` so shots stay grouped by project, ordered by n.
 * Example: `revivepharmacy (1).png`, `agentsly (2).avif`
 * No URLs.
 */

export type ClientWork = {
  id: string
  src: string
  /** Pretty project name for captions */
  alt: string
  project: string
  index: number
}

const modules = import.meta.glob(
  './assets/client-work/*.{png,jpg,jpeg,webp,svg,gif,avif}',
  {
    eager: true,
    query: '?url',
    import: 'default',
  },
) as Record<string, string>

/** Optional display names; unknown slugs fall back to spaced title-case. */
const PROJECT_LABELS: Record<string, string> = {
  agentsly: 'Agentsly',
  codebility: 'Codebility',
  revivepharmacy: 'Revive Pharmacy',
  tapup: 'TapUp',
  thepalacemanila: 'The Palace Manila',
  volatility: 'Volatility',
}

const FILE_RE = /^(.+?)\s*\((\d+)\)\s*$/

function labelProject(slug: string): string {
  const key = slug.toLowerCase().replace(/[\s_-]+/g, '')
  if (PROJECT_LABELS[key]) return PROJECT_LABELS[key]
  return slug
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase())
}

function parseFile(path: string): { id: string; project: string; index: number; alt: string } {
  const file = path.split('/').pop() ?? path
  const id = file.replace(/\.[^.]+$/, '')
  const m = id.match(FILE_RE)
  if (m) {
    const project = m[1].trim()
    const index = Number(m[2])
    return { id, project, index, alt: labelProject(project) }
  }
  return { id, project: id, index: 0, alt: labelProject(id) }
}

function projectKey(slug: string): string {
  return slug.toLowerCase().replace(/[\s_-]+/g, '')
}

export const clientWorks: ClientWork[] = Object.entries(modules)
  .map(([path, src]) => {
    const meta = parseFile(path)
    return { ...meta, src }
  })
  .sort((a, b) => {
    const pk = projectKey(a.project).localeCompare(projectKey(b.project))
    if (pk !== 0) return pk
    return a.index - b.index
  })

export type ClientWorkGroup = {
  key: string
  /** Pretty project name */
  label: string
  shots: ClientWork[]
}

/** Shots clustered by project, in display order. */
export const clientWorkGroups: ClientWorkGroup[] = (() => {
  const byProject = new Map<string, ClientWorkGroup>()
  for (const w of clientWorks) {
    const key = projectKey(w.project)
    const group = byProject.get(key) ?? { key, label: w.alt, shots: [] }
    group.shots.push(w)
    byProject.set(key, group)
  }
  return [...byProject.values()]
})()

/** Split projects across two marquee rows; odd-count leftovers go to row A. */
export function splitClientWorkGroups(): { rowA: ClientWorkGroup[]; rowB: ClientWorkGroup[] } {
  const mid = Math.ceil(clientWorkGroups.length / 2)
  return { rowA: clientWorkGroups.slice(0, mid), rowB: clientWorkGroups.slice(mid) }
}
