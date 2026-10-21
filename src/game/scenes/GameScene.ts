import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from '../core/config';
import { chapterTheme, TXT, hex } from '../ui/theme';
import { makeButton, makeChip, panel, dim, tinyText } from '../ui/widgets';
import { TouchControls, InputManager } from '../ui/TouchControls';
import { SettingsPanel } from '../ui/SettingsPanel';
import { Player } from '../entities/Player';
import { LevelRuntime } from '../runtime/LevelRuntime';
import { LEVELS, levelAt, indexOfLevel, chapterIds } from '../levels/index';
import { LevelDef } from '../levels/types';
import { services } from '../core/services';
import { recordAttempt, recordCompletion } from '../../services/progress';
import { evaluateAchievements } from '../../services/achievements';
import { pickQuip, playDeathAnim, deathAnimFor, victoryConfetti, floatQuip, DEATH_QUIPS } from '../effects/juice';
import { DeathCause } from '../traps/context';
import { haptic, onBackButton, shareCard } from '../../platform/native';
import { renderShareCard } from '../../services/shareCard';
import { challengeText, encodeChallenge } from '../../services/challenge';

type PlayState = 'intro' | 'playing' | 'dying' | 'complete' | 'paused';

const RESPAWN_ANIM_MS = 320;

export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private def!: LevelDef;
  private runtime!: LevelRuntime;
  private player!: Player;
  private ctl!: InputManager;
  private touchUI: TouchControls | null = null;
  private state: PlayState = 'intro';
  private deathsThisVisit = 0;
  private challengeDeaths: number | null = null;
  private hudLevel!: Phaser.GameObjects.Container;
  private hudDeaths!: Phaser.GameObjects.Container;
  private overlay: Phaser.GameObjects.Container | null = null;
  private removeBack: (() => void) | null = null;
  private quipCooldown = 0;
  private startedAt = 0;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: { index?: number; challengeDeaths?: number }): void {
    this.levelIndex = data.index ?? 0;
    this.challengeDeaths = data.challengeDeaths ?? null;
    this.def = levelAt(this.levelIndex);
    this.state = 'intro';
    this.deathsThisVisit = 0;
    this.overlay = null;
  }

  create(): void {
    const theme = chapterTheme(this.def.chapter);
    services.audio.setChapterRoot(this.def.chapter);

    // background
    this.cameras.main.setBackgroundColor(theme.bg);
    this.paintBackground(theme.bgDecor);

    this.player = new Player(this, 0, 0);
    this.runtime = new LevelRuntime(this, this.def, theme, this.player, {
      onKill: (c) => this.kill(c),
      onGoal: () => this.complete(),
      sfx: (n) => services.audio.sfx(n),
      haptic: (k) => void haptic(k, services.settings.haptics),
      quip: (t, x, y) => floatQuip(this, t, x, y),
      reduceMotion: () => services.settings.reducedMotion,
    });
    this.player.setPosition(this.runtime.parsed.spawn.x, this.runtime.parsed.spawn.y);

    this.physics.add.collider(this.player, this.runtime.solids);
    this.physics.add.collider(this.player, this.runtime.platforms);
    this.physics.add.collider(this.player, this.runtime.dynamics);
    this.physics.add.collider(this.runtime.dynamics, this.runtime.solids);
    this.physics.add.collider(this.runtime.dynamics, this.runtime.dynamics);

    this.player.onEvent = (e) => {
      if (e === 'jump') {
        services.audio.sfx('jump');
        this.runtime.notifyJump();
      } else if (e === 'land') {
        services.audio.sfx('land');
        this.runtime.notifyLand();
        void haptic('light', services.settings.haptics && Math.abs((this.player.body as Phaser.Physics.Arcade.Body).velocity.y) > 200);
      }
    };

    // input
    this.ctl = new InputManager(this);
    this.input.addPointer(2); // 3 total pointers for multitouch
    if (TouchControls.shouldShow()) this.touchUI = new TouchControls(this, this.ctl, services.settings);

    this.input.keyboard!.on('keydown-ESC', () => this.togglePause());
    this.input.keyboard!.on('keydown-P', () => this.togglePause());
    this.input.keyboard!.on('keydown-R', () => this.manualRestart());
    this.removeBack = onBackButton(() => {
      if (this.state === 'paused') this.closeOverlay();
      else this.togglePause();
    });

    this.buildHud();
    this.cameras.main.setBounds(0, 0, this.runtime.parsed.width, this.runtime.parsed.height);
    this.cameras.main.fadeIn(220);

    // intro card
    this.showIntroCard();
    this.startedAt = this.time.now;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeBack?.();
      this.runtime?.destroy();
    });
  }

  private paintBackground(decor: number): void {
    const g = this.add.graphics().setDepth(-5);
    g.fillStyle(decor, 0.55);
    // rolling hills silhouette
    for (let i = 0; i < 8; i++) {
      const x = i * 140 - 40;
      g.fillEllipse(x + 80, GAME_HEIGHT + 30, 260, 190 + (i % 3) * 30);
    }
    // faint dots pattern
    g.fillStyle(0xffffff, 0.25);
    for (let y = 40; y < GAME_HEIGHT; y += 90) {
      for (let x = (y / 90) % 2 === 0 ? 40 : 90; x < GAME_WIDTH; x += 180) {
        g.fillCircle(x, y, 2);
      }
    }
  }

  private buildHud(): void {
    this.hudLevel = makeChip(this, 0, 30, ` ${this.def.id}  ${this.def.name} `);
    this.hudLevel.setDepth(40).setPosition(8 + this.hudLevel.width / 2, 30);
    const pauseBtn = makeButton(this, GAME_WIDTH - 34, 34, 44, 44, '❚❚', { fill: 0x4a4038, depth: 40 });
    pauseBtn.on('pointerup', () => this.togglePause());
    this.add.existing(pauseBtn);
    this.hudDeaths = makeChip(this, 0, 30, '☠ 0');
    this.hudDeaths.setDepth(40).setPosition(GAME_WIDTH - 60 - this.hudDeaths.width / 2, 30);
    pauseBtn.setAlpha(0.65);
  }

  private showIntroCard(): void {
    const t = this.add
      .text(GAME_WIDTH / 2, 200, `${this.def.id}\n${this.def.name}`, { ...TXT.h1, align: 'center' })
      .setOrigin(0.5)
      .setDepth(45)
      .setAlpha(0);
    this.tweens.add({ targets: t, alpha: 1, duration: 160 });
    this.tweens.add({ targets: t, alpha: 0, y: 180, delay: 1100, duration: 240, onComplete: () => t.destroy() });
    // Progressive hint: the tip only appears once the player has earned it —
    // a few deaths to the trick first preserves the first-time surprise.
    const earnedTip = (services.save.levels[this.def.id]?.totalAttempts ?? 0) + this.deathsThisVisit >= 3;
    const tip = earnedTip ? this.def.tip : undefined;
    if (tip) {
      const tt = this.add
        .text(GAME_WIDTH / 2, 268, tip, { ...TXT.small, align: 'center' })
        .setOrigin(0.5)
        .setDepth(45)
        .setAlpha(0);
      this.tweens.add({ targets: tt, alpha: 0.9, duration: 160 });
      this.tweens.add({ targets: tt, alpha: 0, delay: 2000, duration: 300, onComplete: () => tt.destroy() });
    }
    this.time.delayedCall(120, () => {
      if (this.state === 'intro') this.state = 'playing';
    });
  }

  update(_t: number, dt: number): void {
    // Simulation runs ONLY while the player has control. This keeps traps from
    // arming during the intro card and makes death a clean freeze-frame.
    if (this.state !== 'playing') return;
    const input = this.ctl.poll();
    this.player.update(dt, input);
    this.runtime.update(dt);
  }

  // ---- death & instant restart -------------------------------------------

  private kill(cause: DeathCause): void {
    if (this.state !== 'playing') return;
    this.state = 'dying';
    this.deathsThisVisit += 1;
    recordAttempt(services.save, this.def.id);
    const won = evaluateAchievements(services.save, { kind: 'death', levelId: this.def.id });
    services.persistSaveSoon();
    this.refreshDeathChip();

    this.player.killInstant();
    this.player.shocked();
    services.audio.sfx(cause === 'crush' ? 'splat' : cause === 'spikes' ? 'pop' : 'splat');
    void haptic('heavy', services.settings.haptics);
    if (!services.settings.reducedMotion) this.cameras.main.shake(120, 0.006);

    if (this.quipCooldown < this.time.now && Math.random() < 0.42) {
      this.quipCooldown = this.time.now + 1400;
      floatQuip(this, pickQuip(cause), this.player.x, this.player.y - 40);
    }

    playDeathAnim(this, this.player, deathAnimFor(cause), services.settings.reducedMotion, () => this.respawn());
    for (const a of won) this.achievementToast(a.title);
  }

  private respawn(): void {
    // Only the death path may respawn — guards against pause/manualRestart races.
    if (this.state !== 'dying') return;
    this.runtime.reset();
    this.player.setVisible(true);
    this.player.revive(this.runtime.parsed.spawn.x, this.runtime.parsed.spawn.y);
    this.ctl.clear();
    this.state = 'playing';
  }

  private refreshDeathChip(): void {
    const chip = this.hudDeaths as Phaser.GameObjects.Container & { labelObj?: Phaser.GameObjects.Text };
    chip.labelObj?.setText(`☠ ${this.deathsThisVisit}`);
  }

  // ---- completion ----------------------------------------------------------

  private complete(): void {
    if (this.state !== 'playing') return;
    this.state = 'complete';
    this.player.setTexture('pip-happy');
    this.player.body!.enable = false;
    services.audio.sfx('goal');
    services.audio.sfx('confetti');
    void haptic('success', services.settings.haptics);
    victoryConfetti(this, this.player.x, this.player.y);

    const attempts = this.deathsThisVisit + 1;
    const chapterIdsList = chapterIds(this.def.chapter);
    const next = this.levelIndex + 1 < LEVELS.length ? LEVELS[this.levelIndex + 1].id : null;
    const res = recordCompletion(services.save, this.def.id, this.levelIndex, attempts, LEVELS.length, next, chapterIdsList);
    const ctx = { kind: 'complete' as const, levelId: this.def.id, attemptsUsed: attempts, chapterIds: { 1: chapterIds(1), 2: chapterIds(2), 3: chapterIds(3), 4: chapterIds(4), 5: chapterIds(5) }, totalLevels: LEVELS.length };
    const won = evaluateAchievements(services.save, ctx);
    services.persistSave();
    for (const a of won) this.time.delayedCall(600, () => this.achievementToast(a.title));

    this.time.delayedCall(services.settings.reducedMotion ? 250 : 750, () => this.showCompleteOverlay(attempts, res.firstTry));
  }

  private showCompleteOverlay(attempts: number, firstTry: boolean): void {
    if (this.overlay) return;
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(60);
    c.add(dim(this));
    c.add(panel(this, 420, 330));
    c.add(this.add.text(0, -110, firstTry ? 'FIRST TRY?!' : 'Level Clear!', TXT.h1).setOrigin(0.5));
    const detail = this.challengeDeaths !== null
      ? `attempts: ${attempts}   (target: ≤${this.challengeDeaths + 1})`
      : `attempts: ${attempts}`;
    c.add(this.add.text(0, -62, detail, TXT.body).setOrigin(0.5));
    const quip = firstTry ? 'Suspiciously good.' : DEATH_QUIPS.generic[Math.floor(Math.random() * 4)];
    c.add(this.add.text(0, -24, quip, TXT.small).setOrigin(0.5));

    const next = this.levelIndex + 1 < LEVELS.length;
    const bNext = makeButton(this, 0, 40, 220, 52, next ? 'Next level' : 'Back to menu', { fill: 0x58a05c });
    bNext.on('pointerup', () => {
      services.audio.sfx('click');
      this.closeOverlay();
      if (next) this.scene.restart({ index: this.levelIndex + 1 });
      else this.scene.start('Menu');
    });
    const row = this.add.container(0, 112);
    const bReplay = makeButton(this, -140, 0, 120, 42, 'Replay', {});
    bReplay.on('pointerup', () => { services.audio.sfx('click'); this.scene.restart({ index: this.levelIndex }); });
    const bShare = makeButton(this, 0, 0, 120, 42, 'Share', { fill: 0x4a72b0 });
    bShare.on('pointerup', () => void this.shareResult(attempts));
    const bMenu = makeButton(this, 140, 0, 120, 42, 'Menu', { fill: 0x6b5e52 });
    bMenu.on('pointerup', () => { services.audio.sfx('back'); this.scene.start('Select'); });
    row.add([bReplay, bShare, bMenu]);
    c.add([bNext, row]);
    this.overlay = c;
    this.tweens.add({ targets: c, scaleX: 1.02, scaleY: 1.02, duration: 140, yoyo: true });
  }

  private async shareResult(attempts: number): Promise<void> {
    services.audio.sfx('click');
    const challenge = { levelIndex: this.levelIndex, deaths: this.deathsThisVisit };
    const text = challengeText(challenge, this.def.id);
    const png = renderShareCard({
      levelId: this.def.id,
      levelName: this.def.name,
      attempts,
      caption: this.deathsThisVisit === 0 ? 'Zero casualties. Show-off.' : pickQuip('generic'),
      code: encodeChallenge(challenge),
    });
    await shareCard(png, text);
  }

  // ---- pause ---------------------------------------------------------------

  togglePause(): void {
    if (this.state === 'paused') {
      this.closeOverlay();
      return;
    }
    // Only live play can pause — intro, dying and complete are excluded so no
    // overlay can ever capture an in-flight respawn or level transition.
    if (this.state !== 'playing') return;
    this.state = 'paused';
    this.physics.world.pause();
    services.audio.sfx('click');
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(70);
    c.add(dim(this));
    c.add(panel(this, 380, 360));
    c.add(this.add.text(0, -130, 'Paused', TXT.h1).setOrigin(0.5));
    const mk = (y: number, label: string, cb: () => void, fill = 0x4a4038) => {
      const b = makeButton(this, 0, y, 240, 48, label, { fill });
      b.on('pointerup', cb);
      c.add(b);
    };
    mk(-60, 'Resume', () => this.closeOverlay(), 0x58a05c);
    mk(0, 'Restart level', () => { this.closeOverlay(); this.manualRestart(); });
    mk(60, 'Settings', () => {
      c.destroy();
      this.overlay = null;
      this.openSettings();
    }, 0x6b5e52);
    mk(120, 'Quit to levels', () => { services.audio.sfx('back'); this.physics.world.resume(); this.scene.start('Select'); }, 0x6b5e52);
    this.overlay = c;
  }

  private openSettings(): void {
    const p = new SettingsPanel(this, () => {
      p.destroy();
      this.overlay = null;
      this.state = 'paused';
      this.togglePause();
    });
    this.overlay = p;
  }

  private closeOverlay(): void {
    this.overlay?.destroy();
    this.overlay = null;
    this.physics.world.resume();
    if (this.state === 'paused') this.state = 'playing';
  }

  private manualRestart(): void {
    if (this.state === 'complete' || this.state === 'intro') return;
    const wasDying = this.state === 'dying';
    if (wasDying) this.state = 'playing'; // stale anim callback is blocked by respawn's guard
    this.runtime.reset();
    this.player.setVisible(true);
    this.player.clearTint();
    this.tweens.killTweensOf(this.player);
    this.player.revive(this.runtime.parsed.spawn.x, this.runtime.parsed.spawn.y);
    this.state = 'playing';
  }

  private achievementToast(title: string): void {
    services.audio.sfx('achievement');
    const c = this.add.container(GAME_WIDTH / 2, -40).setDepth(80);
    const t = this.add.text(0, 0, `★ ${title}`, TXT.chip).setOrigin(0.5);
    const g = this.add.graphics();
    g.fillStyle(0xf2a541, 1).fillRoundedRect(-t.width / 2 - 18, -17, t.width + 36, 34, 17);
    c.add([g, t]);
    this.tweens.add({ targets: c, y: 60, duration: 260, ease: 'Back.easeOut' });
    this.tweens.add({ targets: c, y: -60, alpha: 0, delay: 2200, duration: 300, onComplete: () => c.destroy() });
  }
}
