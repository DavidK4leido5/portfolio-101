import { Color, Vector2, Vector3, type Group } from 'three'
import { sections } from '../data/sections'
import { brainSurface } from '../data/brainCloud'

// Random brain-surface points used as ambient activity wave sources (new set each load)
function pickAmbientOrigins(count: number): Vector3[] {
  const n = brainSurface.length / 3
  return Array.from({ length: count }, () => {
    const i = (Math.random() * n) | 0
    return new Vector3(brainSurface[i * 3], brainSurface[i * 3 + 1], brainSurface[i * 3 + 2])
  })
}

export const CAM_BASE = new Vector3(0, 0.5, 9.8)
export const CLUSTER_SCALE = 1.18

export const clusterState: { rotation: number; group: Group | null } = { rotation: 0, group: null }

export const mouse = { x: 0, y: 0 }

export const indicatorEls: (HTMLButtonElement | null)[] = sections.map(() => null)

export const uniforms = {
  uTime: { value: 0 },
  uAccent: { value: new Color('#8b5cf6') },
  uMouse: { value: new Vector2() },
  uDim: { value: 0 },
  uTravel: { value: 0 },
  uHovered: { value: -1 },
  uActive: { value: -1 },
  uSize: { value: 1.15 },
  uFocus: { value: 0 },
  uNodeCount: { value: 2200 },
  uSpawn: { value: 0 },
  // 0 keeps every node hidden during the loading phase; intro/ready paths raise it
  uSliderSpawn: { value: 0 },
  uRevealFrom: { value: 0 },
  uIntroPulse: { value: 0 },
  uConnect: { value: 0 },
  uSectionColors: { value: sections.map((s) => new Color(s.color)) },
  uHotspots: { value: sections.map((s) => new Vector3(...s.position)) },
  // Hover shockwave: section index + 0..1 progress of the expanding wave
  uWaveSection: { value: -1 },
  uWaveT: { value: 1 },
  uAmbientOrigins: { value: pickAmbientOrigins(8) },
}

export function hotspotWorld(i: number, out: Vector3): Vector3 {
  const [x, y, z] = sections[i].position
  if (clusterState.group) return clusterState.group.localToWorld(out.set(x, y, z))
  const a = clusterState.rotation
  return out.set(x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a))
}

export function rotateY(v: [number, number, number], out: Vector3): Vector3 {
  const a = clusterState.rotation
  return out.set(v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a))
}
