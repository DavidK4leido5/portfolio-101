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
    particles: 10000, maxConnections: 12000, neighbors: 6, maxDist: 0.36, rebuildMs: 550,
    dust: 100, dpr: 2, bloom: true, bloomIntensity: 0.42, ca: true, grain: true, travelSec: 2.8,
  },
  tablet: {
    particles: 5200, maxConnections: 6200, neighbors: 5, maxDist: 0.4, rebuildMs: 750,
    dust: 60, dpr: 1.5, bloom: true, bloomIntensity: 0.32, ca: false, grain: false, travelSec: 2.4,
  },
  mobile: {
    particles: 2600, maxConnections: 3000, neighbors: 4, maxDist: 0.44, rebuildMs: 950,
    dust: 0, dpr: 1, bloom: false, bloomIntensity: 0, ca: false, grain: false, travelSec: 2.0,
  },
}

export function detectTier(): Tier {
  if (matchMedia('(max-width: 768px)').matches) return 'mobile'
  if (matchMedia('(max-width: 1100px)').matches) return 'tablet'
  return 'desktop'
}
