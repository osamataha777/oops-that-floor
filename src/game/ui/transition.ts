import Phaser from 'phaser';
import { MOTION } from '../anim/motion';
import { services } from '../core/services';

let busy = false;

/**
 * The one screen-to-screen transition: a short warm fade, then `go()`.
 * Re-entrant calls while a transition is running are ignored, so double
 * taps can never start two scenes.
 */
export function transitionTo(scene: Phaser.Scene, go: () => void): void {
  if (busy) return;
  const cam = scene.cameras.main;
  const finish = () => {
    busy = false;
    go();
  };
  if (services.settings.reducedMotion || !cam) {
    finish();
    return;
  }
  busy = true;
  cam.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, finish);
  cam.fadeOut(MOTION.scene.fadeOut, 31, 26, 22);
  // Safety net: never leave the flag stuck if the scene dies mid-fade.
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => (busy = false));
}
