const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`

/** Persistent brand mark — favicon twin + document h1 for SEO. */
export function SiteBrand() {
  return (
    <a
      className="site-brand"
      href={import.meta.env.BASE_URL}
      data-testid="site-brand"
      aria-label="The Adaptive Mind — Davids Portfolio"
    >
      <img
        className="site-brand__logo"
        src={LOGO_SRC}
        alt=""
        width={40}
        height={40}
        decoding="async"
      />
      <span className="site-brand__copy">
        <h1 className="site-brand__title">The Adaptive Mind</h1>
        <span className="site-brand__sub">Davids Portfolio</span>
      </span>
    </a>
  )
}
