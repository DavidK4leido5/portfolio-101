import { useEffect, useState } from 'react'

/**
 * A screenshot softened for use inside letterforms: shrunk to a thumbnail,
 * blurred, toned into a fixed brightness band, tinted toward an accent, and
 * handed back as a blob URL to stretch over the word.
 *
 * Filled straight into type, a screenshot's own copy reads through the glyphs
 * and the word turns to noise. Shrinking it to 160px and letting the browser
 * scale it back up blurs it on every engine; the canvas filter only deepens
 * that where it is supported.
 *
 * The tone pass is what keeps every word legible. A flat darkening made light
 * dashboards a dead grey and sank a dark site's name into the page, so each
 * image's own brightness range is stretched into LOW..HIGH instead: dark shots
 * get lifted, light ones pulled down, and the structure of the screenshot
 * survives as soft light and shade inside the letters.
 */
const WIDTH = 160
/** Brightness band the fill is toned into, 0-1. Kept under the cream type. */
const LOW = 0.3
const HIGH = 0.74
/** How far each pixel's colour is pulled toward the accent. */
const TINT = 0.42

const cache = new Map<string, Promise<string>>()

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.replace('#', ''), 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

const lum = (r: number, g: number, b: number) => (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255

function soften(src: string, accent: string): Promise<string> {
  const key = `${src}|${accent}`
  let job = cache.get(key)
  if (!job) {
    job = (async () => {
      const img = new Image()
      img.src = src
      await img.decode()
      const c = document.createElement('canvas')
      c.width = WIDTH
      c.height = Math.max(1, Math.round((WIDTH * img.naturalHeight) / img.naturalWidth))
      const g = c.getContext('2d', { willReadFrequently: true })!
      // Ignored where unsupported; the downscale alone still does the blur
      g.filter = 'blur(2px)'
      g.drawImage(img, 0, 0, c.width, c.height)
      g.filter = 'none'

      const data = g.getImageData(0, 0, c.width, c.height)
      const px = data.data
      let min = 1
      let max = 0
      for (let i = 0; i < px.length; i += 4) {
        const l = lum(px[i], px[i + 1], px[i + 2])
        if (l < min) min = l
        if (l > max) max = l
      }
      const span = Math.max(0.05, max - min)
      const [ar, ag, ab] = hexToRgb(accent)
      const aLum = Math.max(0.05, lum(ar, ag, ab))
      for (let i = 0; i < px.length; i += 4) {
        const r = px[i], gr = px[i + 1], b = px[i + 2]
        const l = Math.max(0.01, lum(r, gr, b))
        const t = LOW + (HIGH - LOW) * ((l - min) / span)
        // The pixel re-lit to its target brightness, and the accent at the same
        // brightness, mixed; both sides land on `t`, so the mix does too
        const k = t / l
        const ka = t / aLum
        px[i] = Math.min(255, r * k * (1 - TINT) + ar * ka * TINT)
        px[i + 1] = Math.min(255, gr * k * (1 - TINT) + ag * ka * TINT)
        px[i + 2] = Math.min(255, b * k * (1 - TINT) + ab * ka * TINT)
      }
      g.putImageData(data, 0, 0)

      const blob = await new Promise<Blob | null>((done) => c.toBlob(done, 'image/webp', 0.85))
      if (!blob) throw new Error('soften: canvas export failed')
      return URL.createObjectURL(blob)
    })()
    cache.set(key, job)
    // A failed decode must not poison the cache for the rest of the session
    job.catch(() => cache.delete(key))
  }
  return job
}

/** The softened URL for `src`, or undefined until it is ready (and on the server). */
export function useSoftFill(src: string | undefined, accent = '#8b5cf6'): string | undefined {
  const [url, setUrl] = useState<string>()
  useEffect(() => {
    if (!src) return
    let live = true
    soften(src, accent).then((u) => { if (live) setUrl(u) }, () => {})
    return () => { live = false }
  }, [src, accent])
  return url
}
