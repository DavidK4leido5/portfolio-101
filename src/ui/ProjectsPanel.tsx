import { projects } from '../content/portfolio'
import { clientWorkGroups } from '../content/clientWorks'
import { useSoftFill } from './softFill'

const pad = (n: number) => String(n).padStart(2, '0')

/** TapUp's accent. One project, so a per-project palette would be noise. */
const ACCENT = '#4da6ff'

const shotBySlug = new Map(clientWorkGroups.map((g) => [g.key, g.shots]))

type Row = (typeof projects)[number]

function IndexRow({ p, i }: { p: Row; i: number }) {
  // Softened so the screenshot's own copy does not read through the letters
  const shot = useSoftFill(shotBySlug.get(p.slug)?.[0]?.src, ACCENT)
  return (
    <li
      className="project-index__row"
      data-reveal
      style={{ '--row-accent': ACCENT } as React.CSSProperties}
    >
      <a
        className="project-index__link"
        href={p.domain}
        target="_blank"
        rel="noreferrer"
      >
        <span className="project-index__num">{pad(i + 1)}</span>
        <span
          className="project-index__word"
          // Inline, not a custom property: a relative url() in a var
          // resolves against the stylesheet, which lives in assets/
          style={
            shot
              ? { backgroundImage: `linear-gradient(var(--cream), var(--cream)), url("${shot}")` }
              : undefined
          }
        >
          {p.title}
        </span>
        <span className="project-index__meta">
          <span className="project-index__desc">{p.description}</span>
        </span>
        <span className="project-index__arrow" aria-hidden>↗</span>
      </a>
    </li>
  )
}

/**
 * The project index: one row per client build that is not one of the roles,
 * the name set at display scale, linking out to the live site. Roles and their
 * walkthrough chapters live under Experience.
 *
 * On hover the name fills with the project's first screenshot, softened, wiped
 * in by shrinking a flat cover layer stacked over it inside the same
 * `background-clip: text`.
 */
export function ProjectsPanel() {
  return (
    <ol className="project-index" data-testid="projects-panel">
      {projects.map((p, i) => (
        <IndexRow key={p.id} p={p} i={i} />
      ))}
    </ol>
  )
}
