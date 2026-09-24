import { useEffect } from 'react'
import { useSceneStore } from '../store/sceneStore'
import {
  SWARM_ATTACK,
  SWARM_BITE,
  SWARM_PULSE,
  SWARM_RETREAT,
  SWARM_TOUCH,
} from '../lib/swarmEvents'
import { UI_REVEAL, type RevealKind } from '../lib/uiEvents'
import { audio } from './engine'
import { uniforms } from '../scene/shared'

/** Anything the interface ticks for. */
const INTERACTIVE = 'a, button, [role="button"], input[type="range"], summary'
/**
 * Share of the intro spawn at which the particles read as a finished
 * structure: nearly every node home and the connection web starting to draw.
 */
const LAND_AT = 0.93
/** Exit progress at which the veil opens: the reveal lands here. */
const REVEAL_AT = 0.84

/**
 * Wires the page to the sound engine. Renders nothing.
 *
 * - Sound starts as the page loads where the browser allows it, and on the
 *   first click, tap or key press everywhere else.
 * - The intro gets a low, heavy build while the swarm assembles.
 * - Scrolling into FULL STACK spools up an engine that follows the scroll,
 *   and the moment the frame breaks through the letters lands a reveal.
 * - The drone takes the mood of wherever the page is; titles, stages and
 *   details announce themselves as they arrive; the swarm drives the rest.
 */
export function Soundscape() {
  useEffect(() => {
    audio.init()

    const onGesture = () => audio.unlock()
    addEventListener('pointerdown', onGesture, { passive: true })
    addEventListener('keydown', onGesture)
    addEventListener('touchend', onGesture, { passive: true })

    /*
     * Intro. The build starts with the intro (or as soon as audio runs, if
     * that comes a moment later), and it lands when the particles actually
     * close into the structure: the spawn uniform read every frame, not a
     * guess at the timeline.
     */
    let introAt = -1
    let assembled = false
    let watch = 0
    const tryAssemble = () => {
      if (assembled || introAt < 0 || !audio.playing) return
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) return
      assembled = true
      audio.assembleStart()
      const check = () => {
        if (uniforms.uSpawn.value >= LAND_AT) {
          audio.land()
          return
        }
        watch = requestAnimationFrame(check)
      }
      watch = requestAnimationFrame(check)
    }
    const bringDroneIn = () => {
      if (useSceneStore.getState().loadPhase === 'ready' && audio.playing) audio.fadeInDrone()
    }
    const unsubAudio = audio.subscribe(() => {
      tryAssemble()
      bringDroneIn()
    })

    // Mood: hero, trace stage, or the section in the middle of the screen
    let section: string | null = null
    const moodNow = () => {
      const { scrollZone, traceStage } = useSceneStore.getState()
      if (scrollZone === 'hero') return 'hero'
      if (scrollZone === 'trace') return traceStage == null ? 'hero' : `trace-${traceStage}`
      return section ?? 'about'
    }
    const syncMood = () => audio.setMood(moodNow())
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          if (e.isIntersecting) section = (e.target as HTMLElement).dataset.section ?? section
        }
        syncMood()
      },
      { rootMargin: '-45% 0px -45% 0px' },
    )
    document.querySelectorAll<HTMLElement>('.spine-section[data-section]').forEach((el) => io.observe(el))

    // Flying into the words, scrubbed by the hero exit
    let revealArmed = true
    const onExit = (p: number) => {
      audio.setWarp(p)
      if (revealArmed && p >= REVEAL_AT) {
        revealArmed = false
        audio.reveal()
      } else if (p < 0.5) revealArmed = true
    }

    const unsubStore = useSceneStore.subscribe((s, prev) => {
      if (s.loadPhase !== prev.loadPhase && s.loadPhase === 'intro') {
        introAt = performance.now()
        tryAssemble()
      }
      // A moment after the words are up, if the landing did not already do it
      if (s.loadPhase !== prev.loadPhase && s.loadPhase === 'ready') setTimeout(bringDroneIn, 1500)
      if (s.heroExitProgress !== prev.heroExitProgress) onExit(s.heroExitProgress)
      if (s.scrollZone !== prev.scrollZone || s.traceStage !== prev.traceStage) syncMood()
    })
    if (useSceneStore.getState().loadPhase === 'intro') introAt = performance.now()

    // Arrivals
    const onReveal = (e: Event) => {
      const kind = (e as CustomEvent<{ kind: RevealKind }>).detail?.kind
      if (kind === 'title') audio.revealTitle()
      else if (kind === 'stage') audio.revealStage()
      else audio.revealItem()
    }
    addEventListener(UI_REVEAL, onReveal)

    // Swarm
    const onPulse = () => audio.chime()
    const onTouch = () => audio.startle()
    const onAttack = () => audio.setAttack(true)
    const onBite = () => audio.bite()
    const onRetreat = () => {
      audio.retreat()
      audio.setAttack(false)
    }
    addEventListener(SWARM_PULSE, onPulse)
    addEventListener(SWARM_TOUCH, onTouch)
    addEventListener(SWARM_ATTACK, onAttack)
    addEventListener(SWARM_BITE, onBite)
    addEventListener(SWARM_RETREAT, onRetreat)

    // Interface: a tick entering anything clickable, a blip on clicking it
    let hovered: Element | null = null
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches
    const onOver = (e: PointerEvent) => {
      const hit = (e.target as Element).closest?.(INTERACTIVE) ?? null
      if (hit && hit !== hovered && fine) audio.hover()
      hovered = hit
    }
    const onClick = (e: MouseEvent) => {
      const hit = (e.target as Element).closest?.(INTERACTIVE)
      // The gate's buttons stay silent: the page's first sound is the landing
      if (hit && !hit.closest('[data-sound-toggle], .loader-gate')) audio.click()
    }
    addEventListener('pointerover', onOver, { passive: true })
    addEventListener('click', onClick, { passive: true })

    return () => {
      removeEventListener('pointerdown', onGesture)
      removeEventListener('keydown', onGesture)
      removeEventListener('touchend', onGesture)
      cancelAnimationFrame(watch)
      unsubAudio()
      unsubStore()
      io.disconnect()
      removeEventListener(UI_REVEAL, onReveal)
      removeEventListener(SWARM_PULSE, onPulse)
      removeEventListener(SWARM_TOUCH, onTouch)
      removeEventListener(SWARM_ATTACK, onAttack)
      removeEventListener(SWARM_BITE, onBite)
      removeEventListener(SWARM_RETREAT, onRetreat)
      removeEventListener('pointerover', onOver)
      removeEventListener('click', onClick)
    }
  }, [])

  return null
}
