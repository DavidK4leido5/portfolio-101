# 09. Sound: a generative sci-fi soundtrack with the Web Audio API

Everything is synthesised live from oscillators, noise and a generated reverb. That
costs zero bytes to download, needs no licences, and lets the music morph smoothly
between places on the page instead of crossfading between recordings.

Use recorded files only if the brief needs a specific recognisable sound (a voice, a
brand sting). Then ship short Opus/WebM files of a few KB each, fetch them after the
first paint, `decodeAudioData` once, and play them through the same graph below.

## Hard rules (each one was a bug somebody heard)

1. **No autoplay.** Browsers block audio until a click, tap or key press. Do not try
   to get around it. End the loading screen on a start button (07-cursor-and-chrome.md,
   "Start gate"), and start the intro from its click.
2. **Every gain starts at zero, at time zero.** A `GainNode` defaults to **1**. If a
   layer's first scheduled value comes later (`gain.setValueAtTime(0, t + 0.6)`), it
   plays at full volume until then. That was the "loud sound right after I click
   start". Always: `g.gain.value = 0; g.gain.setValueAtTime(0, t)` before any ramp.
3. **One-shots are skipped while the context is suspended or muted.** Anything
   scheduled on a suspended context waits and then plays all at once on resume. Guard
   every one-shot with `live()` (running and not muted). The drone is the only thing
   built before the context runs.
4. **Tie big hits to the picture, never to a guessed timeline.** The intro's landing
   predicted from the animation's timing numbers kept missing. Poll the actual visual
   state each frame (a uniform, a progress value) and fire when it crosses the moment
   that reads as "done".
5. **The background must be calm.** Sawtooth drones and a whoosh on every section
   change were "annoying". Use sines and one triangle, each voice swelling on its own
   slow cycle, a dark long reverb, slow glides, and occasional distant glass notes.
6. **One big moment, not two.** The intro landing is the boom. The later reveal (flying
   through the hero words) is a subtle chord swell, not a second impact.
7. **Suspend on `visibilitychange` when hidden**, resume when visible and not muted.
8. **Remember mute** in `localStorage` inside try/catch. Sound is on by default.

## The graph

```ts
const ctx = new AudioContext()
const comp = ctx.createDynamicsCompressor()        // -18dB, ratio 3, attack .02, release .5
const master = ctx.createGain()                     // the mute: ramp 0/1 with setTargetAtTime(.., .15)
comp.connect(master).connect(ctx.destination)
const reverb = ctx.createConvolver()
reverb.buffer = makeImpulse(5, 3)                   // 5s, dark (see below)
const wet = ctx.createGain(); wet.gain.value = 0.6
reverb.connect(wet).connect(comp)
const music = bus()      // the drone, starts silent, faded in by fadeInDrone()
const attackBus = bus()  // tension music, starts silent
const sfx = bus(0.9)     // one-shots
function bus(level = 0) { const g = ctx.createGain(); g.gain.value = level; g.connect(comp); g.connect(reverb); return g }
```

Create the context when the page loads and build the drone then; it stays suspended
and silent. `unlock()` (called on every pointerdown, keydown and touchend) resumes it.

Helpers:

```ts
// White noise, 2s, looped or offset-started for variety
function makeNoise(s: number) { const b = ctx.createBuffer(1, ctx.sampleRate * s, ctx.sampleRate)
  const d = b.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; return b }
// A dark reverb tail: one-pole lowpassed noise under a power decay
function makeImpulse(seconds: number, decay: number) {
  const len = Math.floor(ctx.sampleRate * seconds), b = ctx.createBuffer(2, len, ctx.sampleRate)
  for (let c = 0; c < 2; c++) { const d = b.getChannelData(c); let last = 0
    for (let i = 0; i < len; i++) { last = last * 0.6 + (Math.random() * 2 - 1) * 0.4; d[i] = last * (1 - i / len) ** decay } }
  return b
}
// Attack then exponential release, for one-shots. Starts at 0.0001, never 0 (exponential ramps)
function env(peak: number, at: number, attack: number, release: number) {
  const g = ctx.createGain()
  g.gain.setValueAtTime(0.0001, at)
  g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack)
  g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release)
  return g   // only safe if its sources start at `at`; before `at` it would be 1
}
// Glass: a sine plus quiet inharmonic partials, long in the reverb. The "mystery" note.
function glass(midi: number, peak: number, at: number, release: number, dest: AudioNode) {
  const out = env(peak, at, 0.015, release); out.connect(dest); out.connect(reverb)
  for (const [ratio, level] of [[1, 1], [2.76, 0.18], [5.4, 0.05]]) {
    const o = ctx.createOscillator(); o.frequency.value = hz(midi) * ratio
    const g = ctx.createGain(); g.gain.value = level
    o.connect(g).connect(out); o.start(at); o.stop(at + release + 0.2)
  }
}
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
```

