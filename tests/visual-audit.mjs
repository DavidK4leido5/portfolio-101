// Visual + technical audit pass: screenshots every zone on desktop and mobile,
// and dumps SEO / a11y / perf facts to tests/audit/report.json.
// Usage: node tests/visual-audit.mjs   (dev or preview server must be running)
import { mkdirSync, writeFileSync } from 'node:fs'
import { loadChromium } from './playwright-env.mjs'

const URL = process.env.SMOKE_URL ?? 'http://localhost:5173'
const OUT = 'tests/audit'
mkdirSync(OUT, { recursive: true })

const chromium = await loadChromium()
const browser = await chromium.launch()

const devices = {
  desktop: { viewport: { width: 1440, height: 900 } },
  mobile: {
    viewport: { width: 390, height: 844 },
    deviceScaleFactor: 2,
    isMobile: true,
    hasTouch: true,
  },
}

const report = {}

for (const [name, opts] of Object.entries(devices)) {
  const ctx = await browser.newContext(opts)
  const page = await ctx.newPage()
  const errors = []
  const failed = []
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') errors.push(`${m.type()}: ${m.text()}`) })
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`))
  page.on('requestfailed', (r) => failed.push(`${r.url()} ${r.failure()?.errorText}`))

  await page.addInitScript(() => {
    window.__vitals = { lcp: 0, lcpEl: '', cls: 0, longTasks: 0, longTaskMs: 0 }
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        window.__vitals.lcp = e.startTime
        window.__vitals.lcpEl = e.element ? e.element.tagName + '.' + e.element.className : ''
      }
    }).observe({ type: 'largest-contentful-paint', buffered: true })
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) if (!e.hadRecentInput) window.__vitals.cls += e.value
    }).observe({ type: 'layout-shift', buffered: true })
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) { window.__vitals.longTasks++; window.__vitals.longTaskMs += e.duration }
    }).observe({ type: 'longtask', buffered: true })
  })

  const t0 = Date.now()
  await page.goto(URL, { waitUntil: 'load' })
  const loadMs = Date.now() - t0
  await page.waitForSelector('.ui[data-load-phase="ready"]', { timeout: 120000 })
  const readyMs = Date.now() - t0
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/${name}-00-hero.png` })

  // Trace: step through it a viewport at a time
  const traceBox = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="trace-track"]')
    const r = el.getBoundingClientRect()
    return { top: r.top + scrollY, height: r.height }
  })
  const steps = Math.max(1, Math.round(traceBox.height / (opts.viewport.height * 1.2)))
  for (let i = 0; i <= steps; i++) {
    const y = traceBox.top + (traceBox.height - opts.viewport.height) * (i / steps)
    await page.evaluate((y) => scrollTo(0, y), y)
    await page.waitForTimeout(900)
    await page.screenshot({ path: `${OUT}/${name}-1${i}-trace.png` })
  }

  // Sections: walk the whole spine a viewport at a time, full frame each
  const spine = await page.evaluate(() => {
    const el = document.querySelector('[data-testid="sections-spine"]')
    const r = el.getBoundingClientRect()
    return { top: r.top + scrollY, bottom: document.documentElement.scrollHeight }
  })
  let n = 0
  for (let y = spine.top; y < spine.bottom; y += opts.viewport.height * 0.9) {
    await page.evaluate((y) => scrollTo(0, y), y)
    await page.waitForTimeout(700)
    await page.screenshot({ path: `${OUT}/${name}-2${String(n++).padStart(2, '0')}-spine.png` })
  }

  const facts = await page.evaluate(() => {
    const vw = innerWidth
    const overflow = [...document.querySelectorAll('body *')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        const cs = getComputedStyle(el)
        return r.width > 0 && (r.right > vw + 1 || r.left < -1) && cs.position !== 'fixed' && !el.closest('[class*="marquee"], [class*="strip"], .project-journey')
      })
      .slice(0, 15)
      .map((el) => `${el.tagName}.${el.className} right=${Math.round(el.getBoundingClientRect().right)}`)
    const small = [...document.querySelectorAll('a, button, input, [role="button"]')]
      .filter((el) => {
        const r = el.getBoundingClientRect()
        return r.width > 0 && (r.width < 44 || r.height < 44)
      })
      .map((el) => `${el.tagName}.${el.className} "${(el.textContent || el.getAttribute('aria-label') || '').trim().slice(0, 30)}" ${Math.round(el.getBoundingClientRect().width)}x${Math.round(el.getBoundingClientRect().height)}`)
    const imgs = [...document.images].map((i) => ({
      src: i.currentSrc.split('/').pop(),
      alt: i.getAttribute('alt'),
      loading: i.loading,
      decoding: i.decoding,
      hasDims: i.hasAttribute('width') && i.hasAttribute('height'),
      natural: `${i.naturalWidth}x${i.naturalHeight}`,
      rendered: `${Math.round(i.getBoundingClientRect().width)}x${Math.round(i.getBoundingClientRect().height)}`,
    }))
    const headings = [...document.querySelectorAll('h1,h2,h3,h4,h5,h6')].map(
      (h) => `${h.tagName} ${h.textContent.trim().slice(0, 60)}`,
    )
    const unnamed = [...document.querySelectorAll('a, button')]
      .filter((el) => !(el.textContent.trim() || el.getAttribute('aria-label') || el.getAttribute('title')))
      .map((el) => el.outerHTML.slice(0, 120))
    const links = [...document.querySelectorAll('a[href]')].map((a) => ({
      href: a.getAttribute('href'), text: a.textContent.trim().slice(0, 40), target: a.target, rel: a.rel,
    }))
    const res = performance.getEntriesByType('resource').map((r) => ({
      name: r.name.split('?')[0].split('/').slice(-2).join('/'), type: r.initiatorType, kb: Math.round(r.transferSize / 1024), decodedKb: Math.round(r.decodedBodySize / 1024), ms: Math.round(r.duration),
    }))
    const nav = performance.getEntriesByType('navigation')[0]
    const fcp = performance.getEntriesByName('first-contentful-paint')[0]?.startTime
    return {
      title: document.title,
      metaDesc: document.querySelector('meta[name="description"]')?.content,
      lang: document.documentElement.lang,
      h1Count: document.querySelectorAll('h1').length,
      headings,
      landmarks: [...document.querySelectorAll('main, nav, header, footer, [role="main"]')].map((e) => e.tagName + (e.getAttribute('aria-label') ? `[${e.getAttribute('aria-label')}]` : '')),
      overflow,
      docScrollWidth: document.documentElement.scrollWidth,
      vw,
      small,
      imgs,
      unnamed,
      links,
      domNodes: document.querySelectorAll('*').length,
      vitals: window.__vitals,
      fcp,
      domContentLoaded: nav?.domContentLoadedEventEnd,
      resTop: res.sort((a, b) => b.decodedKb - a.decodedKb).slice(0, 15),
      resCount: res.length,
      heap: performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null,
    }
  })

  report[name] = { loadMs, readyMs, errors, failed, ...facts }
  await ctx.close()
}

// Reduced-motion + no-JS visibility (what crawlers without JS see)
{
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, javaScriptEnabled: false })
  const page = await ctx.newPage()
  await page.goto(URL, { waitUntil: 'load' })
  report.noJs = { bodyText: (await page.evaluate(() => document.body.innerText)).slice(0, 300) }
  await ctx.close()
}

writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2))
await browser.close()
console.log('audit written to', OUT)
