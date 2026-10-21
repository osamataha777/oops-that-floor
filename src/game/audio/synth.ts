/**
 * Procedural WebAudio synth — every sound in the game is synthesized here,
 * so the build ships zero audio files and zero licensing concerns.
 * Headless-safe: `ensure()` is a no-op when AudioContext is unavailable.
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
}

interface NoiseOpts {
  dur: number;
  filter?: number;
  q?: number;
  gain?: number;
  when?: number;
}

export class Synth {
  private ctx: AudioContext | null = null;
  private sfxBus: GainNode | null = null;
  private musicBus: GainNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private unlocked = false;

  get ready(): boolean {
    return this.unlocked;
  }

  /** Must be called from a user gesture on mobile. Safe to call repeatedly. */
  ensure(): void {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') void this.ctx.resume();
      return;
    }
    const AC = (window as unknown as { AudioContext?: typeof AudioContext; webkitAudioContext?: typeof AudioContext }).AudioContext
      ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.sfxBus = this.ctx.createGain();
    this.musicBus = this.ctx.createGain();
    this.sfxBus.connect(this.ctx.destination);
    this.musicBus.connect(this.ctx.destination);
    this.sfxBus.gain.value = 0.8;
    this.musicBus.gain.value = 0.4;
    this.unlocked = true;

    const len = this.ctx.sampleRate;
    this.noiseBuf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const d = this.noiseBuf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  }

  suspend(): void {
    if (this.ctx?.state === 'running') void this.ctx.suspend();
  }

  resume(): void {
    if (this.ctx?.state === 'suspended') void this.ctx.resume();
  }

  setSfxVolume(v01: number): void {
    if (this.sfxBus && this.ctx) this.sfxBus.gain.setTargetAtTime(v01 * 0.9, this.ctx.currentTime, 0.02);
  }

  setMusicVolume(v01: number): void {
    if (this.musicBus && this.ctx) this.musicBus.gain.setTargetAtTime(v01 * 0.5, this.ctx.currentTime, 0.05);
  }

  tone(o: ToneOpts): void {
    if (!this.ctx || !this.sfxBus) return;
    const t0 = this.ctx.currentTime + (o.when ?? 0);
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    const gain = o.gain ?? 0.25;
    const attack = o.attack ?? 0.004;
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(Math.max(20, o.freq), t0);
    if (o.freqEnd !== undefined) osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.freqEnd), t0 + o.dur);
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    osc.connect(g).connect(this.sfxBus);
    osc.start(t0);
    osc.stop(t0 + o.dur + 0.02);
  }

  noise(o: NoiseOpts): void {
    if (!this.ctx || !this.sfxBus || !this.noiseBuf) return;
    const t0 = this.ctx.currentTime + (o.when ?? 0);
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.loop = true;
    const f = this.ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.value = o.filter ?? 1200;
    f.Q.value = o.q ?? 0.8;
    const g = this.ctx.createGain();
    const gain = o.gain ?? 0.2;
    g.gain.setValueAtTime(gain, t0);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + o.dur);
    src.connect(f).connect(g).connect(this.sfxBus);
    src.start(t0, Math.random());
    src.stop(t0 + o.dur + 0.02);
  }

  /** Music note routed to the (quieter) music bus. */
  note(freq: number, when: number, dur: number, type: OscType = 'triangle', gain = 0.14): void {
    if (!this.ctx || !this.musicBus) return;
    const t0 = this.ctx.currentTime + when;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    g.gain.setValueAtTime(0, t0);
    g.gain.linearRampToValueAtTime(gain, t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    osc.connect(g).connect(this.musicBus);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  now(): number {
    return this.ctx?.currentTime ?? 0;
  }
}

export const synth = new Synth();

// ---- Named SFX ------------------------------------------------------------

export const SFX = {
  click: () => synth.tone({ freq: 660, freqEnd: 520, dur: 0.06, type: 'triangle', gain: 0.16 }),
  back: () => synth.tone({ freq: 420, freqEnd: 300, dur: 0.08, type: 'triangle', gain: 0.14 }),
  jump: () => {
    synth.tone({ freq: 280, freqEnd: 640, dur: 0.13, type: 'triangle', gain: 0.14 });
    synth.tone({ freq: 560, freqEnd: 780, dur: 0.07, type: 'sine', gain: 0.06, when: 0.02 });
  },
  land: () => {
    synth.tone({ freq: 160, freqEnd: 60, dur: 0.09, type: 'sine', gain: 0.22 });
    synth.noise({ dur: 0.05, filter: 500, gain: 0.09 });
  },
  pop: () => {
    synth.tone({ freq: 950, freqEnd: 180, dur: 0.1, type: 'sawtooth', gain: 0.15 });
    synth.noise({ dur: 0.07, filter: 2400, gain: 0.11 });
    synth.tone({ freq: 1400, freqEnd: 900, dur: 0.05, type: 'square', gain: 0.05, when: 0.01 });
  },
  crumble: () => {
    synth.noise({ dur: 0.3, filter: 900, gain: 0.2 });
    synth.tone({ freq: 180, freqEnd: 60, dur: 0.28, type: 'triangle', gain: 0.14 });
  },
  wall: () => {
    synth.noise({ dur: 0.16, filter: 700, gain: 0.16 });
    synth.tone({ freq: 120, freqEnd: 90, dur: 0.14, type: 'sine', gain: 0.18 });
  },
  plate: () => {
    synth.tone({ freq: 500, freqEnd: 380, dur: 0.07, type: 'square', gain: 0.12 });
    synth.tone({ freq: 760, dur: 0.06, type: 'square', gain: 0.1, when: 0.05 });
  },
  whoosh: () => synth.noise({ dur: 0.22, filter: 3000, q: 2, gain: 0.12 }),
  splat: () => {
    synth.noise({ dur: 0.14, filter: 1600, gain: 0.22 });
    synth.tone({ freq: 220, freqEnd: 60, dur: 0.2, type: 'sawtooth', gain: 0.2 });
  },
  boing: () => {
    synth.tone({ freq: 140, freqEnd: 520, dur: 0.16, type: 'sine', gain: 0.22 });
    synth.tone({ freq: 520, freqEnd: 160, dur: 0.18, type: 'sine', gain: 0.14, when: 0.1 });
  },
  shrink: () => synth.tone({ freq: 800, freqEnd: 120, dur: 0.24, type: 'triangle', gain: 0.18 }),
  confetti: () => {
    for (let i = 0; i < 5; i++) synth.tone({ freq: 500 + i * 180, dur: 0.07, type: 'triangle', gain: 0.09, when: i * 0.03 });
    synth.noise({ dur: 0.12, filter: 5000, gain: 0.08 });
  },
  freeze: () => synth.tone({ freq: 1100, freqEnd: 1100, dur: 0.22, type: 'sine', gain: 0.12 }),
  goal: () => {
    synth.tone({ freq: 523, dur: 0.1, type: 'triangle', gain: 0.16 });
    synth.tone({ freq: 659, dur: 0.1, type: 'triangle', gain: 0.16, when: 0.08 });
    synth.tone({ freq: 784, dur: 0.16, type: 'triangle', gain: 0.18, when: 0.16 });
  },
  gravflip: () => {
    synth.tone({ freq: 200, freqEnd: 900, dur: 0.25, type: 'sawtooth', gain: 0.12 });
    synth.tone({ freq: 900, freqEnd: 200, dur: 0.25, type: 'sawtooth', gain: 0.1, when: 0.12 });
  },
  crusher: () => {
    synth.noise({ dur: 0.2, filter: 400, gain: 0.26 });
    synth.tone({ freq: 90, freqEnd: 40, dur: 0.22, type: 'sine', gain: 0.26 });
  },
  achievement: () => {
    synth.tone({ freq: 880, dur: 0.09, type: 'sine', gain: 0.14 });
    synth.tone({ freq: 1175, dur: 0.14, type: 'sine', gain: 0.14, when: 0.08 });
  },
  denied: () => synth.tone({ freq: 200, freqEnd: 160, dur: 0.12, type: 'square', gain: 0.1 }),
};
