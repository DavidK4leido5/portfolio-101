import { useState } from 'react'
import { profile, resolveImage } from '../content/portfolio'

export function AboutPanel() {
  const { about } = profile
  const photo = resolveImage(about.image)
  const [showPhoto, setShowPhoto] = useState(Boolean(photo))

  return (
    <div className="about-panel" data-testid="about-panel">
      <header className="about-panel__head" data-reveal-stagger>
        <div className="about-avatar" data-testid="about-avatar" data-reveal="card">
          <span className="about-avatar__initials" aria-hidden>{about.initials}</span>
          {showPhoto && (
            <img
              className="about-avatar__img"
              src={photo}
              alt={about.image.alt}
              loading="lazy"
              decoding="async"
              onError={() => setShowPhoto(false)}
              data-wipe
            />
          )}
        </div>
        <div className="about-panel__id" data-reveal>
          <h3 className="about-panel__name">{profile.fullName}</h3>
          <p className="about-panel__role">{about.role}</p>
          <p className="about-panel__loc">{about.location}</p>
        </div>
      </header>

      <div className="about-panel__body" data-reveal-stagger>
        {about.body.map((para) => (
          <p key={para.slice(0, 24)} data-reveal>{para}</p>
        ))}
      </div>

      <dl className="about-facts" data-testid="about-facts" data-reveal-stagger>
        {about.facts.map((f) => (
          <div className="about-facts__row" key={f.label} data-reveal="left">
            <dt>{f.label}</dt>
            <dd>{f.value}</dd>
          </div>
        ))}
      </dl>

      <div className="about-numbers" data-testid="about-numbers">
        <p className="about-numbers__title" data-reveal>What came out of it</p>
        <ul data-reveal-stagger>
          {about.numbers.map((n) => (
            <li key={n.value + n.label} data-reveal="card">
              <span className="about-numbers__value">{n.value}</span>
              <span className="about-numbers__label">{n.label}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
