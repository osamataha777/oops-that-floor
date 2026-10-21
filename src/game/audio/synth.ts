/**
 * Procedural WebAudio synth — every sound in the game is synthesized here,
 * so the build ships zero audio files and zero licensing concerns.
 * Headless-safe: `ensure()` is a no-op when AudioContext is unavailable.
 *
 * Mix: sfx → gentle compressor → out; music → lowpass → out. Frequent sounds
 * get a few cents of random detune so repetition never turns into a drill.
 */

type OscType = OscillatorType;

interface ToneOpts {
  freq: number;
  freqEnd?: number;
  dur: number;
  type?: OscType;
  gain?: number;
  attack?: number;
  when?: number;
  /** Random detune range in cents (±). */
  jitter?: number;
  /** Optional lowpass cutoff for softer timbres. */
  lp?: number;
}

interface NoiseOpts {
  dur: number;
  filter?: number;
  filterEnd?: number;
  q?: number;
  gain?: number;
  when?: number;
  type?: BiquadFilterType;
}

export class Synth {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private unlocked = false;
  /** Cap simultaneous voices — a pile-up of sounds should never distort. */
  private live = 0;
  private static readonly MAX_VOICES = 24;

  get ready(): boolean {
    return this.unlocked;
  }

  get context(): AudioContext | null {
    return this.ctx;
  }

