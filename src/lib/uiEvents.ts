/**
 * Window event for something arriving on screen, so the soundtrack can
 * answer it. `detail.kind` says how big a moment it is.
 */
export const UI_REVEAL = 'ui:reveal'

export type RevealKind = 'title' | 'stage' | 'item'

export function announceReveal(kind: RevealKind) {
  dispatchEvent(new CustomEvent(UI_REVEAL, { detail: { kind } }))
}
