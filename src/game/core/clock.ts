import Phaser from 'phaser';

/**
 * Phaser 3.60+ tweens measure time with Date.now(), independent of the game
 * loop. That lets visual tweens drift from physics and timers whenever a
 * frame stalls, and makes replays non-deterministic. Drive every
 * TweenManager from the game loop's delta instead — the same clock the
 * physics step, scene timers and traps use. Pausing still works (the
 * manager's `paused` flag short-circuits `update`).
 */
export function installGameClockTweens(): void {
  const proto = Phaser.Tweens.TweenManager.prototype as unknown as {
    getDelta: (tick?: boolean) => number;
    __gameClock?: boolean;
    scene: Phaser.Scene;
  };
  if (proto.__gameClock) return;
  proto.__gameClock = true;
  proto.getDelta = function (this: { scene: Phaser.Scene }) {
    const d = this.scene?.sys?.game?.loop?.delta ?? 16.67;
    return Math.max(0, Math.min(50, d));
  };
}