## The drone: calm, far away, never quite still

- A lowpass at 580 to 780Hz (per mood), Q 0.3, with a 0.03Hz LFO of ±180Hz on it.
- Five voices: the root and four chord tones. Sines, with one triangle. Levels
  0.09, 0.05, 0.04, 0.03, 0.02. Each voice's gain swells ±40% on its own 0.02 to
  0.07Hz LFO, and each sits at a different pan (0, -0.55, 0.5, -0.3, 0.7).
- A sub sine an octave below the root at 0.07.
- Air: looped noise, lowpass 900Hz, gain 0.008 with a slow swell.
- A distant glass note from the chord every 7 to 15 seconds (never during an attack).
- Music bus level 0.42. It fades in over 6 seconds, starting after the intro's landing.

Moods: one per place (hero, each story stage, each section), each a root (MIDI),
four chord tones and a cutoff. Moving between them glides: `setTargetAtTime(target,
now, 3)` on every voice frequency and the cutoff. No whoosh on mood changes.

```ts
const MOODS = {
  hero: { root: 45, chord: [7, 12, 14, 19], cutoff: 680 },     // A
  about: { root: 48, chord: [7, 11, 14, 19], cutoff: 700 },    // C lydian-ish
  projects: { root: 53, chord: [7, 12, 16, 19], cutoff: 760 }, // F
  experience: { root: 50, chord: [7, 10, 15, 19], cutoff: 690 },
  skills: { root: 52, chord: [7, 12, 14, 21], cutoff: 780 },
  contact: { root: 55, chord: [7, 11, 16, 19], cutoff: 720 },
}
```

Pick the mood from the scroll: the hero zone, the current story stage, or the section
crossing the middle of the viewport (an IntersectionObserver with
`rootMargin: '-45% 0px -45% 0px'`).

## The intro: build, then land on the picture

- **Build** (starts with the intro): a looped noise rumble through a lowpass opening
  70 to 380Hz, gain 0 up to 0.06 by 0.8s, then 0.18 by 3.4s. A sub sine 30 to 48Hz
  through a soft clip, throbbed by a 1.4 to 7Hz amplitude LFO, gain up to 0.14 then
  0.3. A band-passed noise rush that only starts at 0.6s, peaking at 0.08. Pin every
  gain to 0 at t (rule 2). Hold at the top; do not land on a timer.
- **Land** when the particles actually close. Poll each frame during the intro:
  `if (uniforms.uSpawn.value >= 0.93) audio.land()`. Landing: fade the build out in
  60ms and stop its sources; a thud (sine 92 to 30Hz over 1.2s through a soft clip,
  peak 0.9, 1.8s release); a low sine chord (MIDI 33, 40, 45, 52) blooming over 4s
  in the reverb; then start the drone's fade-in 1.2s later.
- Fallback: land after 7s if the cue never comes. Skip all of it with reduced motion.

Loudness guide: the build should sit at about half the landing's level. Bright noise
reads as loud more than its gain suggests, so keep the rumble's lowpass low.

## Scrubbed by scroll: flying into the hero words

While the hero exit progress `p` runs 0 to 1, keep one warp voice alive and set its
parameters from `p` every change with `setTargetAtTime(value, now, 0.08)`:

