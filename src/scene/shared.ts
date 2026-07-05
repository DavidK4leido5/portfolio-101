import { Color, Vector2, Vector3 } from 'three'
import { sections } from '../data/sections'

export const CAM_BASE = new Vector3(0, 0.5, 8.5)

export const clusterState = { rotation: 0 }

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
  uSize: { value: 1 },
  uConstel: { value: 0 },
  uSectionColors: { value: sections.map((s) => new Color(s.color)) },
}

export const dofState = { focus: 3, bokeh: 0 }

if (import.meta.env.DEV) {
  ;(window as unknown as Record<string, unknown>).__scene = { uniforms, dofState }
}

export function hotspotWorld(i: number, out: Vector3): Vector3 {
  const [x, y, z] = sections[i].position
  const a = clusterState.rotation
  return out.set(x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a))
}

export function rotateY(v: [number, number, number], out: Vector3): Vector3 {
  const a = clusterState.rotation
  return out.set(v[0] * Math.cos(a) + v[2] * Math.sin(a), v[1], -v[0] * Math.sin(a) + v[2] * Math.cos(a))
}
