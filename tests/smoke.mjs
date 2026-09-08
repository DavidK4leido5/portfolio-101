import { loadChromium } from "./playwright-env.mjs";

const chromium = await loadChromium();

const URL = process.env.SMOKE_URL ?? "http://localhost:5173";
const SECTIONS = ["about", "projects", "experience", "skills", "contact"];
/** Must match src/content/requestTrace.ts */
const STAGES = ["Interface", "API", "Service", "Data", "Infrastructure"];
const STAGE_HOTSPOT = ["about", "projects", "experience", "skills", "contact"];
const CI = !!process.env.CI;
// Headless software GL on GitHub runners is much slower than local dev
const T = {
  ready: CI ? 120_000 : 60_000,
  settle: CI ? 60_000 : 30_000,
  beat: CI ? 120_000 : 60_000,
};

const errors = [];
const fail = (msg) => {
  errors.push(msg);
  console.error("FAIL:", msg);
};

const browser = await chromium.launch({
  args: CI ? ["--disable-dev-shm-usage"] : [],
});

function watch(page) {
  page.on("pageerror", (e) => fail(`pageerror: ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().includes("Failed to load resource"))
      fail(`console: ${m.text()}`);
  });
}

const readFraming = (page) =>
  page.evaluate(() => ({
    tier: window.__scene?.qualityTier ?? null,
    uiTier:
      document.querySelector(".ui")?.getAttribute("data-quality-tier") ?? null,
    camZ: window.__scene?.framing?.camZ ?? -1,
    clusterScale: window.__scene?.framing?.clusterScale ?? -1,
    fit:
      typeof window.__scene?.measureBrainFit === "function"
        ? window.__scene.measureBrainFit()
        : -1,
  }));

/**
 * The hero mark is a veil with the words cut out of it, so "did it work" means
 * the knockout glyphs exist, both lines were fitted to the same measure, and
 * the block sits inside the viewport rather than overhanging it.
 */
const readHeroMark = (page) =>
  page.evaluate(() => {
    const root = document.querySelector('[data-testid="hero-mark"]');
    const veil = document.querySelector(".hero-mark__veil");
    const knockout = [...document.querySelectorAll("#hero-knockout text")];
    const strokes = [...document.querySelectorAll(".hero-mark__stroke")];
    if (!root || !veil || strokes.length === 0) return { missing: true };

    const boxes = strokes.map((el) => el.getBBox());
    const widths = strokes.map((el) => el.getComputedTextLength());
    const rects = strokes.map((el) => el.getBoundingClientRect());
    return {
      opacity: Number(getComputedStyle(root).opacity),
      visibility: getComputedStyle(root).visibility,
      veilOpacity: Number(veil.style.opacity || "1"),
      veilMask: veil.getAttribute("mask"),
      knockoutWords: knockout.map((el) => el.textContent),
      strokeWords: strokes.map((el) => el.textContent),
      // Fitted, so every line lands on the same measure
      widths: widths.map((w) => Math.round(w)),
      sizes: strokes.map((el) =>
        Math.round(parseFloat(el.style.fontSize || "0")),
      ),
      inkTop: Math.round(Math.min(...rects.map((r) => r.top))),
      inkBottom: Math.round(Math.max(...rects.map((r) => r.bottom))),
      inkLeft: Math.round(Math.min(...rects.map((r) => r.left))),
      inkRight: Math.round(Math.max(...rects.map((r) => r.right))),
      hasStrokeNoFill: strokes.every(
        (el) => getComputedStyle(el).fill === "none",
      ),
      boxCount: boxes.length,
      vw: window.innerWidth,
      vh: window.innerHeight,
    };
  });

const traceOffset = (page, progress) =>
  page.evaluate((p) => {
    const track = document.querySelector('[data-testid="trace-track"]');
    const rect = track.getBoundingClientRect();
    const span = Math.max(1, rect.height - window.innerHeight);
    return rect.top + window.scrollY + span * p;
  }, progress);

/** Wait for a trace stage's callout to reach full opacity. */
const stageOpen = (page, index) =>
  page.waitForFunction(
    (i) => {
      const el = document.querySelector(`[data-trace-beat="${i}"]`);
      return !!el && Number(getComputedStyle(el).opacity) > 0.9;
    },
    index,
    { timeout: T.beat },
  );

async function backToHero(page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForSelector(
    '.ui[data-load-phase="ready"][data-scroll-zone="hero"]',
    {
      timeout: T.settle,
    },
  );
}

// ——— Desktop ———
const desktop = await browser.newPage({
  viewport: { width: 1440, height: 900 },
});
watch(desktop);
await desktop.goto(URL, { waitUntil: "domcontentloaded" });
await desktop.waitForSelector("canvas", { timeout: 15000 });

/*
 * The words must not be up while the cloud is still assembling — showing them
 * over a half-built brain gives away that the intro is still running. The
 * `intro` phase is the spawn timeline, and it is the whole of the assembly, so
 * the mark has to be absent for all of it and present once the phase is ready.
 */
await desktop
  .waitForSelector('.ui[data-load-phase="intro"]', { timeout: T.ready })
  .catch(() => {});
const duringAssembly = await desktop.evaluate(() => ({
  phase: document.querySelector(".ui")?.getAttribute("data-load-phase"),
  mark: document.querySelectorAll('[data-testid="hero-mark"]').length,
}));
if (duringAssembly.phase !== "intro") {
  fail(
    `hero mark: never caught the assembly phase (was ${duringAssembly.phase})`,
  );
} else if (duringAssembly.mark !== 0) {
  fail("hero mark: FULL / STACK is up while the cloud is still assembling");
} else console.log("ok: mark held back while the cloud assembles");

await desktop.waitForSelector('.ui[data-load-phase="ready"]', {
  timeout: T.ready,
});
if (!(await desktop.locator('[data-testid="hero-mark"]').count())) {
  fail("hero mark: never arrived once the assembly finished");
} else console.log("ok: mark animates in once the cloud has assembled");
await desktop.waitForSelector('.ui[data-scroll-zone="hero"]', {
  timeout: T.settle,
});
await desktop.waitForTimeout(900);

const glOk = await desktop.evaluate(() => {
  const c = document.querySelector("canvas");
  return !!c && c.width > 0 && c.height > 0;
});
if (!glOk) fail("desktop: canvas missing or zero-sized");
else console.log("ok: desktop tier renders");

const sceneOk = await desktop.evaluate(() => !!window.__scene?.uniforms);
if (!sceneOk)
  fail(
    "desktop: window.__scene missing — build with VITE_SMOKE=true for preview tests",
  );
else console.log("ok: __scene exposed for smoke assertions");

const framing = await readFraming(desktop);
if (framing.tier !== "desktop") fail(`desktop framing: tier=${framing.tier}`);
else if (framing.uiTier !== "desktop")
  fail(`desktop UI: data-quality-tier=${framing.uiTier}`);
else if (Math.abs(framing.camZ - 9.8) > 0.15)
  fail(`desktop framing: camZ=${framing.camZ}, expected ~9.8`);
else if (Math.abs(framing.clusterScale - 1.18) > 0.02)
  fail(`desktop framing: scale=${framing.clusterScale}`);
else console.log("ok: desktop camera framing unchanged");

const ambient = await desktop.evaluate(() => window.__scene?.ambient ?? null);
if (!ambient)
  fail("desktop: ambient state missing — build with VITE_SMOKE=true");
else if (ambient.count < 1) fail(`desktop ambient: count=${ambient.count}`);
else if (ambient.fade < 0.85)
  fail(`desktop ambient: fade=${ambient.fade}, expected visible when ready`);
else console.log(`ok: ambient particles active (count=${ambient.count})`);

const post = await desktop.evaluate(() => window.__scene?.post ?? null);
if (!post) fail("desktop: post stack config missing on __scene");
else if (!post.ca)
  fail("desktop: chromatic aberration disabled in quality tier");
else if (post.caOffset?.[0] !== 0.0006 || post.caOffset?.[1] !== 0.0009) {
  fail(`desktop: unexpected CA offset ${JSON.stringify(post.caOffset)}`);
} else console.log("ok: post chromatic aberration configured (0.0006, 0.0009)");

// —— The hero mask ——
const mark = await readHeroMark(desktop);
if (mark.missing) fail("desktop: hero mark missing");
else {
  if (mark.knockoutWords.join("") !== "FULLSTACK") {
    fail(
      `hero mark: knockout words were ${JSON.stringify(mark.knockoutWords)}, expected FULL + STACK`,
    );
  } else console.log("ok: FULL / STACK punched out of the veil in two lines");

  if (!mark.veilMask?.includes("hero-knockout")) {
    fail(
      "hero mark: veil is not masked by the glyphs, so nothing is cut out of it",
    );
  } else console.log("ok: veil carries the glyph mask");

  if (!mark.hasStrokeNoFill) {
    fail(
      "hero mark: outline copy should be stroke-only — a filled one hides the cloud it frames",
    );
  } else console.log("ok: letterforms are hairlined, not filled");

  // Advance widths snap to the pixel grid, so a fitted line can land one
  // staircase tread short of the measure. Overflow is the failure; a tread is not.
  const spread = Math.max(...mark.widths) - Math.min(...mark.widths);
  const measure = Math.max(...mark.widths);
  if (spread > measure * 0.015) {
    fail(
      `hero mark: lines not fitted to one measure, widths ${JSON.stringify(mark.widths)}`,
    );
  } else
    console.log(
      `ok: both lines fitted to the same measure (~${measure}px, ${spread}px apart)`,
    );

  if (mark.sizes[0] <= mark.sizes[1]) {
    fail(
      `hero mark: FULL should be set larger than STACK to fill the same measure, got ${JSON.stringify(mark.sizes)}`,
    );
  } else console.log(`ok: per-line sizes solved (${mark.sizes.join(" / ")}px)`);

  if (mark.inkLeft < 0 || mark.inkRight > mark.vw) {
    fail(
      `hero mark: block overhangs the viewport (${mark.inkLeft}..${mark.inkRight} of ${mark.vw})`,
    );
  } else if (mark.inkTop < 0 || mark.inkBottom > mark.vh) {
    fail(
      `hero mark: block clipped vertically (${mark.inkTop}..${mark.inkBottom} of ${mark.vh})`,
    );
  } else console.log("ok: block sits inside the viewport on both axes");
}

const brainTouchAt = async (x, y) => {
  await desktop.mouse.move(x, y);
  await desktop.waitForTimeout(700);
  return desktop.evaluate(() => ({
    strength: window.__scene?.touch?.strength ?? 0,
    gain: window.__scene?.touch?.gain ?? -1,
    pointerOnScene: window.__scene?.touch?.pointerOnScene ?? false,
  }));
};
const touchOff = await brainTouchAt(30, 40);
const touchOn = await brainTouchAt(720, 450);
if (touchOn.gain !== 0.68)
  fail(`desktop: fabric gain expected 0.68, got ${touchOn.gain}`);
else if (!touchOn.pointerOnScene)
  fail("desktop: pointerOnScene false over canvas center");
else if (touchOn.strength <= touchOff.strength + 0.12) {
  fail(
    `desktop: touch strength did not rise on brain off=${touchOff.strength} on=${touchOn.strength}`,
  );
} else
  console.log(
    `ok: brain touch raycast active (strength=${touchOn.strength.toFixed(2)})`,
  );

const sliderHit = () =>
  desktop.evaluate(() => {
    const s = document.querySelector('[data-testid="node-slider"]');
    if (!s) return "missing";
    const r = s.getBoundingClientRect();
    const el = document.elementFromPoint(
      r.left + r.width / 2,
      r.top + r.height / 2,
    );
    return el === s ? "ok" : `blocked by ${el?.className || el?.tagName}`;
  });
let hit = await sliderHit();
if (hit !== "ok") fail(`hero: slider not interactive (${hit})`);
else console.log("ok: density slider interactive on the hero");

/*
 * The exit is a zoom, not a fade: the knockout has to grow so the frame passes
 * through the letters, and the veil has to still be there while it does — a
 * veil that dissolves from the start turns the whole move into a crossfade.
 */
const ZOOM_AT = [0, 0.3, 0.6, 0.8, 1];
const zoomSamples = [];
for (const at of ZOOM_AT) {
  await desktop.evaluate(
    (f) => window.scrollTo(0, window.innerHeight * f * 0.98),
    at,
  );
  await desktop.waitForTimeout(1400);
  zoomSamples.push(
    await desktop.evaluate(() => {
      const g = document.querySelector("#hero-knockout g");
      const veil = document.querySelector(".hero-mark__veil");
      const m = g ? new DOMMatrixReadOnly(getComputedStyle(g).transform) : null;
      return {
        scale:
          m && m.a
            ? Number(m.a.toFixed(2))
            : Number(
                g?.getAttribute("transform")?.match(/scale\(([\d.]+)\)/)?.[1] ??
                  0,
              ),
        veil: Number(veil?.style.opacity ?? "1"),
      };
    }),
  );
}
const zoomAt = (f) => zoomSamples[ZOOM_AT.indexOf(f)];
const scales = zoomSamples.map((s) => s.scale);
if (!(scales[0] < 1.05))
  fail(`hero zoom: starts already scaled (${scales[0]})`);
else if (!(zoomAt(1).scale > scales[0] * 3)) {
  fail(
    `hero zoom: knockout barely grows across the exit (${scales.join(" -> ")})`,
  );
} else if (!scales.every((s, i) => i === 0 || s > scales[i - 1])) {
  fail(`hero zoom: not monotonic (${scales.join(" -> ")})`);
} else
  console.log(`ok: knockout zooms through the exit (${scales.join(" -> ")})`);

if (!(zoomAt(0.3).veil > 0.95)) {
  fail(
    `hero zoom: veil already dissolving at 30% — that is a crossfade, not a zoom (${zoomAt(0.3).veil})`,
  );
} else if (!(zoomAt(1).veil < 0.05)) {
  fail(`hero zoom: veil never opens (${zoomAt(1).veil})`);
} else console.log("ok: veil holds through the zoom, then opens");

/*
 * And the zoom has to finish before the veil goes, not stop short and hand over
 * to a fade. By four fifths of the exit the letterforms are long past the edges
 * of the frame — so the sheet is still fully up while the words are already
 * unrecognisable, and the reveal is the zoom's work rather than a dissolve.
 */
const late = zoomAt(0.8);
if (!(late.scale > 8)) {
  fail(
    `hero zoom: only ${late.scale}x at 80% of the exit — the words are still legible when the veil starts to go`,
  );
} else if (!(late.veil > 0.95)) {
  fail(`hero zoom: veil already going at 80% (${late.veil})`);
} else {
  console.log(
    `ok: zoom completes before the veil goes (${late.scale}x with the veil still at ${late.veil})`,
  );
}

/*
 * The hero's idle orbit and the trace's scrubbed waypoints are two different
 * camera owners, and the handover between them used to be a hard cut: the
 * orbit had wandered off the home framing and the trace put the camera back on
 * it in a single frame. The orbit now damps out over the exit, so walking
 * across the boundary must show no step change.
 */
await backToHero(desktop);
await desktop.waitForTimeout(1500);
const walk = [];
for (let i = 0; i <= 12; i++) {
  await desktop.evaluate(
    (f) => window.scrollTo(0, Math.round(window.innerHeight * f * 1.02)),
    i / 12,
  );
  await desktop.waitForTimeout(1100);
  walk.push(
    await desktop.evaluate(() => {
      const c = window.__scene?.camera.position;
      return {
        zone: document.querySelector(".ui")?.getAttribute("data-scroll-zone"),
        pos: c ? [c.x, c.y, c.z] : null,
      };
    }),
  );
}
let worstStep = 0;
for (let i = 1; i < walk.length; i++) {
  const a = walk[i - 1].pos;
  const b = walk[i].pos;
  if (!a || !b) continue;
  worstStep = Math.max(
    worstStep,
    Math.hypot(b[0] - a[0], b[1] - a[1], b[2] - a[2]),
  );
}
const crossed = new Set(walk.map((w) => w.zone));
if (!crossed.has("hero") || !crossed.has("trace")) {
  fail(
    `handover walk never crossed the boundary (zones: ${[...crossed].join(", ")})`,
  );
} else if (worstStep > 0.6) {
  fail(
    `camera snaps at the hero/trace handover (largest step ${worstStep.toFixed(2)} units)`,
  );
} else
  console.log(
    `ok: camera hands over to the trace without a step (max ${worstStep.toFixed(2)} units)`,
  );

await backToHero(desktop);
await desktop.waitForTimeout(900);

// —— The request trace ——
for (let i = 0; i < STAGES.length; i++) {
  const target = await traceOffset(desktop, (i + 1) / STAGES.length);
  await desktop.evaluate((y) => window.scrollTo(0, y), target);
  const opened = await stageOpen(desktop, i)
    .then(() => true)
    .catch(() => false);
  if (!opened) {
    const dump = await desktop.evaluate(
      (n) => ({
        zone: document.querySelector(".ui")?.getAttribute("data-scroll-zone"),
        opacity: getComputedStyle(
          document.querySelector(`[data-trace-beat="${n}"]`),
        ).opacity,
      }),
      i,
    );
    fail(
      `trace stage ${STAGES[i]}: callout never opened ${JSON.stringify(dump)}`,
    );
    continue;
  }

  // The stage's name is carried by the giant ghost word; the corner block
  // carries the sentence
  const stageText = await desktop.evaluate((n) => {
    const ghost = document.querySelector(`[data-trace-ghost="${n}"] b`);
    const block = document.querySelector(`[data-trace-beat="${n}"]`);
    return {
      ghost: ghost?.textContent?.trim() ?? "",
      ghostOpacity: ghost
        ? Number(getComputedStyle(ghost.parentElement).opacity)
        : 0,
      headline:
        block?.querySelector(".trace-beat__title")?.textContent?.trim() ?? "",
    };
  }, i);
  if (stageText.ghost !== STAGES[i]) {
    fail(
      `trace stage ${i}: ghost word was "${stageText.ghost}", expected "${STAGES[i]}"`,
    );
  } else if (!(stageText.ghostOpacity > 0.9)) {
    fail(
      `trace stage ${STAGES[i]}: ghost word never arrived (opacity ${stageText.ghostOpacity})`,
    );
  } else if (stageText.headline.length < 8) {
    fail(`trace stage ${STAGES[i]}: corner block has no headline`);
  }

  await desktop.waitForTimeout(1800);
  const fx = await desktop.evaluate(() => ({
    active: window.__scene?.uniforms.uActive.value ?? -2,
    focus: window.__scene?.uniforms.uFocus.value ?? -1,
    zone: document.querySelector(".ui")?.getAttribute("data-scroll-zone"),
    heroOpacity: Number(
      getComputedStyle(document.querySelector('[data-testid="hero-mark"]'))
        .opacity,
    ),
  }));
  const expected = SECTIONS.indexOf(STAGE_HOTSPOT[i]);
  if (fx.zone !== "trace")
    fail(`trace stage ${STAGES[i]}: zone=${fx.zone}, expected trace`);
  else if (fx.active !== expected)
    fail(
      `trace stage ${STAGES[i]}: uActive=${fx.active}, expected ${expected}`,
    );
  else if (!(fx.focus > 0.5))
    fail(`trace stage ${STAGES[i]}: uFocus=${fx.focus}, expected >0.5`);
  else if (fx.heroOpacity > 0.05) {
    fail(`trace stage ${STAGES[i]}: hero mark still up at ${fx.heroOpacity}`);
  } else console.log(`ok: ${STAGES[i]} lights its lobe and holds the frame`);
}

/*
 * The node field morphs between the baked clouds as the trace descends:
 * brain at the surface, network in the middle, the tiered stack at the floor.
 * `uShapeAlt` has to reach 1 while off the brain, or the connection mesh —
 * wired from brain-space neighbours — stays on and stretches across the new
 * shape as a web.
 */
const morphWalk = [];
for (const at of [0.05, 0.2, 0.4, 0.6, 0.8, 1]) {
  await desktop.evaluate(
    (y) => window.scrollTo(0, y),
    await traceOffset(desktop, at),
  );
  await desktop.waitForTimeout(1400);
  morphWalk.push(
    await desktop.evaluate(() => {
      const u = window.__scene?.uniforms;
      return {
        from: u?.uShapeFrom.value ?? -1,
        to: u?.uShapeTo.value ?? -1,
        morph: Number((u?.uShapeMorph.value ?? -1).toFixed(2)),
        alt: Number((u?.uShapeAlt.value ?? -1).toFixed(2)),
      };
    }),
  );
}
/** Shape actually on screen: `from` until the morph runs, `to` once it lands. */
const shown = morphWalk.map((s) => (s.morph >= 0.5 ? s.to : s.from));
if (shown[0] !== 0)
  fail(`trace should open on the brain, got shape ${shown[0]}`);
else if (!shown.includes(1))
  fail(`trace never reaches the network cloud (${shown.join(" -> ")})`);
else if (shown[shown.length - 1] !== 2) {
  fail(`trace should end on the stack cloud, got ${shown.join(" -> ")}`);
} else
  console.log(
    `ok: node field morphs brain -> network -> stack (${shown.join(" -> ")})`,
  );

const offBrain = morphWalk.filter((s, i) => shown[i] !== 0);
if (offBrain.some((s) => s.alt < 0.9)) {
  fail(
    `uShapeAlt too low off the brain, connection web will show: ${JSON.stringify(offBrain)}`,
  );
} else if (morphWalk[0].alt > 0.05) {
  fail(`uShapeAlt should be 0 on the brain, got ${morphWalk[0].alt}`);
} else
  console.log("ok: connection mesh gated off while the cloud is off the brain");

// The rail must be able to jump between stages
const railJump = await desktop.evaluate(async () => {
  const ticks = [...document.querySelectorAll(".trace-rail__tick")];
  if (ticks.length === 0) return { missing: true };
  const before = window.scrollY;
  ticks[0].click();
  await new Promise((r) => setTimeout(r, 2500));
  return {
    count: ticks.length,
    before: Math.round(before),
    after: Math.round(window.scrollY),
  };
});
if (railJump.missing) fail("trace rail missing");
else if (railJump.count !== STAGES.length)
  fail(`trace rail: ${railJump.count} ticks, expected ${STAGES.length}`);
else if (railJump.after >= railJump.before)
  fail(
    `trace rail: clicking stage 1 did not scroll back (${railJump.before} -> ${railJump.after})`,
  );
else console.log("ok: trace rail jumps between stages");

await backToHero(desktop);
await desktop.waitForTimeout(1200);
const home = await desktop.evaluate(() => ({
  focus: window.__scene?.uniforms.uFocus.value ?? -1,
  dim: window.__scene?.uniforms.uDim.value ?? -1,
  heroOpacity: Number(
    getComputedStyle(document.querySelector('[data-testid="hero-mark"]'))
      .opacity,
  ),
}));
if (!(home.focus < 0.05 && home.dim < 0.05)) {
  fail(
    `back on hero: lobe highlight not unwound (focus=${home.focus}, dim=${home.dim})`,
  );
} else console.log("ok: lobe highlight dissolves back on the hero");
if (!(home.heroOpacity > 0.9))
  fail(`back on hero: mark did not return (opacity=${home.heroOpacity})`);
else console.log("ok: hero mark returns at the top of the page");

// —— The section spine ——
const spine = await desktop.evaluate((ids) => {
  const out = { missing: [], titles: [], edges: [], nowrap: [] };
  for (const id of ids) {
    const el = document.getElementById(`section-${id}`);
    if (!el) {
      out.missing.push(id);
      continue;
    }
    const title = el.querySelector(".spine-title");
    const inner = el.querySelector(".spine-inner");
    const head = el.querySelector(".spine-head");
    const r = inner.getBoundingClientRect();
    out.edges.push({
      id,
      left: Math.round(r.left),
      right: Math.round(r.right),
    });
    out.titles.push({
      id,
      text: title?.textContent?.trim() ?? "",
      width: Math.round(title?.getBoundingClientRect().width ?? 0),
      measure: Math.round(head?.clientWidth ?? 0),
    });
    out.nowrap.push(getComputedStyle(title).whiteSpace);
  }
  out.scrollWidth = document.documentElement.scrollWidth;
  out.clientWidth = document.documentElement.clientWidth;
  return out;
}, SECTIONS);

if (spine.missing.length) fail(`sections missing: ${spine.missing.join(", ")}`);
else console.log(`ok: all ${SECTIONS.length} sections present`);

// A later rule setting margin:0 silently un-centres one container, and it only
// shows once the viewport is wide enough for the max-width to bind
const lefts = new Set(spine.edges.map((e) => e.left));
const rights = new Set(spine.edges.map((e) => e.right));
if (lefts.size !== 1 || rights.size !== 1) {
  fail(`section containers are not aligned: ${JSON.stringify(spine.edges)}`);
} else
  console.log(
    `ok: every section container shares the same edges (${[...lefts][0]}..${[...rights][0]})`,
  );

/*
 * Fitted means "fills the measure without overhanging it". Rendered advance
 * width is a staircase in font size, so a line can settle one tread short;
 * what must never happen is a title wider than its own column.
 */
const overhang = spine.titles.filter((t) => t.width > t.measure + 1);
const short = spine.titles.filter((t) => t.width < t.measure * 0.975);
if (overhang.length)
  fail(`section titles overhang their column: ${JSON.stringify(overhang)}`);
else if (short.length)
  fail(`section titles not filling the measure: ${JSON.stringify(short)}`);
else
  console.log(
    "ok: every section title fills its column measure without overhanging",
  );

if (spine.scrollWidth > spine.clientWidth) {
  fail(
    `page scrolls horizontally: scrollWidth=${spine.scrollWidth} clientWidth=${spine.clientWidth}`,
  );
} else console.log("ok: no horizontal overflow");

// Section nav has to actually land on its section
const navJump = await desktop.evaluate(async () => {
  const btn = document.querySelector(
    '.section-nav__item[data-section="skills"]',
  );
  if (!btn) return { missing: true };
  btn.click();
  await new Promise((r) => setTimeout(r, 2500));
  const target = document
    .getElementById("section-skills")
    .getBoundingClientRect();
  return { top: Math.round(target.top) };
});
if (navJump.missing) fail("section nav missing");
else if (Math.abs(navJump.top) > 200)
  fail(`section nav: skills landed at ${navJump.top}px, expected near 0`);
else console.log("ok: section nav jumps to its section");

/*
 * The giant titles have to animate in, not just appear. The line rides up from
 * under its own clip — and because it hides itself by translating out of that
 * clip, the reveal observer has to be on the mask: put it on the line and the
 * title can never see enough of itself to trigger, so it stays hidden forever.
 */
const titleReveal = await desktop.evaluate(async () => {
  document.getElementById("section-experience").scrollIntoView();
  await new Promise((r) => setTimeout(r, 2600));
  const mask = document.querySelector("#section-experience .spine-title__mask");
  const line = mask?.querySelector(".spine-title__line");
  if (!mask || !line) return { missing: true };
  return {
    observedOnMask: mask.hasAttribute("data-reveal"),
    isIn: mask.classList.contains("is-in"),
    settled: getComputedStyle(line).transform,
    animates:
      line.getAnimations().length > 0 ||
      getComputedStyle(line).transitionDuration !== "0s",
    onScreen: Math.round(line.getBoundingClientRect().top),
  };
});
if (titleReveal.missing) fail("section title mask missing");
else if (!titleReveal.observedOnMask) {
  fail(
    "section title reveal is observed on the line, which hides itself out of view",
  );
} else if (!titleReveal.isIn) fail("section title never revealed");
else if (!titleReveal.animates)
  fail("section title has no transition — it would just appear");
else if (
  titleReveal.settled !== "none" &&
  titleReveal.settled !== "matrix(1, 0, 0, 1, 0, 0)"
) {
  fail(`section title did not settle: ${titleReveal.settled}`);
} else console.log("ok: section titles ride up from under their mask");

const ghostLetters = await desktop.evaluate(() => {
  const chars = document.querySelectorAll(
    '[data-trace-ghost="0"] .trace-ghost__ch',
  );
  const first = chars[0];
  return {
    count: chars.length,
    staggered:
      chars.length > 1 &&
      getComputedStyle(chars[0]).transitionDelay !==
        getComputedStyle(chars[chars.length - 1]).transitionDelay,
    animates: first
      ? getComputedStyle(first).transitionDuration !== "0s"
      : false,
  };
});
if (ghostLetters.count < 4)
  fail(`ghost word not split per letter (${ghostLetters.count} spans)`);
else if (!ghostLetters.animates) fail("ghost letters have no transition");
else if (!ghostLetters.staggered)
  fail("ghost letters all share one delay — no stagger");
else
  console.log(
    `ok: ghost words climb in per letter (${ghostLetters.count} letters, staggered)`,
  );

const skillsUp = await desktop.locator('[data-testid="skills-radar"]').count();
if (!skillsUp) fail("skills radar missing from the skills section");
else console.log("ok: skills radar rendered in its section");

await desktop.close();

// ——— Mobile portrait ———
const portrait = await browser.newPage({
  viewport: { width: 390, height: 844 },
});
watch(portrait);
await portrait.goto(URL, { waitUntil: "domcontentloaded" });
await portrait.waitForSelector("canvas", { timeout: 15000 });
await portrait.waitForSelector('.ui[data-load-phase="ready"]', {
  timeout: T.ready,
});
await portrait.waitForSelector('.ui[data-scroll-zone="hero"]', {
  timeout: T.settle,
});
await portrait.waitForTimeout(1200);

const portraitFraming = await readFraming(portrait);
if (portraitFraming.tier !== "mobile")
  fail(`portrait framing: tier=${portraitFraming.tier}`);
else if (portraitFraming.camZ < 12)
  fail(`portrait framing: camZ=${portraitFraming.camZ}, expected >=12`);
else if (!(portraitFraming.fit > 0.04))
  fail(`portrait brain fit: margin=${portraitFraming.fit}`);
else
  console.log(
    `ok: mobile portrait brain fits (margin=${portraitFraming.fit.toFixed(3)})`,
  );

const portraitMark = await readHeroMark(portrait);
if (portraitMark.missing) fail("portrait: hero mark missing");
else if (portraitMark.inkLeft < 0 || portraitMark.inkRight > portraitMark.vw) {
  fail(
    `portrait hero mark overhangs: ${portraitMark.inkLeft}..${portraitMark.inkRight} of ${portraitMark.vw}`,
  );
} else if (
  portraitMark.inkTop < 0 ||
  portraitMark.inkBottom > portraitMark.vh
) {
  fail(
    `portrait hero mark clipped: ${portraitMark.inkTop}..${portraitMark.inkBottom} of ${portraitMark.vh}`,
  );
} else console.log("ok: portrait hero mark fits the frame");

// The nowrap callout used to blow the trace grid past the viewport on mobile
const portraitTrace = await traceOffset(portrait, 2 / STAGES.length);
await portrait.evaluate((y) => window.scrollTo(0, y), portraitTrace);
await stageOpen(portrait, 1).catch(() =>
  fail("portrait: trace stage 2 never opened"),
);
const portraitOverflow = await portrait.evaluate(() => {
  // Only the callouts actually on screen: the ones waiting their turn are
  // deliberately slid off to the side they will arrive from
  const beats = [...document.querySelectorAll("[data-trace-beat]")]
    .filter((el) => Number(getComputedStyle(el).opacity) > 0.05)
    .map((el) => {
      const r = el.getBoundingClientRect();
      return { left: Math.round(r.left), right: Math.round(r.right) };
    });
  return {
    beats,
    vw: window.innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  };
});
const spill = portraitOverflow.beats.filter(
  (b) => b.left < -1 || b.right > portraitOverflow.vw + 1,
);
if (spill.length)
  fail(`portrait trace callouts overflow: ${JSON.stringify(spill)}`);
else if (portraitOverflow.scrollWidth > portraitOverflow.clientWidth) {
  fail(
    `portrait scrolls horizontally: ${portraitOverflow.scrollWidth} > ${portraitOverflow.clientWidth}`,
  );
} else console.log("ok: portrait trace callouts stay in the frame");

await portrait.close();
await browser.close();

if (errors.length) {
  console.error(`\n${errors.length} failure(s)`);
  process.exit(1);
}
console.log("\nSMOKE PASS");
