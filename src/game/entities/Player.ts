import Phaser from 'phaser';
import { PHYSICS } from '../core/config';
import { nextVelocityX, applyJumpCut, clampFall, JumpAssist, MoveConfig, MIN_JUMP_MS, fallGravityExtra } from '../physics/movement';
import { InputState } from '../ui/TouchControls';
import { PipView } from './PipView';

export type PlayerEvent = 'jump' | 'land' | 'landHard' | 'turn' | 'skid' | 'bonk' | 'launch';

export const HITBOX = { w: 20, h: 26 } as const;

/**
 * Pip's physics body. The Arcade sprite itself is invisible: `x, y` is the
 * centre of a fixed 20×26 hitbox that no animation ever scales. Everything
 * you see is the separate PipView rig, positioned from the body each frame.
 * Movement math lives in physics/movement.ts (pure, unit-tested).
 */
export class Player extends Phaser.Physics.Arcade.Sprite {
  readonly cfg: MoveConfig = PHYSICS;
  readonly view: PipView;
  assist = new JumpAssist(PHYSICS);
  private wasGrounded = false;
  private cutArmed = false;
  private jumpAt = -Infinity;
  private lastDir: -1 | 0 | 1 = 0;
  private dead = false;
  private lastInput: InputState = { dir: 0, jumpDown: false, jumpHeld: false };
  /** Fall speed at the previous frame — used to grade landings. */
  private prevVy = 0;
  facing: 1 | -1 = 1;

  onEvent?: (e: PlayerEvent, data?: number) => void;

  constructor(scene: Phaser.Scene, x: number, y: number) {
    super(scene, x, y, 'px');
    scene.add.existing(this);
    scene.physics.add.existing(this);
    this.setVisible(false);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(HITBOX.w, HITBOX.h, true);
    body.setMaxVelocity(this.cfg.maxSpeed * 1.6, this.cfg.maxFall * 1.3);
    this.setCollideWorldBounds(true);
    this.view = new PipView(scene);
    this.syncView(0);
  }

  get gSign(): 1 | -1 {
    return (this.scene.physics.world.gravity.y >= 0 ? 1 : -1) as 1 | -1;
  }

  get grounded(): boolean {
    const b = this.body as Phaser.Physics.Arcade.Body;
    return this.gSign === 1 ? b.blocked.down || b.touching.down : b.blocked.up || b.touching.up;
  }

  private get headBlocked(): boolean {
    const b = this.body as Phaser.Physics.Arcade.Body;
    return this.gSign === 1 ? b.blocked.up || b.touching.up : b.blocked.down || b.touching.down;
  }

  update(dtMs: number, input: InputState): void {
    this.lastInput = input;
    if (this.dead || !this.body) return;
    const body = this.body as Phaser.Physics.Arcade.Body;
    const now = this.scene.time.now;
    const dt = dtMs / 1000;
    const grounded = this.grounded;
    const g = this.gSign;

    this.assist.update(grounded, now);
    if (input.jumpDown) this.assist.press(now);

    // Skid: reversing direction at speed on the ground.
    const vx0 = body.velocity.x;
    if (grounded && input.dir !== 0 && Math.sign(vx0) === -input.dir && Math.abs(vx0) > this.cfg.maxSpeed * 0.6) {
      this.onEvent?.('skid');
      this.view.onSkid();
    }
    body.setVelocityX(nextVelocityX(vx0, input.dir, grounded, dt, this.cfg));

    if (this.assist.tryConsume(now)) {
      body.setVelocityY(this.cfg.jumpVelocity * g); // jump always opposes gravity
      this.cutArmed = true;
      this.jumpAt = now;
      this.view.onJump();
      this.onEvent?.('jump');
    }

    // Variable jump height. The cut is armed by the jump itself and applied
    // once, as soon as the button is up and a minimum hop has elapsed — so a
    // tap shorter than one frame still gives a short hop, and external
    // launches (springs, traps) are never clipped.
    const rising = body.velocity.y * g < 0;
    if (this.cutArmed && !rising) this.cutArmed = false;
    if (this.cutArmed && !input.jumpHeld && now - this.jumpAt >= MIN_JUMP_MS) {
      body.setVelocityY(applyJumpCut(body.velocity.y, g, this.cfg));
      this.cutArmed = false;
    }

    // Heavier fall than rise: snappy arcs without changing jump height.
    body.setGravityY(fallGravityExtra(body.velocity.y, g, this.scene.physics.world.gravity.y));
    body.setVelocityY(clampFall(body.velocity.y, g, this.cfg));

    if (rising && this.headBlocked) {
      this.onEvent?.('bonk');
      this.cutArmed = false;
    }

    if (!this.wasGrounded && grounded) {
      const impact = Math.min(1, Math.max(0, (this.prevVy * g - 200) / 700));
      this.view.onLand(impact);
      this.onEvent?.(impact > 0.45 ? 'landHard' : 'land', impact);
    }
    this.wasGrounded = grounded;
    this.prevVy = body.velocity.y;

    if (input.dir !== 0 && input.dir !== this.facing) {
      this.facing = input.dir;
      this.view.onTurn();
      this.onEvent?.('turn');
    }
    this.lastDir = input.dir;
  }

  /** External impulse (spring pads). Not subject to the jump cut. */
  launch(vy: number): void {
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setVelocityY(vy);
    this.cutArmed = false;
    this.view.onJump();
    this.onEvent?.('launch');
  }

  /** Position the visual rig from the physics body. Call every frame. */
  syncView(dtMs: number): void {
    const b = this.body as Phaser.Physics.Arcade.Body;
    const g = this.gSign;
    this.view.update(dtMs, {
      x: b.x + b.width / 2,
      y: g === 1 ? b.y + b.height : b.y,
      vx: b.velocity.x,
      vy: b.velocity.y,
      grounded: this.grounded,
      gSign: g,
      facing: this.facing,
      inputDir: this.lastInput.dir,
      maxSpeed: this.cfg.maxSpeed,
    });
  }

  killInstant(): void {
    this.dead = true;
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.setVelocity(0, 0);
    b.enable = false;
  }

  revive(x: number, y: number, dizzy = true): void {
    this.dead = false;
    const b = this.body as Phaser.Physics.Arcade.Body;
    b.enable = true;
    b.reset(x, y);
    b.setVelocity(0, 0);
    b.setAcceleration(0, 0);
    b.setGravityY(0);
    this.facing = 1;
    this.assist.reset();
    this.wasGrounded = false;
    this.cutArmed = false;
    this.prevVy = 0;
    this.lastDir = 0;
    this.view.revive(dizzy);
    this.syncView(0);
  }

  get isDead(): boolean {
    return this.dead;
  }

  destroy(fromScene?: boolean): void {
    this.view?.destroy();
    super.destroy(fromScene);
  }
}
