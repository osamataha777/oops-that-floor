import Phaser from 'phaser';
import { GAME_HEIGHT } from '../core/config';
import { chapterTheme, TXT } from '../ui/theme';
import { makeButton, makeChip, panel, dim, toast, iconButton } from '../ui/widgets';
import { TouchControls, InputManager } from '../ui/TouchControls';
import { SettingsPanel } from '../ui/SettingsPanel';
import { Player } from '../entities/Player';
import { LevelRuntime } from '../runtime/LevelRuntime';
import { LEVELS, levelAt, chapterIds } from '../levels/index';
import { LevelDef } from '../levels/types';
import { services } from '../core/services';
import { VIEW, setupCamera } from '../core/view';
import { MOTION } from '../anim/motion';
import { recordAttempt, recordCompletion } from '../../services/progress';
import { evaluateAchievements } from '../../services/achievements';
import { pickQuip, deathAnimFor, floatQuip, Fx } from '../effects/juice';
import { DeathCause } from '../traps/context';
import { onBackButton, shareCard } from '../../platform/native';
import { renderShareCard } from '../../services/shareCard';
import { challengeText, encodeChallenge } from '../../services/challenge';
import { paintBackdrop } from '../world/Backdrop';
import { FeedbackEvent } from '../feedback/FeedbackManager';
import { DRAW_OPTS } from '../traps/impl/draw';
import { transitionTo } from '../ui/transition';

export type PlayState = 'intro' | 'playing' | 'paused' | 'dying' | 'complete' | 'exiting';

/**
 * Legal transitions. Anything else is rejected (and counted, so tests can
 * assert no illegal transition was ever attempted in a session).
 */
const TRANSITIONS: Record<PlayState, PlayState[]> = {
  intro: ['playing', 'exiting'],
  playing: ['paused', 'dying', 'complete', 'exiting'],
  paused: ['playing', 'exiting'],
  dying: ['playing', 'exiting'],
  complete: ['exiting'],
  exiting: [],
};

const DEATH_FX: Record<DeathCause, FeedbackEvent> = {
  spikes: 'death.spikes',
  crush: 'death.crush',
  squash: 'death.crush',
  fall: 'death.void',
  void: 'death.void',
  hazard: 'death.hazard',
};

export class GameScene extends Phaser.Scene {
  private levelIndex = 0;
  private def!: LevelDef;
  private runtime!: LevelRuntime;
  private player!: Player;
  private ctl!: InputManager;
  private touchUI: TouchControls | null = null;
  private fx!: Fx;
  state: PlayState = 'intro';
  /** Rejected transitions this visit (diagnostics). */
  illegalTransitions = 0;
  private deathsThisVisit = 0;
  private challengeDeaths: number | null = null;
  private hudDeaths!: Phaser.GameObjects.Container & { labelObj?: Phaser.GameObjects.Text };
  private overlay: Phaser.GameObjects.Container | null = null;
  private removeBack: (() => void) | null = null;
  private quipCooldown = 0;
  private startedAt = 0;
  /** Simulated ms in 'playing' this visit (replays, stats). */
  simMs = 0;

  constructor() {
    super({ key: 'Game' });
  }

  init(data: { index?: number; challengeDeaths?: number }): void {
    this.levelIndex = data.index ?? 0;
    this.challengeDeaths = data.challengeDeaths ?? null;
    this.def = levelAt(this.levelIndex);
    this.state = 'intro';
    this.illegalTransitions = 0;
    this.deathsThisVisit = 0;
    this.overlay = null;
    this.touchUI = null;
    this.simMs = 0;
  }

  /** The only way state changes. Returns false (and does nothing) when illegal. */
  private go(next: PlayState): boolean {
    if (!TRANSITIONS[this.state].includes(next)) {
      this.illegalTransitions++;
      return false;
    }
    this.state = next;
    return true;
  }

