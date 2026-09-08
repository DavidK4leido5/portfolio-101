import { contact, profile } from '../content/portfolio'

const YEAR = new Date().getFullYear()

/**
 * End of the page. On a phone the fixed section nav parks over the strip this
 * reserves at the bottom, so the nav reads as part of the footer once you get
 * here instead of floating over it.
 */
export function SiteFooter() {
  return (
    <footer className="site-foot" data-testid="scroll-end">
      <div className="site-foot__inner">
        <div className="site-foot__lead">
          <p className="site-foot__kicker">Still reading?</p>
          <a className="site-foot__mail" href={`mailto:${contact.email}`}>
            {contact.email}
            <span aria-hidden> ↗</span>
          </a>
        </div>

        <nav className="site-foot__links" aria-label="Elsewhere">
          {contact.links.map((l) => (
            <a key={l.label} href={l.url} target="_blank" rel="noreferrer">
              {l.label}
              <span aria-hidden> ↗</span>
            </a>
          ))}
        </nav>

        <div className="site-foot__meta">
          <span>{profile.fullName}</span>
          <span>{profile.about.location}</span>
          <span>© {YEAR}</span>
        </div>
      </div>
    </footer>
  )
}
