import { describe, it, expect } from 'vitest';
import { decodeSave, encodeSave, decodeSettings, encodeSettings, defaultSave, defaultSettings } from '../../src/services/save';
import { recordAttempt, recordCompletion, isUnlocked, completionCount } from '../../src/services/progress';

describe('save decode', () => {
  it('returns defaults on null', () => {
    expect(decodeSave(null)).toEqual(defaultSave());
  });
  it('recovers from corrupted JSON', () => {
    expect(decodeSave('{{{not json')).toEqual(defaultSave());
    expect(decodeSave('{"version":99,"unlockedThrough":5000}').unlockedThrough).toBe(0);
  });
  it('sanitizes out-of-range values', () => {
    const s = decodeSave(JSON.stringify({ version: 1, unlockedThrough: 999, deaths: -5, levels: { '1-1': { completed: true, bestAttempts: 3, totalAttempts: 4, firstTry: false } } }));
    expect(s.unlockedThrough).toBe(39);
    expect(s.deaths).toBe(0);
    expect(s.levels['1-1'].completed).toBe(true);
    expect(s.levels['1-1'].bestAttempts).toBe(3);
  });
  it('drops malformed level records', () => {
    const s = decodeSave(JSON.stringify({ version: 1, levels: { bogus: { completed: true }, '1-2': 'nope' } }));
    expect(s.levels.bogus).toBeUndefined();
    expect(s.levels['1-2']).toBeUndefined();
  });
  it('round-trips', () => {
    const s = defaultSave();
    s.unlockedThrough = 7;
    s.deaths = 42;
    s.achievements = ['first-blood'];
    expect(decodeSave(encodeSave(s))).toEqual(s);
  });
});

describe('settings decode', () => {
  it('defaults on garbage', () => {
    expect(decodeSettings('x')).toEqual(defaultSettings());
  });
  it('clamps volumes', () => {
    const s = decodeSettings(JSON.stringify({ version: 1, music: 50, sfx: -3, haptics: true }));
    expect(s.music).toBe(10);
    expect(s.sfx).toBe(0);
    expect(s.haptics).toBe(true);
  });
  it('round-trips', () => {
    const s = defaultSettings();
    s.music = 3;
    s.controlScale = 1.2;
    expect(decodeSettings(encodeSettings(s))).toEqual(s);
  });
});

describe('progress', () => {
  it('records attempts/deaths', () => {
    const s = defaultSave();
    recordAttempt(s, '1-1');
    recordAttempt(s, '1-1');
    expect(s.deaths).toBe(2);
    expect(s.levels['1-1'].totalAttempts).toBe(2);
  });
  it('unlocks next level on completion', () => {
    const s = defaultSave();
    const r = recordCompletion(s, '1-1', 0, 3, 40, '1-2', ['1-1', '1-2']);
    expect(s.unlockedThrough).toBe(1);
    expect(isUnlocked(s, 1)).toBe(true);
    expect(r.events.some((e) => e.type === 'unlocked' && e.id === '1-2')).toBe(true);
    expect(s.levels['1-1'].bestAttempts).toBe(3);
  });
  it('detects first-try clears', () => {
    const s = defaultSave();
    const r = recordCompletion(s, '1-1', 0, 1, 40, '1-2', ['1-1']);
    expect(r.firstTry).toBe(true);
    expect(s.noDeathStreak).toBe(1);
  });
  it('emits chapter-complete when all 8 done', () => {
    const s = defaultSave();
    const ids = Array.from({ length: 8 }, (_, i) => `1-${i + 1}`);
    ids.slice(0, 7).forEach((id, i) => recordCompletion(s, id, i, 2, 40, ids[i + 1], ids));
    const r = recordCompletion(s, '1-8', 7, 2, 40, '2-1', ids);
    expect(r.events.some((e) => e.type === 'chapter-complete')).toBe(true);
  });
  it('counts completions', () => {
    const s = defaultSave();
    recordCompletion(s, '1-1', 0, 1, 40, '1-2', ['1-1']);
    recordCompletion(s, '1-2', 1, 2, 40, '1-3', ['1-2']);
    expect(completionCount(s)).toBe(2);
  });
});
