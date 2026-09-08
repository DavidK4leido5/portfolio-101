import { experience } from '../content/portfolio'
import { clientWorkGroups } from '../content/clientWorks'

/** First screenshot per client-work group, used as the engagement's image. */
const shotBySlug = new Map(clientWorkGroups.map((g) => [g.key, g.shots[0]?.src]))

export function ExperienceList() {
  return (
    <div className="experience-list" data-testid="experience-list">
      {experience.map((e) => {
        const shot = e.slug ? shotBySlug.get(e.slug) : undefined
        return (
          <article
            className={`card card--exp${shot ? '' : ' card--exp-bare'}`}
            key={e.id}
            data-reveal="card"
          >
            {shot && (
              <img
                className="card__shot"
                src={shot}
                alt=""
                loading="lazy"
                decoding="async"
                data-wipe
              />
            )}
            <div className="card__head">
              <h3>{e.role} · {e.company}</h3>
              <span className="card__period">{e.period}</span>
            </div>
            <p>{e.description}</p>
          </article>
        )
      })}
    </div>
  )
}
