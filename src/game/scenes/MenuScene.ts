import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, THEMES } from '../core/config';
import { TXT, FONT } from '../ui/theme';
import { makeButton, tinyText } from '../ui/widgets';
import { SettingsPanel } from '../ui/SettingsPanel';
import { services } from '../core/services';
import { completionCount } from '../../services/progress';
import { decodeChallenge, encodeChallenge } from '../../services/challenge';
import { LEVELS, levelAt } from '../levels/index';
import { isNative, shareText } from '../../platform/native';
import { setupCamera } from '../core/view';
import { ACHIEVEMENTS } from '../../services/achievements';

export class MenuScene extends Phaser.Scene {
  private overlay: Phaser.GameObjects.Container | null = null;

  constructor() {
    super({ key: 'Menu' });
  }

  create(): void {
    const theme = THEMES[0];
    setupCamera(this);
    this.cameras.main.setBackgroundColor(theme.bg);
    this.cameras.main.fadeIn(200);

    // soft horizon + ground
    const g = this.add.graphics();
    g.fillStyle(theme.bgFar, 0.8);
    for (let i = 0; i < 5; i++) g.fillEllipse(i * 260 - 40, GAME_HEIGHT + 40, 360, 200);
    g.fillStyle(theme.solid, 1);
    g.fillRoundedRect(0, GAME_HEIGHT - 90, GAME_WIDTH, 92, { tl: 20, tr: 20, bl: 0, br: 0 });
    g.fillStyle(theme.solidTop, 1);
    g.fillRoundedRect(0, GAME_HEIGHT - 90, GAME_WIDTH, 14, { tl: 20, tr: 20, bl: 0, br: 0 });
    g.fillStyle(theme.solidDark, 0.5);
    g.fillRoundedRect(0, GAME_HEIGHT - 76, GAME_WIDTH, 4, 0);

    // suspicious plank + spikes underneath — the whole joke in one image
    const plankX = GAME_WIDTH / 2 + 210;
    const plankY = GAME_HEIGHT - 90;
    const plank = this.add.graphics().setDepth(4);
    const paintPlank = (cracked: boolean) => {
      plank.clear();
      plank.fillStyle(theme.solidDark, 0.5);
      plank.fillRoundedRect(plankX - 70, plankY - 10, 140, 12, 5);
      plank.fillStyle(cracked ? 0x8a6a52 : 0xa37c5e, 1);
      plank.fillRoundedRect(plankX - 70, plankY - 13, 140, 10, 5);
      if (cracked) {
        plank.lineStyle(1.6, 0x1a1512, 0.5);
        plank.beginPath();
        plank.moveTo(plankX - 8, plankY - 13);
        plank.lineTo(plankX + 4, plankY - 4);
        plank.moveTo(plankX - 30, plankY - 13);
        plank.lineTo(plankX - 24, plankY - 6);
        plank.strokePath();
      }
    };
    paintPlank(false);
    // spikes hiding below the plank
    const spikeG = this.add.graphics().setDepth(3).setAlpha(0);
    spikeG.fillStyle(0xff5a4e, 1);
    for (let i = 0; i < 5; i++) {
      const sx = plankX - 55 + i * 24;
      spikeG.fillTriangle(sx, plankY + 18, sx + 10, plankY + 2, sx + 20, plankY + 18);
    }
    const pip = this.add.sprite(plankX, plankY - 32, 'pip-idle').setDepth(5).setScale(1.35);

    // The menu vignette loop: idle → plank cracks → Pip panics → respawn grumpy.
    const vignette = () => {
      pip.setTexture('pip-idle');
      paintPlank(false);
      spikeG.setAlpha(0);
      pip.setPosition(plankX, plankY - 32).setAngle(0).setScale(1.35);
      this.time.delayedCall(1400, () => {
        pip.setTexture('pip-curious');
        paintPlank(true);
        services.audio.sfx('crumble');
        this.time.delayedCall(700, () => {
          // plank drops out, Pip hovers shocked
          plank.clear();
          spikeG.setAlpha(1);
          services.audio.sfx('pop');
          pip.setTexture('pip-shock');
          this.tweens.add({
            targets: pip,
            y: plankY + 4,
            angle: 40,
            duration: 480,
            ease: 'Quad.easeIn',
            onComplete: () => {
              pip.setTexture('pip-dizzy');
              this.time.delayedCall(1100, () => {
                this.tweens.add({ targets: pip, x: plankX, y: plankY - 32, angle: 0, duration: 1, onComplete: vignette });
                pip.setTexture('pip-defeated');
              });
            },
          });
        });
      });
    };
    vignette();
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.tweens.killTweensOf(pip));

