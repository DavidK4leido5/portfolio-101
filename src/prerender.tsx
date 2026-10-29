import { renderToString } from 'react-dom/server'
import { SectionsSpine } from './ui/SectionsSpine'
import { SiteFooter } from './ui/SiteFooter'
import { experience, profile, projects } from './content/portfolio'
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
  const summary = `React, Node and PostgreSQL systems for ${experience
    .slice(0, 3)
    .map((e) => e.company)
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

type ClientWorkLd = {
  id: string
  name: string
  description: string
  url?: string
  keywords: string
  period?: string
}

/**
 * Every client build the page carries, from both halves of the content: the
 * chapters told under each role, then the standalone projects. The Projects
 * section shows only the second half, but a crawler should still find the six,
 * and the chapter list is what makes that list complete.
 */
function clientWorkLd(): ClientWorkLd[] {
  return [
    ...projectStories.map((story) => ({
      id: story.id,
      name: story.title,
      description: story.beats[0].body,
      url: story.domain,
      keywords: story.stack.join(', '),
      period: story.period,
    })),
    ...projects.map((p) => ({
      id: p.id,
      name: p.title,
      description: p.description,
      url: p.domain,
      keywords: p.skills.join(', '),
    })),
  ]
}

/** Client work as schema.org CreativeWork, from the same data the page renders. */
export function projectsLd() {
  return {
    '@type': 'ItemList',
    '@id': `${SITE}#projects`,
    name: `Client projects by ${profile.fullName}`,
    itemListElement: clientWorkLd().map((w, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      item: {
        '@type': 'CreativeWork',
        '@id': `${SITE}#project-${w.id}`,
        name: w.name,
        description: w.description,
        ...(w.url ? { url: w.url } : {}),
        keywords: w.keywords,
        creator: { '@id': `${SITE}#person` },
        ...(w.period ? { temporalCoverage: w.period } : {}),
      },
    })),
  }
}
