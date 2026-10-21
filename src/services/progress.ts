import { LevelRecord, SaveData } from './save';

/**
 * Pure progression rules over SaveData. `linearIndex` = chapter*8+index order
 * across all 40 levels (level list order, not id string order).
 */
export interface ProgressEvent {
  type: 'unlocked' | 'achievement' | 'chapter-complete';
  id: string;
}

export function recordAttempt(save: SaveData, levelId: string): void {
  const rec = ensure(save, levelId);
  rec.totalAttempts += 1;
  save.deaths += 1;
  save.noDeathStreak = 0;
}

export function recordStart(save: SaveData, levelId: string): void {
  ensure(save, levelId).totalAttempts += 1;
}

export interface CompletionResult {
  events: ProgressEvent[];
  firstTry: boolean;
  improved: boolean;
}

/**
 * Record a level completion.
 * @param attemptsUsed attempts spent on THIS successful visit (1 = first try)
 */
export function recordCompletion(
  save: SaveData,
  levelId: string,
  linearIndex: number,
  attemptsUsed: number,
  totalLevels: number,
  nextLevelId: string | null,
  levelIdsInChapter: string[],
): CompletionResult {
  const rec = ensure(save, levelId);
  const events: ProgressEvent[] = [];
  const firstTry = attemptsUsed === 1 && !rec.completed;
  const improved = !rec.completed || attemptsUsed < rec.bestAttempts || rec.bestAttempts === 0;

  rec.completed = true;
  if (rec.bestAttempts === 0 || attemptsUsed < rec.bestAttempts) rec.bestAttempts = attemptsUsed;
  if (firstTry) rec.firstTry = true;
  rec.totalAttempts += Math.max(0, attemptsUsed - 0); // attempts counted per death/start elsewhere; keep as visit attempts
  save.completedAt = save.completedAt ?? {};
  save.completedAt[levelId] = Date.now();

  if (save.noDeathStreak === 0 && attemptsUsed === 1) {
    // no-death streak counts consecutive first-try finishes
  }
  if (attemptsUsed === 1) save.noDeathStreak += 1;
  else save.noDeathStreak = 0;
  if (save.noDeathStreak > save.bestNoDeathStreak) save.bestNoDeathStreak = save.noDeathStreak;

  if (linearIndex + 1 < totalLevels && save.unlockedThrough < linearIndex + 1) {
    save.unlockedThrough = linearIndex + 1;
    if (nextLevelId) events.push({ type: 'unlocked', id: nextLevelId });
  }
  const chapterDone = levelIdsInChapter.every((id) => ensure(save, id).completed);
  if (chapterDone) events.push({ type: 'chapter-complete', id: levelId.split('-')[0] });
  return { events, firstTry, improved };
}

export function isUnlocked(save: SaveData, linearIndex: number): boolean {
  return linearIndex <= save.unlockedThrough;
}

export function completionCount(save: SaveData): number {
  return Object.values(save.levels).filter((l) => l.completed).length;
}

export function chapterCompletion(save: SaveData, ids: string[]): { done: number; total: number } {
  return { done: ids.filter((id) => save.levels[id]?.completed).length, total: ids.length };
}

function ensure(save: SaveData, id: string): LevelRecord {
  if (!save.levels[id]) save.levels[id] = { completed: false, bestAttempts: 0, totalAttempts: 0, firstTry: false };
  return save.levels[id];
}
