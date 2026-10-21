import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, PHYSICS } from './game/core/config';
import { BootScene } from './game/scenes/BootScene';
import { MenuScene } from './game/scenes/MenuScene';
import { LevelSelectScene } from './game/scenes/LevelSelectScene';
import { GameScene } from './game/scenes/GameScene';
import { services } from './game/core/services';

async function boot(): Promise<void> {
  await services.init();

  const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    parent: 'game',
    backgroundColor: '#f4efe6',
    scale: {
      mode: Phaser.Scale.FIT,
      autoCenter: Phaser.Scale.CENTER_BOTH,
      width: GAME_WIDTH,
      height: GAME_HEIGHT,
    },
    input: {
      activePointers: 3,
    },
    physics: {
      default: 'arcade',
      arcade: {
        gravity: { x: 0, y: PHYSICS.gravityY },
        debug: false,
        fps: 60,
      },
    },
    render: {
      antialias: true,
      roundPixels: false,
    },
    scene: [BootScene, MenuScene, LevelSelectScene, GameScene],
    disableContextMenu: true,
  };

  const game = new Phaser.Game(config);
  // debug/testing handle — harmless in an offline game, used by Playwright E2E
  (window as unknown as { __otf: Phaser.Game }).__otf = game;

  // lock to landscape-ish presentation on devices that respect it
  try {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (screen.orientation as any)?.lock?.('landscape').catch?.(() => undefined);
  } catch {
    /* unsupported — layout still works */
  }

  void game;
}

void boot();
