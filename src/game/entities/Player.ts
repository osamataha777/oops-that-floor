import Phaser from 'phaser';
import { PHYSICS } from '../core/config';
import { nextVelocityX, applyJumpCut, clampFall, JumpAssist, MoveConfig } from '../physics/movement';
import { InputState } from '../ui/TouchControls';

export type PlayerEvent = 'jump' | 'land' | 'turn';

/**
 * Pip — the little guy. An Arcade sprite with squash-and-stretch feel.
 * Movement math lives in physics/movement.ts (pure, unit-tested).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly cfg: MoveConfig = PHYSICS;
  assist = new JumpAssist(PHYSICS);
  private wasGrounded = false;
  private runFrame = 0;
  private runTimer = 0;
  private dead = false;
  facing: 1 | -1 = 1;

  onEvent?: (e: PlayerEvent) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'pip-idle');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.body!.setSize(20, 26);
    this.body!.setOffset(10, 16);
    this.setCollideWorldBounds(false);
    this.setDepth(10);
    (this.body as Phaser.Physics.Arcade.Body).setMaxVelocity(this.cfg.maxSpeed * 1.6, this.cfg.maxFall * 1.2);
  }

  get gSign(): 1 | -1 {
    return (this.scene.physics.world.gravity.y >= 0 ? 1 : -1) as 1 | -1;
  }

  get grounded(): boolean {
    const b = this.body as Phaser.Physics.Arcade.Body;
    return this.gSign === 1 ? b.blocked.down || b.touching.down : b.blocked.up || b.touching.up;
  }

  update(dtMs: number, input: InputState): void {
    if (this.dead || !this.body) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const dt = dtMs / 1000;
    const grounded = this.grounded;

    this.assist.update(grounded, now);
    if (input.jumpDown) this.assist.press(now);

    body.setVelocityX(nextVelocityX(body.velocity.x, input.dir, grounded, dt, this.cfg));

    if (this.assist.tryConsume(now)) {
      body.setVelocityY(this.cfg.jumpVelocity * this.gSign); // jump always opposes gravity
      this.setTexture('pip-jump');
      this.squash(0.78, 1.22);
      this.onEvent?.('jump');
    }

    // Variable jump height.
    if (!input.jumpHeld) {
      const cut = applyJumpCut(body.velocity.y, this.gSign, this.cfg);
      if (cut !== body.velocity.y) body.setVelocityY(cut);
    }
    body.setVelocityY(clampFall(body.velocity.y, this.gSign, this.cfg));

    if (!this.wasGrounded && grounded) {
      this.squash(1.22, 0.8);
      this.onEvent?.('land');
    }
    this.wasGrounded = grounded;

    // Facing + run frames.
    if (input.dir !== 0) {
      this.facing = input.dir;
      this.setFlipX(input.dir < 0);
    }
    if (grounded && Math.abs(body.velocity.x) > 30) {
      this.runTimer += dtMs;
      if (this.runTimer > 90) {
        this.runTimer = 0;
        this.runFrame = 1 - this.runFrame;
        this.setTexture(this.runFrame ? 'pip-run1' : 'pip-run2');
      }
    } else if (grounded) {
      this.setTexture('pip-idle');
      this.runTimer = 90; // first step starts instantly
    } else if (body.velocity.y * this.gSign > 120) {
      this.setTexture('pip-fall');
    }
  }

  /** Quick procedural squash/stretch — returns a tween, respects reduced motion upstream. */
  squash(sx: number, sy: number): void {
    this.scene.tweens.killTweensOf(this);
    this.scene.tweens.add({
      targets: this,
      scaleX: sx,
      scaleY: sy,
      duration: 70,
      yoyo: true,
      ease: 'Quad.easeOut',
      onComplete: () => this.setScale(1),
    });
  }

  shocked(): void {
    this.setTexture('pip-shock');
  }

  killInstant(): void {
    this.dead = true;
    (this.body as Phaser.Physics.Arcade.Body).enable = false;
  }

  revive(x: number, y: number): void {
    this.dead = false;
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.enable = true;
    b.setVelocity(0, 0);
    b.setAcceleration(0, 0);
    this.setPosition(x, y);
    this.setTexture('pip-idle');
    this.setScale(1);
    this.setAlpha(1);
    this.setAngle(0);
    this.assist.reset();
    this.wasGrounded = false;
  }

  get isDead(): boolean {
    return this.dead;
  }
}
