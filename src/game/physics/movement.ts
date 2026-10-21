/**
 * Pure player-movement math, independent of Phaser — unit-tested directly.
 * Positive `dir` = right, negative = left, 0 = no input.
 */
export interface MoveConfig {
  maxSpeed: number;
  accel: number;
  decel: number;
  airAccel: number;
  jumpVelocity: number;
  jumpCutFactor: number;
  coyoteMs: number;
  bufferMs: number;
  maxFall: number;
}

/** Approach `target` by `amount`, never overshooting. */
export function approach(current: number, target: number, amount: number): number {
  if (current < target) return Math.min(current + amount, target);
  if (current > target) return Math.max(current - amount, target);
  return current;
}

/**
 * Next horizontal velocity for a frame.
 * Ground deceleration is stronger than acceleration so stops feel crisp.
 */
export function nextVelocityX(
  vx: number,
  dir: -1 | 0 | 1,
  grounded: boolean,
  dtSec: number,
  cfg: MoveConfig,
): number {
  const target = dir * cfg.maxSpeed;
  if (dir !== 0) {
    const a = (grounded ? cfg.accel : cfg.airAccel) * dtSec;
    // Accelerating past maxSpeed is clamped; turning around gets accel + decel snap.
    if (Math.sign(vx) === -dir && vx !== 0) {
      return approach(vx, target, (a + cfg.decel * dtSec));
    }
    return Math.abs(vx) < cfg.maxSpeed ? approach(vx, target, a) : approach(vx, target, cfg.decel * dtSec);
  }
  return approach(vx, 0, cfg.decel * dtSec * (grounded ? 1 : 0.55));
}

/** Variable jump height: releasing jump early clamps upward velocity. `gSign` handles flipped gravity. */
export function applyJumpCut(vy: number, gSign: 1 | -1, cfg: MoveConfig): number {
  const rising = gSign === 1 ? vy < 0 : vy > 0;
  if (!rising) return vy;
  return vy * cfg.jumpCutFactor;
}

/** Clamp fall speed respecting gravity direction. */
export function clampFall(vy: number, gSign: 1 | -1, cfg: MoveConfig): number {
  if (gSign === 1) return Math.min(vy, cfg.maxFall);
  return Math.max(vy, -cfg.maxFall);
}

/**
 * Coyote-time + jump-buffer bookkeeping. Drive `update` once per frame,
 * call `press()` on jump-down edge, `tryConsume()` when you want to jump.
 */
export class JumpAssist {
  private lastGroundedAt = -Infinity;
  private bufferedAt = -Infinity;

  constructor(private cfg: MoveConfig) {}

  update(grounded: boolean, nowMs: number): void {
    if (grounded) this.lastGroundedAt = nowMs;
  }

  press(nowMs: number): void {
    this.bufferedAt = nowMs;
  }

  /** True when a jump may start right now (grounded, or within coyote window). */
  canJump(nowMs: number): boolean {
    return nowMs - this.lastGroundedAt <= this.cfg.coyoteMs;
  }

  /** True if a buffered press is still waiting and can be consumed. */
  bufferedJumpReady(nowMs: number): boolean {
    return nowMs - this.bufferedAt <= this.cfg.bufferMs;
  }

  /** Consume both windows; returns true when a jump should fire. */
  tryConsume(nowMs: number): boolean {
    if (this.bufferedJumpReady(nowMs) && this.canJump(nowMs)) {
      this.bufferedAt = -Infinity;
      this.lastGroundedAt = -Infinity;
      return true;
    }
    return false;
  }

  reset(): void {
    this.lastGroundedAt = -Infinity;
    this.bufferedAt = -Infinity;
  }
}

/** A jump always rises for at least this long before a release can cut it. */
export const MIN_JUMP_MS = 50;

/** Extra gravity while falling (multiplier on world gravity). Rise stays 1×. */
export const FALL_GRAVITY_MUL = 1.22;

/**
 * Per-body extra gravity: zero while rising, (mul−1)×world gravity while
 * falling. Sign follows the world so flipped gravity works unchanged.
 */
export function fallGravityExtra(vy: number, gSign: 1 | -1, worldGravityY: number, mul = FALL_GRAVITY_MUL): number {
  const falling = vy * gSign > 0;
  return falling ? worldGravityY * (mul - 1) : 0;
}
