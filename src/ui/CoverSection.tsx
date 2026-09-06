import { useState } from 'react'
import { splitClientWorkGroups, type ClientWorkGroup } from '../content/clientWorks'
import {
  experience,
  resolveImage,
  testimonials,
  type ImageSource,
  type Testimonial,
} from '../content/portfolio'
import { Marquee } from './Marquee'

/** Company → role, so each strip group reads as an engagement, not a screenshot dump. */
const roleByCompany = new Map(experience.map((e) => [e.company, e.role]))

function WorkGroup({ group }: { group: ClientWorkGroup }) {
  const role = roleByCompany.get(group.label)

  return (
    <div className="work-group">
      <div className="work-group__head">
        <span className="work-group__name">{group.label}</span>
        {role && <span className="work-group__role">{role}</span>}
      </div>
      <div className="work-group__shots">
        {group.shots.map((w) => (
          <figure className="client-work__shot" key={w.id}>
            <img src={w.src} alt="" loading="lazy" decoding="async" draggable={false} />
          </figure>
        ))}
      </div>
    </div>
  )
}

function initialsOf(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]!.toUpperCase())
    .join('')
}

function TestimonialAvatar({ name, image }: { name: string; image: ImageSource }) {
  const src = resolveImage(image)
  const [showImg, setShowImg] = useState(Boolean(src))

  return (
    <div className="testimonial-avatar" aria-hidden>
      <span className="testimonial-avatar__initials">{initialsOf(name)}</span>
      {showImg && (
        <img
          className="testimonial-avatar__img"
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setShowImg(false)}
        />
      )}
    </div>
  )
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <blockquote className="testimonial-card">
      <span className="testimonial-mark" aria-hidden>&ldquo;</span>
      <p className="testimonial-quote">{t.quote}</p>
      <footer className="testimonial-meta">
        <TestimonialAvatar name={t.name} image={t.avatar} />
        <div className="testimonial-meta__text">
          <cite className="testimonial-name">{t.name}</cite>
          <span className="testimonial-role">{t.title}</span>
          <span className="testimonial-company">{t.company}</span>
        </div>
      </footer>
    </blockquote>
  )
}

export function CoverSection() {
  const { rowA, rowB } = splitClientWorkGroups()
  const hasShots = rowA.length + rowB.length > 0
  const projectCount = rowA.length + rowB.length

  return (
    <section className="cover-section" data-testid="cover-section" aria-label="Client work and testimonials">
      <div className="cover-inner">
        <header className="cover-header">
          <p className="cover-eyebrow">Client work</p>
          <h2 className="cover-title">Shipped, and running in production</h2>
          <p className="cover-lead">
            {projectCount} client engagements across systems, frontend, and full-stack delivery.
            Each strip below groups the screens by the product they belong to.
          </p>
        </header>
      </div>

      {hasShots && (
        <div className="client-work" data-testid="client-work-marquee">
          <Marquee direction="rtl" speedPx={28} fill aria-label="Client work screenshots">
            {rowA.map((g) => (
              <WorkGroup key={g.key} group={g} />
            ))}
          </Marquee>
          {rowB.length > 0 && (
            <Marquee direction="ltr" speedPx={24} className="client-work__row--offset" fill decorative>
              {rowB.map((g) => (
                <WorkGroup key={g.key} group={g} />
              ))}
            </Marquee>
          )}
        </div>
      )}

      <div className="cover-inner">
        <header className="cover-header cover-header--spaced">
          <p className="cover-eyebrow">References</p>
          <h2 className="cover-title">What the people who hired me say</h2>
          <p className="cover-lead">
            Founders and directors I reported to directly, on the work I owned for them.
          </p>
        </header>
      </div>

      <div className="testimonial-marquee" data-testid="testimonial-marquee">
        <Marquee direction="ltr" speedPx={22} fill aria-label="Testimonials">
          {testimonials.map((t) => (
            <TestimonialCard key={t.id} t={t} />
          ))}
        </Marquee>
      </div>
    </section>
  )
}
