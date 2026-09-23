import type { MouseEvent } from 'react'
import { projects } from '../content/portfolio'
import { projectStories } from '../content/projects'
import { useSoftFill } from './softFill'
import { glideTo } from '../scroll/traceNav'

const storyById = new Map(projectStories.map((s) => [s.id, s]))
const pad = (n: number) => String(n).padStart(2, '0')

/** Glide to the project's chapter in the timeline instead of jumping there. */
function toChapter(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(`project-${id}`)
  if (!el) return
  e.preventDefault()
  glideTo(el.getBoundingClientRect().top + scrollY)
  history.replaceState(null, '', `#project-${id}`)
}

type Row = (typeof projects)[number]

function IndexRow({ p, i }: { p: Row; i: number }) {
  const story = storyById.get(p.id)
  // Softened so the screenshot's own copy does not read through the letters
  const shot = useSoftFill(story?.shots[0]?.src, story?.accent)
  return (
    <li
      className="project-index__row"
      data-reveal
      style={{ '--row-accent': story?.accent } as React.CSSProperties}
    >
      <a
        className="project-index__link"
        href={`#project-${p.id}`}
        onClick={(e) => toChapter(e, p.id)}
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
          {story?.role && (
            <span className="project-index__role">
              {story.role}
              {story.period ? ` · ${story.period}` : ''}
            </span>
          )}
        </span>
        <span className="project-index__arrow" aria-hidden>↘</span>
      </a>
    </li>
  )
}

/**
 * The project index: one row per client build, the name set at display scale.
 * Each row links to its chapter in the timeline under Experience. On hover the
 * name fills with the project's first screenshot, softened, wiped in by
 * shrinking a flat cover layer stacked over it inside the same
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
