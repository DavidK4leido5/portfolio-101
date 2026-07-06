import { create } from 'zustand'
import { detectTier, type Tier } from '../lib/quality'
import { clampNodes, NODE_LIMITS } from '../lib/nodes'
import type { SectionId } from '../data/sections'

export type Phase = 'idle' | 'travel' | 'arrived'
export type LoadPhase = 'loading' | 'intro' | 'ready'

interface SceneState {
  phase: Phase
  loadPhase: LoadPhase
  sceneReady: boolean
  hoveredSection: SectionId | null
  activeSection: SectionId | null
  returning: boolean
  qualityTier: Tier
  nodeCount: number
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
  setHovered: (id) => set({ hoveredSection: id }),
  navigateTo: (id) => set({ activeSection: id, phase: 'travel', returning: false, hoveredSection: null }),
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
}))
