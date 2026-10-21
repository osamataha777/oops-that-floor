import { describe, it, expect } from 'vitest';
import { approach, nextVelocityX, applyJumpCut, clampFall, JumpAssist, MoveConfig } from '../../src/game/physics/movement';
import { PHYSICS } from '../../src/game/core/config';

const cfg: MoveConfig = PHYSICS;

describe('approach', () => {
  it('moves toward target without overshoot', () => {
    expect(approach(0, 100, 30)).toBe(30);
    expect(approach(90, 100, 30)).toBe(100);
    expect(approach(100, 0, 130)).toBe(0);
    expect(approach(-50, -100, 30)).toBe(-80);
  });
});

describe('nextVelocityX', () => {
  it('accelerates toward max speed', () => {
    const v = nextVelocityX(0, 1, true, 0.016, cfg);
    expect(v).toBeGreaterThan(0);
    expect(v).toBeLessThanOrEqual(cfg.maxSpeed);
  });
  it('reaches max speed and stays', () => {
    let v = 0;
    for (let i = 0; i < 60; i++) v = nextVelocityX(v, 1, true, 0.016, cfg);
    expect(v).toBeCloseTo(cfg.maxSpeed, 0);
    v = nextVelocityX(v, 1, true, 0.016, cfg);
    expect(v).toBe(cfg.maxSpeed);
  });
  it('decelerates to stop on no input', () => {
    let v = cfg.maxSpeed;
    for (let i = 0; i < 60; i++) v = nextVelocityX(v, 0, true, 0.016, cfg);
    expect(v).toBe(0);
  });
  it('turns around faster than raw accel', () => {
    const turnDelta = nextVelocityX(-cfg.maxSpeed, 1, true, 0.016, cfg) - -cfg.maxSpeed;
    const fromStopDelta = nextVelocityX(0, 1, true, 0.016, cfg);
    expect(turnDelta).toBeGreaterThan(fromStopDelta);
  });
});

describe('variable jump', () => {
  it('cuts upward velocity on early release', () => {
    const cut = applyJumpCut(cfg.jumpVelocity, 1, cfg);
    expect(cut).toBeCloseTo(cfg.jumpVelocity * cfg.jumpCutFactor);
    expect(Math.abs(cut)).toBeLessThan(Math.abs(cfg.jumpVelocity));
  });
  it('does not cut while already falling', () => {
    expect(applyJumpCut(300, 1, cfg)).toBe(300);
  });
  it('handles flipped gravity', () => {
    const cut = applyJumpCut(-cfg.jumpVelocity, -1, cfg); // rising under flipped gravity = +vy... wait
    expect(cut).toBeCloseTo(-cfg.jumpVelocity * cfg.jumpCutFactor);
    expect(applyJumpCut(-500, -1, cfg)).toBe(-500); // "falling" under flipped g
  });
});

describe('clampFall', () => {
  it('caps fall speed both directions', () => {
    expect(clampFall(5000, 1, cfg)).toBe(cfg.maxFall);
    expect(clampFall(-5000, -1, cfg)).toBe(-cfg.maxFall);
    expect(clampFall(100, 1, cfg)).toBe(100);
  });
});

describe('JumpAssist (coyote + buffer)', () => {
  it('allows jump right after leaving ground (coyote)', () => {
    const a = new JumpAssist(cfg);
    a.update(true, 0);
    a.update(false, 50);
    a.press(50);
    expect(a.tryConsume(50)).toBe(true);
  });
  it('denies jump after coyote expires', () => {
    const a = new JumpAssist(cfg);
    a.update(true, 0);
    a.update(false, cfg.coyoteMs + 50);
    a.press(cfg.coyoteMs + 50);
    expect(a.tryConsume(cfg.coyoteMs + 50)).toBe(false);
  });
  it('fires buffered jump on landing (buffer)', () => {
    const a = new JumpAssist(cfg);
    a.update(false, 0);
    a.press(50); // pressed mid-air
    a.update(true, 50 + cfg.bufferMs - 10); // lands within window
    expect(a.tryConsume(50 + cfg.bufferMs - 10)).toBe(true);
  });
  it('drops stale buffer', () => {
    const a = new JumpAssist(cfg);
    a.press(0);
    a.update(true, cfg.bufferMs + 100);
    expect(a.tryConsume(cfg.bufferMs + 100)).toBe(false);
  });
  it('consumes once', () => {
    const a = new JumpAssist(cfg);
    a.update(true, 0);
    a.press(0);
    expect(a.tryConsume(0)).toBe(true);
    expect(a.tryConsume(10)).toBe(false);
  });
});
