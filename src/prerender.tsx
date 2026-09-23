import { renderToString } from 'react-dom/server'
import { SectionsSpine } from './ui/SectionsSpine'
import { SiteFooter } from './ui/SiteFooter'
import { profile, projects } from './content/portfolio'
import { projectStories } from './content/projects'
import { traceOpening, traceStages } from './content/requestTrace'

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

/**
 * Stands in for the WebGL hero until the app mounts: the page's h1 and the
 * request trace's five stages as real headings. Painted the loading screen's
 * black, so the swap to the live hero is not seen.
 */
export function renderHero() {
  const summary = `React, Node and PostgreSQL systems for ${projects
    .slice(0, 3)
    .map((p) => p.title)
    .join(', ')} and more, from ${profile.about.location}.`
  return renderToString(
    <header
      className="prerender-hero"
      style={{ minHeight: '100dvh', padding: '8vh 6vw', background: '#020204', color: 'rgba(235,235,255,.62)' }}
    >
      <h1 style={{ margin: 0, font: "800 clamp(40px,8vw,120px)/.9 'Inter Tight',sans-serif", color: '#e8e8f0', textTransform: 'uppercase' }}>
        {profile.fullName}
      </h1>
      <p style={{ margin: '1rem 0 3rem', maxWidth: '46ch' }}>{`${profile.title}. ${summary}`}</p>
      <p>{traceOpening.kicker}</p>
      <ol>
        {traceStages.map((stage) => (
          <li key={stage.title}>
            <h2>{`${stage.title} layer: ${stage.headline}`}</h2>
            <p>{stage.lede}</p>
            <p>{stage.stack.join(', ')}</p>
          </li>
        ))}
      </ol>
    </header>,
  )
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
