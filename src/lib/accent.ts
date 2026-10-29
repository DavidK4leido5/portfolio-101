import { Color } from 'three'

const CYCLE = 300
/**
 * Hue journey over one cycle. Starts on the cyan stop rather than the violet
 * one, so the page opens cool and drifts into warm instead of opening purple.
 * Same stops as authored, just rotated one place.
 */
const HUE_STOPS = [185, 270, 315, 230, 185]

function accentHue(t: number): number {
  const p = ((t % CYCLE) + CYCLE) % CYCLE / CYCLE * (HUE_STOPS.length - 1)
  const i = Math.min(Math.floor(p), HUE_STOPS.length - 2)
  const f = p - i
  const s = f * f * (3 - 2 * f)
  return HUE_STOPS[i] + (HUE_STOPS[i + 1] - HUE_STOPS[i]) * s
}

export function getAccent(t: number, out: Color): Color {
  return out.setHSL(accentHue(t) / 360, 0.82, 0.62)
}

const tmp = new Color()
export function accentHex(t: number): string {
  return '#' + getAccent(t, tmp).getHexString()
}
