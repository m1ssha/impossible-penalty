import Phaser from 'phaser';
import type { Language } from '../core/i18n';
import type { SoundEvent } from '../core/audio';
import type { Phase, Shot } from '../core/model';
import { PenaltyScene } from './PenaltyScene';

export interface GameCallbacks {
  onPhase(phase: Phase): void;
  onShot(shot: Shot): void;
  onSound(event: SoundEvent): void;
  onRemark(text: string): void;
}

export interface GameController {
  destroy(): void;
  setReducedMotion(value: boolean): void;
  setLanguage(language: Language): void;
  shoot(): void;
  moveAim(dx: number, dy: number): void;
}

export function createGame(parent: HTMLElement, callbacks: GameCallbacks): GameController {
  const scene = new PenaltyScene(callbacks);
  let destroyed = false;
  const game = new Phaser.Game({
    type: Phaser.AUTO,
    parent,
    width: 960,
    height: 600,
    backgroundColor: '#071b20',
    pixelArt: true,
    antialias: false,
    roundPixels: true,
    audio: { noAudio: true },
    scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    render: { transparent: false, preserveDrawingBuffer: true },
    scene: [scene],
    fps: { target: 60 },
  });
  // FIT's built-in resize polling can lag behind responsive CSS. Refresh before
  // native input reaches Phaser, as well as when the containing block changes.
  const refreshScale = () => {
    if (destroyed || !game.isBooted || !game.canvas || !game.scale) return;
    const bounds = parent.getBoundingClientRect();
    if (bounds.width <= 0 || bounds.height <= 0) return;
    game.scale.getParentBounds();
    game.scale.refresh();
  };
  const updateBounds = () => {
    if (!destroyed && game.isBooted && game.canvas && game.scale) game.scale.updateBounds();
  };
  const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(refreshScale);
  observer?.observe(parent);
  const inputEvents = ['pointerdown', 'mousedown', 'touchstart'] as const;
  for (const event of inputEvents) parent.addEventListener(event, refreshScale, true);
  window.addEventListener('resize', refreshScale);
  window.addEventListener('orientationchange', refreshScale);
  window.addEventListener('scroll', updateBounds, true);
  game.events.once(Phaser.Core.Events.READY, refreshScale);
  return {
    destroy() {
      if (destroyed) return;
      destroyed = true;
      observer?.disconnect();
      for (const event of inputEvents) parent.removeEventListener(event, refreshScale, true);
      window.removeEventListener('resize', refreshScale);
      window.removeEventListener('orientationchange', refreshScale);
      window.removeEventListener('scroll', updateBounds, true);
      game.events.off(Phaser.Core.Events.READY, refreshScale);
      game.destroy(true);
    },
    setLanguage(language) {
      scene.setLanguage(language);
    },
    setReducedMotion(value) {
      scene.setReducedMotion(value);
    },
    shoot() {
      scene.shoot();
    },
    moveAim(dx, dy) {
      scene.moveAim(dx, dy);
    },
  };
}
