import { projects } from '../content/portfolio'

function hasUrl(url?: string) {
  return Boolean(url?.trim())
}

export function ProjectsPanel() {
  return (
    <div className="projects-panel" data-testid="projects-panel">
      {projects.map((p) => (
        <article className="project-card" key={p.id}>
          <header className="project-card__head">
            <h3 className="project-card__title">{p.title}</h3>
            {p.status && (
              <span className={`project-card__status project-card__status--${p.status}`}>
                {p.status === 'live' ? 'Live' : 'WIP'}
              </span>
            )}
          </header>
          <p className="project-card__desc">{p.description}</p>
          {p.skills.length > 0 && (
            <ul className="project-card__skills">
              {p.skills.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          )}
          {(hasUrl(p.liveUrl) || hasUrl(p.githubUrl)) && (
            <div className="project-card__links">
              {hasUrl(p.liveUrl) && (
                <a href={p.liveUrl!.trim()} target="_blank" rel="noreferrer">
                  Live →
                </a>
              )}
              {hasUrl(p.githubUrl) && (
                <a href={p.githubUrl!.trim()} target="_blank" rel="noreferrer">
                  GitHub →
                </a>
              )}
            </div>
          )}
        </article>
      ))}
    </div>
  )
}
