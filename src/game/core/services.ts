import { SaveData, SettingsData, decodeSave, decodeSettings, encodeSave, encodeSettings, defaultSave, defaultSettings } from '../../services/save';
import { kvGet, kvSet, initStorage, kvRemove } from '../../services/storage';
import { SAVE_KEY, SETTINGS_KEY } from './config';
import { AudioManager } from '../audio/AudioManager';
import { FeedbackManager, FeedbackEvent } from '../feedback/FeedbackManager';
import { fireHaptic, preloadHaptics, isNative } from '../../platform/native';

/** App-wide services: save data, settings, audio. One instance. */
export class Services {
  save: SaveData = defaultSave();
  settings: SettingsData = defaultSettings();
  audio!: AudioManager;
  feedback!: FeedbackManager;
  private flushTimer: number | null = null;

  async init(): Promise<void> {
    await initStorage();
    this.save = decodeSave(kvGet(SAVE_KEY));
    this.settings = decodeSettings(kvGet(SETTINGS_KEY));
    this.audio = new AudioManager(this.settings);
    this.feedback = new FeedbackManager(
      {
        sfx: (n) => this.audio.sfx(n),
        haptic: (k) => fireHaptic(k, this.settings.haptics && isNative()),
        now: () => performance.now(),
      },
      () => ({
        haptics: this.settings.haptics,
        shake: this.settings.shake,
        reducedMotion: this.settings.reducedMotion,
        gentle: this.settings.gentle,
      }),
    );
    void preloadHaptics();
  }

  /** Shorthand for gameplay/UI code. */
  fx(ev: FeedbackEvent, opts?: { intensity?: number }): void {
    this.feedback?.emit(ev, opts);
  }

  persistSave(): void {
    kvSet(SAVE_KEY, encodeSave(this.save));
  }

  persistSaveSoon(): void {
    if (this.flushTimer !== null) return;
    this.flushTimer = window.setTimeout(() => {
      this.flushTimer = null;
      this.persistSave();
    }, 400);
  }

  persistSettings(): void {
    kvSet(SETTINGS_KEY, encodeSettings(this.settings));
    this.audio?.setSettings(this.settings);
  }

  resetProgress(): void {
    this.save = defaultSave();
    kvRemove(SAVE_KEY);
    this.persistSave();
  }
}

export const services = new Services();
