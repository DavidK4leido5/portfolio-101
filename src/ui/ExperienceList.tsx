import { experience } from '../content/portfolio'
import { clientWorkGroups } from '../content/clientWorks'

/** First screenshot per client-work group, used as the engagement's image. */
const shotBySlug = new Map(clientWorkGroups.map((g) => [g.key, g.shots[0]?.src]))
const pad = (n: number) => String(n).padStart(2, '0')

/**
 * One typographic row per role: index, the company at display scale, role and
 * dates small, and the first percentage in the write-up pulled out as the
 * row's number.
 */
export function ExperienceList() {
  return (
    <ol className="exp-list" data-testid="experience-list">
      {experience.map((e, i) => {
        const shot = e.slug ? shotBySlug.get(e.slug) : undefined
        const metric = e.description.match(/\d+(?:\.\d+)?%/)?.[0]
        return (
          <li className="exp-row" key={e.id} data-reveal="card">
            <span className="exp-row__num">{pad(i + 1)}</span>
            <div className="exp-row__main">
              <h3 className="exp-row__company">{e.company}</h3>
              <p className="exp-row__role">
                {e.role} · {e.period}
              </p>
              <p className="exp-row__desc">{e.description}</p>
            </div>
            {(metric || shot) && (
              <div className="exp-row__side">
                {metric && <span className="exp-row__metric">{metric}</span>}
                {shot && (
                  <img
                    className="card__shot"
                    src={shot}
                    alt={`${e.company} screenshot`}
                    width={1024}
                    height={504}
                    loading="lazy"
                    decoding="async"
                    data-wipe
                  />
                )}
              </div>
            )}
          </li>
        )
      })}
    </ol>
  )
}
