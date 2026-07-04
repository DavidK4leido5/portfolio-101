import { create } from 'zustand'
import { detectTier, type Tier } from '../lib/quality'
import type { SectionId } from '../data/sections'

export type Phase = 'idle' | 'travel' | 'arrived'

interface SceneState {
  phase: Phase
  hoveredSection: SectionId | null
  activeSection: SectionId | null
  returning: boolean
  qualityTier: Tier
  setHovered: (id: SectionId | null) => void
  navigateTo: (id: SectionId) => void
  arrive: () => void
  returnHome: () => void
  settleHome: () => void
  setTier: (t: Tier) => void
}

export const useSceneStore = create<SceneState>((set) => ({
  phase: 'idle',
  hoveredSection: null,
  activeSection: null,
  returning: false,
  qualityTier: detectTier(),
  setHovered: (id) => set({ hoveredSection: id }),
  navigateTo: (id) => set({ activeSection: id, phase: 'travel', returning: false, hoveredSection: null }),
  arrive: () => set({ phase: 'arrived' }),
  returnHome: () => set({ phase: 'travel', returning: true }),
  settleHome: () => set({ phase: 'idle', activeSection: null, returning: false }),
  setTier: (t) => set({ qualityTier: t }),
}))
