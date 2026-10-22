import { SAVE_VERSION } from '../game/core/config';

export interface LevelRecord {
  completed: boolean;
  bestAttempts: number;   // fewest attempts used to finish
  totalAttempts: number;
  firstTry: boolean;
}

export interface SaveData {
  version: number;
  unlockedThrough: number;             // highest linear level index unlocked (0-39)
  levels: Record<string, LevelRecord>; // keyed by level id "1-3"
  deaths: number;
  completedAt?: Record<string, number>;
  achievements: string[];              // achievement ids
  seenTips: string[];                  // level ids whose tip was shown
  noDeathStreak: number;               // consecutive finishes without dying
  bestNoDeathStreak: number;
}

export interface SettingsData {
  version: number;
  music: number;        // 0..10
  sfx: number;          // 0..10
  haptics: boolean;
  reducedMotion: boolean;
  controlScale: number; // 0.8..1.4
  controlSpread: boolean; // wide vs compact touch layout
  controlOpacity: number; // 0.3..1 — how visible the touch buttons are
  shake: boolean;       // camera shake on impacts
  gentle: boolean;      // reduced sensory intensity (softer haptics/shake/flashes)
  highContrast: boolean; // hazards get a bold outline + stripe pattern
  language: 'en';
}

export const defaultSettings = (): SettingsData => ({
  version: SAVE_VERSION,
  music: 6,
  sfx: 8,
  haptics: true,
  reducedMotion: false,
  controlScale: 1,
  controlSpread: false,
  controlOpacity: 0.6,
  shake: true,
  gentle: false,
  highContrast: false,
  language: 'en',
});

export const defaultSave = (): SaveData => ({
  version: SAVE_VERSION,
  unlockedThrough: 0,
  levels: {},
  deaths: 0,
  achievements: [],
  seenTips: [],
  noDeathStreak: 0,
  bestNoDeathStreak: 0,
});

const isObj = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;
const clampInt = (v: unknown, min: number, max: number, dflt: number) =>
  typeof v === 'number' && Number.isFinite(v) ? Math.min(max, Math.max(min, Math.round(v))) : dflt;

/** Parse + sanitize save JSON. Corrupt input → fresh save (never throws). */
export function decodeSave(raw: string | null): SaveData {
  const base = defaultSave();
  if (!raw) return base;
  try {
    const j = JSON.parse(raw);
    if (!isObj(j) || typeof j.version !== 'number' || j.version > SAVE_VERSION) return base;
    base.unlockedThrough = clampInt(j.unlockedThrough, 0, 39, 0);
    base.deaths = clampInt(j.deaths, 0, 1e7, 0);
    base.noDeathStreak = clampInt(j.noDeathStreak, 0, 1e6, 0);
    base.bestNoDeathStreak = clampInt(j.bestNoDeathStreak, 0, 1e6, 0);
    if (isObj(j.levels)) {
      for (const [k, v] of Object.entries(j.levels)) {
        if (!/^\d-\d$/.test(k) || !isObj(v)) continue;
        base.levels[k] = {
          completed: v.completed === true,
          bestAttempts: clampInt(v.bestAttempts, 0, 99999, 0),
          totalAttempts: clampInt(v.totalAttempts, 0, 999999, 0),
          firstTry: v.firstTry === true,
        };
      }
    }
    if (Array.isArray(j.achievements)) base.achievements = j.achievements.filter((a) => typeof a === 'string');
    if (Array.isArray(j.seenTips)) base.seenTips = j.seenTips.filter((a) => typeof a === 'string');
    return base;
  } catch {
    return base;
  }
}

export function encodeSave(data: SaveData): string {
  return JSON.stringify(data);
}

export function decodeSettings(raw: string | null): SettingsData {
  const base = defaultSettings();
  if (!raw) return base;
  try {
    const j = JSON.parse(raw);
    if (!isObj(j) || j.version !== SAVE_VERSION) return base;
    base.music = clampInt(j.music, 0, 10, base.music);
    base.sfx = clampInt(j.sfx, 0, 10, base.sfx);
    base.haptics = j.haptics === true;
    base.reducedMotion = j.reducedMotion === true;
    base.controlScale = typeof j.controlScale === 'number' ? Math.min(1.4, Math.max(0.8, j.controlScale)) : 1;
    base.controlSpread = j.controlSpread === true;
    base.controlOpacity = typeof j.controlOpacity === 'number' ? Math.min(1, Math.max(0.3, j.controlOpacity)) : base.controlOpacity;
    base.shake = j.shake !== false;
    base.gentle = j.gentle === true;
    base.highContrast = j.highContrast === true;
    return base;
  } catch {
    return base;
  }
}

export function encodeSettings(s: SettingsData): string {
  return JSON.stringify(s);
}
