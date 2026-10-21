import { synth, SFX } from './synth';
import { SettingsData } from '../../services/save';

/**
 * Thin wrapper over the synth: applies settings, runs the ambient music
 * loop, and handles page lifecycle. Music is a two-bar generative loop —
 * a soft kick, a wobbling bass and a pentatonic pluck. Original composition.
 */
export class AudioManager {
  private settings: SettingsData;
  private musicTimer: number | null = null;
  private step = 0;
  private root = 220; // A3 — varied per chapter
  private enabled = true;

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
      this.startMusic();
    }
  }

  suspendAll(): void {
    synth.suspend();
  }

  resumeAll(): void {
    synth.resume();
  }

  setChapterRoot(chapter: number): void {
    this.root = [220, 196, 233, 208, 175][Math.min(4, Math.max(0, chapter - 1))];
  }

  sfx(name: keyof typeof SFX): void {
    if (!this.enabled || this.settings.sfx === 0) return;
    try {
      SFX[name]();
    } catch {
      /* audio is decorative — never crash gameplay for it */
    }
  }

  startMusic(): void {
    if (this.musicTimer !== null || this.settings.music === 0 || !synth.ready) return;
    const barMs = 460;
    this.musicTimer = window.setInterval(() => this.scheduleBar(), barMs);
  }

  stopMusic(): void {
    if (this.musicTimer !== null) {
      window.clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /** Schedule a tiny 8-step pattern ahead of time. */
  private scheduleBar(): void {
    if (!synth.ready || document.hidden) return;
    const r = this.root;
    const penta = [1, 9 / 8, 5 / 4, 3 / 2, 5 / 3, 2];
    const s = this.step++;
    for (let i = 0; i < 8; i++) {
      const t = i * 0.115;
      if (i % 4 === 0) synth.note(r / 2, t, 0.09, 'sine', 0.16);           // heartbeat bass
      if (i === 3 || i === 6) synth.note(r / 2, t, 0.05, 'square', 0.05);   // off-beat tick
      const melody = [0, -1, 2, -1, 4, -1, 3, 1][i];
      if (melody >= 0 && (s + i) % 2 === 0) {
        synth.note(r * 2 * penta[melody % penta.length], t, 0.12, 'triangle', 0.07);
      }
    }
  }
}
