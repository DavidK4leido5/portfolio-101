import { useRef, useSyncExternalStore } from 'react'
import { audio } from './engine'

/**
 * 'on': sound is playing. 'waiting': sound is on, but the browser is holding
 * it until the first click, tap or key press. 'muted': the visitor turned it off.
 */
type Status = 'on' | 'waiting' | 'muted'

const status = (): Status => (audio.muted ? 'muted' : audio.running ? 'on' : 'waiting')

/**
 * The mute toggle, always on screen. Sound is on by default; this turns it
 * off and back on, and the choice is remembered.
 */
export function SoundToggle() {
  const state = useSyncExternalStore(
    (fn) => audio.subscribe(fn),
    status,
    () => 'waiting' as Status,
  )
  // The page-wide gesture listener resumes audio on this same press, before
  // the click lands. A press that was only waking the audio should not then
  // mute it, so remember whether sound was actually playing when it began.
  const wasPlaying = useRef(false)
  const remember = () => { wasPlaying.current = audio.playing }

  const onClick = () => {
    if (!audio.muted && !wasPlaying.current) {
      audio.unlock()
      return
    }
    const mute = !audio.muted
    audio.setMuted(mute)
    if (!mute) audio.click()
  }

  return (
    <button
      type="button"
      className="sound-toggle"
      data-state={state}
      data-sound-toggle
      aria-pressed={state !== 'muted'}
      aria-label={state === 'muted' ? 'Turn sound on' : 'Mute sound'}
      onPointerDown={remember}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') remember() }}
      onClick={onClick}
    >
      <span className="sound-toggle__bars" aria-hidden>
        <i />
        <i />
        <i />
        <i />
      </span>
      <span className="sound-toggle__label">{state === 'muted' ? 'Muted' : 'Sound on'}</span>
    </button>
  )
}
