import { useEffect, useMemo, useRef } from 'react'
import gsap from 'gsap'
import type { SkillCategory } from '../content/portfolio'
import { SkillIcon } from './skillIcons'

const SIZE = 280
const CX = SIZE / 2
const CY = SIZE / 2
const R = 96
const RINGS = [0.33, 0.66, 1]

function angleAt(i: number, n: number) {
  // Start at top (−90°) and go clockwise
  return -Math.PI / 2 + (i / n) * Math.PI * 2
}

function pointAt(i: number, n: number, t: number) {
  const a = angleAt(i, n)
  return {
    x: CX + Math.cos(a) * R * t,
    y: CY + Math.sin(a) * R * t,
  }
}

function polyPoints(categories: SkillCategory[]) {
  const n = categories.length
  return categories
    .map((c, i) => {
      const p = pointAt(i, n, Math.max(0.08, Math.min(1, c.score / 100)))
      return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
    })
    .join(' ')
}

function ringPoints(n: number, t: number) {
  return Array.from({ length: n }, (_, i) => {
    const p = pointAt(i, n, t)
    return `${p.x.toFixed(2)},${p.y.toFixed(2)}`
  }).join(' ')
}

type Props = {
  categories: SkillCategory[]
  activeId: string
  onSelect: (id: string) => void
}

export function SkillsRadar({ categories, activeId, onSelect }: Props) {
  const n = categories.length
  const polyRef = useRef<SVGPolygonElement>(null)
  const skipPulse = useRef(true)
  const reduced = useMemo(
    () => typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches,
    [],
  )

  const points = useMemo(() => polyPoints(categories), [categories])

  useEffect(() => {
    const el = polyRef.current
    if (!el) return
    gsap.killTweensOf(el)
    if (reduced) {
      gsap.set(el, { opacity: 1, scale: 1, transformOrigin: '50% 50%' })
      return
    }
    gsap.fromTo(
      el,
      { opacity: 0, scale: 0.55, transformOrigin: '50% 50%' },
      { opacity: 1, scale: 1, duration: 0.85, ease: 'power2.out' },
    )
    return () => { gsap.killTweensOf(el) }
  }, [reduced])

  useEffect(() => {
    if (skipPulse.current) {
      skipPulse.current = false
      return
    }
    const el = polyRef.current
    if (!el || reduced) return
    gsap.killTweensOf(el)
    gsap.fromTo(el, { opacity: 0.55 }, { opacity: 1, duration: 0.35, ease: 'power1.out' })
    return () => { gsap.killTweensOf(el) }
  }, [activeId, reduced])

  return (
    <div className="skills-radar" data-testid="skills-radar" data-reveal="card">
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} width="100%" height="100%" role="group" aria-label="Skills radar">
        <defs>
          <linearGradient id="skills-poly-fill" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="var(--skills-accent, #4da6ff)" stopOpacity="0.35" />
            <stop offset="100%" stopColor="var(--accent, #8b5cf6)" stopOpacity="0.18" />
          </linearGradient>
          <linearGradient id="skills-poly-stroke" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="var(--skills-accent, #4da6ff)" />
            <stop offset="100%" stopColor="var(--accent, #8b5cf6)" />
          </linearGradient>
        </defs>

        {RINGS.map((t) => (
          <polygon
            key={t}
            className="skills-radar__ring"
            points={ringPoints(n, t)}
            fill="none"
          />
        ))}

        {categories.map((_, i) => {
          const tip = pointAt(i, n, 1)
          return (
            <line
              key={`axis-${i}`}
              className="skills-radar__axis"
              x1={CX}
              y1={CY}
              x2={tip.x}
              y2={tip.y}
            />
          )
        })}

        <polygon
          ref={polyRef}
          className="skills-radar__poly"
          points={points}
          fill="url(#skills-poly-fill)"
          stroke="url(#skills-poly-stroke)"
        />

        {categories.map((c, i) => {
          const tip = pointAt(i, n, 1)
          const node = pointAt(i, n, Math.max(0.08, Math.min(1, c.score / 100)))
          const active = c.id === activeId
          // Icon sits slightly outside the outer ring
          const iconPos = pointAt(i, n, 1.28)
          return (
            <g key={c.id}>
              <circle
                className={`skills-radar__node${active ? ' is-active' : ''}`}
                cx={node.x}
                cy={node.y}
                r={active ? 6.5 : 4}
              />
              <foreignObject
                x={iconPos.x - 16}
                y={iconPos.y - 16}
                width={32}
                height={32}
              >
                  <button
                  type="button"
                  className={`skills-radar__hit${active ? ' is-active' : ''}`}
                  aria-label={c.label}
                  aria-pressed={active}
                  aria-controls="skills-detail"
                  onClick={() => onSelect(c.id)}
                >
                  <SkillIcon name={c.icon} size={16} />
                </button>
              </foreignObject>
              {/* Invisible larger hit target along the axis tip */}
              <circle
                cx={tip.x}
                cy={tip.y}
                r={18}
                fill="transparent"
                className="skills-radar__hit-area"
                onClick={() => onSelect(c.id)}
                style={{ cursor: 'pointer' }}
              />
            </g>
          )
        })}
      </svg>
    </div>
  )
}
