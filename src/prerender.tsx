import { renderToString } from 'react-dom/server'
import { SectionsSpine } from './ui/SectionsSpine'
import { SiteFooter } from './ui/SiteFooter'
import { profile, projects } from './content/portfolio'
import { projectStories } from './content/projects'

/**
 * Build-time render of the portfolio sections, injected into `dist/index.html`
 * by `scripts/prerender.mjs` so crawlers that don't run JS still get the copy.
 * There is no hydration: `createRoot` clears this markup on its first render.
 */
export function render() {
  return renderToString(
    <>
      <SectionsSpine />
      <SiteFooter />
    </>,
  )
}

/** Copy for the static hero placeholder that carries the page's h1. */
export function heroLd() {
  return {
    name: profile.fullName,
    role: profile.title,
    summary: `React, Node and PostgreSQL systems for ${projects
      .slice(0, 3)
      .map((p) => p.title)
      .join(', ')} and more, from ${profile.about.location}.`,
  }
}

const SITE = 'https://stackwithdavid.is-a.dev/'

/** Projects as schema.org CreativeWork, from the same data the page renders. */
export function projectsLd() {
  return {
    '@type': 'ItemList',
    '@id': `${SITE}#projects`,
    name: `Client projects by ${profile.fullName}`,
    itemListElement: projects.map((p, i) => {
      const story = projectStories.find((s) => s.id === p.id)
      return {
        '@type': 'ListItem',
        position: i + 1,
        item: {
          '@type': 'CreativeWork',
          '@id': `${SITE}#project-${p.id}`,
          name: p.title,
          description: p.description,
          ...(p.domain ? { url: p.domain } : {}),
          keywords: p.skills.join(', '),
          creator: { '@id': `${SITE}#person` },
          ...(story?.period ? { temporalCoverage: story.period } : {}),
        },
      }
    }),
  }
}
