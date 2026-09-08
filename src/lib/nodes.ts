import type { Tier } from './quality'

export interface NodeLimits {
  min: number
  max: number
  default: number
  pool: number
}

export const NODE_LIMITS: Record<Tier, NodeLimits> = {
  desktop: { min: 1200, default: 2200, max: 8000, pool: 8000 },
  tablet: { min: 800, default: 1400, max: 4500, pool: 4500 },
  // The hero mask reads the cloud through the letterforms, and at 900 the
  // mobile brain was too sparse to fill them. Points are cheap here — the
  // connection count is capped separately in QUALITY.
  mobile: { min: 600, default: 1200, max: 2500, pool: 2500 },
}

export function clampNodes(n: number, tier: Tier): number {
  const { min, max } = NODE_LIMITS[tier]
  return Math.round(Math.min(max, Math.max(min, n)))
}