    // title
    const t1 = this.add.text(GAME_WIDTH / 2 - 90, 108, 'Oops!', { ...TXT.title, fontSize: '64px' }).setOrigin(0.5);
    const t2 = this.add.text(GAME_WIDTH / 2 - 90, 168, 'THAT FLOOR!', { ...TXT.title, fontSize: '44px', color: '#b8452f' }).setOrigin(0.5);
    t1.setRotation(-0.04);
    t2.setRotation(-0.04);
    this.tweens.add({ targets: [t1, t2], y: '+=6', duration: 1400, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    this.add.text(GAME_WIDTH / 2 - 90, 214, 'the floor is a liar', TXT.small).setOrigin(0.5);

    // unlock audio on first gesture
    this.input.once('pointerdown', () => services.audio.unlock());
    this.input.keyboard?.once('keydown', () => services.audio.unlock());

    // buttons
    const save = services.save;
    const nextIdx = Math.min(save.unlockedThrough, LEVELS.length - 1);
    const bx = GAME_WIDTH / 2 - 220;
    const mk = (x: number, y: number, w: number, label: string, cb: () => void, fill = 0x4a4038) => {
      const b = makeButton(this, x, y, w, 52, label, { fill });
      b.on('pointerup', () => {
        services.audio.unlock();
        services.audio.sfx('click');
        cb();
      });
      return b;
    };
    mk(bx, 280, 240, `▶  Play ${levelAt(nextIdx).id}`, () => this.scene.start('Game', { index: nextIdx }), 0x58a05c);
    mk(bx, 344, 240, 'Levels', () => this.scene.start('Select'));
    mk(bx + 250, 344, 200, 'Challenge', () => this.showChallenge());
    mk(bx + 250, 280, 200, 'Settings', () => this.showSettings(), 0x6b5e52);

    // footer stats
    const done = completionCount(save);
    const stats = `${done}/40 cleared   ☠ ${save.deaths} deaths   ★ ${save.achievements.length}/${ACHIEVEMENTS.length}`;
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 30, stats, TXT.small).setOrigin(0.5);
    tinyText(this, GAME_WIDTH / 2, GAME_HEIGHT - 12, 'v1.0 — offline, no ads, no mercy');
  }

  private showSettings(): void {
    if (this.overlay) return;
    const p = new SettingsPanel(this, () => {
      p.destroy();
      this.overlay = null;
    });
    this.overlay = p;
  }

