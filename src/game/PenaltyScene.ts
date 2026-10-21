import Phaser from 'phaser';
import { planShot, type Phase, type Point, type Shot } from '../core/model';
import type { GameCallbacks } from './createGame';
import { createArt } from './art';

const GOAL = { x: 226, y: 154, width: 508, height: 202 };
const BALL = { x: 492, y: 527 };
const KEEPER = { x: 480, y: 365 };
const RUNUP_MS = 650;
const FLIGHT_MS = 640;
const CONTACT_T = 0.84;
const clamp = Phaser.Math.Clamp;
const lerp = Phaser.Math.Linear;
const ease = (t: number) => 1 - Math.pow(1 - clamp(t, 0, 1), 3);

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  color: number;
  size: number;
  smoke?: boolean;
};

/** All round animation uses one local clock, so hidden tabs cannot skip contact. */
export class PenaltyScene extends Phaser.Scene {
  private readonly callbacks: GameCallbacks;
  private phase: Phase = 'ready';
  private phaseTime = 0;
  private totalTime = 0;
  private aim: Point = { x: 0.72, y: 0.4 };
  private history: Point[] = [];
  private shotSequence = 0;
  private shot: Shot | null = null;
  private reducedMotion = false;
  private suspended = false;
  private initialized = false;
  private hasResolved = false;
  private keeper!: Phaser.GameObjects.Image;
  private striker!: Phaser.GameObjects.Image;
  private fan!: Phaser.GameObjects.Image;
  private incidentBanner!: Phaser.GameObjects.Text;
  private smokeAccumulator = 0;
  private ball!: Phaser.GameObjects.Image;
  private shadows!: Phaser.GameObjects.Graphics;
  private effects!: Phaser.GameObjects.Graphics;
  private net!: Phaser.GameObjects.Graphics;
  private reticle!: Phaser.GameObjects.Graphics;
  private keeperStart = { ...KEEPER };
  private contact = { x: 480, y: 250 };
  private diveEnd = { ...KEEPER };
  private diveRotation = 0;
  private landingStart = { ...KEEPER, rotation: 0, scale: 2.5 };
  private direction = 1;
  private particles: Particle[] = [];
  private trail: { x: number; y: number; scale: number }[] = [];
  private rebound = { x: 0, y: 0, vx: 0, vy: 0 };
  private celebration!: Phaser.GameObjects.Text;
  private resultAccent!: Phaser.GameObjects.Text;
  private idlePose = '';
  private lastIdleCycle = -1;

  constructor(callbacks: GameCallbacks) {
    super({ key: 'PenaltyScene' });
    this.callbacks = callbacks;
  }