  /** Must be called from a user gesture on mobile. Safe to call repeatedly. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state !== 'running') void this.ctx.resume().catch(() => undefined);
      return;
    }
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    const comp = this.ctx.createDynamicsCompressor();
    comp.threshold.value = -16;
    comp.knee.value = 12;
    comp.ratio.value = 4;
    comp.attack.value = 0.004;
    comp.release.value = 0.16;
    comp.connect(this.ctx.destination);
    this.sfxBus = this.ctx.createGain();
    this.sfxBus.connect(comp);
    const lp = this.ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 3200;
    lp.connect(this.ctx.destination);
    this.musicBus = this.ctx.createGain();
    this.musicBus.connect(lp);
    this.sfxBus.gain.value = 0.8;
    this.musicBus.gain.value = 0.3;
    this.unlocked = true;

    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend().catch(() => undefined);
  }

  resume(): void {
    // iOS reports 'interrupted' after a call/Siri; both need an explicit resume.
    if (this.ctx && this.ctx.state !== 'running' && this.ctx.state !== 'closed') void this.ctx.resume().catch(() => undefined);
  }

  setSfxVolume(v01: number): void {
    if (this.sfxBus && this.ctx) this.sfxBus.gain.setTargetAtTime(v01 * 0.9, this.ctx.currentTime, 0.02);
  }

  setMusicVolume(v01: number): void {
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(v01 * 0.42, this.ctx.currentTime, 0.05);
  }

  private voice(dur: number): boolean {
    if (this.live >= Synth.MAX_VOICES) return false;
    this.live++;
    setTimeout(() => (this.live = Math.max(0, this.live - 1)), (dur + 0.05) * 1000);
    return true;
  }

  tone(o: ToneOpts): void {
    if (!this.ctx || !this.sfxBus || this.ctx.state !== 'running' || !this.voice(o.dur)) return;
    const t0 = this.ctx.currentTime + (o.when ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const gain = o.gain ?? 0.25;
    const attack = o.attack ?? 0.004;
    osc.type = o.type ?? 'square';
    if (o.jitter) osc.detune.value = (Math.random() * 2 - 1) * o.jitter;
    osc.frequency.setValueAtTime(Math.max(20, o.freq), t0);
    if (o.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t0 + o.dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    let node: AudioNode = osc;
    if (o.lp) {
      const f = this.ctx.createBiquadFilter();
      f.type = 'lowpass';
      f.frequency.value = o.lp;
      osc.connect(f);
      node = f;
    }
    node.connect(g).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }

  noise(o: NoiseOpts): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuf || this.ctx.state !== 'running' || !this.voice(o.dur)) return;
    const t0 = this.ctx.currentTime + (o.when ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.setValueAtTime(o.filter ?? 1200, t0);
    if (o.filterEnd) f.frequency.exponentialRampToValueAtTime(o.filterEnd, t0 + o.dur);
    f.Q.value = o.q ?? 0.8;
    const g = this.ctx.createGain();
    const gain = o.gain ?? 0.2;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.004);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t0, Math.random());
    src.stop(t0 + o.dur + 0.02);
  }

  /** Music note routed to the (quieter, filtered) music bus at an absolute time. */
  noteAt(freq: number, t0: number, dur: number, type: OscType = 'triangle', gain = 0.14): void {
    if (!this.ctx || !this.musicBus) return;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.musicBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  /** Soft filtered noise hit on the music bus (brush/hat). */
  brushAt(t0: number, dur: number, gain: number, cutoff = 6000): void {
    if (!this.ctx || !this.musicBus || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    const f = this.ctx.createBiquadFilter();
    f.type = 'highpass';
    f.frequency.value = cutoff;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(f).connect(g).connect(this.musicBus);
    src.start(t0, Math.random());
    src.stop(t0 + dur + 0.02);
  }

  now(): number {
    return this.ctx?.currentTime ?? 0;
  }
}

export const synth = new Synth();

// ---- Named SFX ------------------------------------------------------------
// Pitch language: rising = Pip's agency (jump, goal), falling = the world
// winning (pop, splat, fall). Traps are woody/mechanical, Pip is bubbly.

export const SFX: Record<string, () => void> = {
  click: () => synth.tone({ freq: 720, freqEnd: 560, dur: 0.05, type: 'triangle', gain: 0.14, jitter: 20 }),
  tick: () => synth.tone({ freq: 1250, dur: 0.025, type: 'square', gain: 0.05, lp: 3000 }),
  back: () => synth.tone({ freq: 460, freqEnd: 320, dur: 0.07, type: 'triangle', gain: 0.13 }),
  jump: () => {
    synth.tone({ freq: 300, freqEnd: 620, dur: 0.11, type: 'triangle', gain: 0.12, jitter: 35 });
    synth.tone({ freq: 600, freqEnd: 820, dur: 0.06, type: 'sine', gain: 0.05, when: 0.02 });
  },
  jump2: () => {
    synth.tone({ freq: 320, freqEnd: 660, dur: 0.1, type: 'triangle', gain: 0.12, jitter: 35 });
    synth.tone({ freq: 640, freqEnd: 900, dur: 0.05, type: 'sine', gain: 0.05, when: 0.02 });
  },
  land: () => {
    synth.tone({ freq: 150, freqEnd: 70, dur: 0.07, type: 'sine', gain: 0.16, jitter: 40 });
    synth.noise({ dur: 0.04, filter: 600, gain: 0.05 });
  },
  landHard: () => {
    synth.tone({ freq: 130, freqEnd: 48, dur: 0.12, type: 'sine', gain: 0.24, jitter: 30 });
    synth.noise({ dur: 0.08, filter: 700, filterEnd: 200, gain: 0.1 });
  },
  skid: () => synth.noise({ dur: 0.12, filter: 2600, filterEnd: 900, q: 3, gain: 0.05, type: 'bandpass' }),
  bonk: () => synth.tone({ freq: 240, freqEnd: 180, dur: 0.08, type: 'square', gain: 0.07, lp: 1400 }),
  warn: () => {
    synth.tone({ freq: 980, dur: 0.035, type: 'square', gain: 0.05, lp: 2600 });
    synth.tone({ freq: 980, dur: 0.035, type: 'square', gain: 0.04, lp: 2600, when: 0.08 });
  },
  pop: () => {
    synth.tone({ freq: 950, freqEnd: 180, dur: 0.1, type: 'sawtooth', gain: 0.12, lp: 4000, jitter: 30 });
    synth.noise({ dur: 0.06, filter: 2400, gain: 0.09 });
    synth.tone({ freq: 1500, freqEnd: 900, dur: 0.04, type: 'square', gain: 0.04, when: 0.01 });
  },
  crumble: () => {
    synth.noise({ dur: 0.32, filter: 1100, filterEnd: 300, gain: 0.18 });
    for (let i = 0; i < 3; i++) synth.tone({ freq: 220 - i * 40, dur: 0.04, type: 'triangle', gain: 0.07, when: 0.05 + i * 0.07, jitter: 60 });
  },
  wall: () => {
    synth.noise({ dur: 0.16, filter: 700, gain: 0.14 });
    synth.tone({ freq: 120, freqEnd: 80, dur: 0.14, type: 'sine', gain: 0.18 });
  },
  thud: () => {
    synth.tone({ freq: 95, freqEnd: 40, dur: 0.18, type: 'sine', gain: 0.26 });
    synth.noise({ dur: 0.1, filter: 500, gain: 0.12 });
  },
  plate: () => {
    synth.tone({ freq: 500, freqEnd: 380, dur: 0.06, type: 'square', gain: 0.09, lp: 2400 });
    synth.tone({ freq: 760, dur: 0.06, type: 'square', gain: 0.08, when: 0.05, lp: 2400 });
  },
  whoosh: () => synth.noise({ dur: 0.22, filter: 900, filterEnd: 3800, q: 2, gain: 0.1, type: 'bandpass' }),
  vanish: () => synth.tone({ freq: 880, freqEnd: 1760, dur: 0.08, type: 'sine', gain: 0.06 }),
  spring: () => {
    synth.tone({ freq: 180, freqEnd: 760, dur: 0.18, type: 'triangle', gain: 0.18 });
    synth.tone({ freq: 760, freqEnd: 700, dur: 0.12, type: 'sine', gain: 0.06, when: 0.12 });
  },
  splat: () => {
    synth.noise({ dur: 0.14, filter: 1600, gain: 0.2 });
    synth.tone({ freq: 220, freqEnd: 60, dur: 0.2, type: 'sawtooth', gain: 0.16, lp: 2000 });
  },
  fall: () => synth.tone({ freq: 700, freqEnd: 140, dur: 0.42, type: 'triangle', gain: 0.12 }),
  boing: () => {
    synth.tone({ freq: 140, freqEnd: 520, dur: 0.16, type: 'sine', gain: 0.2 });
    synth.tone({ freq: 520, freqEnd: 160, dur: 0.18, type: 'sine', gain: 0.12, when: 0.1 });
  },
  flee: () => {
    // a nervous little "eep!" + scurry
    synth.tone({ freq: 900, freqEnd: 1500, dur: 0.07, type: 'sine', gain: 0.1 });
    synth.noise({ dur: 0.18, filter: 3000, q: 4, gain: 0.05, type: 'bandpass', when: 0.05 });
  },
  caught: () => {
    synth.tone({ freq: 660, freqEnd: 520, dur: 0.1, type: 'triangle', gain: 0.1 });
    synth.tone({ freq: 520, freqEnd: 440, dur: 0.14, type: 'triangle', gain: 0.08, when: 0.09 });
  },
  shrink: () => synth.tone({ freq: 800, freqEnd: 120, dur: 0.24, type: 'triangle', gain: 0.16 }),
  confetti: () => {
    for (let i = 0; i < 5; i++) synth.tone({ freq: 500 + i * 180, dur: 0.07, type: 'triangle', gain: 0.07, when: i * 0.03 });
    synth.noise({ dur: 0.12, filter: 5000, gain: 0.06, type: 'highpass' });
  },
  respawn: () => {
    synth.tone({ freq: 400, freqEnd: 800, dur: 0.09, type: 'sine', gain: 0.07 });
    synth.tone({ freq: 800, dur: 0.05, type: 'sine', gain: 0.05, when: 0.08 });
  },
  freeze: () => synth.tone({ freq: 1100, freqEnd: 1100, dur: 0.22, type: 'sine', gain: 0.1 }),
  goal: () => {
    synth.tone({ freq: 523, dur: 0.1, type: 'triangle', gain: 0.14 });
    synth.tone({ freq: 659, dur: 0.1, type: 'triangle', gain: 0.14, when: 0.08 });
    synth.tone({ freq: 784, dur: 0.18, type: 'triangle', gain: 0.16, when: 0.16 });
    synth.tone({ freq: 1046, dur: 0.24, type: 'sine', gain: 0.08, when: 0.24 });
  },
  fanfare: () => {
    const seq = [523, 659, 784, 1046, 784, 1046];
    seq.forEach((f, i) => synth.tone({ freq: f, dur: i === seq.length - 1 ? 0.4 : 0.12, type: 'triangle', gain: 0.13, when: i * 0.1 }));
  },
  gravflip: () => {
    synth.tone({ freq: 200, freqEnd: 900, dur: 0.25, type: 'sawtooth', gain: 0.09, lp: 2500 });
    synth.tone({ freq: 900, freqEnd: 200, dur: 0.25, type: 'sawtooth', gain: 0.07, when: 0.12, lp: 2500 });
  },
  crusher: () => {
    synth.noise({ dur: 0.2, filter: 400, gain: 0.22 });
    synth.tone({ freq: 90, freqEnd: 40, dur: 0.22, type: 'sine', gain: 0.24 });
  },
  achievement: () => {
    synth.tone({ freq: 880, dur: 0.09, type: 'sine', gain: 0.12 });
    synth.tone({ freq: 1175, dur: 0.14, type: 'sine', gain: 0.12, when: 0.08 });
  },
  denied: () => synth.tone({ freq: 200, freqEnd: 160, dur: 0.12, type: 'square', gain: 0.08, lp: 1800 }),
};
