import { LevelDef } from './types';
import { CH1 } from './ch1';
import { CH2 } from './ch2';
import { CH3 } from './ch3';
import { CH4 } from './ch4';
import { CH5 } from './ch5';

export const LEVELS: LevelDef[] = [...CH1, ...CH2, ...CH3, ...CH4, ...CH5];

export function levelAt(linearIndex: number): LevelDef {
  return LEVELS[Math.min(LEVELS.length - 1, Math.max(0, linearIndex))];
}

export function indexOfLevel(id: string): number {
  return LEVELS.findIndex((l) => l.id === id);
}

export function chapterIds(chapter: number): string[] {
  return LEVELS.filter((l) => l.chapter === chapter).map((l) => l.id);
}
