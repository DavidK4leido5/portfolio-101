/** Assert-based check for the trace beat window (mirrors sceneStore). */

const BEAT_HOLD = 0.4
const BEAT_FADE = 0.2

function beatOpacity(progress, index, count) {
  if (count <= 0) return 0
  const t = Math.min(1, Math.max(0, progress)) * count
  const d = Math.abs(t - (index + 1))
  if (d <= BEAT_HOLD) return 1
  if (d >= BEAT_HOLD + BEAT_FADE) return 0
  return (BEAT_HOLD + BEAT_FADE - d) / BEAT_FADE
}

function progressForBeat(index, count) {
  if (count <= 0) return 0
  return Math.min(1, (index + 1) / count)
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

const n = 5

assert(beatOpacity(0, 0, n) === 0, 'the trace opens on the brain, not on a stage')
assert(beatOpacity(1 / n, 0, n) === 1, 'stage 1 peak')
assert(beatOpacity(1.4 / n, 0, n) === 1, 'stage 1 still held at the edge of the hold')
assert(beatOpacity(1.6 / n, 0, n) === 0, 'stage 1 gone once the fade completes')
assert(Math.abs(beatOpacity(1.5 / n, 0, n) - 0.5) < 1e-9, 'stage 1 mid-handover')
assert(Math.abs(beatOpacity(1.5 / n, 1, n) - 0.5) < 1e-9, 'stage 2 mid-handover')
assert(beatOpacity(1, 4, n) === 1, 'the last stage peaks at the end of the track')
assert(beatOpacity(1, 0, n) === 0, 'stage 1 gone at the end')

// The rail scrolls to a stage's peak, so the two have to agree
for (let i = 0; i < n; i++) {
  assert(beatOpacity(progressForBeat(i, n), i, n) === 1, `stage ${i} is fully open at its own scroll target`)
}

/*
 * Only one stage can ever be the current one. 0.55 is the threshold the rail
 * and the HUD use; at the exact crossover both stages sit at 0.5, which is the
 * handover and is fine.
 */
for (let step = 0; step <= 200; step++) {
  const p = step / 200
  const open = Array.from({ length: n }, (_, i) => beatOpacity(p, i, n)).filter((o) => o > 0.55)
  assert(open.length <= 1, `two stages both current at progress ${p}`)
}

console.log('scroll-opacity-check: PASS')
