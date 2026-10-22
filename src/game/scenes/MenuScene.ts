import Phaser from 'phaser';
import { GAME_HEIGHT, THEMES } from '../core/config';
import { TXT, FONT } from '../ui/theme';
import { makeButton, iconButton, toast, INK } from '../ui/widgets';
import { SettingsPanel } from '../ui/SettingsPanel';
import { services } from '../core/services';
import { completionCount } from '../../services/progress';
import { decodeChallenge, encodeChallenge } from '../../services/challenge';
import { LEVELS, levelAt } from '../levels/index';
import { shareText } from '../../platform/native';
import { ACHIEVEMENTS } from '../../services/achievements';
import { VIEW, setupCamera } from '../core/view';
import { paintBackdrop } from '../world/Backdrop';
import { drawCell, ALL_EXPOSED } from '../traps/impl/draw';
import { PipView } from '../entities/PipView';
import { transitionTo } from '../ui/transition';
import { MOTION } from '../anim/motion';

/**
 * Title screen. One dominant action (Play / Continue), the world of the
 * chapter you're in, and Pip doing the whole joke of the game in miniature:
 * standing on a plank that eventually changes its mind.
 */
export class MenuScene extends Phaser.Scene {
  private overlay: Phaser.GameObjects.Container | null = null;
  private pip!: PipView;
  private pipState: 'idle' | 'falling' = 'idle';

  constructor() {
    super({ key: 'Menu' });
  }

