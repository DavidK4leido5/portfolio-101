const LOGO_SRC = `${import.meta.env.BASE_URL}logo.png`

/** Persistent brand mark. The name line is the document h1. */
export function SiteBrand() {
  return (
    <a
      className="site-brand"
      href={import.meta.env.BASE_URL}
      data-testid="site-brand"
      aria-label="The Adaptive Mind, David Remus Tribugenia portfolio home"
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
        <span className="site-brand__title">The Adaptive Mind</span>
        <h1 className="site-brand__sub">David Remus Tribugenia</h1>
      </span>
    </a>
  )
}
