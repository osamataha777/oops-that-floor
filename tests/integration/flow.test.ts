import { describe, it, expect } from 'vitest';
import { defaultSave } from '../../src/services/save';
import { recordAttempt, recordCompletion, isUnlocked } from '../../src/services/progress';
import { evaluateAchievements } from '../../src/services/achievements';
import { LEVELS, levelAt, chapterIds } from '../../src/game/levels/index';
import { encodeChallenge, decodeChallenge } from '../../src/services/challenge';
import { decodeSave, encodeSave } from '../../src/services/save';

const CH_IDS = { 1: chapterIds(1), 2: chapterIds(2), 3: chapterIds(3), 4: chapterIds(4), 5: chapterIds(5) };

/** Simulate a playthrough: die twice then clear, for every level in order. */
function simulatePlaythrough() {
  const save = defaultSave();
  const unlockedAchievements: string[] = [];
  for (let i = 0; i < LEVELS.length; i++) {
    const lvl = levelAt(i);
    if (!isUnlocked(save, i)) throw new Error(`level ${lvl.id} should be unlocked`);
    recordAttempt(save, lvl.id);
    recordAttempt(save, lvl.id);
    evaluateAchievements(save, { kind: 'death', levelId: lvl.id }).forEach((a) => unlockedAchievements.push(a.id));
    const next = i + 1 < LEVELS.length ? levelAt(i + 1).id : null;
    recordCompletion(save, lvl.id, i, 3, LEVELS.length, next, CH_IDS[lvl.chapter as 1 | 2 | 3 | 4 | 5]);
    evaluateAchievements(save, { kind: 'complete', levelId: lvl.id, attemptsUsed: 3, chapterIds: CH_IDS, totalLevels: LEVELS.length }).forEach((a) => unlockedAchievements.push(a.id));
  }
  return { save, unlockedAchievements };
}

describe('full game flow', () => {
  it('progresses sequentially through all 40 levels', () => {
    const { save } = simulatePlaythrough();
    expect(save.unlockedThrough).toBe(39);
    expect(save.deaths).toBe(80);
    expect(Object.values(save.levels).filter((l) => l.completed)).toHaveLength(40);
  });
  it('earns achievements along the way', () => {
    const { save, unlockedAchievements } = simulatePlaythrough();
    expect(unlockedAchievements).toContain('first-blood');
    expect(unlockedAchievements).toContain('persistent');
    expect(unlockedAchievements).toContain('chapter-1');
    expect(unlockedAchievements).toContain('all-clear');
    expect(save.achievements.length).toBeGreaterThanOrEqual(5);
  });
  it('persists and restores progress (restart simulation)', () => {
    const { save } = simulatePlaythrough();
    const restored = decodeSave(encodeSave(save));
    expect(restored.unlockedThrough).toBe(39);
    expect(restored.deaths).toBe(80);
    expect(restored.levels['5-8'].completed).toBe(true);
  });
  it('challenge codes survive a full round-trip into level indices', () => {
    const idx = 23;
    const code = encodeChallenge({ levelIndex: idx, deaths: 4 });
    const dec = decodeChallenge(code, LEVELS.length - 1)!;
    expect(levelAt(dec.levelIndex).id).toBe('3-8');
    expect(dec.deaths).toBe(4);
  });
});
