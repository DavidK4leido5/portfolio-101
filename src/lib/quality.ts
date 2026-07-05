export type Tier = 'desktop' | 'tablet' | 'mobile'

export interface TierConfig {
  particles: number
  maxConnections: number
  neighbors: number
  maxDist: number
  rebuildMs: number
  dust: number
  dpr: number
  bloom: boolean
  bloomIntensity: number
  ca: boolean
  grain: boolean
  travelSec: number
}

export const QUALITY: Record<Tier, TierConfig> = {
  desktop: {
    particles: 4000, maxConnections: 5000, neighbors: 5, maxDist: 1.15, rebuildMs: 600,
    dust: 180, dpr: 2, bloom: true, bloomIntensity: 0.55, ca: true, grain: true, travelSec: 2.8,
  },
  tablet: {
    particles: 2200, maxConnections: 2600, neighbors: 4, maxDist: 1.25, rebuildMs: 800,
    dust: 100, dpr: 1.5, bloom: true, bloomIntensity: 0.45, ca: false, grain: false, travelSec: 2.4,
  },
  mobile: {
    particles: 1100, maxConnections: 1200, neighbors: 3, maxDist: 1.35, rebuildMs: 1000,
    dust: 0, dpr: 1, bloom: false, bloomIntensity: 0, ca: false, grain: false, travelSec: 2.0,
  },
}

export function detectTier(): Tier {
  if (matchMedia('(max-width: 768px)').matches) return 'mobile'
  if (matchMedia('(max-width: 1100px)').matches) return 'tablet'
  return 'desktop'
}
