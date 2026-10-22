// 音频：全部用 Web Audio 实时合成（无音频文件）。音效 + 程序化合成器波背景音乐。
// 浏览器要求用户手势后才能出声，所以 AudioContext 在第一次点击/按键时才创建。

type ToneOpts = {
  type?: OscillatorType;
  vol?: number;
  slide?: number;
  attack?: number;
  delay?: number;
};

type NoiseOpts = {
  vol: number;
  freq: number;
  freqEnd?: number;
  q?: number;
  type?: BiquadFilterType;
  delay?: number;
};

const PENTA = [0, 2, 4, 7, 9];
const midi = (m: number) => 440 * 2 ** ((m - 69) / 12);

/** 连击越高音越高（C 大调五声音阶，最多三个八度） */
function comboNote(combo: number): number {
  const step = Math.min(Math.max(combo, 0), 14);
  return midi(64 + 12 * Math.floor(step / 5) + PENTA[step % 5]);
}

export class Sound {
  sfxOn = true;
  musicOn = true;
  private ctx: AudioContext | null = null;
  private sfx!: GainNode;
  private musicBus!: GainNode;
  private musicFilter!: BiquadFilterNode;
  private noise!: AudioBuffer;
  private last = new Map<string, number>();
  private music: Music | null = null;

  /** 在用户手势回调里调用 */
  unlock(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext;
      if (!Ctor) return;
      const ctx = new Ctor();
      this.ctx = ctx;
      const comp = ctx.createDynamicsCompressor();
      comp.threshold.value = -14;
      comp.ratio.value = 4;
      const master = ctx.createGain();
      master.gain.value = 0.8;
      master.connect(comp).connect(ctx.destination);
      this.sfx = ctx.createGain();
      this.sfx.gain.value = 0.9;
      this.sfx.connect(master);
      this.musicFilter = ctx.createBiquadFilter();
      this.musicFilter.type = 'lowpass';
      this.musicFilter.frequency.value = 9000;
      this.musicBus = ctx.createGain();
      this.musicBus.gain.value = 0.5;
      this.musicBus.connect(this.musicFilter).connect(master);
      this.noise = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const data = this.noise.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
      this.music = new Music(ctx, this.musicBus, this.noise);
      if (this.musicOn) this.music.start();
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume();
  }

  setSfx(on: boolean): void {
    this.sfxOn = on;
  }

  setMusic(on: boolean): void {
    this.musicOn = on;
    if (!this.music) return;
    if (on) this.music.start();
    else this.music.stop();
  }

  /** 暂停时把音乐压暗成「隔墙」的闷音 */
  muffle(on: boolean): void {
    if (!this.ctx) return;
    this.musicFilter.frequency.setTargetAtTime(
      on ? 650 : 9000,
      this.ctx.currentTime,
      0.15,
    );
  }

  private ready(key: string, gap: number): boolean {
    if (!this.ctx || !this.sfxOn || this.ctx.state !== 'running') return false;
    const now = this.ctx.currentTime;
    if (now - (this.last.get(key) ?? -1) < gap) return false;
    this.last.set(key, now);
    return true;
  }

