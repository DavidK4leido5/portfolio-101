import { useEffect, useRef } from 'react'
import { contact, profile } from '../content/portfolio'
import { observeFit } from './fitText'

const YEAR = new Date().getFullYear()

/**
 * End of the page, closing on the name at full width like end credits. On a
 * phone the fixed section nav parks over the strip this reserves at the
 * bottom, so the nav reads as part of the footer once you get here instead of
 * floating over it.
 */
export function SiteFooter() {
  const rootRef = useRef<HTMLElement>(null)

  useEffect(() => {
    const root = rootRef.current
    return root ? observeFit(root, -0.04) : undefined
  }, [])

  return (
    <footer className="site-foot" data-testid="scroll-end" ref={rootRef}>
      <div className="site-foot__inner">
        <div className="site-foot__lead">
          <p className="site-foot__kicker">Still reading?</p>
          <a className="site-foot__mail" href={`mailto:${contact.email}`}>
            Start a project
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
          <span>{profile.title}</span>
          <span>{profile.about.location}</span>
          <span>© {YEAR}</span>
        </div>
      </div>

      <p className="site-foot__name">
        <span data-fit>{profile.fullName}</span>
      </p>
    </footer>
  )
}
