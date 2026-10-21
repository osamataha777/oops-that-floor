import { describe, it, expect } from 'vitest';
import { FeedbackManager, FeedbackPrefs, HAPTIC_GAP_MS, PROFILES } from '../../src/game/feedback/FeedbackManager';

function rig(prefs: Partial<FeedbackPrefs> = {}) {
  let now = 1000;
  const sfx: string[] = [];
  const haptics: string[] = [];
  const shakes: [number, number][] = [];
  const p: FeedbackPrefs = { haptics: true, shake: true, reducedMotion: false, gentle: false, ...prefs };
  const fm = new FeedbackManager({ sfx: (n) => sfx.push(n), haptic: (k) => haptics.push(k), now: () => now }, () => p);
  fm.attachShake((ms, k) => shakes.push([ms, k]));
  return { fm, sfx, haptics, shakes, p, tick: (ms: number) => (now += ms) };
}

describe('FeedbackManager', () => {
  it('routes a death to sound + heavy haptic + shake', () => {
    const r = rig();
    r.fm.emit('death.spikes');
    expect(r.sfx).toEqual(['pop']);
    expect(r.haptics).toEqual(['heavy']);
    expect(r.shakes.length).toBe(1);
  });

  it('never buzzes on a plain jump', () => {
    const r = rig();
    r.fm.emit('player.jump');
    expect(r.haptics).toEqual([]);
    expect(r.sfx.length).toBe(1);
  });

  it('debounces repeats of the same event inside its gap', () => {
    const r = rig();
    r.fm.emit('trap.crumble');
    r.tick(20);
    r.fm.emit('trap.crumble');
    expect(r.sfx.length).toBe(1);
    r.tick(PROFILES['trap.crumble'].gapMs! + 1);
    r.fm.emit('trap.crumble');
    expect(r.sfx.length).toBe(2);
  });

  it('spaces haptics globally, but a higher priority pulse may cut in', () => {
    const r = rig();
    r.fm.emit('trap.plate'); // light, prio 0
    r.tick(10);
    r.fm.emit('trap.crumble'); // light, prio 0 → dropped (global gap)
    expect(r.haptics).toEqual(['light']);
    r.tick(10);
    r.fm.emit('death.crush'); // heavy, prio 3 → allowed
    expect(r.haptics).toEqual(['light', 'heavy']);
    r.tick(Math.max(HAPTIC_GAP_MS, PROFILES['trap.plate'].gapMs!) + 1);
    r.fm.emit('trap.plate');
    expect(r.haptics.length).toBe(3);
  });

  it('respects the haptics toggle, gentle mode and reduced motion', () => {
    const off = rig({ haptics: false });
    off.fm.emit('death.crush');
    expect(off.haptics).toEqual([]);

    const gentle = rig({ gentle: true });
    gentle.fm.emit('death.crush');
    expect(gentle.haptics).toEqual(['medium']);
    expect(gentle.shakes[0][1]).toBeLessThan(PROFILES['death.crush'].shake![1]);

    const rm = rig({ reducedMotion: true });
    rm.fm.emit('death.crush');
    expect(rm.shakes).toEqual([]);
    const noShake = rig({ shake: false });
    noShake.fm.emit('death.crush');
    expect(noShake.shakes).toEqual([]);
  });

  it('round-robins jump variants and layers the goal fanfare', () => {
    const r = rig();
    r.fm.emit('player.jump');
    r.tick(100);
    r.fm.emit('player.jump');
    expect(r.sfx).toEqual(['jump', 'jump2']);
    r.fm.emit('goal.reach');
    expect(r.sfx.slice(2)).toEqual(['goal', 'confetti']);
  });

  it('does not shake after the scene detaches its camera', () => {
    const r = rig();
    r.fm.attachShake(null);
    r.fm.emit('death.crush');
    expect(r.shakes).toEqual([]);
  });

  it('every profile names a real synth patch', async () => {
    const { SFX } = await import('../../src/game/audio/synth');
    for (const [ev, p] of Object.entries(PROFILES)) {
      const names = Array.isArray(p.sfx) ? p.sfx : p.sfx ? [p.sfx] : [];
      for (const n of names) expect(SFX[n], `${ev} → ${n}`).toBeTypeOf('function');
    }
  });
});
