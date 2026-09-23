import { useEffect, useState } from 'react'
import { useSceneStore } from '../store/sceneStore'
import { SWARM_TOUCH } from '../lib/swarmEvents'

/** How long "It felt that." stays up before the hint leaves for good. */
const FELT_MS = 3200

/** A mouse or trackpad gets the dare beside the cursor instead (Cursor.tsx). */
const hasCursor = () =>
  typeof matchMedia !== 'undefined' && matchMedia('(hover: hover) and (pointer: fine)').matches

/**
 * A dare next to the brain, for touch screens. It tells people the cloud
 * reacts, answers the first touch, then gets out of the way for the rest of
 * the visit.
 */
export function SwarmHint() {
  const zone = useSceneStore((s) => s.scrollZone)
  const loadPhase = useSceneStore((s) => s.loadPhase)
  const [state, setState] = useState<'dare' | 'felt' | 'gone'>('dare')

  useEffect(() => {
    if (state !== 'dare') return
    const onTouch = () => setState('felt')
    addEventListener(SWARM_TOUCH, onTouch)
    return () => removeEventListener(SWARM_TOUCH, onTouch)
  }, [state])

  useEffect(() => {
    if (state !== 'felt') return
    const to = setTimeout(() => setState('gone'), FELT_MS)
    return () => clearTimeout(to)
  }, [state])

  const shown = loadPhase === 'ready' && zone === 'hero' && state !== 'gone'
  if (hasCursor()) return null

  return (
    <p className="swarm-hint" data-state={state} data-shown={shown} aria-hidden>
      <span className="swarm-hint__dot" />
      {/* 'gone' keeps the answer, so the fade-out does not flash the dare again */}
      {state !== 'dare' ? (
        <span className="swarm-hint__line">It felt that.</span>
      ) : (
        <>
          <span className="swarm-hint__line">Don&apos;t touch.</span>
          <span className="swarm-hint__sub">The swarm is alive.</span>
        </>
      )}
    </p>
  )
}
