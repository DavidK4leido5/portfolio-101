import { Vector3 } from 'three'
import type { Tier } from './quality'

export interface SceneFraming {
  cam: Vector3
  clusterScale: number
  fov: number
}

const DESKTOP: SceneFraming = {
  cam: new Vector3(0, 0.5, 9.8),
  clusterScale: 1.18,
  fov: 49,
}

// Mobile landscape: slight pull-back vs desktop
const MOBILE_LANDSCAPE: SceneFraming = {
  cam: new Vector3(0, 0.42, 12.6),
  clusterScale: 1.04,
  fov: 54,
}

// Mobile portrait: narrower horizontal FOV — pull back further + smaller brain
const MOBILE_PORTRAIT: SceneFraming = {
  cam: new Vector3(0, 0.38, 17.2),
  clusterScale: 0.88,
  fov: 58,
}

function mobileAspect(): number {
  if (typeof window === 'undefined') return 1
  return window.innerWidth / window.innerHeight
}

export function sceneFraming(tier: Tier): SceneFraming {
  if (tier === 'mobile') {
    return mobileAspect() < 0.85 ? MOBILE_PORTRAIT : MOBILE_LANDSCAPE
  }
  return DESKTOP
}

/** Min NDC inset from screen edge for brain AABB corners (positive = fully visible with padding). */
export function measureBrainFit(camera: { projectionMatrix: { elements: number[] }; matrixWorldInverse: { elements: number[] } }, clusterScale: number): number {
  const v = new Vector3()
  let minMargin = 1
  const rx = 3.15 * clusterScale
  const ry = 2.45 * clusterScale
  const rz = 3.15 * clusterScale
  for (const x of [-1, 1] as const) {
    for (const y of [-1, 1] as const) {
      for (const z of [-1, 1] as const) {
        v.set(x * rx, y * ry, z * rz)
        v.project(camera as import('three').Camera)
        if (v.z > 1) continue
        const margin = 1 - Math.max(Math.abs(v.x), Math.abs(v.y))
        minMargin = Math.min(minMargin, margin)
      }
    }
  }
  return minMargin
}
