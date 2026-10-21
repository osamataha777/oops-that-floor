import { synth, SFX } from './synth';
import { SettingsData } from '../../services/save';

/** A chapter's musical personality. All original, generated at runtime. */
interface MusicStyle {
  bpm: number;
  root: number;
  /** Scale as frequency ratios over the root. */
  scale: number[];
  /** 16-step bass line: scale degree or −1 for rest. */
  bass: number[];
  /** Melody phrases (16 steps each, −1 = rest); bars cycle through them. */
  phrases: number[][];
  lead: OscillatorType;
  bassWave: OscillatorType;
  /** Steps with a soft hat/brush. */
  hats: number[];
  leadGain: number;
}

const MAJ_PENTA = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2, 9 / 4, 5 / 2];
const MIXO = [1, 9 / 8, 5 / 4, 4 / 3, 3 / 2, 5 / 3, 16 / 9, 2];
const WHOLE = [1, 9 / 8, 81 / 64, 729 / 512, 3 / 2 * 1.06, 16 / 9, 2, 9 / 4];
const MINOR = [1, 9 / 8, 6 / 5, 4 / 3, 3 / 2, 8 / 5, 9 / 5, 2];

const _ = -1;
export const STYLES: Record<'menu' | 1 | 2 | 3 | 4 | 5, MusicStyle> = {
  // Warm, bouncy, innocent — the game pretending to be nice.
  menu: {
    bpm: 108, root: 220, scale: MAJ_PENTA, lead: 'triangle', bassWave: 'sine', leadGain: 0.07,
    bass: [0, _, _, _, 3, _, _, _, 0, _, _, _, 4, _, 3, _],
    hats: [4, 12],
    phrases: [
      [4, _, 5, _, 4, _, 2, _, 3, _, _, _, 1, _, _, _],
      [2, _, 3, _, 4, _, 5, _, 7, _, 5, _, 4, _, _, _],
    ],
  },
  1: {
    bpm: 112, root: 220, scale: MAJ_PENTA, lead: 'triangle', bassWave: 'sine', leadGain: 0.06,
    bass: [0, _, _, 0, 3, _, _, _, 0, _, _, 0, 4, _, _, _],
    hats: [2, 6, 10, 14],
    phrases: [
      [_, _, 4, _, 5, _, 4, _, 2, _, _, _, _, _, _, _],
      [_, _, 2, _, 3, _, 4, _, 7, _, 5, _, _, _, _, _],
      [_, _, 4, _, 2, _, 1, _, 0, _, _, _, _, _, _, _],
    ],
  },
  // Clockwork: ticking hats, square plucks, a syncopated machine bass.
  2: {
    bpm: 124, root: 196, scale: MIXO, lead: 'square', bassWave: 'triangle', leadGain: 0.035,
    bass: [0, _, 0, _, _, 0, _, 4, 0, _, 0, _, _, 6, _, 4],
    hats: [0, 2, 4, 6, 8, 10, 12, 14],
    phrases: [
      [4, _, _, 4, _, _, 6, _, 7, _, _, 6, _, _, 4, _],
      [2, _, _, 2, _, _, 4, _, 3, _, _, 2, _, _, 0, _],
    ],
  },
  // Dreamy and floaty: whole-tone sines, sparse, rubbery.
  3: {
    bpm: 92, root: 233, scale: WHOLE, lead: 'sine', bassWave: 'sine', leadGain: 0.07,
    bass: [0, _, _, _, _, _, _, _, 2, _, _, _, _, _, _, _],
    hats: [6, 14],
    phrases: [
      [4, _, _, 5, _, _, 6, _, _, _, 7, _, _, _, _, _],
      [6, _, _, 5, _, _, 3, _, _, _, 2, _, _, _, _, _],
    ],
  },
  // Theatrical oompah: root–fifth bass, cheeky staccato lead.
  4: {
    bpm: 132, root: 208, scale: MIXO, lead: 'sawtooth', bassWave: 'triangle', leadGain: 0.028,
    bass: [0, _, 4, _, 0, _, 4, _, 3, _, 7, _, 3, _, 7, _],
    hats: [2, 6, 10, 14],
    phrases: [
      [7, _, 6, _, 4, _, 6, _, 7, 7, _, 4, _, _, _, _],
      [4, _, 3, _, 2, _, 3, _, 4, 4, _, 0, _, _, _, _],
    ],
  },
  // Final chapter: minor, driving, a little ominous — but still a cartoon.
  5: {
    bpm: 116, root: 175, scale: MINOR, lead: 'triangle', bassWave: 'sawtooth', leadGain: 0.06,
    bass: [0, _, 0, _, 0, _, 0, 5, 3, _, 3, _, 4, _, 4, 6],
    hats: [2, 6, 10, 14],
    phrases: [
      [7, _, _, 4, _, _, 5, _, 4, _, _, 2, _, _, _, _],
      [7, _, _, 6, _, _, 5, _, 4, _, 2, _, 4, _, _, _],
    ],
  },
};