  create(): void {
    const theme = chapterTheme(this.def.chapter);
    const rm = services.settings.reducedMotion;
    DRAW_OPTS.highContrast = services.settings.highContrast;
    services.audio.setChapterRoot(this.def.chapter);
    const cam = setupCamera(this);
    cam.setBackgroundColor(theme.bg);
    paintBackdrop(this, this.def.chapter, theme, rm);
    this.fx = new Fx(this, () => services.settings.reducedMotion);

    this.player = new Player(this, 0, 0);
    this.player.view.setReduceMotion(rm);
    this.runtime = new LevelRuntime(this, this.def, theme, this.player, {
      onKill: (c) => this.kill(c),
      onGoal: () => this.complete(),
      feedback: (ev, o) => this.feedback(ev, o),
      quip: (t, x, y) => floatQuip(this, t, x, y),
      reduceMotion: () => services.settings.reducedMotion,
    });
    const sp = this.runtime.parsed.spawn;
    this.player.revive(sp.x, sp.y, false);

    this.physics.add.collider(this.player, this.runtime.solids);
    this.physics.add.collider(this.player, this.runtime.platforms);
    // Falling hazards flag themselves pass-through so they crush instead of
    // being caught on Pip's head.
    this.physics.add.collider(this.player, this.runtime.dynamics, undefined, (_p, o) => !(o as Phaser.GameObjects.GameObject).getData?.('passThrough'));
    this.physics.add.collider(this.runtime.dynamics, this.runtime.solids);
    this.physics.add.collider(this.runtime.dynamics, this.runtime.dynamics);

    this.player.onEvent = (e, impact) => this.onPlayerEvent(e, impact ?? 0);

    // input
    this.ctl = new InputManager(this);
    if (TouchControls.shouldShow()) this.touchUI = new TouchControls(this, this.ctl, services.settings);
    const kb = this.input.keyboard;
    kb?.on('keydown-ESC', () => this.togglePause());
    kb?.on('keydown-P', () => this.togglePause());
    kb?.on('keydown-R', () => this.manualRestart());
    kb?.on('keydown-ENTER', () => this.state === 'complete' && this.goNext());
    this.removeBack = onBackButton(() => this.onBack());
    // App backgrounded / tab hidden → pause so nothing happens off-screen.
    this.game.events.on(Phaser.Core.Events.HIDDEN, this.autoPause, this);

    services.feedback.attachShake((ms, k) => this.cameras.main.shake(ms, k));

    this.buildHud();
    cam.fadeIn(MOTION.scene.fadeIn);
    this.showIntro();
    this.startedAt = this.time.now;

    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.removeBack?.();
      this.game.events.off(Phaser.Core.Events.HIDDEN, this.autoPause, this);
      services.feedback.attachShake(null);
      this.runtime?.destroy();
      this.player?.destroy();
    });
  }

  private feedback(ev: FeedbackEvent, o?: { intensity?: number }): void {
    services.fx(ev, o);
    // Pip reacts to the world (selectively — reactions never spoil a trap
    // before it fires, they only follow it).
    const v = this.player?.view;
    if (!v || this.state !== 'playing') return;
    if (ev === 'goal.flee') {
      v.express('shock', 650);
      const g = this.runtime.goal;
      v.lookAt({ x: g.x + g.w / 2, y: g.y + g.h / 2 });
      this.time.delayedCall(900, () => v.lookAt(null));
    } else if (ev === 'goal.caught') v.express('smug', 700);
    else if (ev === 'trap.spikes' || ev === 'trap.wall' || ev === 'trap.gravflip') v.express('shock', 480);
    else if (ev === 'trap.crumble') v.express('nervous', 520);
    else if (ev === 'trap.warn') v.express('suspicious', 420);
    else if (ev === 'trap.boing') v.express('defeated', 700);
    else if (ev === 'trap.spring') v.express('happy', 400);
  }

  private onPlayerEvent(e: string, impact: number): void {
    const p = this.player;
    const g = p.gSign;
    const feetY = g === 1 ? p.y + 13 : p.y - 13;
    if (e === 'jump') {
      this.feedback('player.jump');
      this.runtime.notifyJump();
      this.fx.dust(p.x, feetY, 4, g);
    } else if (e === 'land' || e === 'landHard') {
      this.feedback(e === 'landHard' ? 'player.landHard' : 'player.land', { intensity: impact });
      this.runtime.notifyLand();
      this.fx.dust(p.x, feetY, e === 'landHard' ? 10 : 5, g);
    } else if (e === 'skid') {
      this.feedback('player.skid');
      this.fx.dust(p.x - p.facing * 6, feetY, 3, g);
    } else if (e === 'bonk') this.feedback('player.bonk');
  }

  // ---- HUD -------------------------------------------------------------------

  private buildHud(): void {
    const L = 12;
    const R = VIEW.w - 12;
    const tag = makeChip(this, 0, 30, `${this.def.id}  ${this.def.name}`, 0x2c2622, 0.72);
    tag.setPosition(L + tag.width / 2, 30).setDepth(40).setScrollFactor(0, 0, true);
    const pauseBtn = iconButton(this, R - 22, 30, 'pause', () => this.togglePause());
    pauseBtn.setDepth(41).setScrollFactor(0, 0, true);
    this.hudDeaths = makeChip(this, 0, 30, '☠ 0', 0x2c2622, 0.72);
    this.hudDeaths.setPosition(R - 56 - this.hudDeaths.width / 2, 30).setDepth(40).setScrollFactor(0, 0, true);
    if (this.challengeDeaths !== null) {
      const ch = makeChip(this, 0, 64, `Challenge: ≤ ${this.challengeDeaths + 1} tries`, 0x4a72b0, 0.9);
      ch.setPosition(L + ch.width / 2, 64).setDepth(40).setScrollFactor(0, 0, true);
    }
  }

  /** Compact, non-blocking level banner + (earned) tip. Control is instant. */
  private showIntro(): void {
    const theme = chapterTheme(this.def.chapter);
    const firstOfChapter = this.def.index === 1;
    const cx = VIEW.w / 2;
    const c = this.add.container(cx, firstOfChapter ? 150 : 86).setDepth(45).setScrollFactor(0, 0, true).setAlpha(0);
    if (firstOfChapter) {
      const t1 = this.add.text(0, -22, `Chapter ${this.def.chapter}`, { ...TXT.small, fontSize: '16px', color: '#fffaf0' }).setOrigin(0.5);
      const t2 = this.add.text(0, 8, theme.name, { ...TXT.h1, fontSize: '40px', color: '#fffaf0', stroke: '#2c2622', strokeThickness: 8 }).setOrigin(0.5);
      const t3 = this.add.text(0, 44, theme.tagline, { ...TXT.small, fontSize: '15px', color: '#fffaf0', stroke: '#2c2622', strokeThickness: 5 }).setOrigin(0.5);
      t1.setStroke('#2c2622', 5);
      c.add([t1, t2, t3]);
    } else {
      const t = this.add.text(0, 0, this.def.name, { ...TXT.h2, fontSize: '26px', color: '#fffaf0', stroke: '#2c2622', strokeThickness: 7 }).setOrigin(0.5);
      c.add(t);
    }
    const hold = firstOfChapter ? MOTION.chapter.cardMs : 900;
    this.tweens.add({ targets: c, alpha: 1, y: c.y + 6, duration: 180, ease: 'Quad.easeOut' });
    this.tweens.add({ targets: c, alpha: 0, y: c.y - 10, delay: hold, duration: 260, onComplete: () => c.destroy() });

    // Progressive hint: the tip only appears once the player has earned it —
    // a few deaths to the trick first preserves the first-time surprise.
    const earned = (services.save.levels[this.def.id]?.totalAttempts ?? 0) + this.deathsThisVisit >= 3;
    if (earned && this.def.tip) this.showTip(this.def.tip);

    this.time.delayedCall(120, () => {
      if (this.state === 'intro') this.go('playing');
    });
  }

  private tipShown = false;
  private showTip(tip: string): void {
    if (this.tipShown) return;
    this.tipShown = true;
    toast(this, `💡 ${tip}`, { y: GAME_HEIGHT - 26, hold: 3600, depth: 44 });
  }

  // ---- loop --------------------------------------------------------------------

  update(_t: number, dt: number): void {
    // Simulation runs ONLY while the player has control. This keeps traps from
    // arming during the intro and makes death a clean freeze-frame.
    if (this.state === 'playing') {
      const input = this.ctl.poll();
      this.player.update(dt, input);
      this.runtime.update(dt);
      this.simMs += dt;
      this.updateGaze();
    }
    if (this.state !== 'paused') this.player.syncView(dt);
  }

  /** Pip glances at the exit when it's near and in view (unless reacting). */
  private updateGaze(): void {
    const g = this.runtime.goal;
    const gx = g.x + g.w / 2;
    const gy = g.y + g.h / 2;
    const d = Math.hypot(gx - this.player.x, gy - this.player.y);
    if (d < 220 && d > 50) this.player.view.lookAt({ x: gx, y: gy });
    else if (d >= 240) this.player.view.lookAt(null);
  }

  // ---- death & instant restart -------------------------------------------------

  private kill(cause: DeathCause): void {
    if (!this.go('dying')) return;
    this.deathsThisVisit += 1;
    recordAttempt(services.save, this.def.id);
    const won = evaluateAchievements(services.save, { kind: 'death', levelId: this.def.id });
    services.persistSaveSoon();
    this.refreshDeathChip();

    const px = this.player.x;
    const py = this.player.y;
    this.player.killInstant();
    this.feedback(DEATH_FX[cause]);
    if (cause === 'spikes') this.fx.puff(px, py, 12);
    if (cause === 'crush' || cause === 'squash') this.fx.chips(px, py + 10, 0x3d3b74, 8);

    if (this.quipCooldown < this.time.now && (this.deathsThisVisit === 1 || Math.random() < 0.4)) {
      this.quipCooldown = this.time.now + 1400;
      floatQuip(this, pickQuip(cause), px, py - 46);
    }
    if (this.deathsThisVisit === 3 && this.def.tip) this.showTip(this.def.tip);

    this.player.view.playDeath(deathAnimFor(cause), () => this.respawn());
    for (const a of won) this.achievementToast(a.title);
  }

  private respawn(): void {
    // Only the death path may respawn — guards against pause/manualRestart races.
    if (this.state !== 'dying') return;
    this.restoreLevel(true);
    this.go('playing');
  }

  private restoreLevel(dizzy: boolean): void {
    this.runtime.reset();
    const sp = this.runtime.parsed.spawn;
    this.player.revive(sp.x, sp.y, dizzy && this.deathsThisVisit > 0);
    this.ctl.clearEdges();
    this.feedback('respawn');
  }

  private refreshDeathChip(): void {
    this.hudDeaths.labelObj?.setText(`☠ ${this.deathsThisVisit}`);
    if (!services.settings.reducedMotion) {
      this.tweens.killTweensOf(this.hudDeaths);
      this.hudDeaths.setScale(1);
      this.tweens.add({ targets: this.hudDeaths, scale: 1.18, duration: 90, yoyo: true, ease: 'Quad.easeOut' });
    }
  }

  // ---- completion ----------------------------------------------------------------

  private complete(): void {
    if (!this.go('complete')) return;
    const body = this.player.body as Phaser.Physics.Arcade.Body;
    body.setVelocity(0, 0);
    body.enable = false;
    this.touchUI?.setEnabled(false);
    const attempts = this.deathsThisVisit + 1;
    const hardWon = this.deathsThisVisit >= 4;
    this.player.view.celebrate(hardWon || this.deathsThisVisit === 0);
    this.feedback('goal.reach');
    this.fx.victory(this.player.x, this.player.y, hardWon);

    const chapterList = chapterIds(this.def.chapter);
    const next = this.levelIndex + 1 < LEVELS.length ? LEVELS[this.levelIndex + 1].id : null;
    const res = recordCompletion(services.save, this.def.id, this.levelIndex, attempts, LEVELS.length, next, chapterList);
    const ctx = { kind: 'complete' as const, levelId: this.def.id, attemptsUsed: attempts, chapterIds: { 1: chapterIds(1), 2: chapterIds(2), 3: chapterIds(3), 4: chapterIds(4), 5: chapterIds(5) }, totalLevels: LEVELS.length };
    const won = evaluateAchievements(services.save, ctx);
    services.persistSave();
    won.forEach((a, i) => this.time.delayedCall(700 + i * 500, () => this.achievementToast(a.title)));

    const chapterDone = this.def.index === 8;
    if (chapterDone) this.time.delayedCall(260, () => this.feedback('chapter.complete'));
    this.time.delayedCall(services.settings.reducedMotion ? 150 : MOTION.complete.celebrateMs, () =>
      this.showCompleteRibbon(attempts, res.firstTry, chapterDone),
    );
  }

  /** Fast, low-friction success: a ribbon with one dominant "Next" action. */
  private showCompleteRibbon(attempts: number, firstTry: boolean, chapterDone: boolean): void {
    if (this.overlay || this.state !== 'complete') return;
    const W = VIEW.w;
    const c = this.add.container(W / 2, GAME_HEIGHT / 2).setDepth(60).setScrollFactor(0, 0, true);
    const shade = this.add.rectangle(0, 0, W, GAME_HEIGHT, 0x1f1a16, 0.28);
    c.add(shade);
    const bandH = chapterDone ? 200 : 150;
    const band = this.add.graphics();
    band.fillStyle(0x000000, 0.18).fillRect(-W / 2, -bandH / 2 + 6, W, bandH);
    band.fillStyle(0xfffaf0, 1).fillRect(-W / 2, -bandH / 2, W, bandH);
    band.fillStyle(chapterTheme(this.def.chapter).accent, 1).fillRect(-W / 2, -bandH / 2, W, 6);
    c.add(band);

    const headline = chapterDone
      ? `Chapter ${this.def.chapter} cleared!`
      : firstTry ? 'First try?!' : attempts >= 10 ? 'FINALLY.' : 'Nailed it.';
    const sub = this.challengeDeaths !== null
      ? (attempts <= this.challengeDeaths + 1 ? `Challenge beaten — ${attempts} vs ${this.challengeDeaths + 1}` : `${attempts} tries (target ${this.challengeDeaths + 1}). So close.`)
      : `${this.def.id} · ${attempts} ${attempts === 1 ? 'try' : 'tries'}${firstTry ? ' · suspiciously good' : ''}`;
    const left = -Math.min(380, W / 2 - 40);
    c.add(this.add.text(left, -bandH / 2 + 34, headline, { ...TXT.h1, fontSize: '34px' }).setOrigin(0, 0.5));
    c.add(this.add.text(left, -bandH / 2 + 70, sub, TXT.body).setOrigin(0, 0.5));
    if (chapterDone) {
      const nextTheme = chapterTheme(Math.min(5, this.def.chapter + 1));
      const line = this.def.chapter < 5 ? `Next: ${nextTheme.name} — ${nextTheme.tagline}` : 'You beat the floor. The floor is furious.';
      c.add(this.add.text(left, -bandH / 2 + 108, line, { ...TXT.small, fontSize: '15px' }).setOrigin(0, 0.5));
    }

    const hasNext = this.levelIndex + 1 < LEVELS.length;
    const right = Math.min(380, W / 2 - 40);
    const bNext = makeButton(this, right - 110, 0, 220, 64, hasNext ? 'Next  ▶' : 'Finale ★', { fill: 0x3f9d57 });
    bNext.on('pointerup', () => this.goNext());
    const row = this.add.container(right - 110, bandH / 2 - 30);
    const mini = (x: number, label: string, cb: () => void) => {
      const b = makeButton(this, x, 0, 64, 36, label, { fill: 0x5a4f46, textStyle: { ...TXT.light, fontSize: '15px' } });
      b.on('pointerup', cb);
      row.add(b);
    };
    mini(-74, '↻', () => this.leave(() => this.scene.restart({ index: this.levelIndex })));
    mini(0, 'Share', () => void this.shareResult(attempts));
    mini(74, '☰', () => this.leave(() => this.scene.start('Select', { focus: this.def.id })));
    c.add([bNext, row]);
    this.overlay = c;
    if (!services.settings.reducedMotion) {
      c.setScale(1, 0.2).setAlpha(0);
      this.tweens.add({ targets: c, scaleY: 1, alpha: 1, duration: MOTION.ui.panelIn.ms, ease: MOTION.ui.panelIn.ease });
    }
  }

  private goNext(): void {
    if (this.state !== 'complete') return;
    this.feedback('ui.tap');
    const hasNext = this.levelIndex + 1 < LEVELS.length;
    this.leave(() => (hasNext ? this.scene.restart({ index: this.levelIndex + 1 }) : this.scene.start('Menu', { finale: true })));
  }

  /** Single exit path: lock the state, quick fade, then switch. */
  private leave(go: () => void): void {
    if (!this.go('exiting')) return;
    this.touchUI?.setEnabled(false);
    this.physics.world.resume();
    this.tweens.resumeAll();
    transitionTo(this, go);
  }

  private async shareResult(attempts: number): Promise<void> {
    this.feedback('ui.tap');
    const challenge = { levelIndex: this.levelIndex, deaths: this.deathsThisVisit };
    const text = challengeText(challenge, this.def.id);
    const png = renderShareCard({
      levelId: this.def.id,
      levelName: this.def.name,
      attempts,
      caption: this.deathsThisVisit === 0 ? 'Zero casualties. Show-off.' : pickQuip('generic'),
      code: encodeChallenge(challenge),
    });
    const r = await shareCard(png, text);
    if (!this.scene.isActive()) return;
    if (r === 'copied') toast(this, 'Card saved · challenge text copied');
    else if (r === 'failed') toast(this, 'Sharing isn’t available here');
  }

  // ---- pause -------------------------------------------------------------------

  private onBack(): void {
    if (this.state === 'paused') this.resume();
    else if (this.state === 'complete') this.leave(() => this.scene.start('Select', { focus: this.def.id }));
    else this.togglePause();
  }

  private autoPause(): void {
    if (this.state === 'playing') this.togglePause();
  }

  togglePause(): void {
    if (this.state === 'paused') {
      this.resume();
      return;
    }
    // Only live play can pause — intro, dying and complete are excluded so no
    // overlay can ever capture an in-flight respawn or level transition.
    if (!this.go('paused')) return;
    this.physics.world.pause();
    this.tweens.pauseAll();
    this.touchUI?.setEnabled(false);
    this.feedback('ui.tap');
    this.openPauseMenu();
  }

  private openPauseMenu(): void {
    const c = this.add.container(VIEW.w / 2, GAME_HEIGHT / 2).setDepth(70).setScrollFactor(0, 0, true);
    c.add(dim(this));
    c.add(panel(this, 360, 344));
    c.add(this.add.text(0, -128, 'Paused', TXT.h1).setOrigin(0.5));
    c.add(this.add.text(0, -94, `${this.def.id} · ${this.def.name}`, TXT.small).setOrigin(0.5));
    const mk = (y: number, label: string, cb: () => void, fill = 0x4a4038) => {
      const b = makeButton(this, 0, y, 240, 50, label, { fill });
      b.on('pointerup', cb);
      c.add(b);
    };
    mk(-42, 'Resume', () => this.resume(), 0x3f9d57);
    mk(18, 'Restart level', () => {
      this.resume();
      this.manualRestart();
    });
    mk(78, 'Settings', () => {
      c.destroy();
      this.overlay = null;
      this.openSettings();
    }, 0x6b5e52);
    mk(138, 'Levels', () => this.leave(() => this.scene.start('Select', { focus: this.def.id })), 0x6b5e52);
    this.overlay = c;
  }

  private openSettings(): void {
    const p = new SettingsPanel(this, () => {
      p.destroy();
      this.overlay = null;
      if (this.state === 'paused') this.openPauseMenu();
    });
    p.setScrollFactor(0, 0, true).setX(VIEW.w / 2);
    this.overlay = p;
  }

  private resume(): void {
    if (this.state !== 'paused') return;
    this.overlay?.destroy();
    this.overlay = null;
    this.physics.world.resume();
    this.tweens.resumeAll();
    this.touchUI?.setEnabled(true);
    this.ctl.clearEdges();
    this.go('playing');
  }

  private manualRestart(): void {
    if (this.state !== 'playing' && this.state !== 'dying') return;
    if (this.state === 'dying') this.go('playing'); // pending death callback is cancelled by revive
    this.restoreLevel(false);
  }

  private achievementToast(title: string): void {
    this.feedback('achievement');
    toast(this, `★ ${title}`, { y: 70, hold: 2000, fill: 0xf2a541, depth: 80 });
  }
}