  create(data: { finale?: boolean } = {}): void {
    const save = services.save;
    const nextIdx = Math.min(save.unlockedThrough, LEVELS.length - 1);
    const next = levelAt(nextIdx);
    const chapter = completionCount(save) >= LEVELS.length ? 5 : next.chapter;
    const theme = THEMES[chapter - 1];
    const rm = services.settings.reducedMotion;
    services.audio.setChapterRoot('menu');

    const cam = setupCamera(this, false);
    cam.setBackgroundColor(theme.bg);
    cam.fadeIn(MOTION.scene.fadeIn);
    paintBackdrop(this, chapter, theme, rm, 0);

    const W = VIEW.w;
    const dark = chapter === 5;
    const ink = dark ? '#fffaf0' : '#3f372f';

    // ---- ground strip with Pip's treacherous plank
    const groundY = GAME_HEIGHT - 70;
    const g = this.add.graphics().setDepth(2);
    for (let x = -30; x < W + 30; x += 30) {
      drawCell(g, x, groundY, { ...ALL_EXPOSED, left: false, right: false, bottom: false }, theme);
      drawCell(g, x, groundY + 30, { top: false, bottom: false, left: false, right: false }, theme);
      drawCell(g, x, groundY + 60, { top: false, bottom: false, left: false, right: false }, theme);
    }
    const plankX = W * 0.72;
    const hole = this.add.graphics().setDepth(2.5);
    hole.fillStyle(0x1f1a16, 0.55).fillRoundedRect(plankX - 45, groundY - 2, 90, 30, 6).setVisible(false);
    const plank = this.add.graphics().setDepth(3);
    const paintPlank = (cracked: boolean) => {
      plank.clear();
      drawCell(plank, -45, 0, { ...ALL_EXPOSED, right: false }, theme, cracked ? 'crack' : 'none', 9000, 9000);
      drawCell(plank, -15, 0, { ...ALL_EXPOSED, left: false, right: false }, theme, cracked ? 'crack' : 'none', 9030, 9000);
      drawCell(plank, 15, 0, { ...ALL_EXPOSED, left: false }, theme, cracked ? 'crack' : 'none', 9060, 9000);
      plank.setPosition(plankX, groundY).setAngle(0).setAlpha(1);
    };
    paintPlank(false);

    this.pip = new PipView(this, 6);
    this.pip.setReduceMotion(rm);
    this.pip.root.setScale(2.1);
    const pipHome = { x: plankX, y: groundY };
    let pipPos = { ...pipHome };

    // ---- title: letters that occasionally fall through the floor
    const titleX = W * 0.3;
    const oops = this.add.text(titleX, 104, 'Oops!', { ...TXT.title, fontSize: '78px', color: ink, stroke: dark ? '#2c2622' : '#fffaf0', strokeThickness: 10 }).setOrigin(0.5).setRotation(-0.05).setDepth(5);
    const word = 'THAT FLOOR!';
    const letters: Phaser.GameObjects.Text[] = [];
    const style = { fontFamily: FONT, fontSize: '50px', fontStyle: '900', color: '#d9492f', stroke: '#2c2622', strokeThickness: 8 } as Phaser.Types.GameObjects.Text.TextStyle;
    const widths = [...word].map((ch) => (ch === ' ' ? 18 : this.add.text(0, 0, ch, style).setVisible(false).width));
    let lx = titleX - widths.reduce((a, b) => a + b, 0) / 2;
    [...word].forEach((ch, i) => {
      const t = this.add.text(lx + widths[i] / 2, 172, ch, style).setOrigin(0.5).setDepth(5).setRotation(-0.05);
      lx += widths[i];
      if (ch !== ' ') letters.push(t);
    });
    this.add.text(titleX, 222, theme === THEMES[0] ? 'the floor is a liar' : theme.tagline.toLowerCase(), { ...TXT.small, fontSize: '16px', color: ink }).setOrigin(0.5).setDepth(5).setAlpha(0.85);
    if (!rm) {
      this.tweens.add({ targets: oops, y: '+=6', duration: 1500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
      this.time.addEvent({
        delay: 3200,
        loop: true,
        callback: () => {
          const t = letters[Math.floor(Math.random() * letters.length)];
          if (this.tweens.isTweening(t)) return;
          const y0 = 172;
          this.tweens.chain({
            targets: t,
            tweens: [
              { y: y0 + 3, duration: 70, ease: 'Quad.easeOut' },
              { y: y0 + 46, alpha: 0, angle: Phaser.Math.Between(-30, 30), duration: 220, ease: 'Quad.easeIn' },
              { y: y0 - 24, alpha: 0, angle: -3, duration: 1 },
              { y: y0, alpha: 1, duration: 300, ease: 'Bounce.easeOut', delay: 380 },
            ],
          });
        },
      });
    }

    // ---- primary + secondary actions
    const started = completionCount(save) > 0 || Object.keys(save.levels).length > 0;
    const playLabel = started ? `Continue  ${next.id}` : 'Play';
    const bx = titleX;
    const play = makeButton(this, bx, 300, 280, 70, `▶  ${playLabel}`, { fill: 0x3f9d57, depth: 6 });
    play.on('pointerup', () => this.go(() => this.scene.start('Game', { index: nextIdx })));
    if (started) this.add.text(bx, 346, next.name, { ...TXT.small, fontSize: '15px', color: ink }).setOrigin(0.5).setDepth(6).setAlpha(0.85);
    if (!rm) this.tweens.add({ targets: play, scale: 1.035, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    const row = (x: number, label: string, cb: () => void) => {
      const b = makeButton(this, x, 400, 132, 46, label, { fill: 0x5a4f46, depth: 6 });
      b.on('pointerup', cb);
    };
    row(bx - 142, 'Levels', () => this.go(() => this.scene.start('Select')));
    row(bx, 'Challenge', () => this.showChallenge());
    row(bx + 142, 'Settings', () => this.showSettings());

    // ---- footer stats
    const done = completionCount(save);
    const stats = `${done}/${LEVELS.length} cleared   ☠ ${save.deaths}   ★ ${save.achievements.length}/${ACHIEVEMENTS.length}`;
    this.add.text(bx, GAME_HEIGHT - 38, stats, { ...TXT.chip, fontSize: '14px' }).setOrigin(0.5).setDepth(6);
    this.add.text(W - 14, GAME_HEIGHT - 14, 'v1.0 · offline · no ads', { ...TXT.small, fontSize: '11px', color: '#fffaf0' }).setOrigin(1, 1).setDepth(6).setAlpha(0.7);

    if (data.finale) toast(this, '★ You beat the floor. The floor would like a rematch.', { y: 40, hold: 4200, fill: 0xf2a541 });

    // unlock audio on first gesture
    this.input.once('pointerdown', () => services.audio.unlock());
    this.input.keyboard?.once('keydown', () => services.audio.unlock());
    this.input.keyboard?.on('keydown-ENTER', () => this.go(() => this.scene.start('Game', { index: nextIdx })));

    // ---- Pip's little loop: idle → suspicious → plank drops → dizzy return
    let idleFor = 0;
    let fallAt = 0;
    const tapZone = this.add.zone(plankX, groundY - 40, 110, 100).setInteractive({ useHandCursor: true }).setDepth(7);
    tapZone.on('pointerup', () => {
      services.fx('player.jump');
      this.pip.onJump();
      this.pip.express('happy', 600);
    });
    this.events.on(Phaser.Scenes.Events.UPDATE, (_t: number, dt: number) => {
      if (this.pipState === 'idle') {
        idleFor += dt;
        this.pip.update(dt, { x: pipPos.x, y: pipPos.y, vx: 0, vy: 0, grounded: true, gSign: 1, facing: -1, inputDir: 0, maxSpeed: 340 });
        this.pip.lookAt({ x: bx, y: 300 });
        if (!rm && idleFor > 5200 && fallAt === 0) {
          fallAt = idleFor;
          paintPlank(true);
          this.pip.express('suspicious', 900);
          services.fx('trap.crumble');
        }
        if (fallAt && idleFor - fallAt > 900) {
          this.pipState = 'falling';
          fallAt = 0;
          idleFor = 0;
          hole.setVisible(true);
          this.tweens.add({ targets: plank, y: groundY + 120, angle: 24, alpha: 0, duration: 380, ease: 'Quad.easeIn' });
          this.pip.express('shock', 2000);
          this.pip.puppet('shock');
          this.tweens.add({
            targets: this.pip.root,
            y: groundY + 70,
            duration: 380,
            ease: 'Quad.easeIn',
            onComplete: () => {
              this.time.delayedCall(700, () => {
                paintPlank(false);
                hole.setVisible(false);
                pipPos = { ...pipHome };
                this.pip.revive(true);
                this.pip.root.setPosition(pipPos.x, pipPos.y).setScale(2.1);
                this.pipState = 'idle';
              });
            },
          });
        }
      }
    });
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.pip.destroy());
  }

  private go(fn: () => void): void {
    services.audio.unlock();
    if (this.overlay) return;
    transitionTo(this, fn);
  }

  private showSettings(): void {
    if (this.overlay) return;
    const p = new SettingsPanel(this, () => {
      p.destroy();
      this.overlay = null;
    }, { onReset: () => this.scene.restart() });
    p.setX(VIEW.w / 2);
    this.overlay = p;
  }

  private showChallenge(): void {
    if (this.overlay) return;
    const W = VIEW.w;
    const c = this.add.container(W / 2, GAME_HEIGHT / 2).setDepth(80);
    const shade = this.add.rectangle(0, 0, W * 2, GAME_HEIGHT * 2, 0x1f1a16, 0.5).setInteractive();
    c.add(shade);
    const card = this.add.graphics();
    card.fillStyle(0x000000, 0.2).fillRoundedRect(-230, -172, 460, 360, 24);
    card.fillStyle(INK, 1).fillRoundedRect(-233, -183, 466, 366, 26);
    card.fillStyle(0xfffaf0, 1).fillRoundedRect(-230, -180, 460, 360, 24);
    c.add(card);
    c.add(this.add.text(0, -146, 'Challenge a Friend', TXT.h2).setOrigin(0.5));
    c.add(this.add.text(0, -112, 'Send your best clear, or enter a code you got.', { ...TXT.small, align: 'center' }).setOrigin(0.5));

    // your challenge: the most recently cleared level (latest in the run)
    const clearedIdx = LEVELS.map((l, i) => (services.save.levels[l.id]?.completed ? i : -1)).filter((i) => i >= 0);
    const lastIdx = clearedIdx.length ? clearedIdx[clearedIdx.length - 1] : -1;
    if (lastIdx >= 0) {
      const lvl = LEVELS[lastIdx];
      const best = Math.max(1, services.save.levels[lvl.id].bestAttempts || 1);
      const code = encodeChallenge({ levelIndex: lastIdx, deaths: best - 1 });
      c.add(this.add.text(0, -70, `${lvl.id} · ${lvl.name} · best ${best} ${best === 1 ? 'try' : 'tries'}`, TXT.body).setOrigin(0.5));
      c.add(this.add.text(0, -36, code, { ...TXT.h2, fontFamily: 'ui-monospace, monospace', fontSize: '28px', color: '#4a72b0' }).setOrigin(0.5));
      const bShare = makeButton(this, -86, 16, 160, 44, 'Share', { fill: 0x4a72b0 });
      bShare.on('pointerup', async () => {
        const r = await shareText(`Level ${lvl.id} took me ${best} ${best === 1 ? 'try' : 'tries'} in Oops! That Floor! Beat that — code ${code}`);
        if (!this.scene.isActive()) return;
        if (r === 'copied') toast(this, 'Challenge copied to clipboard');
        else if (r === 'failed') toast(this, 'Sharing isn’t available — code: ' + code);
      });
      const bCopy = makeButton(this, 86, 16, 160, 44, 'Copy code', { fill: 0x5a4f46 });
      bCopy.on('pointerup', async () => {
        try {
          await navigator.clipboard.writeText(code);
          toast(this, 'Code copied');
        } catch {
          toast(this, `Code: ${code}`);
        }
      });
      c.add([bShare, bCopy]);
    } else {
      c.add(this.add.text(0, -36, 'Clear a level to get your first code.', TXT.body).setOrigin(0.5));
    }

    const enter = makeButton(this, 0, 88, 260, 48, 'Enter a code', { fill: 0x3f9d57 });
    const shown = this.add.text(0, 128, '', { ...TXT.small, fontSize: '15px' }).setOrigin(0.5);
    enter.on('pointerup', () => {
      this.openCodeEntry((code) => {
        const dec = decodeChallenge(code, LEVELS.length - 1);
        if (!dec) {
          shown.setText('That code doesn’t look right (OTF-00-00-0).').setColor('#b8452f');
          services.fx('ui.denied');
          this.tweens.add({ targets: shown, x: { from: -8, to: 0 }, duration: 240, ease: 'Elastic.easeOut' });
          return;
        }
        const lvl = levelAt(dec.levelIndex);
        shown.setText(`${lvl.id} · beat it in ≤ ${dec.deaths + 1} tries`).setColor('#3f9d57');
        this.time.delayedCall(700, () => this.go(() => this.scene.start('Game', { index: dec.levelIndex, challengeDeaths: dec.deaths })));
      });
    });
    c.add([enter, shown]);
    const close = iconButton(this, 206, -156, 'close', () => {
      c.destroy();
      this.overlay = null;
    }, 40);
    c.add(close);
    this.overlay = c;
    if (!services.settings.reducedMotion) {
      c.setScale(0.9).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: MOTION.ui.panelIn.ms, ease: MOTION.ui.panelIn.ease });
    }
  }

  /**
   * In-game challenge-code entry. Uses a DOM input so it gets a real native
   * keyboard + paste support inside the Capacitor WebView — no window.prompt.
   */
  private openCodeEntry(onCode: (code: string) => void): void {
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(31,26,22,0.55);';
    const box = document.createElement('div');
    box.style.cssText =
      'background:#fffaf0;border:3px solid #2c2622;border-radius:22px;padding:22px 26px;display:flex;flex-direction:column;' +
      'gap:12px;align-items:center;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:ui-rounded,"SF Pro Rounded",system-ui,sans-serif;';
    const label = document.createElement('div');
    label.textContent = 'Challenge code';
    label.style.cssText = 'font-size:15px;font-weight:800;color:#7a6f62;';
    const input = document.createElement('input');
    input.placeholder = 'OTF-00-00-0';
    input.setAttribute('maxlength', '14');
    input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.setAttribute('inputmode', 'text');
    input.style.cssText =
      'font-size:26px;font-family:ui-monospace,monospace;font-weight:800;letter-spacing:2px;' +
      'text-align:center;text-transform:uppercase;border:3px solid #e4dccb;border-radius:12px;' +
      'padding:10px 14px;width:260px;color:#3f372f;background:#fff;outline:none;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;';
    const btn = document.createElement('button');
    btn.textContent = 'Go';
    btn.style.cssText = 'font-size:17px;font-weight:800;color:#fffaf0;background:#3f9d57;border:3px solid #2c2622;border-radius:14px;padding:10px 26px;';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.cssText = 'font-size:16px;font-weight:700;color:#7a6f62;background:transparent;border:0;padding:10px 16px;';
    const done = (code?: string) => {
      host.remove();
      if (code !== undefined) onCode(code.trim());
    };
    btn.onclick = () => done(input.value);
    cancel.onclick = () => done();
    input.onkeydown = (e) => {
      if (e.key === 'Enter') done(input.value);
      if (e.key === 'Escape') done();
    };
    host.onclick = (e) => {
      if (e.target === host) done();
    };
    row.append(btn, cancel);
    box.append(label, input, row);
    host.append(box);
    document.body.append(host);
    input.focus();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => host.remove());
  }
}
