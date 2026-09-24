/**
 * The soundtrack, synthesised live with the Web Audio API.
 *
 * Nothing is downloaded: every sound is built from oscillators, noise and a
 * generated reverb, so it costs no bytes and the music can morph between
 * places on the page instead of crossfading between recordings.
 *
 * Sound is on by default. The context is created as the page loads and
 * plays straight away where the browser allows it; where it does not (most
 * browsers, until the visitor has clicked, tapped or pressed a key) it waits
 * suspended and `unlock()` resumes it on the first gesture. One-shots are
 * skipped while it is suspended, or they would all fire at once on resume.
 *
 * Signal flow: music, attack and effects buses into a compressor, with a
 * shared reverb send, then a master gain the mute toggle ramps.
 */

type Mood = {
  /** MIDI note of the root */
  root: number
  /** Four chord tones in semitones above the root */
  chord: [number, number, number, number]
  /** Lowpass on the pad, Hz: lower is darker and further away */
  cutoff: number
}

/** One mood per place on the page. Keys come from Soundscape. */
const MOODS: Record<string, Mood> = {
  hero: { root: 45, chord: [7, 12, 14, 19], cutoff: 680 },
  'trace-0': { root: 50, chord: [7, 12, 16, 19], cutoff: 760 },
  'trace-1': { root: 52, chord: [7, 10, 14, 19], cutoff: 720 },
  'trace-2': { root: 47, chord: [7, 12, 15, 19], cutoff: 700 },
  'trace-3': { root: 43, chord: [7, 11, 14, 19], cutoff: 640 },
  'trace-4': { root: 41, chord: [7, 12, 14, 19], cutoff: 580 },
  about: { root: 48, chord: [7, 11, 14, 19], cutoff: 700 },
  projects: { root: 53, chord: [7, 12, 16, 19], cutoff: 760 },
  experience: { root: 50, chord: [7, 10, 15, 19], cutoff: 690 },
  skills: { root: 52, chord: [7, 12, 14, 21], cutoff: 780 },
  contact: { root: 55, chord: [7, 11, 16, 19], cutoff: 720 },
}

/** Level of the drone bus. Kept low: it should sit under everything. */
const MUSIC_LEVEL = 0.42
const MUTE_KEY = 'sound-muted'
const hz = (midi: number) => 440 * 2 ** ((midi - 69) / 12)
const rand = (a: number, b: number) => a + Math.random() * (b - a)
const pick = <T,>(xs: readonly T[]) => xs[Math.floor(Math.random() * xs.length)]
const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
const smooth = (a: number, b: number, x: number) => {
  const t = clamp01((x - a) / (b - a))
  return t * t * (3 - 2 * t)
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(MUTE_KEY) === '1'
  } catch {
    return false
  }
}

function writeMuted(muted: boolean) {
  try {
    localStorage.setItem(MUTE_KEY, muted ? '1' : '0')
  } catch {
    /* private mode: the choice is not remembered */
  }
}

type Voice = { osc: OscillatorNode; interval: number }

type Warp = {
  noise: AudioBufferSourceNode
  band: BiquadFilterNode
  saws: OscillatorNode[]
  sawFilter: BiquadFilterNode
  sub: OscillatorNode
  trem: OscillatorNode
  out: GainNode
}

class Engine {
  private ctx: AudioContext | null = null
  private master!: GainNode
  private music!: GainNode
  private attackBus!: GainNode
  private sfx!: GainNode
  private reverb!: ConvolverNode
  private noise!: AudioBuffer
  private padFilter!: BiquadFilterNode
  private voices: Voice[] = []
  private sub!: OscillatorNode
  private mood: Mood = MOODS.hero
  private moodKey = 'hero'
  private attackTimer = 0
  private attackOn = false
  private attackOff: ReturnType<typeof setTimeout> | undefined
  private tremoloStop: (() => void) | null = null
  private chimeTimer: ReturnType<typeof setTimeout> | undefined
  private warp: Warp | null = null
  private warpStop: ReturnType<typeof setTimeout> | undefined
  private lastHover = 0
  private lastItem = 0
  private listeners = new Set<() => void>()

  muted = readMuted()

  /** Audio is actually running (the browser has let it start). */
  get running() {
    return this.ctx?.state === 'running'
  }
  /** Sound is coming out of the speakers. */
  get playing() {
    return this.running && !this.muted
  }