  private showChallenge(): void {
    if (this.overlay) return;
    const c = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(80);
    c.add(this.add.rectangle(0, 0, GAME_WIDTH * 2, GAME_HEIGHT * 2, 0x2b2418, 0.45).setInteractive());
    c.add(this.add.rectangle(0, 0, 440, 360, 0xfffaf0).setStrokeStyle(0).setInteractive());
    c.add(this.add.text(0, -140, 'Challenge a Friend', TXT.h2).setOrigin(0.5));
    c.add(this.add.text(0, -96, 'Share your best clear — or enter a code\nyou received.', { ...TXT.small, align: 'center' }).setOrigin(0.5));

    // your latest challenge code: hardest cleared level
    const cleared = Object.entries(services.save.levels)
      .filter(([, r]) => r.completed)
      .map(([id]) => id);
    const lastId = cleared[cleared.length - 1];
    const mine = lastId
      ? encodeChallenge({ levelIndex: LEVELS.findIndex((l) => l.id === lastId), deaths: Math.max(0, (services.save.levels[lastId].bestAttempts || 1) - 1) })
      : null;

    const codeTxt = this.add
      .text(0, -30, mine ? `Your code: ${mine}` : 'Finish a level to get a code', { ...TXT.body, fontFamily: FONT })
      .setOrigin(0.5);
    c.add(codeTxt);
    if (mine) {
      const bShare = makeButton(this, 0, 24, 240, 44, 'Share my challenge', { fill: 0x4a72b0 });
      bShare.on('pointerup', () => {
        const lvl = LEVELS.find((l) => l.id === lastId)!;
        const d = Math.max(0, lvl ? (services.save.levels[lastId].bestAttempts || 1) - 1 : 0);
        void shareText(`Level ${lastId} took me ${d + 1} ${d === 0 ? 'try' : 'tries'} in Oops! That Floor! Beat that. Code: ${mine}`);
      });
      c.add(bShare);
    }

    // code entry — native-friendly DOM input (real keyboard, paste, no prompt())
    const entry = this.add.text(0, 84, 'Tap to enter code', { ...TXT.body, color: '#4a72b0' }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    const shown = this.add.text(0, 120, '', { ...TXT.h2, fontFamily: 'ui-monospace, monospace' }).setOrigin(0.5);
    entry.on('pointerup', () => {
      this.openCodeEntry((code) => {
        const dec = decodeChallenge(code, LEVELS.length - 1);
        if (dec) {
          const lvl = levelAt(dec.levelIndex);
          shown.setText(`→ ${lvl.id} in ≤${dec.deaths + 1} tries`);
          this.time.delayedCall(600, () => this.scene.start('Game', { index: dec.levelIndex, challengeDeaths: dec.deaths }));
        } else {
          shown.setText('Invalid code');
          services.audio.sfx('denied');
        }
      });
    });
    c.add([entry, shown]);

    const close = makeButton(this, 0, 150, 140, 40, 'Close', {});
    close.on('pointerup', () => {
      c.destroy();
      this.overlay = null;
    });
    c.add(close);
    this.overlay = c;
  }

  /**
   * In-game challenge-code entry. Uses a DOM input so it gets a real native
   * keyboard + paste support inside the Capacitor WebView — no window.prompt.
   */
  private openCodeEntry(onCode: (code: string) => void): void {
    const host = document.createElement('div');
    host.style.cssText =
      'position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;' +
      'background:rgba(43,36,24,0.5);';
    const box = document.createElement('div');
    box.style.cssText =
      'background:#fffaf0;border-radius:18px;padding:22px 26px;display:flex;flex-direction:column;' +
      'gap:12px;align-items:center;box-shadow:0 12px 40px rgba(0,0,0,.25);font-family:ui-rounded,"SF Pro Rounded",system-ui,sans-serif;';
    const label = document.createElement('div');
    label.textContent = 'Challenge code';
    label.style.cssText = 'font-size:15px;font-weight:700;color:#7a6f62;';
    const input = document.createElement('input');
    input.placeholder = 'OTF-00-00-0';
    input.setAttribute('maxlength', '11');
    input.setAttribute('autocapitalize', 'characters');
    input.setAttribute('autocorrect', 'off');
    input.setAttribute('spellcheck', 'false');
    input.style.cssText =
      'font-size:26px;font-family:ui-monospace,monospace;font-weight:800;letter-spacing:2px;' +
      'text-align:center;text-transform:uppercase;border:3px solid #e4dccb;border-radius:12px;' +
      'padding:10px 14px;width:260px;color:#3f372f;background:#fff;outline:none;';
    const row = document.createElement('div');
    row.style.cssText = 'display:flex;gap:10px;';
    const btn = document.createElement('button');
    btn.textContent = 'Go';
    btn.style.cssText =
      'font-size:16px;font-weight:800;color:#fffaf0;background:#58a05c;border:0;border-radius:10px;padding:10px 24px;';
    const cancel = document.createElement('button');
    cancel.textContent = 'Cancel';
    cancel.style.cssText =
      'font-size:16px;font-weight:700;color:#7a6f62;background:transparent;border:0;padding:10px 16px;';
    const done = (code?: string) => {
      host.remove();
      if (code) onCode(code);
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