- level `smooth(0.015, 0.2, p) * (1 - smooth(0.8, 0.92, p)) * 0.3`
- a looped noise through a band-pass, Q 6, frequency `180 * 2 ** (p * 4.2)`
- two detuned saws a fifth apart through a lowpass `220 + 2600 * p * p`, pitch
  climbing two octaves across `p`
- a sub two octaves down, climbing an octave
- the whole thing throbbed by an amplitude LFO speeding from 2 to 16Hz

Build it when `p` passes 0.015, release it (fade, then stop sources after 900ms) below
that or above 0.97. When `p` crosses the point where the veil opens (0.84), play the
**subtle** reveal once: a four-note sine chord through a lowpass sweeping 380 to
1400Hz and back to 600Hz, peak 0.045, 5s long, plus one glass note. Re-arm below
`p = 0.5`, so scrolling back and forward can play it again.

## Things arriving

Fire a window event from the reveal points (the reveal observer, story stage
changes, timeline handovers) with a kind, and answer it:

- `title` (a section heading rising in): a sine gliding up an octave, peak 0.18, a
  soft band-passed noise sweep, and a glass note.
- `stage` (a story stage, a timeline chapter): one glass note, peak 0.04, and a soft
  low sine.
- `item` (everything else): a very faint high glass note, peak 0.012, rate-limited to
  one per 90ms, so a list sparkles instead of clattering.

## Attack music and swarm effects

- **Attack on:** attack bus up to 0.8 (`setTargetAtTime(..., 0.25)`), drone ducked to
  35%. Start:
  - a bass ostinato: saw eighth notes at 148bpm, pattern `[0, 0, 12, 0, 1, 0, 12, 1]`
    semitones above the root minus an octave, each note through a lowpass closing
    800 to 160Hz
  - a kick on every beat (sine 130 to 38Hz)
  - two high sines a semitone apart with a 9Hz tremolo
  - a noise riser with a dissonant stab (root plus 0, 1 and 6 semitones)
- **Scheduling:** use a lookahead scheduler, `setInterval(schedule, 25)`, scheduling
  notes while `next < ctx.currentTime + 0.12`. Never `setTimeout` per note.
- **Attack off:** wait 4 seconds so a short raid still reads as a scene, then fade the
  bus out, restore the drone, clear the interval and stop the tremolo.
- **Bite:** 120ms of band-passed noise (random 900 to 2600Hz, Q 5) through a hard
  soft-clip, plus a square chirp falling from 500 to 800Hz down to 90Hz, at a random pan.
- **Retreat:** band-passed noise sinking 3000 to 250Hz.
- **Pointer pulse:** a quiet glass note from the chord, 0.025.
- **Click on the cloud:** an airy noise sweep 420 to 3200Hz over a low thump.

## Interface sounds

- Hover tick: sine 2300 to 2600Hz, 30ms, peak 0.02. Only for fine pointers, only when
  entering a new clickable element, rate-limited to 70ms.
- Click blip: two triangle blips, 880 then 1320Hz, 55ms apart, peak 0.04. Not for the
  mute toggle or the start gate.

## Testing sound you cannot hear

Headless tests have no speakers, so prove the engine runs and times correctly by
wrapping the constructor before the page loads:

```js
await page.addInitScript(() => {
  const Real = window.AudioContext
  window.__a = { osc: 0, noise: 0, times: [] }
  window.AudioContext = class extends Real {
    constructor(...a) { super(...a); window.__a.ctx = this }
    createOscillator() { window.__a.osc++; window.__a.times.push(performance.now()); return super.createOscillator() }
    createBufferSource() { window.__a.noise++; return super.createBufferSource() }
  }
  Object.defineProperty(Navigator.prototype, 'webdriver', { get: () => false })  // to see the gate
})
```

Check:
- no context runs before the gate click
- the context is `running` right after it
- the build appears at the click and the landing later
- scrolling through the hero exit builds the warp
- no errors
- mute survives a reload

Then ask the person to listen. You cannot judge loudness or mood from numbers, so
say so, and ask what is too loud, too quiet or annoying.
