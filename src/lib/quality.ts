export type Tier = 'desktop' | 'tablet' | 'mobile'

export interface TierConfig {
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
    maxConnections: 6000, neighbors: 5, maxDist: 0.36, rebuildMs: 650,
    dust: 80, dpr: 2, bloom: true, bloomIntensity: 0.42, ca: true, grain: true, travelSec: 2.8,
  },
  tablet: {
    maxConnections: 3200, neighbors: 4, maxDist: 0.4, rebuildMs: 800,
    dust: 50, dpr: 1.5, bloom: true, bloomIntensity: 0.32, ca: false, grain: false, travelSec: 2.4,
  },
  mobile: {
    maxConnections: 1600, neighbors: 3, maxDist: 0.44, rebuildMs: 950,
    dust: 0, dpr: 1, bloom: false, bloomIntensity: 0, ca: false, grain: false, travelSec: 2.0,
  },
}

export function detectTier(): Tier {
  if (matchMedia('(max-width: 768px)').matches) return 'mobile'
  if (matchMedia('(max-width: 1100px)').matches) return 'tablet'
  return 'desktop'
}
