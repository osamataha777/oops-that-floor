import { SaveData } from './save';

export interface AchievementDef {
  id: string;
  title: string;
  blurb: string;
  /** Evaluate against post-mutation save + the triggering context. */
  test: (save: SaveData, ctx: AchievementCtx) => boolean;
}

export interface AchievementCtx {
  kind: 'death' | 'complete' | 'secret';
  levelId?: string;
  attemptsUsed?: number;
  chapterIds?: Record<number, string[]>;
  totalLevels?: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first-blood',
    title: 'Floor 1, You 0',
    blurb: 'Die for the first time.',
    test: (s, c) => c.kind === 'death' && s.deaths >= 1,
  },
  {
    id: 'persistent',
    title: 'Persistent Little Guy',
    blurb: 'Die 50 times and keep going.',
    test: (s) => s.deaths >= 50,
  },
  {
    id: 'centurion',
    title: 'A Hundred Betrayals',
    blurb: 'Die 100 times.',
    test: (s) => s.deaths >= 100,
  },
  {
    id: 'first-try',
    title: 'One And Done',
    blurb: 'Finish a level on the first try.',
    test: (s, c) => c.kind === 'complete' && c.attemptsUsed === 1,
  },
  {
    id: 'streak-5',
    title: 'Untouchable',
    blurb: 'Finish five levels in a row without dying.',
    test: (s) => s.bestNoDeathStreak >= 5,
  },
  {
    id: 'determination',
    title: 'Determination.exe',
    blurb: 'Finish a level after 15+ attempts.',
    test: (s, c) => c.kind === 'complete' && (c.attemptsUsed ?? 0) >= 15,
  },
  {
    id: 'chapter-1',
    title: 'Trust Issues: Acquired',
    blurb: 'Finish Chapter 1.',
    test: (s, c) => chapterDone(s, c, 1),
  },
  {
    id: 'chapter-5',
    title: 'Graduated With Honors',
    blurb: 'Finish Chapter 5.',
    test: (s, c) => chapterDone(s, c, 5),
  },
  {
    id: 'all-clear',
    title: 'The Floor Accepts You',
    blurb: 'Finish every level.',
    test: (s, c) => Object.values(s.levels).filter((l) => l.completed).length >= (c.totalLevels ?? 40),
  },
  {
    id: 'snooper',
    title: 'Snoop',
    blurb: 'Find a secret spot.',
    test: (_s, c) => c.kind === 'secret',
  },
];

function chapterDone(s: SaveData, c: AchievementCtx, ch: number): boolean {
  const ids = c.chapterIds?.[ch];
  if (!ids) return false;
  return ids.every((id) => s.levels[id]?.completed);
}

/** Returns newly unlocked achievement defs (save is mutated in place). */
export function evaluateAchievements(save: SaveData, ctx: AchievementCtx): AchievementDef[] {
  const won: AchievementDef[] = [];
  for (const a of ACHIEVEMENTS) {
    if (save.achievements.includes(a.id)) continue;
    try {
      if (a.test(save, ctx)) {
        save.achievements.push(a.id);
        won.push(a);
      }
    } catch {
      /* defensive — never let an achievement crash gameplay */
    }
  }
  return won;
}
