// 纯视觉特效：粒子、冲击波环、飘字、屏幕震动、闪屏、黑暗关卡里的爆炸光源。
// 与游戏逻辑无关，丢帧或关闭都不影响玩法。

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number;
  color: string;
  kind: 'spark' | 'shard' | 'dot';
  rot: number;
  vr: number;
  gravity: number;
}

export interface Ring {
  x: number;
  y: number;
  r: number;
  maxR: number;
  life: number;
  max: number;
  color: string;
  width: number;
}

export interface FloatText {
  x: number;
  y: number;
  text: string;
  color: string;
  size: number;
  life: number;
  max: number;
  vy: number;
}

export interface Light {
  x: number;
  y: number;
  r: number;
  life: number;
  max: number;
}

const MAX_PARTICLES = 900;

export class Fx {
  particles: Particle[] = [];
  rings: Ring[] = [];
  texts: FloatText[] = [];
  lights: Light[] = [];
  flash = 0;
  flashColor = '255,255,255';
  reduced = false;
  private trauma = 0;
  private pending: { t: number; run: () => void }[] = [];

  clear(): void {
    this.particles = [];
    this.rings = [];
    this.texts = [];
    this.lights = [];
    this.pending = [];
    this.trauma = 0;
    this.flash = 0;
  }

  burst(
    x: number,
    y: number,
    color: string,
    n: number,
    speed: number,
    kind: Particle['kind'] = 'spark',
    gravity = 260,
  ): void {
    for (let i = 0; i < n && this.particles.length < MAX_PARTICLES; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = speed * (0.35 + Math.random() * 0.65);
      const life = 0.35 + Math.random() * 0.45;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v,
        life,
        max: life,
        size: kind === 'shard' ? 3 + Math.random() * 4 : 1.5 + Math.random() * 2,
        color,
        kind,
        rot: Math.random() * Math.PI,
        vr: (Math.random() - 0.5) * 14,
        gravity,
      });
    }
  }

  /** 砖块碎裂：碎片从砖块范围内向外飞 */
  shatter(x: number, y: number, w: number, h: number, color: string): void {
    for (let i = 0; i < 12 && this.particles.length < MAX_PARTICLES; i++) {
      const px = x + (Math.random() - 0.5) * w;
      const py = y + (Math.random() - 0.5) * h;
      const a = Math.atan2(py - y, px - x) + (Math.random() - 0.5) * 0.8;
      const v = 80 + Math.random() * 220;
      const life = 0.5 + Math.random() * 0.5;
      this.particles.push({
        x: px,
        y: py,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 60,
        life,
        max: life,
        size: 3 + Math.random() * 5,
        color,
        kind: 'shard',
        rot: Math.random() * 3,
        vr: (Math.random() - 0.5) * 16,
        gravity: 520,
      });
    }
    this.burst(x, y, color, 8, 260);
  }

  ring(x: number, y: number, color: string, maxR: number, width = 3, dur = 0.45): void {
    this.rings.push({ x, y, r: 4, maxR, life: dur, max: dur, color, width });
  }

  text(x: number, y: number, text: string, color: string, size = 16, dur = 0.9): void {
    this.texts.push({ x, y, text, color, size, life: dur, max: dur, vy: -46 });
    if (this.texts.length > 40) this.texts.shift();
  }

  light(x: number, y: number, r: number, dur: number): void {
    this.lights.push({ x, y, r, life: dur, max: dur });
  }

  shake(amount: number): void {
    this.trauma = Math.min(1, this.trauma + amount * (this.reduced ? 0.25 : 1));
  }

  flashScreen(rgb: string, amount: number): void {
    this.flashColor = rgb;
    this.flash = Math.max(this.flash, this.reduced ? amount * 0.4 : amount);
  }

  later(delay: number, run: () => void): void {
    this.pending.push({ t: delay, run });
  }

  /** 通关烟花 */
  celebrate(w: number, h: number, colors: string[]): void {
    for (let i = 0; i < 9; i++) {
      this.later(i * 0.16, () => {
        const x = w * (0.15 + Math.random() * 0.7);
        const y = h * (0.12 + Math.random() * 0.4);
        const c = colors[i % colors.length];
        this.burst(x, y, c, 34, 320, 'dot', 120);
        this.ring(x, y, c, 70, 2, 0.6);
      });
    }
  }

  shakeOffset(): { x: number; y: number } {
    const k = this.trauma * this.trauma * 9;
    return { x: (Math.random() - 0.5) * 2 * k, y: (Math.random() - 0.5) * 2 * k };
  }

  update(dt: number): void {
    this.trauma = Math.max(0, this.trauma - dt * 1.6);
    this.flash = Math.max(0, this.flash - dt * 2.5);
    if (this.pending.length) {
      const due = this.pending.filter((p) => (p.t -= dt) <= 0);
      this.pending = this.pending.filter((p) => p.t > 0);
      for (const p of due) p.run();
    }
    for (const p of this.particles) {
      p.life -= dt;
      p.vx *= 1 - dt * 1.8;
      p.vy = p.vy * (1 - dt * 1.8) + p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
    }
    this.particles = this.particles.filter((p) => p.life > 0);
    for (const r of this.rings) {
      r.life -= dt;
      r.r = r.maxR * (1 - (r.life / r.max) ** 2);
    }
    this.rings = this.rings.filter((r) => r.life > 0);
    for (const t of this.texts) {
      t.life -= dt;
      t.y += t.vy * dt;
      t.vy *= 1 - dt * 2;
    }
    this.texts = this.texts.filter((t) => t.life > 0);
    for (const l of this.lights) l.life -= dt;
    this.lights = this.lights.filter((l) => l.life > 0);
  }
}
