/** Assert-based check for scroll opacity helpers (mirrors sceneStore). */

function labelOpacityFromScroll(s) {
  const cover = Math.min(1, Math.max(0, s.coverProgress))
  return Math.min(1, Math.max(0, 1 - cover))
}

function heroTextOpacityFromScroll(s) {
  const cover = Math.min(1, Math.max(0, s.coverProgress))
  const bridgeIn = Math.min(1, Math.max(0, s.bridgeInProgress))
  const approach = Math.min(1, Math.max(0, s.journeyApproachProgress))
  const base = cover < 1 ? 1 - cover : bridgeIn
  return Math.min(1, Math.max(0, base * (1 - approach)))
}

function journeyPanelOpacity(progress, sectionIndex, sectionCount) {
  if (sectionCount <= 0) return 0
  const t = Math.min(1, Math.max(0, progress)) * sectionCount
  const d = Math.abs(t - (sectionIndex + 1))
  if (d >= 1) return 0
  return 1 - d
}

function assert(cond, msg) {
  if (!cond) throw new Error(msg)
}

assert(labelOpacityFromScroll({ coverProgress: 0, bridgeInProgress: 0, journeyApproachProgress: 0 }) === 1, 'labels hero')
assert(labelOpacityFromScroll({ coverProgress: 1, bridgeInProgress: 1, journeyApproachProgress: 0 }) === 0, 'labels settle off')

assert(heroTextOpacityFromScroll({ coverProgress: 0, bridgeInProgress: 0, journeyApproachProgress: 0 }) === 1, 'text hero')
assert(Math.abs(heroTextOpacityFromScroll({ coverProgress: 0.5, bridgeInProgress: 0, journeyApproachProgress: 0 }) - 0.5) < 1e-9, 'text cover mid')
assert(heroTextOpacityFromScroll({ coverProgress: 1, bridgeInProgress: 0, journeyApproachProgress: 0 }) === 0, 'text cover done')
assert(Math.abs(heroTextOpacityFromScroll({ coverProgress: 1, bridgeInProgress: 0.5, journeyApproachProgress: 0 }) - 0.5) < 1e-9, 'text settle mid')
assert(heroTextOpacityFromScroll({ coverProgress: 1, bridgeInProgress: 1, journeyApproachProgress: 1 }) === 0, 'text journey off')

const n = 5
assert(journeyPanelOpacity(0, 0, n) === 0, 'journey start no panel')
assert(journeyPanelOpacity(1 / n, 0, n) === 1, 'projects peak')
assert(Math.abs(journeyPanelOpacity(1.5 / n, 0, n) - 0.5) < 1e-9, 'projects fade')
assert(Math.abs(journeyPanelOpacity(1.5 / n, 1, n) - 0.5) < 1e-9, 'experience rise')
assert(journeyPanelOpacity(1, 4, n) === 1, 'contact end peak')
assert(journeyPanelOpacity(1, 0, n) === 0, 'projects gone at end')

console.log('scroll-opacity-check: PASS')