  private tone(freq: number, dur: number, o: ToneOpts = {}): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type ?? 'square';
    osc.frequency.setValueAtTime(freq, t0);
    if (o.slide)
      osc.frequency.exponentialRampToValueAtTime(Math.max(20, o.slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(o.vol ?? 0.2, t0 + (o.attack ?? 0.004));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(this.sfx);
    osc.start(t0);
    osc.stop(t0 + dur + 0.03);
  }

  private burst(dur: number, o: NoiseOpts): void {
    const ctx = this.ctx!;
    const t0 = ctx.currentTime + (o.delay ?? 0);
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const f = ctx.createBiquadFilter();
    f.type = o.type ?? 'lowpass';
    f.frequency.setValueAtTime(o.freq, t0);
    if (o.freqEnd) f.frequency.exponentialRampToValueAtTime(o.freqEnd, t0 + dur);
    f.Q.value = o.q ?? 0.8;
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(f).connect(g).connect(this.sfx);
    src.start(t0, Math.random() * 0.5);
    src.stop(t0 + dur + 0.03);
  }

  private arp(notes: number[], step: number, o: ToneOpts): void {
    notes.forEach((n, i) =>
      this.tone(n, step * 2.2, { ...o, delay: (o.delay ?? 0) + i * step }),
    );
  }

  launch(): void {
    if (this.ready('launch', 0.05)) this.tone(520, 0.12, { vol: 0.1, slide: 1100 });
  }
  paddle(): void {
    if (!this.ready('paddle', 0.03)) return;
    this.tone(220, 0.1, { type: 'triangle', vol: 0.32, slide: 340 });
    this.tone(660, 0.05, { type: 'sine', vol: 0.08 });
  }
  wall(): void {
    if (this.ready('wall', 0.04))
      this.tone(430, 0.05, { type: 'sine', vol: 0.07, slide: 380 });
  }
  blocker(): void {
    if (!this.ready('blocker', 0.04)) return;
    this.tone(1250, 0.06, { vol: 0.04 });
    this.tone(1870, 0.09, { type: 'sine', vol: 0.06 });
  }
  brickHit(combo: number): void {
    if (this.ready('hit', 0.025))
      this.tone(comboNote(combo), 0.09, { type: 'triangle', vol: 0.2 });
  }
  brickBreak(combo: number): void {
    if (!this.ready('break', 0.025)) return;
    const n = comboNote(combo);
    this.tone(n, 0.12, { vol: 0.08 });
    this.tone(n * 2, 0.1, { type: 'triangle', vol: 0.1, delay: 0.02 });
    this.burst(0.08, { vol: 0.1, freq: 3200, type: 'highpass' });
  }
  explode(big: boolean): void {
    if (!this.ready('boom', 0.05)) return;
    this.burst(big ? 1.1 : 0.5, { vol: big ? 0.8 : 0.5, freq: 1800, freqEnd: 80 });
    this.tone(big ? 70 : 110, big ? 0.9 : 0.4, { type: 'sine', vol: 0.55, slide: 32 });
  }
  bumper(): void {
    if (!this.ready('bumper', 0.04)) return;
    this.tone(300, 0.16, { type: 'sine', vol: 0.26, slide: 720 });
    this.tone(600, 0.1, { type: 'triangle', vol: 0.1, slide: 1300 });
  }
  portal(): void {
    if (!this.ready('portal', 0.08)) return;
    this.burst(0.32, { vol: 0.2, freq: 400, freqEnd: 3200, type: 'bandpass', q: 5 });
    this.tone(300, 0.3, { type: 'sine', vol: 0.1, slide: 900 });
  }
  power(good: boolean): void {
    if (!this.ready('power', 0.05)) return;
    if (good) this.arp([523, 659, 784, 1047], 0.06, { type: 'triangle', vol: 0.16 });
    else this.arp([392, 311, 233], 0.08, { vol: 0.09 });
  }
  laser(): void {
    if (this.ready('laser', 0.05))
      this.tone(1600, 0.07, { type: 'sawtooth', vol: 0.035, slide: 420 });
  }
  shield(): void {
    if (this.ready('shield', 0.05))
      this.tone(880, 0.14, { type: 'sine', vol: 0.16, slide: 1400 });
  }
  combo(n: number): void {
    if (this.ready('combo', 0.1))
      this.arp([comboNote(n), comboNote(n + 2), comboNote(n + 4)], 0.05, {
        type: 'sine',
        vol: 0.12,
      });
  }
  lifeLost(): void {
    if (!this.ready('life', 0.2)) return;
    this.tone(440, 0.55, { type: 'triangle', vol: 0.3, slide: 100 });
    this.burst(0.4, { vol: 0.2, freq: 900, freqEnd: 120 });
  }
  clear(): void {
    if (!this.ready('clear', 0.5)) return;
    this.arp([523, 659, 784, 1047, 1319, 1568, 2093], 0.075, {
      type: 'triangle',
      vol: 0.16,
    });
    this.arp([262, 330, 392], 0.075, { type: 'square', vol: 0.05, delay: 0.1 });
  }
  gameOver(): void {
    if (this.ready('over', 0.5))
      this.arp([392, 330, 262, 196], 0.18, { type: 'triangle', vol: 0.2 });
  }
  click(): void {
    if (this.ready('click', 0.03)) this.tone(900, 0.035, { type: 'sine', vol: 0.08 });
  }
}

/** 程序化合成器波：Am–F–C–G 循环，贝斯 + 琶音 + 铺底 + 鼓 */
class Music {
  private timer = 0;
  private step = 0;
  private next = 0;
  private readonly spb: number;
  private readonly arpOut: GainNode;
  private readonly ctx: AudioContext;
  private readonly out: GainNode;
  private readonly noise: AudioBuffer;

