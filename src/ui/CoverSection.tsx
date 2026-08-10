import { contributions, testimonials } from '../content/portfolio'

export function CoverSection() {
  return (
    <section className="cover-section" data-testid="cover-section" aria-label="Contributions and testimonials">
      <div className="cover-inner">
        <header className="cover-header">
          <p className="cover-eyebrow">Field notes</p>
          <h2 className="cover-title">Contributions</h2>
          <p className="cover-lead">
            Systems design, integration, and shipping across pharmacy platforms, marketing sites,
            AI products, and public-sector ops.
          </p>
        </header>

        <div className="cover-grid">
          {contributions.map((c) => (
            <article className="cover-card" key={c.id}>
              <p className="cover-card-period">{c.period}</p>
              <h3 className="cover-card-role">{c.role}</h3>
              <p className="cover-card-company">{c.company}</p>
              <ul className="cover-card-list">
                {c.highlights.map((h) => (
                  <li key={h}>{h}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>

        <header className="cover-header cover-header--testimonials">
          <p className="cover-eyebrow">Signals</p>
          <h2 className="cover-title">Testimonials</h2>
          <p className="cover-lead">People I&apos;ve built with. Replace placeholders with real quotes.</p>
        </header>

        <div className="testimonial-grid">
          {testimonials.map((t) => (
            <blockquote className="testimonial-card" key={t.id}>
              <p className="testimonial-quote">&ldquo;{t.quote}&rdquo;</p>
              <footer className="testimonial-meta">
                <cite className="testimonial-name">{t.name}</cite>
                <span className="testimonial-role">{t.title} · {t.company}</span>
              </footer>
            </blockquote>
          ))}
        </div>
      </div>
    </section>
  )
}
