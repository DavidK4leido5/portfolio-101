import { projects } from '../content/portfolio'
import { clientWorkGroups } from '../content/clientWorks'

const shotBySlug = new Map(clientWorkGroups.map((g) => [g.key, g.shots[0]?.src]))

function hostOf(url: string) {
  try {
    return new URL(url).host.replace(/^www\./, '')
  } catch {
    return url
  }
}

export function ProjectsPanel() {
  return (
    <div className="projects-panel" data-testid="projects-panel">
      {projects.map((p) => {
        const shot = shotBySlug.get(p.slug)
        return (
          <article className="project-card" key={p.id}>
            {shot && (
              <img
                className="project-card__shot"
                src={shot}
                alt=""
                loading="lazy"
                decoding="async"
              />
            )}
            <header className="project-card__head">
              <h3 className="project-card__title">{p.title}</h3>
            </header>
            <p className="project-card__desc">{p.description}</p>
            {p.skills.length > 0 && (
              <ul className="project-card__skills">
                {p.skills.map((s) => (
                  <li key={s}>{s}</li>
                ))}
              </ul>
            )}
            {p.domain && (
              <div className="project-card__links">
                <a href={p.domain} target="_blank" rel="noreferrer">
                  {hostOf(p.domain)} →
                </a>
              </div>
            )}
          </article>
        )
      })}
    </div>
  )
}