  constructor(ctx: AudioContext, out: GainNode, noise: AudioBuffer) {
    this.ctx = ctx;
    this.out = out;
    this.noise = noise;
    this.spb = 60 / 112 / 4;
    // 琶音加一点延迟回声，更有空间感
    this.arpOut = ctx.createGain();
    const delay = ctx.createDelay();
    delay.delayTime.value = this.spb * 3;
    const fb = ctx.createGain();
    fb.gain.value = 0.32;
    this.arpOut.connect(out);
    this.arpOut.connect(delay);
    delay.connect(fb).connect(delay);
    delay.connect(out);
  }

  start(): void {
    if (this.timer) return;
    this.next = this.ctx.currentTime + 0.1;
    this.timer = window.setInterval(() => this.tick(), 25);
  }

  stop(): void {
    clearInterval(this.timer);
    this.timer = 0;
  }

  private tick(): void {
    while (this.next < this.ctx.currentTime + 0.12) {
      this.play(this.step, this.next);
      this.step = (this.step + 1) % 64;
      this.next += this.spb;
    }
  }

  private play(step: number, t: number): void {
    const CHORDS = [
      [57, 60, 64],
      [53, 57, 60],
      [55, 60, 64],
      [55, 59, 62],
    ];
    const ROOTS = [33, 29, 36, 31];
    const bar = Math.floor(step / 16);
    const s = step % 16;
    const chord = CHORDS[bar];
    if ([0, 3, 6, 8, 11, 14].includes(s))
      this.voice(midi(ROOTS[bar]), t, this.spb * 1.6, 'sawtooth', 0.11, 420, this.out);
    const pool = [...chord, ...chord.map((n) => n + 12)];
    const order = [0, 1, 2, 3, 4, 5, 4, 3];
    this.voice(
      midi(pool[order[s % 8]] + 12),
      t,
      this.spb * 0.9,
      'triangle',
      0.035,
      3000,
      this.arpOut,
    );
    if (s === 0)
      for (const n of chord)
        this.voice(midi(n), t, this.spb * 15, 'sawtooth', 0.018, 900, this.out, 0.4);
    if (s === 0 || s === 8) this.kick(t);
    if (s === 4 || s === 12) this.hiss(t, 0.12, 1600, 'bandpass', 0.06);
    if (s % 4 === 2) this.hiss(t, 0.04, 7000, 'highpass', 0.03);
  }

  private voice(
    freq: number,
    t: number,
    dur: number,
    type: OscillatorType,
    vol: number,
    cutoff: number,
    dest: AudioNode,
    attack = 0.01,
  ): void {
    const o = this.ctx.createOscillator();
    const f = this.ctx.createBiquadFilter();
    const g = this.ctx.createGain();
    o.type = type;
    o.frequency.value = freq;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(f).connect(g).connect(dest);
    o.start(t);
    o.stop(t + dur + 0.05);
  }

  private kick(t: number): void {
    const o = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    o.frequency.setValueAtTime(140, t);
    o.frequency.exponentialRampToValueAtTime(40, t + 0.22);
    g.gain.setValueAtTime(0.3, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.25);
    o.connect(g).connect(this.out);
    o.start(t);
    o.stop(t + 0.3);
  }

  private hiss(
    t: number,
    dur: number,
    freq: number,
    type: BiquadFilterType,
    vol: number,
  ): void {
    const src = this.ctx.createBufferSource();
    src.buffer = this.noise;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    src.connect(f).connect(g).connect(this.out);
    src.start(t, Math.random() * 0.5);
    src.stop(t + dur + 0.02);
  }
}
