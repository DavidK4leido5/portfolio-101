import { create } from 'zustand'
import { detectTier, type Tier } from '../lib/quality'
import { clampNodes, NODE_LIMITS } from '../lib/nodes'
import type { SectionId } from '../data/sections'

export type Phase = 'idle' | 'travel' | 'arrived'
export type LoadPhase = 'loading' | 'intro' | 'ready'
/** settle = 1vh home reset after cover, before sector journey */
export type ScrollZone = 'hero' | 'cover' | 'settle' | 'journey' | 'end'

interface SceneState {
  phase: Phase
  loadPhase: LoadPhase
  sceneReady: boolean
  hoveredSection: SectionId | null
  activeSection: SectionId | null
  returning: boolean
  qualityTier: Tier
  nodeCount: number
  scrollZone: ScrollZone
  journeySection: SectionId | null
  journeyProgress: number
  /** 0–1 as cover rises over the sticky brain (labels fade out) */
  coverProgress: number
  /** 0–1 as settle bridge rises into view (labels fade in) */
  bridgeInProgress: number
  /** 0–1 as journey section rises into view (labels fade out again) */
  journeyApproachProgress: number
  /** 0–1 through the post-cover home settle viewport */
  settleProgress: number
  setHovered: (id: SectionId | null) => void
  navigateTo: (id: SectionId) => void
  arrive: () => void
  returnHome: () => void
  settleHome: () => void
  setTier: (t: Tier) => void
  setSceneReady: () => void
  startIntro: () => void
  finishIntro: () => void
  setNodeCount: (n: number) => void
  setScrollZone: (zone: ScrollZone) => void
  setJourneySection: (id: SectionId | null) => void
  setJourneyProgress: (p: number) => void
  setCoverProgress: (p: number) => void
  setBridgeInProgress: (p: number) => void
  setJourneyApproachProgress: (p: number) => void
  setSettleProgress: (p: number) => void
}

/** Scrubbed label/hero visibility 0–1 from scroll progress fields */
export function labelOpacityFromScroll(s: {
  coverProgress: number
  bridgeInProgress: number
  journeyApproachProgress: number
}): number {
  const cover = Math.min(1, Math.max(0, s.coverProgress))
  const bridgeIn = Math.min(1, Math.max(0, s.bridgeInProgress))
  const approach = Math.min(1, Math.max(0, s.journeyApproachProgress))
  // Hero→cover: 1→0. After cover (cover=1): bridgeIn 0→1. Journey approaches: →0.
  const base = cover < 1 ? 1 - cover : bridgeIn
  return Math.min(1, Math.max(0, base * (1 - approach)))
}

/**
 * Triangular window for section i in journey waypoint space.
 * progress 0→1 maps to t = progress * n (0=home, 1..=sectors).
 * Section i peaks at t = i + 1; crossfades ±1 with neighbors.
 */
export function journeyPanelOpacity(
  progress: number,
  sectionIndex: number,
  sectionCount: number,
): number {
  if (sectionCount <= 0) return 0
  const t = Math.min(1, Math.max(0, progress)) * sectionCount
  const d = Math.abs(t - (sectionIndex + 1))
  if (d >= 1) return 0
  return 1 - d
}

const tier = detectTier()

export const useSceneStore = create<SceneState>((set, get) => ({
  phase: 'idle',
  loadPhase: 'loading',
  sceneReady: false,
  hoveredSection: null,
  activeSection: null,
  returning: false,
  qualityTier: tier,
  nodeCount: NODE_LIMITS[tier].default,
  scrollZone: 'hero',
  journeySection: null,
  journeyProgress: 0,
  coverProgress: 0,
  bridgeInProgress: 0,
  journeyApproachProgress: 0,
  settleProgress: 0,
  setHovered: (id) => set({ hoveredSection: id }),
  navigateTo: (id) => {
    const zone = get().scrollZone
    if (zone !== 'hero' && zone !== 'settle') return
    set({ activeSection: id, phase: 'travel', returning: false, hoveredSection: null })
  },
  arrive: () => set({ phase: 'arrived' }),
  returnHome: () => set({ phase: 'travel', returning: true, hoveredSection: null }),
  settleHome: () => set({ phase: 'idle', activeSection: null, returning: false }),
  setTier: (t) => {
    const nodeCount = clampNodes(get().nodeCount, t)
    set({ qualityTier: t, nodeCount })
  },
  setSceneReady: () => set({ sceneReady: true }),
  startIntro: () => set({ loadPhase: 'intro' }),
  finishIntro: () => set({ loadPhase: 'ready' }),
  setNodeCount: (n) => set({ nodeCount: clampNodes(n, get().qualityTier) }),
  setScrollZone: (zone) => {
    const prev = get().scrollZone
    if (prev === zone) return
    if (prev === 'hero' && zone !== 'hero') {
      const { phase, returnHome, settleHome } = get()
      if (phase === 'arrived' || phase === 'travel') returnHome()
      else if (phase === 'idle' && get().activeSection) settleHome()
    }
    if (zone === 'journey') {
      set({ scrollZone: zone })
      return
    }
    // Keep end progress so last panel doesn't snap off; clear elsewhere
    if (zone === 'end') {
      set({ scrollZone: zone })
      return
    }
    set({ scrollZone: zone, journeySection: null, journeyProgress: 0 })
  },
  setJourneySection: (id) => {
    if (get().scrollZone !== 'journey' && id !== null) return
    if (get().journeySection === id) return
    set({ journeySection: id })
  },
  setJourneyProgress: (p) => set({ journeyProgress: p }),
  setCoverProgress: (p) => set({ coverProgress: p }),
  setBridgeInProgress: (p) => set({ bridgeInProgress: p }),
  setJourneyApproachProgress: (p) => set({ journeyApproachProgress: p }),
  setSettleProgress: (p) => set({ settleProgress: p }),
}))
