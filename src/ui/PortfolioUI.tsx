import { useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useSceneStore } from '../store/sceneStore'
import { sections, type SectionId } from '../data/sections'
import { QUALITY } from '../lib/quality'
import { indicatorEls } from '../scene/shared'
import {
  profile, projects, skills, experience, contact, sectionCopy, resolveImage, type ImageSource,
} from '../content/portfolio'

function Img({ image }: { image: ImageSource }) {
  return (
    <img
      src={resolveImage(image)}
      alt={image.alt}
      loading="lazy"
      onError={(e) => { e.currentTarget.style.display = 'none' }}
    />
  )
}

function SectionContent({ id }: { id: SectionId }) {
  if (id === 'projects')
    return (
      <>
        {projects.map((p) => (
          <article className="card" key={p.id}>
            <Img image={p.image} />
            <h3>{p.title}</h3>
            <p>{p.description}</p>
            <div className="tags">{p.tags.map((t) => <span key={t}>{t}</span>)}</div>
            <a href={p.link} target="_blank" rel="noreferrer">View project →</a>
          </article>
        ))}
      </>
    )
  if (id === 'skills')
    return (
      <>
        {skills.map((s) => (
          <article className="card" key={s.id}>
            <h3>{s.name}</h3>
            <p>{s.description}</p>
            <div className="tags"><span>{s.level}</span></div>
          </article>
        ))}
      </>
    )
  if (id === 'experience')
    return (
      <>
        {experience.map((e) => (
          <article className="card" key={e.id}>
            <h3>{e.role} · {e.company}</h3>
            <p className="period">{e.period}</p>
            <p>{e.description}</p>
          </article>
        ))}
      </>
    )
  if (id === 'about')
    return (
      <article className="card">
        <Img image={profile.about.image} />
        <p>{profile.about.body}</p>
      </article>
    )
  return (
    <article className="card">
      <p>{contact.description}</p>
      <p><a href={`mailto:${contact.email}`}>{contact.email}</a></p>
      <div className="tags">
        {contact.links.map((l) => (
          <a key={l.label} href={l.url} target="_blank" rel="noreferrer">{l.label}</a>
        ))}
      </div>
    </article>
  )
}

export function PortfolioUI() {
  const phase = useSceneStore((s) => s.phase)
  const active = useSceneStore((s) => s.activeSection)
  const tier = useSceneStore((s) => s.qualityTier)
  const setHovered = useSceneStore((s) => s.setHovered)
  const navigateTo = useSceneStore((s) => s.navigateTo)
  const returnHome = useSceneStore((s) => s.returnHome)
  const indicatorsRef = useRef<HTMLDivElement>(null)
  const overlayRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    gsap.to(indicatorsRef.current, { autoAlpha: phase === 'idle' ? 1 : 0, duration: 0.45, ease: 'power2.out' })
  }, [phase])

  useEffect(() => {
    if (phase === 'arrived' && overlayRef.current) {
      gsap.fromTo(overlayRef.current, { autoAlpha: 0, y: 14 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: 'power2.out' })
    }
  }, [phase])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && useSceneStore.getState().phase === 'arrived') returnHome()
    }
    addEventListener('keydown', onKey)
    return () => removeEventListener('keydown', onKey)
  }, [returnHome])

  useEffect(() => {
    const tw = gsap.to('.indicator .dot', { opacity: 0.35, repeat: -1, yoyo: true, duration: 1.1, ease: 'sine.inOut', stagger: 0.2 })
    return () => { tw.kill() }
  }, [])

  return (
    <div className="ui" data-phase={phase}>
      <div className="hud tl">{profile.name}<br /><span>{profile.title}</span></div>
      <div className="hud tr">STATUS <b>ONLINE</b><br />NODES <b>{QUALITY[tier].particles}</b><br />SECTOR <b>{active ?? 'CORE'}</b></div>
      <div className="hud bl">NEURAL.PORTFOLIO <b>v1.0</b><br />{profile.tagline}</div>
      <div className="hud br">SYS.COLOR<span className="swatch" /><br />LINK <b>{phase.toUpperCase()}</b></div>

      <div className="indicators" ref={indicatorsRef}>
        {sections.map((s, i) => (
          <button
            key={s.id}
            data-section={s.id}
            className="indicator"
            ref={(el) => { indicatorEls[i] = el }}
            onMouseEnter={() => setHovered(s.id)}
            onMouseLeave={() => setHovered(null)}
            onFocus={() => setHovered(s.id)}
            onBlur={() => setHovered(null)}
            onClick={() => navigateTo(s.id)}
          >
            <span className="dot" /><span className="line" /><span className="label">{s.label}</span>
          </button>
        ))}
      </div>

      {phase === 'arrived' && active && (
        <div className="overlay" ref={overlayRef}>
          <div className="panel">
            <h2 data-testid="overlay-title">{sectionCopy[active].headline}</h2>
            <p className="intro">{sectionCopy[active].intro}</p>
            <SectionContent id={active} />
            <button className="back" data-testid="overlay-back" onClick={returnHome}>← Return to core</button>
          </div>
        </div>
      )}
    </div>
  )
}
