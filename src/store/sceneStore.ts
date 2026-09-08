import { create } from 'zustand'
import { detectTier, type Tier } from '../lib/quality'
import { clampNodes, NODE_LIMITS } from '../lib/nodes'

export type LoadPhase = 'loading' | 'intro' | 'ready'
/**
 * hero (the FULL / STACK mark over the brain) → trace (one request followed
 * through the brain, stage by stage) → sections (the brain stage is done; the
 * portfolio sections take the page).
 */
export type ScrollZone = 'hero' | 'trace' | 'sections'

interface SceneState {
  loadPhase: LoadPhase
  sceneReady: boolean
  qualityTier: Tier
  nodeCount: number
  scrollZone: ScrollZone
  /** 0–1 as the trace rises over the hero: the mask opens and the mark leaves */
  heroExitProgress: number
  /** 0–1 through the trace track */
  traceProgress: number
  /** Index of the stage currently on screen, or null at the trace's home beat */
  traceStage: number | null
  setTier: (t: Tier) => void
  setSceneReady: () => void
  startIntro: () => void
  finishIntro: () => void
  setNodeCount: (n: number) => void
  setScrollZone: (zone: ScrollZone) => void
  setHeroExitProgress: (p: number) => void
  setTraceProgress: (p: number) => void
  setTraceStage: (i: number | null) => void
}

/** Waypoint distance a stage stays fully opaque either side of its peak. */
const BEAT_HOLD = 0.4
/** Waypoint distance the crossfade to the next stage takes. */
const BEAT_FADE = 0.2

/**
 * Visibility window for stage i in trace waypoint space.
 * progress 0→1 maps to t = progress * n (0 = home framing, 1..n = stages).
 * Stage i peaks at t = i + 1, holds, then hands over to its neighbour.
 *
 * A plain triangle (opacity = 1 - d) peaks at a single scroll position, so a
 * stage would only ever be fully readable at one exact offset and spend the
 * rest of its beat half-faded. The hold fixes that; the short fade keeps the
 * handover from showing two stages at once for long.
 */
export function beatOpacity(progress: number, index: number, count: number): number {
  if (count <= 0) return 0
  const t = Math.min(1, Math.max(0, progress)) * count
  const d = Math.abs(t - (index + 1))
  if (d <= BEAT_HOLD) return 1
  if (d >= BEAT_HOLD + BEAT_FADE) return 0
  return (BEAT_HOLD + BEAT_FADE - d) / BEAT_FADE
}

/** Scroll progress at which stage i sits dead centre of its beat. */
export function progressForBeat(index: number, count: number): number {
  if (count <= 0) return 0
  return Math.min(1, (index + 1) / count)
}

const tier = detectTier()

export const useSceneStore = create<SceneState>((set, get) => ({
  loadPhase: 'loading',
  sceneReady: false,
  qualityTier: tier,
  nodeCount: NODE_LIMITS[tier].default,
  scrollZone: 'hero',
  heroExitProgress: 0,
  traceProgress: 0,
  traceStage: null,
  setTier: (t) => set({ qualityTier: t, nodeCount: clampNodes(get().nodeCount, t) }),
  setSceneReady: () => set({ sceneReady: true }),
  startIntro: () => set({ loadPhase: 'intro' }),
  finishIntro: () => set({ loadPhase: 'ready' }),
  setNodeCount: (n) => set({ nodeCount: clampNodes(n, get().qualityTier) }),
  setScrollZone: (zone) => {
    if (get().scrollZone === zone) return
    // Leaving for the sections keeps the last stage lit, so nothing snaps off
    // while the first section is still sliding up over the brain
    if (zone === 'hero') set({ scrollZone: zone, traceProgress: 0, traceStage: null })
    else set({ scrollZone: zone })
  },
  setHeroExitProgress: (p) => set({ heroExitProgress: p }),
  setTraceProgress: (p) => set({ traceProgress: p }),
  setTraceStage: (i) => {
    if (get().traceStage === i) return
    set({ traceStage: i })
  },
}))