/**
 * Applies settings, runs the generative music with a lookahead scheduler
 * (sample-accurate, immune to setInterval jitter), and owns lifecycle:
 * tab hide, app pause, iOS audio interruptions.
 */
export class AudioManager {
  private settings: SettingsData;
  private timer: number | null = null;
  private style: MusicStyle = STYLES.menu;
  private styleKey: keyof typeof STYLES = 'menu';
  private nextStepAt = 0;
  private step = 0;
  private bar = 0;
  private hidden = false;

  constructor(settings: SettingsData) {
    this.settings = settings;
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.suspendAll();
      else this.resumeAll();
    });
  }

  setSettings(s: SettingsData): void {
    this.settings = s;
    synth.setSfxVolume(s.sfx / 10);
    synth.setMusicVolume(s.music / 10);
    if (s.music === 0) this.stopMusic();
    else this.startMusic();
  }

  unlock(): void {
    synth.ensure();
    if (synth.ready) {
      synth.setSfxVolume(this.settings.sfx / 10);
      synth.setMusicVolume(this.settings.music / 10);
      const ctx = synth.context;
      if (ctx && !(ctx as AudioContext & { __otfWatch?: boolean }).__otfWatch) {
        (ctx as AudioContext & { __otfWatch?: boolean }).__otfWatch = true;
        // iOS: an interruption (call, Siri, alarm) leaves the context
        // 'interrupted'; resume as soon as we're visible again.
        ctx.addEventListener('statechange', () => {
          if (ctx.state !== 'running' && !this.hidden) setTimeout(() => synth.resume(), 300);
        });
      }
      this.startMusic();
    }
  }

  suspendAll(): void {
    this.hidden = true;
    synth.suspend();
  }

  resumeAll(): void {
    this.hidden = false;
    synth.resume();
    this.nextStepAt = 0; // re-sync the sequencer instead of bursting missed steps
  }

  /** Switch the music personality; crossfades at the next bar line. */
  setChapterRoot(chapter: number | 'menu'): void {
    const key = (chapter === 'menu' ? 'menu' : Math.min(5, Math.max(1, chapter))) as keyof typeof STYLES;
    if (key === this.styleKey) return;
    this.styleKey = key;
    this.style = STYLES[key];
    this.step = 0;
    this.bar = 0;
  }

  sfx(name: string): void {
    if (this.settings.sfx === 0) return;
    try {
      SFX[name]?.();
    } catch {
      /* audio is decorative — never crash gameplay for it */
    }
  }

  startMusic(): void {
    if (this.timer !== null || this.settings.music === 0 || !synth.ready) return;
    this.nextStepAt = 0;
    this.timer = window.setInterval(() => this.pump(), 40);
  }

  stopMusic(): void {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  private pump(): void {
    const ctx = synth.context;
    if (!ctx || ctx.state !== 'running' || this.hidden) return;
    const stepDur = 60 / this.style.bpm / 4;
    if (this.nextStepAt < ctx.currentTime) this.nextStepAt = ctx.currentTime + 0.05;
    while (this.nextStepAt < ctx.currentTime + 0.18) {
      this.playStep(this.nextStepAt, stepDur);
      this.nextStepAt += stepDur;
      this.step = (this.step + 1) % 16;
      if (this.step === 0) this.bar++;
    }
  }

  private playStep(t: number, stepDur: number): void {
    const s = this.style;
    const i = this.step;
    const deg = (d: number) => s.root * s.scale[((d % s.scale.length) + s.scale.length) % s.scale.length] * (d >= s.scale.length ? 2 : 1);
    const b = s.bass[i];
    if (b >= 0) synth.noteAt(deg(b) / 2, t, stepDur * 2.2, s.bassWave, 0.13);
    if (s.hats.includes(i)) synth.brushAt(t, 0.05, 0.035);
    // Every 4th bar rests the melody — breathing room keeps it from nagging.
    if (this.bar % 4 === 3) return;
    const phrase = s.phrases[this.bar % s.phrases.length];
    const m = phrase[i];
    if (m >= 0) synth.noteAt(deg(m) * 2, t, stepDur * 1.8, s.lead, s.leadGain);
  }
}
