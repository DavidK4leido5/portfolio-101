import { useState } from 'react'
import { clientWorkGroups } from '../content/clientWorks'
import {
  resolveImage,
  testimonials,
  type ImageSource,
  type Testimonial,
} from '../content/portfolio'
import { Marquee } from './Marquee'

/**
 * A big-type break between the project index and the timeline: the client
 * names in giant alternating outline and solid type, each followed by one
 * small screenshot, running as one CSS marquee.
 *
 * Decorative: every name and shot here is already on the page as real
 * content, and the marquee repeats its children to fill the row.
 */
export function ClientWorkStrip() {
  if (clientWorkGroups.length === 0) return null

  return (
    <div className="client-work" data-testid="client-work-marquee" data-reveal>
      <Marquee direction="rtl" speedPx={60} fill decorative>
        {clientWorkGroups.map((g, i) => (
          <div className="type-marquee__item" key={g.key}>
            <span className={`type-marquee__word${i % 2 ? ' is-solid' : ''}`}>{g.label}</span>
            {g.shots[0] && (
              <figure className="client-work__shot">
                <img
                  src={g.shots[0].src}
                  alt=""
                  width={1024}
                  height={504}
                  loading="lazy"
                  decoding="async"
                  draggable={false}
                />
              </figure>
            )}
          </div>
        ))}
      </Marquee>
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
