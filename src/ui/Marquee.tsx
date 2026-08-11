import {
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react'

type MarqueeProps = {
  children: ReactNode
  /** Visual travel direction of the strip */
  direction?: 'ltr' | 'rtl'
  /**
   * Steady travel speed in px/sec (preferred). Duration is derived from
   * group width so fill-copies don't make the strip feel faster.
   */
  speedPx?: number
  /** Fallback seconds when speedPx is omitted */
  durationSec?: number
  className?: string
  'aria-label'?: string
  /** Hide from AT when the strip is a visual duplicate */
  decorative?: boolean
  /**
   * Repeat children until one group is at least as wide as the viewport,
   * so the strip opens filled with even gaps (no empty center holes).
   */
  fill?: boolean
}

/**
 * Infinite CSS marquee. Children are duplicated once for a seamless loop.
 * Pauses on hover. Stops under prefers-reduced-motion (static overflow scroll).
 */
export function Marquee({
  children,
  direction = 'ltr',
  speedPx,
  durationSec = 40,
  className = '',
  'aria-label': ariaLabel,
  decorative = false,
  fill = false,
}: MarqueeProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const measureRef = useRef<HTMLDivElement>(null)
  const groupRef = useRef<HTMLDivElement>(null)
  const [copies, setCopies] = useState(1)
  const [duration, setDuration] = useState(durationSec)

  useLayoutEffect(() => {
    if (!fill) {
      setCopies(1)
      return
    }
    const root = rootRef.current
    const measure = measureRef.current
    if (!root || !measure) return

    const update = () => {
      const cw = root.clientWidth
      const gw = measure.scrollWidth
      if (cw <= 0 || gw <= 0) return
      setCopies(Math.max(1, Math.ceil(cw / gw) + 1))
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(root)
    return () => ro.disconnect()
  }, [fill, children])

  useLayoutEffect(() => {
    const group = groupRef.current
    if (!group) return

    const syncDuration = () => {
      const w = group.scrollWidth
      if (w <= 0) return
      if (speedPx && speedPx > 0) {
        setDuration(Math.max(20, w / speedPx))
      } else {
        setDuration(durationSec)
      }
    }

    syncDuration()
    const ro = new ResizeObserver(syncDuration)
    ro.observe(group)
    return () => ro.disconnect()
  }, [speedPx, durationSec, copies, children])

  const sets = fill ? Math.max(1, copies) : 1
  const strip = Array.from({ length: sets }, (_, i) => (
    <div className="marquee__set" key={i}>
      {children}
    </div>
  ))

  return (
    <div
      ref={rootRef}
      className={`marquee ${className}`.trim()}
      data-direction={direction}
      data-fill={fill || undefined}
      style={{ '--marquee-duration': `${duration}s` } as CSSProperties}
      aria-label={decorative ? undefined : ariaLabel}
      aria-hidden={decorative || undefined}
    >
      {fill && (
        <div className="marquee__measure" ref={measureRef} aria-hidden="true">
          <div className="marquee__set">{children}</div>
        </div>
      )}
      <div className="marquee__track">
        <div className="marquee__group" ref={groupRef}>{strip}</div>
        <div className="marquee__group" aria-hidden="true">{strip}</div>
      </div>
    </div>
  )
}
