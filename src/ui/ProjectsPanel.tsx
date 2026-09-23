import type { MouseEvent } from 'react'
import { projects } from '../content/portfolio'
import { projectStories } from '../content/projects'

const storyById = new Map(projectStories.map((s) => [s.id, s]))
const pad = (n: number) => String(n).padStart(2, '0')

const prefersReduced = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches

/** Glide to the project's chapter in the timeline instead of jumping there. */
function toChapter(e: MouseEvent<HTMLAnchorElement>, id: string) {
  const el = document.getElementById(`project-${id}`)
  if (!el) return
  e.preventDefault()
  scrollTo({
    top: el.getBoundingClientRect().top + scrollY,
    behavior: prefersReduced() ? 'auto' : 'smooth',
  })
  history.replaceState(null, '', `#project-${id}`)
}

/**
 * The project index: one row per client build, the name set at display scale.
 * Each row links to its chapter in the timeline below. On hover the name fills
 * with the project's first screenshot, wiped in by shrinking a flat cover layer
 * stacked over the image inside the same `background-clip: text`.
 */
export function ProjectsPanel() {
  return (
    <ol className="project-index" data-testid="projects-panel">
      {projects.map((p, i) => {
        const story = storyById.get(p.id)
        const shot = story?.shots[0]?.src
        return (
          <li
            className="project-index__row"
            key={p.id}
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
      })}
    </ol>
  )
}
