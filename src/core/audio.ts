export type SoundEvent = 'kick' | 'save' | 'goal' | 'hover' | 'rocket' | 'explosion' | 'whistle';
/** Original synthesized arcade sound: no downloads, codecs or third-party samples. */
export class GameAudio {
  private context: AudioContext | null = null;
  private enabled = false;
  private crowd: AudioBufferSourceNode | null = null;
  private master: GainNode | null = null;
  private visibilityHandler = () => {
    if (!this.context) return;
    if (document.hidden) void this.context.suspend().catch(() => {});
    else if (this.enabled) void this.context.resume().catch(() => {});
  };
  constructor() {
    document.addEventListener('visibilitychange', this.visibilityHandler);
  }
  setEnabled(value: boolean) {
    this.enabled = value;
    if (!value) {
      if (this.master) this.master.gain.value = 0;
      return;
    }
    try {
      if (!this.context) {
        // Remember the preference, but unlock audio only during a real gesture.
        if (!navigator.userActivation?.isActive) return;
        this.context = new AudioContext();
        this.master = this.context.createGain();
        this.master.gain.value = 0.32;
        this.master.connect(this.context.destination);
        this.startCrowd();
      }
      if (this.master) this.master.gain.value = 0.32;
      void this.context.resume().catch(() => {});
    } catch {
      this.enabled = false;
    }
  }
  private startCrowd() {
    const ctx = this.context!;
    const length = ctx.sampleRate * 3;
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let previous = 0;
    for (let i = 0; i < length; i++) {
      previous = (previous + (Math.random() * 2 - 1) * 0.08) / 1.025;
      data[i] = previous;
    }
    this.crowd = ctx.createBufferSource();
    this.crowd.buffer = buffer;
    this.crowd.loop = true;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 900;
    const gain = ctx.createGain();
    gain.gain.value = 0.12;
    this.crowd.connect(filter).connect(gain).connect(this.master!);
    this.crowd.start();
  }
  private tone(
    freq: number,
    at: number,
    duration: number,
    volume: number,
    type: OscillatorType = 'triangle',
    end?: number,
  ) {
    const ctx = this.context!;
    const oscillator = ctx.createOscillator();
    const gain = ctx.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(freq, at);
    if (end) oscillator.frequency.exponentialRampToValueAtTime(end, at + duration);
    gain.gain.setValueAtTime(0.001, at);
    gain.gain.exponentialRampToValueAtTime(volume, at + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    oscillator.connect(gain).connect(this.master!);
    oscillator.start(at);
    oscillator.stop(at + duration + 0.02);
  }
  private noise(at: number, duration: number, volume: number, frequency: number) {
    const ctx = this.context!;
    const buffer = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * duration), ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = frequency;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(volume, at);
    gain.gain.exponentialRampToValueAtTime(0.001, at + duration);
    source.connect(filter).connect(gain).connect(this.master!);
    source.start(at);
    source.stop(at + duration);
  }
  play(event: SoundEvent) {
    if (!this.enabled) return;
    if (!this.context) this.setEnabled(true);
    if (!this.context) return;
    void this.context.resume().catch(() => {});
    const t = this.context.currentTime;
    if (event === 'kick') {
      this.tone(140, t, 0.14, 0.8, 'sine', 45);
      this.noise(t, 0.09, 0.3, 1700);
    }
    if (event === 'save') {
      this.noise(t, 0.18, 0.5, 2200);
      this.tone(170, t, 0.22, 0.3, 'triangle', 60);
      this.tone(390, t + 0.12, 0.1, 0.09, 'square');
    }
    if (event === 'goal') {
      [523.25, 659.25, 783.99, 1046.5].forEach((f, i) =>
        this.tone(f, t + i * 0.12, i === 3 ? 0.65 : 0.2, 0.26, 'square'),
      );
      this.noise(t, 1.4, 0.15, 1400);
    }
    if (event === 'rocket') {
      this.tone(350, t, 0.35, 0.22, 'sawtooth', 1400);
      this.noise(t, 0.4, 0.15, 1600);
    }
    if (event === 'explosion') {
      this.noise(t, 0.65, 0.7, 2400);
      this.tone(90, t, 0.45, 0.6, 'sine', 22);
      this.tone(42, t + 0.05, 0.35, 0.4, 'triangle', 18);
    }
    if (event === 'whistle') {
      this.tone(2460, t, 0.16, 0.16, 'sine', 2800);
      this.tone(2790, t + 0.01, 0.13, 0.08, 'sine', 2650);
      this.tone(2600, t + 0.22, 0.26, 0.14, 'sine', 2900);
    }
    if (event === 'hover') this.tone(700, t, 0.05, 0.05);
  }
  destroy() {
    document.removeEventListener('visibilitychange', this.visibilityHandler);
    this.crowd?.stop();
    void this.context?.close().catch(() => {});
    this.context = null;
  }
}
