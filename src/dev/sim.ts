import Phaser from 'phaser';

/**
 * Deterministic replay harness (test/QA tooling, ~2 KB, inert unless called).
 *
 * Pauses the real-time loop and steps the *actual* game — scenes, Arcade
 * physics, traps, tweens, timers — at an exact 60 Hz with no rendering.
 * Input goes through `InputManager.scripted`, the same InputState the touch
 * router and keyboard produce, so a replay exercises real movement code.
 *
 * Program DSL — space-separated segments of held controls + frame count:
 *   R30   hold right 30 frames        RJ12  right + jump held 12 frames
 *   L8    left 8                      J6    jump only        _20  nothing
 *   W     wait (no input) until control returns after a death
 * A jump *press* happens on the first frame of any J segment that follows a
 * segment without J (use `_1` between two jumps to re-press).
 */

export interface SimResult {
  level: string;
  completed: boolean;
  deaths: number;
  causes: string[];
  frames: number;
  completeFrame: number | null;
  final: { x: number; y: number; state: string };
  trace: [number, number][];
  illegalTransitions: number;
}

type Seg = { dir: -1 | 0 | 1; jump: boolean; frames: number; wait?: boolean };

export function parseProgram(src: string): Seg[] {
  const out: Seg[] = [];
  for (const tok of src.trim().split(/\s+/)) {
    if (!tok) continue;
    if (tok === 'W') {
      out.push({ dir: 0, jump: false, frames: 0, wait: true });
      continue;
    }
    const m = /^([LRJ_]+)(\d+)$/.exec(tok);
    if (!m) throw new Error(`bad sim token '${tok}'`);
    const keys = m[1];
    const dir = keys.includes('L') && !keys.includes('R') ? -1 : keys.includes('R') && !keys.includes('L') ? 1 : 0;
    out.push({ dir, jump: keys.includes('J'), frames: Number(m[2]) });
  }
  return out;
}

const DT = 1000 / 60;

export function installSim(game: Phaser.Game): void {
  let t = 0;
  const step = (n = 1) => {
    for (let i = 0; i < n; i++) {
      t += DT;
      // tweens read the loop delta (see core/clock.ts)
      (game.loop as unknown as { delta: number }).delta = DT;
      game.headlessStep(t, DT);
    }
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const gs = () => game.scene.getScene('Game') as any;

  const api = {
    /** Run `program` on level `index` from a fresh start. */
    run(index: number, program: string, opts: { tail?: number; settle?: boolean } = {}): SimResult {
      const segs = parseProgram(program);
      game.loop.sleep();
      t = game.loop.now || performance.now();
      for (const s of game.scene.getScenes(true)) if (s.scene.key !== 'Game') game.scene.stop(s.scene.key);
      game.scene.start('Game', { index });
      for (let i = 0; i < 90 && gs()?.state !== 'playing'; i++) step();
      const scene = gs();
      if (!scene || scene.state !== 'playing') throw new Error('Game scene never reached playing');
      const trace: [number, number][] = [];
      const causes: string[] = [];
      let frames = 0;
      let completeFrame: number | null = null;
      let prevJump = false;
      let lastDeaths = 0;
      const tick = (dir: -1 | 0 | 1, jump: boolean) => {
        scene.ctl.scripted = { dir, jumpDown: jump && !prevJump, jumpHeld: jump };
        prevJump = jump;
        step();
        frames++;
        if (frames % 4 === 0) trace.push([Math.round(scene.player.x), Math.round(scene.player.y)]);
        if (scene.deathsThisVisit !== lastDeaths) {
          lastDeaths = scene.deathsThisVisit;
          causes.push(`${frames}:${Math.round(scene.player.x)},${Math.round(scene.player.y)}`);
        }
        if (scene.state === 'complete' && completeFrame === null) completeFrame = frames;
      };
      outer: for (const s of segs) {
        if (s.wait) {
          for (let i = 0; i < 240 && scene.state !== 'playing'; i++) tick(0, false);
          continue;
        }
        for (let i = 0; i < s.frames; i++) {
          tick(s.dir, s.jump);
          if (completeFrame !== null) break outer;
        }
      }
      for (let i = 0; i < (opts.tail ?? 90) && completeFrame === null; i++) tick(0, false);
      scene.ctl.scripted = null;
      const res: SimResult = {
        level: scene.def.id,
        completed: completeFrame !== null,
        deaths: scene.deathsThisVisit,
        causes,
        frames,
        completeFrame,
        final: { x: Math.round(scene.player.x), y: Math.round(scene.player.y), state: scene.state },
        trace,
        illegalTransitions: scene.illegalTransitions,
      };
      if (opts.settle !== false) game.loop.wake();
      return res;
    },
    step,
  };
  (window as unknown as { __otfSim: typeof api }).__otfSim = api;
}
