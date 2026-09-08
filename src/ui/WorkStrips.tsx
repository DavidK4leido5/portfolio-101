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

/**
 * Two counter-scrolling rows of client screenshots, grouped by product.
 *
 * The reveal goes on the strip, never on the shots inside it: those already
 * ride the marquee's own transform, and a second one on the same node fights
 * it.
 */
export function ClientWorkStrip() {
  const { rowA, rowB } = splitClientWorkGroups()
  if (rowA.length + rowB.length === 0) return null

  return (
    <div className="client-work" data-testid="client-work-marquee" data-reveal>
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

/** References from the people who hired him, as one scrolling row. */
export function TestimonialStrip() {
  if (testimonials.length === 0) return null
  return (
    <div className="testimonial-marquee" data-testid="testimonial-marquee" data-reveal>
      <Marquee direction="ltr" speedPx={22} fill aria-label="Testimonials">
        {testimonials.map((t) => (
          <TestimonialCard key={t.id} t={t} />
        ))}
      </Marquee>
    </div>
  )
}
