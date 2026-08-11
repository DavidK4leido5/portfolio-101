import { useState } from 'react'
import { splitClientWorksByProject } from '../content/clientWorks'
import {
  resolveImage,
  testimonials,
  type ImageSource,
  type Testimonial,
} from '../content/portfolio'
import { Marquee } from './Marquee'

function WorkShot({ w, caption }: { w: { id: string; src: string; alt: string }; caption: boolean }) {
  return (
    <figure className="client-work__shot">
      <img src={w.src} alt={caption ? w.alt : ''} loading="lazy" draggable={false} />
      <figcaption className="client-work__caption">{w.alt}</figcaption>
    </figure>
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
          onError={() => setShowImg(false)}
        />
      )}
    </div>
  )
}

function TestimonialCard({ t }: { t: Testimonial }) {
  return (
    <blockquote className="testimonial-card">
      <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
      <footer className="testimonial-meta">
        <TestimonialAvatar name={t.name} image={t.avatar} />
        <div className="testimonial-meta__text">
          <cite className="testimonial-name">{t.name}</cite>
          <span className="testimonial-role">{t.title} · {t.company}</span>
        </div>
      </footer>
    </blockquote>
  )
}

export function CoverSection() {
  const { rowA, rowB } = splitClientWorksByProject()
  const hasShots = rowA.length + rowB.length > 0

  return (
    <section className="cover-section" data-testid="cover-section" aria-label="Client work and testimonials">
      <div className="cover-inner">
        <header className="cover-header">
          <p className="cover-eyebrow">Client delivery</p>
          <h2 className="cover-title">Work shipped with partners</h2>
          <p className="cover-lead">
            Product screens from Agentsly, Codebility, Revive Pharmacy, TapUp, The Palace Manila,
            and Volatility — systems, frontend, and full-stack builds in production.
          </p>
        </header>
      </div>

      {hasShots && (
        <div className="client-work" data-testid="client-work-marquee">
          <Marquee direction="rtl" speedPx={28} fill aria-label="Client work screenshots">
            {rowA.map((w) => (
              <WorkShot key={w.id} w={w} caption />
            ))}
          </Marquee>
          {rowB.length > 0 && (
            <Marquee direction="ltr" speedPx={24} className="client-work__row--offset" fill decorative>
              {rowB.map((w) => (
                <WorkShot key={w.id} w={w} caption={false} />
              ))}
            </Marquee>
          )}
        </div>
      )}

      <div className="cover-inner">
        <header className="cover-header cover-header--spaced">
          <p className="cover-eyebrow">Signals</p>
          <h2 className="cover-title">Testimonials</h2>
          <p className="cover-lead">Major people I&apos;ve worked with across client delivery.</p>
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
