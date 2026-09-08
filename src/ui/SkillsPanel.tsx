import { useEffect, useMemo, useRef, useState } from 'react'
import gsap from 'gsap'
import { skills, type SkillCategory } from '../content/portfolio'
import { SkillIcon } from './skillIcons'
import { SkillsRadar } from './SkillsRadar'

function CategoryDetail({ category }: { category: SkillCategory }) {
  const listRef = useRef<HTMLUListElement>(null)
  const reduced = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  useEffect(() => {
    const root = listRef.current
    if (!root) return
    const fills = root.querySelectorAll<HTMLElement>('.skills-bar__fill')
    gsap.killTweensOf(fills)
    if (reduced) {
      gsap.set(fills, { scaleX: 1 })
      return
    }
    gsap.fromTo(
      fills,
      { scaleX: 0, transformOrigin: 'left center' },
      {
        scaleX: 1,
        duration: 0.7,
        ease: 'power2.out',
        stagger: 0.06,
      },
    )
    return () => { gsap.killTweensOf(fills) }
  }, [category.id, reduced])

  return (
    <div className="skills-detail" data-testid="skills-detail" id="skills-detail">
      <header className="skills-detail__head">
        <span className="skills-detail__badge" aria-hidden>
          <SkillIcon name={category.icon} size={18} />
        </span>
        <h3 className="skills-detail__label">{category.label}</h3>
        <span className="skills-detail__score">{category.score.toFixed(0)}</span>
      </header>
      <ul className="skills-detail__list" ref={listRef}>
        {category.tech.map((t) => (
          <li
            className="skills-row"
            key={t.name}
            aria-label={`${t.name}, ${t.score} out of 10`}
          >
            <span className="skills-row__icon" aria-hidden>
              <SkillIcon name={t.icon} size={15} />
            </span>
            <span className="skills-row__name" aria-hidden>{t.name}</span>
            <span className="skills-row__pct" aria-hidden>
              {Math.round(Math.min(100, Math.max(0, t.score * 10)))}%
            </span>
            <span className="skills-bar" aria-hidden>
              <span
                className="skills-bar__fill"
                style={{ width: `${Math.min(100, Math.max(0, t.score * 10))}%` }}
              />
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}

export function SkillsPanel() {
  const [activeId, setActiveId] = useState(skills[0]?.id ?? '')
  const active = skills.find((c) => c.id === activeId) ?? skills[0]

  if (!active) return null

  return (
    <div className="skills-panel">
      <SkillsRadar
        categories={skills}
        activeId={active.id}
        onSelect={setActiveId}
      />
      <CategoryDetail category={active} />

      {/* Every category at a glance, and a second way into the radar */}
      <ul className="skills-index" data-testid="skills-index">
        {skills.map((c) => (
          <li key={c.id}>
            <button
              type="button"
              className={`skills-index__row${c.id === active.id ? ' is-active' : ''}`}
              onClick={() => setActiveId(c.id)}
              aria-pressed={c.id === active.id}
            >
              <span className="skills-index__icon" aria-hidden>
                <SkillIcon name={c.icon} size={14} />
              </span>
              <span className="skills-index__label">{c.label}</span>
              <span className="skills-index__meter" aria-hidden>
                <span style={{ width: `${Math.min(100, Math.max(0, c.score))}%` }} />
              </span>
              <span className="skills-index__score">{c.score.toFixed(0)}</span>
            </button>
          </li>
        ))}
      </ul>
    </div>
  )
}
