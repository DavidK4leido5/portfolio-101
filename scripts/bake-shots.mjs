/**
 * Client-work screenshots → web-sized WebP.
 *
 * Raw 1080p screenshots decode to ~7 MB of pixels each. The cover marquee holds
 * ~160 <img> tags, so scrolling into it stalled the main thread on image decode
 * (117 ms long tasks) and the sticky 3D scene visibly stuttered. Capping the
 * long edge at MAX_W cuts decode cost about 3.5x and file size about 15x.
 *
 * Re-run after dropping new shots in: `pnpm bake:shots`
 */
import { readdirSync, readFileSync, writeFileSync, unlinkSync, statSync } from 'node:fs'
import { dirname, join, extname, basename } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..')
const DIR = join(ROOT, 'src', 'content', 'assets', 'client-work')

/** Cards render at 380 CSS px but `object-fit: cover` crops a 2:1 shot to 3:2, so
 *  the source needs ~1030 px to stay sharp at DPR 2. */
const MAX_W = 1024
const QUALITY = 0.82
const MIME = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' }

const targets = readdirSync(DIR).filter((f) => extname(f).toLowerCase() in MIME)
if (!targets.length) {
  console.log('bake:shots — nothing to convert')
  process.exit(0)
}

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('about:blank')

let before = 0
let after = 0

for (const file of targets) {
  const ext = extname(file).toLowerCase()
  const bytes = readFileSync(join(DIR, file))
  before += bytes.length

  const out = await page.evaluate(
    async ([dataUrl, maxW, quality]) => {
      const bmp = await createImageBitmap(await (await fetch(dataUrl)).blob())
      const scale = Math.min(1, maxW / bmp.width)
      const w = Math.round(bmp.width * scale)
      const h = Math.round(bmp.height * scale)
      const canvas = new OffscreenCanvas(w, h)
      const ctx = canvas.getContext('2d')
      ctx.drawImage(bmp, 0, 0, w, h)
      bmp.close()
      const blob = await canvas.convertToBlob({ type: 'image/webp', quality })
      const buf = new Uint8Array(await blob.arrayBuffer())
      let bin = ''
      for (const b of buf) bin += String.fromCharCode(b)
      return { b64: btoa(bin), w, h }
    },
    [`data:${MIME[ext]};base64,${bytes.toString('base64')}`, MAX_W, QUALITY],
  )

  const dest = join(DIR, `${basename(file, ext)}.webp`)
  writeFileSync(dest, Buffer.from(out.b64, 'base64'))
  unlinkSync(join(DIR, file))
  after += statSync(dest).size
  console.log(`${file} → ${basename(dest)}  ${out.w}x${out.h}`)
}

await browser.close()

const mb = (n) => `${(n / 1048576).toFixed(1)} MB`
console.log(`\n${targets.length} shots: ${mb(before)} → ${mb(after)}`)