  subscribe(fn: () => void) {
    this.listeners.add(fn)
    return () => this.listeners.delete(fn)
  }
  private emit() {
    for (const fn of this.listeners) fn()
  }

  /** A one-shot may play only on a running, audible context. */
  private live(): AudioContext | null {
    return this.ctx && this.ctx.state === 'running' && !this.muted ? this.ctx : null
  }

  /** Build the graph and start the drone. Called once, as the page loads. */
  init() {
    if (this.ctx) return
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
    if (!Ctx) return
    const ctx = new Ctx()
    this.ctx = ctx

    this.noise = this.makeNoise(2)
    this.reverb = ctx.createConvolver()
    this.reverb.buffer = this.makeImpulse(5, 3)

    const comp = ctx.createDynamicsCompressor()
    comp.threshold.value = -18
    comp.ratio.value = 3
    comp.attack.value = 0.02
    comp.release.value = 0.5

    this.master = ctx.createGain()
    this.master.gain.value = this.muted ? 0 : 1
    comp.connect(this.master).connect(ctx.destination)

    const wet = ctx.createGain()
    wet.gain.value = 0.6
    this.reverb.connect(wet).connect(comp)

    this.music = ctx.createGain()
    this.music.gain.value = 0
    this.music.connect(comp)
    this.music.connect(this.reverb)

    this.attackBus = ctx.createGain()
    this.attackBus.gain.value = 0
    this.attackBus.connect(comp)
    this.attackBus.connect(this.reverb)

    this.sfx = ctx.createGain()
    this.sfx.gain.value = 0.9
    this.sfx.connect(comp)

    this.startDrone()
    ctx.addEventListener('statechange', () => this.emit())
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return
      if (document.hidden) void this.ctx.suspend()
      else if (!this.muted) void this.ctx.resume()
    })
    // Plays now where autoplay is allowed; otherwise stays suspended
    if (!this.muted) void ctx.resume().catch(() => {})
    this.emit()
  }

  /** Resume on a user gesture. Safe to call on every one. */
  unlock() {
    if (!this.ctx) this.init()
    if (this.ctx && this.ctx.state === 'suspended' && !this.muted && !document.hidden) {
      void this.ctx.resume().catch(() => {})
    }
  }

  setMuted(muted: boolean) {
    this.muted = muted
    writeMuted(muted)
    if (this.ctx) {
      const t = this.ctx.currentTime
      this.master.gain.cancelScheduledValues(t)
      this.master.gain.setTargetAtTime(muted ? 0 : 1, t, 0.15)
      if (!muted) void this.ctx.resume().catch(() => {})
    }
    this.emit()
  }

  // ---- building blocks -------------------------------------------------

  private makeNoise(seconds: number): AudioBuffer {
    const ctx = this.ctx!
    const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * seconds), ctx.sampleRate)
    const d = buf.getChannelData(0)
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1
    return buf
  }

  /** A reverb tail: stereo noise under a decay, softened at the top. */
  private makeImpulse(seconds: number, decay: number): AudioBuffer {
    const ctx = this.ctx!
    const len = Math.floor(ctx.sampleRate * seconds)
    const buf = ctx.createBuffer(2, len, ctx.sampleRate)
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c)
      let last = 0
      for (let i = 0; i < len; i++) {
        // A one-pole lowpass on the noise: a darker, gentler tail
        last = last * 0.6 + (Math.random() * 2 - 1) * 0.4
        d[i] = last * (1 - i / len) ** decay
      }
    }
    return buf
  }

  private noiseSource(loop = false): AudioBufferSourceNode {
    const src = this.ctx!.createBufferSource()
    src.buffer = this.noise
    src.loop = loop
    return src
  }

  /** Gain with an attack and an exponential release, for one-shots. */
  private env(peak: number, at: number, attack: number, release: number): GainNode {
    const g = this.ctx!.createGain()
    g.gain.setValueAtTime(0.0001, at)
    g.gain.exponentialRampToValueAtTime(Math.max(peak, 0.0002), at + attack)
    g.gain.exponentialRampToValueAtTime(0.0001, at + attack + release)
    return g
  }

  private softClip(amount: number): WaveShaperNode {
    const ws = this.ctx!.createWaveShaper()
    const n = 1024
    const curve = new Float32Array(n)
    for (let i = 0; i < n; i++) {
      const x = (i / (n - 1)) * 2 - 1
      curve[i] = Math.tanh(x * amount) / Math.tanh(amount)
    }
    ws.curve = curve
    return ws
  }

  private panned(pan: number, dest: AudioNode): StereoPannerNode {
    const p = this.ctx!.createStereoPanner()
    p.pan.value = pan
    p.connect(dest)
    return p
  }

  /** A glassy note: a sine and a quiet inharmonic partial, long in the reverb. */
  private glass(midi: number, peak: number, at: number, release: number, dest: AudioNode) {
    const ctx = this.ctx!
    const out = this.env(peak, at, 0.015, release)
    out.connect(dest)
    out.connect(this.reverb)
    for (const [ratio, level] of [[1, 1], [2.76, 0.18], [5.4, 0.05]] as const) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz(midi) * ratio
      const g = ctx.createGain()
      g.gain.value = level
      o.connect(g).connect(out)
      o.start(at)
      o.stop(at + release + 0.2)
    }
  }

  // ---- the drone: calm, far away, never quite still --------------------

  private startDrone() {
    const ctx = this.ctx!
    const t = ctx.currentTime

    this.padFilter = ctx.createBiquadFilter()
    this.padFilter.type = 'lowpass'
    this.padFilter.frequency.value = this.mood.cutoff
    this.padFilter.Q.value = 0.3
    this.padFilter.connect(this.music)

    const lfo = ctx.createOscillator()
    lfo.frequency.value = 0.03
    const lfoAmt = ctx.createGain()
    lfoAmt.gain.value = 180
    lfo.connect(lfoAmt).connect(this.padFilter.frequency)
    lfo.start(t)

    /*
     * Five soft voices: root, then the chord tones above it. Sines and one
     * triangle, no saws, so nothing buzzes. Each one swells and fades on its
     * own slow cycle and sits somewhere different in the stereo field, so the
     * chord drifts rather than holds.
     */
    const intervals = [0, ...this.mood.chord]
    const levels = [0.09, 0.05, 0.04, 0.03, 0.02]
    const pans = [0, -0.55, 0.5, -0.3, 0.7]
    this.voices = intervals.map((interval, i) => {
      const osc = ctx.createOscillator()
      osc.type = i === 1 ? 'triangle' : 'sine'
      osc.frequency.value = hz(this.mood.root + interval)
      osc.detune.value = rand(-4, 4)
      const g = ctx.createGain()
      g.gain.value = levels[i] * 0.6
      const swell = ctx.createOscillator()
      swell.frequency.value = rand(0.02, 0.07)
      const swellAmt = ctx.createGain()
      swellAmt.gain.value = levels[i] * 0.4
      swell.connect(swellAmt).connect(g.gain)
      osc.connect(g).connect(this.panned(pans[i], this.padFilter))
      osc.start(t)
      swell.start(t + rand(0, 3))
      return { osc, interval }
    })

    // A sub so low it is felt more than heard
    this.sub = ctx.createOscillator()
    this.sub.type = 'sine'
    this.sub.frequency.value = hz(this.mood.root - 12)
    const subGain = ctx.createGain()
    subGain.gain.value = 0.07
    this.sub.connect(subGain).connect(this.music)
    this.sub.start(t)

    // Air: a faint breath of low noise
    const air = this.noiseSource(true)
    const airLow = ctx.createBiquadFilter()
    airLow.type = 'lowpass'
    airLow.frequency.value = 900
    const airGain = ctx.createGain()
    airGain.gain.value = 0.008
    const airLfo = ctx.createOscillator()
    airLfo.frequency.value = 0.035
    const airLfoAmt = ctx.createGain()
    airLfoAmt.gain.value = 0.006
    airLfo.connect(airLfoAmt).connect(airGain.gain)
    air.connect(airLow).connect(airGain).connect(this.music)
    air.start(t)
    airLfo.start(t)

    // Silent until fadeInDrone(): it rises out of the intro's landing
    this.music.gain.setValueAtTime(0, t)

    this.scheduleChime()
  }

  /**
   * Bring the ambience in, slowly, once. Called under the intro's landing, or
   * when the page is ready without one (entered muted, reduced motion).
   */
  fadeInDrone(delay = 0) {
    const ctx = this.live()
    if (!ctx || this.droneIn) return
    this.droneIn = true
    const t = ctx.currentTime + delay
    this.music.gain.cancelScheduledValues(ctx.currentTime)
    this.music.gain.setValueAtTime(0, t)
    this.music.gain.linearRampToValueAtTime(MUSIC_LEVEL, t + 6)
  }

  /** Now and then, a distant glass note from the chord. The mystery. */
  private scheduleChime() {
    this.chimeTimer = setTimeout(() => {
      const ctx = this.live()
      if (ctx && this.droneIn && !this.attackOn) {
        const note = this.mood.root + 24 + pick(this.mood.chord)
        this.glass(note, 0.022, ctx.currentTime, 4.5, this.panned(rand(-0.8, 0.8), this.music))
      }
      this.scheduleChime()
    }, rand(7000, 15000))
  }

  /** Drift to another place's chord and colour, slowly. */
  setMood(key: string) {
    const mood = MOODS[key]
    if (!mood || key === this.moodKey) return
    this.moodKey = key
    this.mood = mood
    if (!this.ctx) return
    const t = this.ctx.currentTime
    const intervals = [0, ...mood.chord]
    this.voices.forEach((v, i) => v.osc.frequency.setTargetAtTime(hz(mood.root + intervals[i]), t, 3))
    this.sub.frequency.setTargetAtTime(hz(mood.root - 12), t, 3.5)
    this.padFilter.frequency.setTargetAtTime(mood.cutoff, t, 3)
  }

  // ---- the intro: the swarm assembling ---------------------------------

  private build: { nodes: AudioScheduledSourceNode[]; gains: GainNode[] } | null = null
  private landFallback: ReturnType<typeof setTimeout> | undefined
  private droneIn = false

  /**
   * The swarm pulling together: a low rumble, a throbbing sub and a rush,
   * rising from the first movement and holding at the top, kept well under
   * the landing so the build is felt and the hit is what lands. It does not
   * land on its own: `land()` is called when the particles actually close.
   *
   * Every gain is pinned to 0 at the start. A GainNode defaults to 1, and a
   * layer whose first scheduled value came later (the rush, 0.6s in) played
   * at full level until then: the loud burst right after the start click.
   */
  assembleStart() {
    const ctx = this.live()
    if (!ctx || this.build) return
    const t = ctx.currentTime + 0.02
    /** When the build reaches its top; roughly when the structure closes */
    const top = t + 3.4
    const nodes: AudioScheduledSourceNode[] = []
    const gains: GainNode[] = []

    const rum = this.noiseSource(true)
    const rf = ctx.createBiquadFilter()
    rf.type = 'lowpass'
    rf.frequency.setValueAtTime(70, t)
    rf.frequency.exponentialRampToValueAtTime(380, top)
    const rg = ctx.createGain()
    rg.gain.value = 0
    rg.gain.setValueAtTime(0, t)
    rg.gain.linearRampToValueAtTime(0.06, t + 0.8)
    rg.gain.linearRampToValueAtTime(0.18, top)
    rum.connect(rf).connect(rg)
    rg.connect(this.sfx)
    rg.connect(this.reverb)
    nodes.push(rum)
    gains.push(rg)

    const sub = ctx.createOscillator()
    sub.frequency.setValueAtTime(30, t)
    sub.frequency.linearRampToValueAtTime(48, top)
    const throbbed = ctx.createGain()
    throbbed.gain.value = 0.55
    const throb = ctx.createOscillator()
    throb.frequency.setValueAtTime(1.4, t)
    throb.frequency.linearRampToValueAtTime(7, top)
    const throbAmt = ctx.createGain()
    throbAmt.gain.value = 0.45
    throb.connect(throbAmt).connect(throbbed.gain)
    const sg = ctx.createGain()
    sg.gain.value = 0
    sg.gain.setValueAtTime(0, t)
    sg.gain.linearRampToValueAtTime(0.14, t + 1.1)
    sg.gain.linearRampToValueAtTime(0.3, top)
    sub.connect(this.softClip(1.8)).connect(throbbed).connect(sg).connect(this.sfx)
    nodes.push(sub, throb)
    gains.push(sg)

    const rush = this.noiseSource(true)
    const bf = ctx.createBiquadFilter()
    bf.type = 'bandpass'
    bf.Q.value = 1.6
    bf.frequency.setValueAtTime(160, t)
    bf.frequency.setValueAtTime(160, t + 0.6)
    bf.frequency.exponentialRampToValueAtTime(700, t + 2.2)
    bf.frequency.exponentialRampToValueAtTime(320, top)
    const bg = ctx.createGain()
    bg.gain.value = 0
    bg.gain.setValueAtTime(0, t)
    bg.gain.setValueAtTime(0, t + 0.6)
    bg.gain.linearRampToValueAtTime(0.08, t + 2.2)
    bg.gain.linearRampToValueAtTime(0.035, top)
    rush.connect(bf).connect(bg)
    bg.connect(this.sfx)
    bg.connect(this.reverb)
    nodes.push(rush)
    gains.push(bg)

    for (const n of nodes) n.start(t)
    this.build = { nodes, gains }
    // If the cue never comes (the intro was skipped), land anyway
    clearTimeout(this.landFallback)
    this.landFallback = setTimeout(() => this.land(), 7000)
  }

  /**
   * The structure has closed: the build stops dead, the hit lands, and the
   * ambience rises out of it.
   */
  land() {
    clearTimeout(this.landFallback)
    const build = this.build
    this.build = null
    if (!this.ctx || !build) return
    const now = this.ctx.currentTime
    for (const g of build.gains) {
      g.gain.cancelScheduledValues(now)
      g.gain.setTargetAtTime(0, now, 0.06)
    }
    for (const n of build.nodes) n.stop(now + 0.6)
    const ctx = this.live()
    if (!ctx) return
    const t = ctx.currentTime
    this.fadeInDrone(1.2)

    const thud = ctx.createOscillator()
    thud.frequency.setValueAtTime(92, t)
    thud.frequency.exponentialRampToValueAtTime(30, t + 1.2)
    const tg = this.env(0.9, t, 0.005, 1.8)
    thud.connect(this.softClip(2)).connect(tg).connect(this.sfx)
    thud.start(t)
    thud.stop(t + 2.2)
    const bloom = this.env(0.06, t, 0.3, 4)
    bloom.connect(this.sfx)
    bloom.connect(this.reverb)
    for (const note of [33, 40, 45, 52]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz(note)
      o.connect(bloom)
      o.start(t)
      o.stop(t + 4.6)
    }
  }

  // ---- flying into the words -------------------------------------------

  /**
   * The hero exit, scrubbed by scroll: 0 at rest, 1 once the page is inside
   * the letters. A ship's engine spooling up into a tunnel: pitch climbs, the
   * filter opens, the throb speeds up. It dies away as the veil opens, where
   * `reveal()` takes over.
   */
  setWarp(p: number) {
    const on = p > 0.015 && p < 0.97
    if (!on) {
      if (this.warp) this.releaseWarp()
      return
    }
    const ctx = this.live()
    if (!ctx) return
    if (!this.warp) this.warp = this.buildWarp(ctx)
    clearTimeout(this.warpStop)
    const w = this.warp
    const t = ctx.currentTime
    const level = smooth(0.015, 0.2, p) * (1 - smooth(0.8, 0.92, p)) * 0.3
    w.out.gain.setTargetAtTime(level, t, 0.08)
    w.band.frequency.setTargetAtTime(180 * 2 ** (p * 4.2), t, 0.08)
    w.sawFilter.frequency.setTargetAtTime(220 + 2600 * p * p, t, 0.08)
    const semis = -12 + p * 24
    for (const [i, o] of w.saws.entries()) o.frequency.setTargetAtTime(hz(this.mood.root + semis + i * 7), t, 0.08)
    w.sub.frequency.setTargetAtTime(hz(this.mood.root - 24 + p * 12), t, 0.1)
    w.trem.frequency.setTargetAtTime(2 + p * 14, t, 0.1)
  }

  private buildWarp(ctx: AudioContext): Warp {
    const t = ctx.currentTime
    const out = ctx.createGain()
    out.gain.value = 0
    out.connect(this.sfx)
    out.connect(this.reverb)

    // The throb: amplitude pulsing faster the deeper in it goes
    const throbbed = ctx.createGain()
    throbbed.gain.value = 0.6
    const trem = ctx.createOscillator()
    trem.frequency.value = 2
    const tremAmt = ctx.createGain()
    tremAmt.gain.value = 0.4
    trem.connect(tremAmt).connect(throbbed.gain)
    throbbed.connect(out)

    const noise = this.noiseSource(true)
    const band = ctx.createBiquadFilter()
    band.type = 'bandpass'
    band.Q.value = 6
    band.frequency.value = 180
    const ng = ctx.createGain()
    ng.gain.value = 0.9
    noise.connect(band).connect(ng).connect(throbbed)

    const sawFilter = ctx.createBiquadFilter()
    sawFilter.type = 'lowpass'
    sawFilter.frequency.value = 220
    sawFilter.Q.value = 4
    const sg = ctx.createGain()
    sg.gain.value = 0.18
    sawFilter.connect(sg).connect(throbbed)
    const saws = [0, 1].map((i) => {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = hz(this.mood.root - 12 + i * 7)
      o.detune.value = i ? 8 : -8
      o.connect(sawFilter)
      o.start(t)
      return o
    })

    const sub = ctx.createOscillator()
    sub.frequency.value = hz(this.mood.root - 24)
    const subG = ctx.createGain()
    subG.gain.value = 0.5
    sub.connect(subG).connect(out)

    noise.start(t)
    sub.start(t)
    trem.start(t)
    return { noise, band, saws, sawFilter, sub, trem, out }
  }

  private releaseWarp() {
    const w = this.warp
    if (!w || !this.ctx) return
    const t = this.ctx.currentTime
    w.out.gain.setTargetAtTime(0, t, 0.12)
    clearTimeout(this.warpStop)
    this.warpStop = setTimeout(() => {
      for (const n of [w.noise, w.sub, w.trem, ...w.saws]) n.stop()
      if (this.warp === w) this.warp = null
    }, 900)
  }

  /**
   * Through the letters and out the other side. Kept quiet on purpose: the
   * engine has done the drama, so this is the view opening, a soft chord
   * swelling in and away, and one glass note on top.
   */
  reveal() {
    const ctx = this.live()
    if (!ctx) return
    const t = ctx.currentTime + 0.01
    const view = ctx.createBiquadFilter()
    view.type = 'lowpass'
    view.frequency.setValueAtTime(380, t)
    view.frequency.exponentialRampToValueAtTime(1400, t + 1.2)
    view.frequency.exponentialRampToValueAtTime(600, t + 4.5)
    const vg = ctx.createGain()
    vg.gain.setValueAtTime(0.0001, t)
    vg.gain.exponentialRampToValueAtTime(0.045, t + 0.9)
    vg.gain.exponentialRampToValueAtTime(0.0001, t + 4.8)
    view.connect(vg)
    vg.connect(this.sfx)
    vg.connect(this.reverb)
    const root = this.mood.root
    for (const semi of [0, 7, 12, 16]) {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz(root + semi)
      o.connect(view)
      o.start(t)
      o.stop(t + 5)
    }
    this.glass(root + 31, 0.028, t + 0.4, 3.2, this.sfx)
  }

  // ---- reveals ---------------------------------------------------------

  /** A section title rising in: a soft low swell with a glassy top. */
  revealTitle() {
    const ctx = this.live()
    if (!ctx) return
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.setValueAtTime(hz(this.mood.root - 12), t)
    o.frequency.exponentialRampToValueAtTime(hz(this.mood.root), t + 0.5)
    const g = this.env(0.18, t, 0.12, 1.4)
    o.connect(g)
    g.connect(this.sfx)
    g.connect(this.reverb)
    o.start(t)
    o.stop(t + 1.8)
    const n = this.noiseSource()
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.2
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(2200, t + 0.7)
    const ng = this.env(0.06, t, 0.35, 0.6)
    n.connect(f).connect(ng)
    ng.connect(this.sfx)
    ng.connect(this.reverb)
    n.start(t, rand(0, 1))
    n.stop(t + 1.1)
    this.glass(this.mood.root + 24 + this.mood.chord[1], 0.035, t + 0.25, 3, this.sfx)
  }

  /** A stage or chapter arriving: one glass note, a little brighter. */
  revealStage() {
    const ctx = this.live()
    if (!ctx) return
    const t = ctx.currentTime
    this.glass(this.mood.root + 24 + pick(this.mood.chord), 0.04, t, 3, this.panned(rand(-0.4, 0.4), this.sfx))
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(hz(this.mood.root - 12), t)
    const g = this.env(0.1, t, 0.03, 0.9)
    o.connect(g).connect(this.sfx)
    o.start(t)
    o.stop(t + 1.1)
  }

  /** Small items arriving: a faint shimmer, rate-limited so a list sparkles. */
  revealItem() {
    const ctx = this.live()
    if (!ctx) return
    const now = performance.now()
    if (now - this.lastItem < 90) return
    this.lastItem = now
    this.glass(this.mood.root + 36 + pick(this.mood.chord), 0.012, ctx.currentTime, 1.2, this.panned(rand(-0.7, 0.7), this.sfx))
  }

  // ---- attack music ----------------------------------------------------

  /** Suspense while the swarm is on the cursor; lingers after it lets go. */
  setAttack(on: boolean) {
    if (!this.ctx) return
    clearTimeout(this.attackOff)
    if (on) {
      if (this.attackOn || !this.live()) return
      this.attackOn = true
      const t = this.ctx.currentTime
      this.attackBus.gain.cancelScheduledValues(t)
      this.attackBus.gain.setTargetAtTime(0.8, t, 0.25)
      this.music.gain.setTargetAtTime(MUSIC_LEVEL * 0.35, t, 0.3)
      this.startOstinato()
      this.startTremolo()
      this.riser()
    } else if (this.attackOn) {
      // Suspense hangs on, so even a short raid reads as a scene
      this.attackOff = setTimeout(() => {
        if (!this.ctx) return
        this.attackOn = false
        const t = this.ctx.currentTime
        this.attackBus.gain.setTargetAtTime(0, t, 0.8)
        this.music.gain.setTargetAtTime(MUSIC_LEVEL, t, 1.5)
        window.clearInterval(this.attackTimer)
        this.attackTimer = 0
        this.tremoloStop?.()
      }, 4000)
    }
  }

  /** Pulsing bass in eighths with a heartbeat on the beat, scheduled ahead. */
  private startOstinato() {
    const ctx = this.ctx!
    const step = 60 / 148 / 2
    const pattern = [0, 0, 12, 0, 1, 0, 12, 1]
    let next = ctx.currentTime + 0.05
    let i = 0
    const schedule = () => {
      while (next < ctx.currentTime + 0.12) {
        const o = ctx.createOscillator()
        o.type = 'sawtooth'
        o.frequency.value = hz(this.mood.root - 12 + pattern[i % pattern.length])
        const f = ctx.createBiquadFilter()
        f.type = 'lowpass'
        f.frequency.setValueAtTime(800, next)
        f.frequency.exponentialRampToValueAtTime(160, next + step * 0.9)
        const g = this.env(0.2, next, 0.005, step * 0.9)
        o.connect(f).connect(g).connect(this.attackBus)
        o.start(next)
        o.stop(next + step)
        if (i % 2 === 0) this.kick(next)
        next += step
        i++
      }
    }
    schedule()
    window.clearInterval(this.attackTimer)
    this.attackTimer = window.setInterval(schedule, 25)
  }

  private kick(at: number) {
    const ctx = this.ctx!
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(130, at)
    o.frequency.exponentialRampToValueAtTime(38, at + 0.22)
    const g = this.env(0.45, at, 0.004, 0.3)
    o.connect(g).connect(this.attackBus)
    o.start(at)
    o.stop(at + 0.4)
  }

  /** Two high tones a semitone apart, shivering: the sound of being watched. */
  private startTremolo() {
    const ctx = this.ctx!
    this.tremoloStop?.()
    const t = ctx.currentTime
    const out = ctx.createGain()
    out.gain.setValueAtTime(0, t)
    out.gain.linearRampToValueAtTime(0.04, t + 1.2)
    const trem = ctx.createOscillator()
    trem.frequency.value = 9
    const tremAmt = ctx.createGain()
    tremAmt.gain.value = 0.03
    trem.connect(tremAmt).connect(out.gain)
    const tones = [0, 1].map((semi) => {
      const o = ctx.createOscillator()
      o.type = 'sine'
      o.frequency.value = hz(this.mood.root + 36 + semi)
      o.connect(out)
      o.start(t)
      return o
    })
    out.connect(this.attackBus)
    trem.start(t)
    this.tremoloStop = () => {
      const now = ctx.currentTime
      out.gain.setTargetAtTime(0, now, 0.4)
      for (const o of [...tones, trem]) o.stop(now + 2)
      this.tremoloStop = null
    }
  }

  /** The raid arriving: noise tightening upward under a dissonant stab. */
  private riser() {
    const ctx = this.ctx!
    const t = ctx.currentTime
    const n = this.noiseSource()
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 3
    f.frequency.setValueAtTime(300, t)
    f.frequency.exponentialRampToValueAtTime(4000, t + 0.6)
    const g = this.env(0.22, t, 0.5, 0.25)
    n.connect(f).connect(g).connect(this.attackBus)
    n.start(t)
    n.stop(t + 0.9)
    for (const semi of [0, 1, 6]) {
      const o = ctx.createOscillator()
      o.type = 'sawtooth'
      o.frequency.value = hz(this.mood.root + 12 + semi)
      const og = this.env(0.04, t + 0.55, 0.01, 0.9)
      o.connect(og).connect(this.attackBus)
      o.start(t + 0.55)
      o.stop(t + 1.6)
    }
  }

  // ---- one-shots -------------------------------------------------------

  /** A bite: a crunch of filtered noise, clipped, with a falling chirp. */
  bite() {
    const ctx = this.live()
    if (!ctx) return
    const t = ctx.currentTime
    const pan = this.panned(rand(-0.5, 0.5), this.sfx)
    const n = this.noiseSource()
    const bp = ctx.createBiquadFilter()
    bp.type = 'bandpass'
    bp.frequency.value = rand(900, 2600)
    bp.Q.value = 5
    const ng = this.env(0.45, t, 0.002, 0.08)
    n.connect(bp).connect(this.softClip(6)).connect(ng).connect(pan)
    n.start(t, rand(0, 1.5))
    n.stop(t + 0.12)
    const o = ctx.createOscillator()
    o.type = 'square'
    o.frequency.setValueAtTime(rand(500, 800), t)
    o.frequency.exponentialRampToValueAtTime(90, t + 0.1)
    const og = this.env(0.1, t, 0.002, 0.1)
    o.connect(og).connect(pan)
    o.start(t)
    o.stop(t + 0.14)
  }

  /** The raid falling back: a whoosh that sinks away. */
  retreat() {
    const ctx = this.live()
    if (!ctx) return
    const t = ctx.currentTime
    const n = this.noiseSource()
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 2
    f.frequency.setValueAtTime(3000, t)
    f.frequency.exponentialRampToValueAtTime(250, t + 0.9)
    const g = this.env(0.16, t, 0.05, 0.9)
    n.connect(f).connect(g)
    g.connect(this.sfx)
    g.connect(this.reverb)
    n.start(t)
    n.stop(t + 1.1)
  }

  /** A light pulse from the pointer: a quiet glass note from the chord. */
  chime() {
    const ctx = this.live()
    if (!ctx) return
    this.glass(this.mood.root + 24 + pick(this.mood.chord), 0.025, ctx.currentTime, 2.2, this.panned(rand(-0.5, 0.5), this.sfx))
  }

  /** The swarm startled by a click: an airy sweep over a low thump. */
  startle() {
    const ctx = this.live()
    if (!ctx) return
    const t = ctx.currentTime
    const n = this.noiseSource()
    const f = ctx.createBiquadFilter()
    f.type = 'bandpass'
    f.Q.value = 1.4
    f.frequency.setValueAtTime(420, t)
    f.frequency.exponentialRampToValueAtTime(3200, t + 0.6)
    const g = this.env(0.12, t, 0.3, 0.5)
    n.connect(f).connect(g)
    g.connect(this.sfx)
    g.connect(this.reverb)
    n.start(t, rand(0, 1))
    n.stop(t + 0.9)
    const o = ctx.createOscillator()
    o.frequency.setValueAtTime(90, t)
    o.frequency.exponentialRampToValueAtTime(40, t + 0.35)
    const og = this.env(0.3, t, 0.005, 0.4)
    o.connect(og).connect(this.sfx)
    o.start(t)
    o.stop(t + 0.5)
  }

  /** Hovering something clickable: a tiny high tick. Rate-limited. */
  hover() {
    const ctx = this.live()
    if (!ctx) return
    const now = performance.now()
    if (now - this.lastHover < 70) return
    this.lastHover = now
    const t = ctx.currentTime
    const o = ctx.createOscillator()
    o.type = 'sine'
    o.frequency.value = rand(2300, 2600)
    const g = this.env(0.02, t, 0.002, 0.03)
    o.connect(g).connect(this.sfx)
    o.start(t)
    o.stop(t + 0.05)
  }

  /** A click on the interface: two quick rising blips. */
  click() {
    const ctx = this.live()
    if (!ctx) return
    const t = ctx.currentTime
    ;[880, 1320].forEach((f, i) => {
      const o = ctx.createOscillator()
      o.type = 'triangle'
      o.frequency.value = f
      const g = this.env(0.04, t + i * 0.055, 0.003, 0.06)
      o.connect(g).connect(this.sfx)
      o.start(t + i * 0.055)
      o.stop(t + i * 0.055 + 0.08)
    })
  }
}

export const audio = new Engine()