  create(): void {
    createArt(this);
    this.add.image(0, 0, 'stadium').setOrigin(0);
    this.net = this.add.graphics().setDepth(1);
    this.shadows = this.add.graphics().setDepth(2);
    this.keeper = this.add
      .image(KEEPER.x, KEEPER.y, 'keeper-idle')
      .setOrigin(0.5, 1)
      .setScale(2.5)
      .setDepth(3);
    this.striker = this.add
      .image(455, 550, 'striker-idle')
      .setOrigin(0.5, 1)
      .setScale(2.5)
      .setDepth(5);
    this.fan = this.add
      .image(-70, 548, 'fan-run')
      .setOrigin(0.5, 1)
      .setScale(2.5)
      .setDepth(5.5)
      .setVisible(false);
    this.incidentBanner = this.add
      .text(480, 112, '', {
        fontFamily: 'monospace',
        fontSize: '16px',
        fontStyle: 'bold',
        color: '#ffe5ee',
        backgroundColor: '#632744',
        padding: { x: 14, y: 8 },
      })
      .setOrigin(0.5)
      .setDepth(9)
      .setVisible(false);
    this.ball = this.add.image(BALL.x, BALL.y, 'ball').setScale(2).setDepth(6);
    this.effects = this.add.graphics().setDepth(7);
    this.reticle = this.add.graphics().setDepth(8);
    this.celebration = this.add
      .text(480, 236, '', {
        fontFamily: 'monospace',
        fontSize: '60px',
        fontStyle: 'bold',
        color: '#e4ff90',
        stroke: '#0a2024',
        strokeThickness: 10,
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);
    this.resultAccent = this.add
      .text(480, 289, '', {
        fontFamily: 'monospace',
        fontSize: '13px',
        fontStyle: 'bold',
        color: '#fff7d4',
        backgroundColor: '#102b2c',
        padding: { x: 12, y: 7 },
      })
      .setOrigin(0.5)
      .setDepth(10)
      .setVisible(false);
    this.input.on('pointermove', this.handlePointerMove, this);
    this.input.on('pointerdown', this.handlePointerDown, this);
    this.input.on('gameout', this.handlePointerOut, this);
    document.addEventListener('visibilitychange', this.handleVisibility);
    window.addEventListener('blur', this.handleBlur);
    window.addEventListener('focus', this.handleFocus);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      document.removeEventListener('visibilitychange', this.handleVisibility);
      window.removeEventListener('blur', this.handleBlur);
      window.removeEventListener('focus', this.handleFocus);
      this.input.off('pointermove', this.handlePointerMove, this);
      this.input.off('pointerdown', this.handlePointerDown, this);
      this.input.off('gameout', this.handlePointerOut, this);
      this.initialized = false;
    });
    this.initialized = true;
    this.suspended = document.hidden;
    this.callbacks.onPhase('ready');
    this.drawReticle();
  }

  setReducedMotion(value: boolean): void {
    this.reducedMotion = value;
  }

  moveAim(dx: number, dy: number): void {
    if (this.phase !== 'ready') return;
    this.aim = {
      x: clamp(this.aim.x + dx, -GOAL.x / GOAL.width, (960 - GOAL.x) / GOAL.width),
      y: clamp(this.aim.y + dy, -GOAL.y / GOAL.height, (600 - GOAL.y) / GOAL.height),
    };
    if (this.initialized) this.drawReticle();
  }

  shoot(): void {
    if (!this.initialized || this.phase !== 'ready' || this.suspended) return;
    // Close the gate before invoking any external callback or sampling a result.
    this.phase = 'runup';
    this.phaseTime = 0;
    this.hasResolved = false;
    this.keeper.setAlpha(1);
    this.striker.setAlpha(1);
    this.ball.setAlpha(1);
    this.shot = planShot({ ...this.aim }, this.history, Math.random, this.shotSequence++);
    if (this.shot.outcome !== 'miss') this.history = [...this.history, { ...this.aim }].slice(-6);
    this.fan
      .setPosition(-70, 548)
      .setAlpha(1)
      .setRotation(0)
      .setTexture('fan-run')
      .setVisible(this.shot.surprise === 'fan');
    this.incidentBanner
      .setVisible(this.shot.surprise === 'fan')
      .setText('FAN INVASION!')
      .setAlpha(1);
    this.keeperStart = { x: this.keeper.x, y: this.keeper.y };
    this.direction = this.aim.x < 0.5 ? -1 : 1;
    this.contact = this.flightPosition(CONTACT_T);
    this.diveRotation = this.direction * (0.9 + (1 - this.aim.y) * 0.25);
    this.keeper.setFlipX(this.direction < 0);
    // Dive texture's extended hand (27,12), transformed exactly into ball contact.
    const hand = this.handOffset(this.diveRotation, this.shot.surprise === 'giant' ? 7.5 : 2.5);
    this.diveEnd = { x: this.contact.x - hand.x, y: this.contact.y - hand.y };
    if (this.shot.outcome === 'goal') {
      this.diveEnd = { x: KEEPER.x - this.direction * 155, y: KEEPER.y + 26 };
      this.diveRotation = -this.direction * 1.25;
      this.keeper.setFlipX(this.direction > 0);
    }
    this.reticle.setVisible(false);
    this.callbacks.onRemark(this.shot.surprise === 'fan' ? 'WHO LET YOU ON THE PITCH?!' : '');
    this.callbacks.onPhase('runup');
  }

  private handleVisibility = (): void => {
    this.suspended = document.hidden;
  };
  private handleBlur = (): void => {
    this.suspended = true;
  };
  private handleFocus = (): void => {
    this.suspended = document.hidden;
  };
  private handlePointerOut(): void {
    if (this.phase === 'ready') this.reticle.setAlpha(0.45);
  }

  /** Read current DOM geometry, independent of Phaser's throttled scale cache. */
  private pointerPosition(pointer: Phaser.Input.Pointer): { x: number; y: number } {
    const event = pointer.event;
    let position: MouseEvent | Touch | undefined;
    if (event && 'changedTouches' in event) {
      position = Array.from(event.changedTouches).find(
        (touch) => touch.identifier === pointer.identifier,
      );
    } else if (event) position = event;
    const bounds = this.game.canvas.getBoundingClientRect();
    if (!position || bounds.width <= 0 || bounds.height <= 0)
      return { x: pointer.worldX, y: pointer.worldY };
    return {
      x: ((position.clientX - bounds.left) * 960) / bounds.width,
      y: ((position.clientY - bounds.top) * 600) / bounds.height,
    };
  }

  private handlePointerMove(pointer: Phaser.Input.Pointer): void {
    if (this.phase !== 'ready') return;
    const { x, y } = this.pointerPosition(pointer);
    this.input.setDefaultCursor('crosshair');
    if (x < 0 || x > 960 || y < 0 || y > 600) {
      this.reticle.setAlpha(0.45);
      return;
    }
    this.aim = { x: (x - GOAL.x) / GOAL.width, y: (y - GOAL.y) / GOAL.height };
    this.reticle.setAlpha(1);
    this.drawReticle();
  }

  private handlePointerDown(pointer: Phaser.Input.Pointer): void {
    if (this.phase !== 'ready') return;
    const { x, y } = this.pointerPosition(pointer);
    if (x < 0 || x > 960 || y < 0 || y > 600) return;
    this.aim = { x: (x - GOAL.x) / GOAL.width, y: (y - GOAL.y) / GOAL.height };
    this.shoot();
  }

  private drawReticle(): void {
    if (!this.reticle) return;
    const x = GOAL.x + this.aim.x * GOAL.width;
    const y = GOAL.y + this.aim.y * GOAL.height;
    const g = this.reticle.clear().setVisible(true);
    const color =
      this.aim.x >= 0 && this.aim.x <= 1 && this.aim.y >= 0 && this.aim.y <= 1
        ? 0xe4ff90
        : 0xffa45d;
    g.lineStyle(2, color, 0.9);
    const gap = 5;
    const arm = 12;
    g.lineBetween(x - arm, y, x - gap, y);
    g.lineBetween(x + gap, y, x + arm, y);
    g.lineBetween(x, y - arm, x, y - gap);
    g.lineBetween(x, y + gap, x, y + arm);
    g.strokeRect(x - 15, y - 15, 30, 30);
    g.fillStyle(color, 0.95).fillRect(x - 1, y - 1, 2, 2);
  }

  private handOffset(rotation: number, scale = 2.5): { x: number; y: number } {
    const x = 11 * scale * this.direction;
    const y = -36 * scale;
    return {
      x: x * Math.cos(rotation) - y * Math.sin(rotation),
      y: x * Math.sin(rotation) + y * Math.cos(rotation),
    };
  }

  private flightPosition(t: number): { x: number; y: number } {
    const target = this.shot?.target ?? this.aim;
    const x = GOAL.x + target.x * GOAL.width;
    const y = GOAL.y + target.y * GOAL.height;
    return {
      x: lerp(BALL.x, x, t),
      y: lerp(BALL.y, y, t) - Math.sin(t * Math.PI) * clamp(48 + (1 - target.y) * 25, 18, 95),
    };
  }

  update(_time: number, delta: number): void {
    if (!this.initialized || this.suspended) return;
    const dt = Math.min(delta, 100);
    this.totalTime += dt;
    this.phaseTime += dt;
    if (this.phase === 'ready') this.updateIdle(dt);
    else if (this.phase === 'runup') this.updateRunup();
    else if (this.phase === 'flight') this.updateFlight();
    else this.updateResult(dt);
    this.drawShadows();
    this.drawEffects(dt);
    this.drawNet();
    this.updateCamera();
  }

  private updateIdle(dt: number): void {
    const cycle = Math.floor(this.totalTime / 3900);
    const within = this.totalTime % 3900;
    if (cycle !== this.lastIdleCycle) {
      this.lastIdleCycle = cycle;
      const poses = [
        'keeper-idle',
        'keeper-clap',
        'keeper-idle',
        'keeper-yawn',
        'keeper-paper',
        'keeper-smoke',
      ];
      this.idlePose = poses[cycle % poses.length];
    }
    const special = within > 2000 && within < 3500;
    let texture = special ? this.idlePose : 'keeper-idle';
    if (texture === 'keeper-clap' && !this.reducedMotion && Math.floor(within / 180) % 2 === 0)
      texture = 'keeper-idle';
    const yawnTilt =
      special && texture === 'keeper-yawn' && !this.reducedMotion
        ? Math.sin(((within - 2000) / 1500) * Math.PI) * -0.06
        : 0;
    this.keeper.setTexture(texture).setRotation(yawnTilt).setScale(2.5).setFlipX(false);
    const repeated =
      this.history.length >= 3 &&
      this.history
        .slice(-3)
        .every((p) => Math.abs(p.x - this.history[this.history.length - 1].x) < 0.22);
    const lean = repeated ? (this.history[this.history.length - 1].x - 0.5) * 22 : 0;
    const breath = this.reducedMotion ? 0 : Math.sin(this.totalTime / 280) * 1.5;
    this.keeper.setPosition(KEEPER.x + lean, KEEPER.y + breath);
    if (texture === 'keeper-smoke') {
      this.smokeAccumulator += dt;
      if (this.smokeAccumulator >= (this.reducedMotion ? 600 : 160)) {
        this.smokeAccumulator = 0;
        const life = this.reducedMotion ? 950 : 1500;
        this.particles.push({
          x: this.keeper.x + 35,
          y: this.keeper.y - 82.5,
          vx: 4 + Math.random() * 6,
          vy: -15 - Math.random() * 8,
          life,
          max: life,
          color: 0xb7c9bc,
          size: 3,
          smoke: true,
        });
      }
    } else this.smokeAccumulator = 0;
    const reveal = clamp(this.phaseTime / 160, 0, 1);
    this.keeper.setAlpha(reveal);
    this.striker.setTexture('striker-idle').setPosition(455, 550).setRotation(0).setAlpha(reveal);
    this.ball.setPosition(BALL.x, BALL.y).setScale(2).setRotation(0).setAlpha(reveal);
    if (!this.reducedMotion) this.reticle.setAlpha(0.72 + Math.sin(this.totalTime / 210) * 0.2);
  }

  private updateRunup(): void {
    if (!this.shot) return;
    const fanShot = this.shot.surprise === 'fan';
    const t = clamp(this.phaseTime / (fanShot ? 1100 : RUNUP_MS), 0, 1);
    this.striker.setTexture(
      t > 0.77 ? 'striker-kick' : Math.floor(t * 9) % 2 ? 'striker-run' : 'striker-idle',
    );
    this.striker.setPosition(
      lerp(455, 475, t),
      lerp(550, 534, t) - Math.sin(t * Math.PI * 6) * (t < 0.78 ? 3 : 0),
    );
    this.striker.setRotation(Math.sin(t * Math.PI) * 0.07);
    if (fanShot) {
      const approach = t < 0.84 ? (t / 0.84) * 0.97 : 0.97 + ((t - 0.84) / 0.16) * 0.03;
      this.fan
        .setPosition(
          lerp(-70, 475, approach),
          lerp(548, 534, approach) - (t < 0.84 ? Math.abs(Math.sin(t * Math.PI * 8)) * 5 : 0),
        )
        .setTexture(t > 0.84 ? 'fan-kick' : 'fan-run')
        .setRotation(t > 0.84 ? 0 : Math.sin(t * Math.PI * 8) * 0.04);
      this.striker
        .setTexture('striker-idle')
        .setPosition(lerp(455, 585, ease(t / 0.55)), lerp(550, 562, ease(t / 0.55)))
        .setRotation(0);
    }
    this.keeper.setTexture('keeper-idle').setRotation(0);
    const anticipation = this.shot.outcome === 'predictor' ? ease((t - 0.35) / 0.65) : 0;
    this.keeper.setPosition(
      this.keeperStart.x + this.direction * anticipation * 21,
      KEEPER.y + anticipation * 5,
    );
    this.keeper.setScale(2.5, 2.5 - anticipation * 0.12);
    if (t >= 1) {
      this.phase = 'flight';
      this.phaseTime = 0;
      this.keeperStart = { x: this.keeper.x, y: this.keeper.y };
      this.callbacks.onSound('kick');
      this.callbacks.onPhase('flight');
      this.burst(BALL.x, BALL.y + 8, 0xd3e9ac, 10, 55);
    }
  }

  private updateFlight(): void {
    if (!this.shot) return;
    const t = clamp(this.phaseTime / FLIGHT_MS, 0, 1);
    const miss = this.shot.outcome === 'miss';
    const limit = this.shot.outcome === 'goal' || miss ? 1 : CONTACT_T;
    const ballT = Math.min(t, limit);
    const pos = this.flightPosition(ballT);
    this.ball
      .setPosition(pos.x, pos.y)
      .setScale(
        lerp(
          2,
          miss
            ? lerp(0.7, 2.2, clamp((GOAL.y + this.shot.target.y * GOAL.height - 80) / 520, 0, 1))
            : 0.86,
          ballT,
        ),
      )
      .setRotation(t * 14 * this.direction);
    if (!this.reducedMotion) {
      this.trail.push({ x: pos.x, y: pos.y, scale: this.ball.scaleX });
      if (this.trail.length > 7) this.trail.shift();
    }
    if (miss) {
      this.keeper
        .setTexture('keeper-idle')
        .setScale(2.5)
        .setPosition(KEEPER.x + this.direction * ease(t) * 12, KEEPER.y)
        .setRotation(this.direction * Math.sin(t * Math.PI) * 0.025);
      this.striker.setTexture(t < 0.28 ? 'striker-kick' : 'striker-idle').setRotation(0);
      if (t >= 1) this.resolve();
      return;
    }
    const start =
      this.shot.outcome === 'flash'
        ? 0.48
        : this.shot.outcome === 'goal'
          ? 0.53
          : this.shot.outcome === 'showoff'
            ? 0.24
            : 0.02;
    const end = this.shot.outcome === 'goal' ? 1.18 : CONTACT_T;
    const raw = clamp((t - start) / (end - start), 0, 1);
    const movement = this.shot.outcome === 'flash' ? raw * raw * (3 - 2 * raw) : ease(raw);
    this.keeper.setTexture(
      raw > 0
        ? this.shot.outcome === 'showoff'
          ? 'keeper-showoff'
          : 'keeper-dive'
        : 'keeper-idle',
    );
    const keeperScale = this.shot.surprise === 'giant' ? lerp(2.5, 7.5, movement) : 2.5;
    if (this.shot.surprise === 'giant' && movement > 0.15)
      this.incidentBanner
        .setVisible(true)
        .setText('REGULATION SIZE. PROBABLY.')
        .setColor('#ffe4b6');
    this.keeper
      .setScale(keeperScale)
      .setPosition(
        lerp(this.keeperStart.x, this.diveEnd.x, movement),
        lerp(this.keeperStart.y, this.diveEnd.y, movement) - Math.sin(raw * Math.PI) * 14,
      );
    this.keeper.setRotation(this.diveRotation * movement);
    if (this.shot.surprise === 'giant') {
      // Grow around a continuous glove path; scaling must never pull the hand
      // away from the sampled ball trajectory or teleport the keeper's body.
      const startHand = this.handOffset(0, 2.5);
      const offset = this.handOffset(this.keeper.rotation, keeperScale);
      this.keeper.setPosition(
        lerp(this.keeperStart.x + startHand.x, this.contact.x, movement) - offset.x,
        lerp(this.keeperStart.y + startHand.y, this.contact.y, movement) - offset.y,
      );
    }
    if (this.shot.surprise === 'fan') {
      this.striker.setTexture('striker-idle').setRotation(0);
      this.fan.setTexture(t < 0.28 ? 'fan-kick' : 'fan-run');
    } else this.striker.setTexture(t < 0.28 ? 'striker-kick' : 'striker-idle').setRotation(0);
    if (t >= limit) this.resolve();
  }

  private resolve(): void {
    if (!this.shot || this.hasResolved) return;
    this.hasResolved = true;
    const isGoal = this.shot.outcome === 'goal';
    const miss = this.shot.outcome === 'miss';
    const point = this.flightPosition(isGoal || miss ? 1 : CONTACT_T);
    this.ball.setPosition(point.x, point.y);
    if (!isGoal && !miss)
      this.keeper.setPosition(this.diveEnd.x, this.diveEnd.y).setRotation(this.diveRotation);
    this.landingStart = {
      x: this.keeper.x,
      y: this.keeper.y,
      rotation: this.keeper.rotation,
      scale: this.keeper.scaleX,
    };
    this.rebound = {
      x: point.x,
      y: point.y,
      vx: this.direction * (130 + Math.random() * 65),
      vy: -130,
    };
    this.phase = 'result';
    this.phaseTime = 0;
    this.callbacks.onShot(this.shot);
    if (!miss) this.callbacks.onSound(isGoal ? 'goal' : 'save');
    this.callbacks.onRemark(this.shot.remark);
    this.callbacks.onPhase('result');
    if (!miss)
      this.burst(
        point.x,
        point.y,
        isGoal ? 0xe4ff90 : 0xfff3c4,
        isGoal ? 42 : 17,
        isGoal ? 200 : 125,
      );
    if (isGoal) {
      this.burst(200, 115, 0xffad58, 25, 180);
      this.burst(760, 115, 0xc3ff78, 25, 180);
    }
    this.celebration.setText(
      miss
        ? 'WIDE.'
        : isGoal
          ? this.shot.surprise === 'fan'
            ? 'FAN-TASTIC!'
            : 'GOOOAL!'
          : this.shot.outcome === 'flash'
            ? 'BLINK. SAVED.'
            : this.shot.outcome === 'showoff'
              ? 'TOO EASY.'
              : this.shot.surprise === 'giant'
                ? 'ABSOLUTELY NOT.'
                : 'DENIED.',
    );
    this.celebration
      .setColor(miss ? '#ffad6b' : isGoal ? '#e4ff90' : '#fff3d1')
      .setVisible(true)
      .setAlpha(0)
      .setScale(0.9);
    this.resultAccent
      .setText(
        miss
          ? 'THE GOAL WAS THE OTHER BIT'
          : this.shot.surprise === 'fan'
            ? 'UNAUTHORISED. UNSTOPPABLE.'
            : this.shot.surprise === 'giant'
              ? 'SOMEONE CHECK THE RULEBOOK'
              : isGoal
                ? 'THE IMPOSSIBLE JUST HAPPENED'
                : this.shot.outcome === 'flash'
                  ? 'REACTION TIME: UNFAIR'
                  : this.shot.outcome === 'showoff'
                    ? 'STYLE POINTS: DISRESPECTFUL'
                    : 'HE KNEW BEFORE YOU DID',
      )
      .setVisible(true)
      .setAlpha(0);
  }

  private updateResult(dt: number): void {
    if (!this.shot) return;
    const goal = this.shot.outcome === 'goal';
    const miss = this.shot.outcome === 'miss';
    const fanShot = this.shot.surprise === 'fan';
    const seconds = this.phaseTime / 1000;
    const reveal = ease((this.phaseTime - 120) / 240);
    const duration = this.reducedMotion
      ? fanShot
        ? 1650
        : 1180
      : fanShot
        ? 2250
        : goal
          ? 1850
          : 1460;
    const fade = clamp((duration - this.phaseTime) / 180, 0, 1);
    this.keeper.setAlpha(fade);
    this.fan.setAlpha(fade);
    this.incidentBanner.setAlpha(fade);
    this.striker.setAlpha(fade);
    this.ball.setAlpha(fade);
    this.celebration.setAlpha(reveal * fade).setScale(this.reducedMotion ? 1 : 0.9 + reveal * 0.1);
    this.resultAccent.setAlpha(reveal * fade);
    this.trail = [];
    if (miss) {
      const point = this.flightPosition(1);
      const targetX = GOAL.x + this.shot.target.x * GOAL.width;
      const targetY = GOAL.y + this.shot.target.y * GOAL.height;
      const drift = this.reducedMotion ? 0.15 : 0.3;
      this.ball
        .setPosition(
          point.x + (targetX - BALL.x) * seconds * drift,
          point.y + (targetY - BALL.y) * seconds * drift + seconds * seconds * 35,
        )
        .setRotation(seconds * 8)
        .setAlpha(fade);
      const recover = ease(seconds / 0.5);
      this.keeper
        .setPosition(lerp(this.landingStart.x, KEEPER.x, recover), KEEPER.y)
        .setRotation(0)
        .setScale(2.5)
        .setTexture(seconds > 0.3 ? 'keeper-yawn' : 'keeper-idle');
    } else if (goal) {
      const targetY = GOAL.y + this.shot.target.y * GOAL.height;
      this.ball
        .setY(Math.min(355, targetY + seconds * seconds * 95))
        .setAlpha(Math.max(0.5, 1 - seconds * 0.2) * fade);
      const landing = ease(seconds / 0.5);
      this.keeper
        .setRotation(lerp(this.landingStart.rotation, this.diveRotation, landing))
        .setPosition(
          lerp(this.landingStart.x, this.diveEnd.x, landing),
          lerp(this.landingStart.y, 396, landing),
        );
      this.striker
        .setTexture(fanShot ? 'striker-idle' : seconds > 0.55 ? 'striker-run' : 'striker-kick')
        .setRotation(this.reducedMotion ? 0 : Math.sin(seconds * 11) * 0.07);
      if (fanShot) {
        const exit = ease((seconds - 0.75) / 1.3);
        this.fan
          .setPosition(
            lerp(475, 1040, exit),
            534 - (this.reducedMotion ? 0 : Math.abs(Math.sin(seconds * 11)) * (exit > 0 ? 5 : 13)),
          )
          .setTexture(Math.floor(seconds * 7) % 2 === 0 ? 'fan-run' : 'fan-kick')
          .setRotation(this.reducedMotion ? 0 : Math.sin(seconds * 10) * 0.055);
      } else if (!this.reducedMotion) this.striker.y = 534 - Math.abs(Math.sin(seconds * 8)) * 8;
    } else {
      this.rebound.x += (this.rebound.vx * dt) / 1000;
      this.rebound.vy += (510 * dt) / 1000;
      this.rebound.y += (this.rebound.vy * dt) / 1000;
      if (this.rebound.y > 501) {
        this.rebound.y = 501;
        this.rebound.vy = -Math.abs(this.rebound.vy) * 0.45;
      }
      this.ball
        .setPosition(this.rebound.x, this.rebound.y)
        .setRotation(seconds * 12)
        .setScale(lerp(1, 1.4, Math.min(seconds, 1)));
      // Keeper lands, then gets back up for a smug final pose.
      const landing = ease(seconds / 0.44);
      const rise = ease((seconds - 0.5) / 0.4);
      this.keeper.setPosition(
        lerp(this.diveEnd.x, KEEPER.x, rise),
        lerp(lerp(this.diveEnd.y, 397, landing), KEEPER.y, rise),
      );
      this.keeper
        .setRotation(this.diveRotation * (1 - rise))
        .setScale(lerp(this.landingStart.scale, 2.5, ease(seconds / 0.75)));
      if (rise > 0.85)
        this.keeper
          .setTexture(this.shot.outcome === 'showoff' ? 'keeper-clap' : 'keeper-idle')
          .setFlipX(false);
    }
    if (this.phaseTime >= duration) this.resetRound();
  }

  private resetRound(): void {
    this.phase = 'ready';
    this.phaseTime = 0;
    this.shot = null;
    this.particles = [];
    this.trail = [];
    this.fan.setVisible(false).setAlpha(1);
    this.incidentBanner.setVisible(false).setAlpha(1).setColor('#ffe5ee');
    this.celebration.setVisible(false);
    this.resultAccent.setVisible(false);
    this.keeper
      .setPosition(KEEPER.x, KEEPER.y)
      .setScale(2.5)
      .setRotation(0)
      .setFlipX(false)
      .setTexture('keeper-idle');
    this.striker.setPosition(455, 550).setRotation(0).setTexture('striker-idle');
    this.ball.setPosition(BALL.x, BALL.y).setScale(2).setAlpha(0);
    this.keeper.setAlpha(0);
    this.striker.setAlpha(0);
    this.cameras.main.setScroll(0, 0);
    this.drawReticle();
    this.callbacks.onPhase('ready');
  }

  private drawShadows(): void {
    const g = this.shadows.clear();
    g.fillStyle(0x031a18, 0.33);
    g.fillEllipse(
      this.keeper.x,
      Math.max(365, this.keeper.y),
      (62 * this.keeper.scaleX) / 2.5,
      (13 * this.keeper.scaleX) / 2.5,
    );
    g.fillEllipse(this.striker.x, this.shot?.surprise === 'fan' ? 562 : 550, 62, 15);
    if (this.fan.visible) g.fillEllipse(this.fan.x, 548, 58, 13);
    const progress =
      this.phase === 'flight'
        ? clamp(this.phaseTime / FLIGHT_MS, 0, 1)
        : this.phase === 'result'
          ? 1
          : 0;
    const shadowY =
      this.phase === 'flight'
        ? lerp(BALL.y + 9, 365, progress)
        : this.phase === 'result'
          ? Math.max(365, this.ball.y + 10)
          : BALL.y + 9;
    g.fillStyle(0x021813, 0.28).fillEllipse(
      this.ball.x,
      shadowY,
      20 - progress * 9,
      7 - progress * 3,
    );
  }

  private burst(x: number, y: number, color: number, count: number, speed: number): void {
    const actualCount = this.reducedMotion ? Math.min(count, 5) : count;
    for (let i = 0; i < actualCount; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = speed * (0.25 + Math.random() * 0.75);
      const life = 350 + Math.random() * 650;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity - 40,
        life,
        max: life,
        color,
        size: 2 + Math.floor(Math.random() * 3),
      });
    }
  }

  private drawEffects(dt: number): void {
    const g = this.effects.clear();
    if (!this.reducedMotion)
      this.trail.forEach((p, i) => {
        g.fillStyle(0xf4f3c9, (i / this.trail.length) * 0.3).fillRect(
          p.x - 3 * p.scale,
          p.y - 3 * p.scale,
          6 * p.scale,
          6 * p.scale,
        );
      });
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const p of this.particles) {
      p.life -= dt;
      p.x += (p.vx * dt) / 1000;
      p.y += (p.vy * dt) / 1000;
      if (p.smoke) p.x += ((Math.sin(this.totalTime / 180 + p.y) * dt) / 1000) * 7;
      else p.vy += (165 * dt) / 1000;
      const size = p.size + (p.smoke ? Math.floor((1 - p.life / p.max) * 4) : 0);
      g.fillStyle(p.color, Math.max(0, p.life / p.max) * (p.smoke ? 0.42 : 1)).fillRect(
        Math.round(p.x),
        Math.round(p.y),
        size,
        size,
      );
    }
    if (
      this.phase === 'result' &&
      this.phaseTime < 240 &&
      this.shot?.outcome !== 'goal' &&
      this.shot?.outcome !== 'miss'
    ) {
      const size = 10 + this.phaseTime * 0.06;
      g.lineStyle(2, 0xfff3c4, 1 - this.phaseTime / 240).strokeCircle(
        this.contact.x,
        this.contact.y,
        size,
      );
    }
  }

  private drawNet(): void {
    const g = this.net.clear();
    if (this.phase !== 'result' || this.shot?.outcome !== 'goal' || this.phaseTime > 1000) return;
    const t = this.phaseTime / 1000;
    const x = GOAL.x + this.shot.target.x * GOAL.width;
    const y = GOAL.y + this.shot.target.y * GOAL.height;
    const radius = 12 + t * 135;
    g.lineStyle(2, 0xc9ffdc, (1 - t) * 0.8);
    // Local elastic net strands, clipped to the painted goal mouth.
    for (let strand = GOAL.x + 8; strand < GOAL.x + GOAL.width; strand += 20) {
      const distance = Math.abs(strand - x);
      if (distance > radius) continue;
      const wobble = Math.sin((radius - distance) * 0.07) * (1 - t) * (this.reducedMotion ? 3 : 12);
      g.beginPath();
      g.moveTo(strand, GOAL.y);
      g.lineTo(
        clamp(strand + wobble, GOAL.x, GOAL.x + GOAL.width),
        clamp(y + wobble, GOAL.y, GOAL.y + GOAL.height),
      );
      g.lineTo(strand, GOAL.y + GOAL.height);
      g.strokePath();
    }
  }

  private updateCamera(): void {
    if (
      this.reducedMotion ||
      this.shot?.outcome === 'miss' ||
      this.phase !== 'result' ||
      this.phaseTime > 240
    ) {
      this.cameras.main.setScroll(0, 0);
      return;
    }
    const amplitude = (1 - this.phaseTime / 240) * (this.shot?.outcome === 'goal' ? 3 : 2);
    this.cameras.main.setScroll(
      Math.sin(this.phaseTime * 0.12) * amplitude,
      Math.cos(this.phaseTime * 0.15) * amplitude,
    );
  }
}
