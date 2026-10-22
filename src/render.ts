// Canvas 2D 渲染（霓虹风格）。静态外观（砖块/胶囊/球光晕）缓存为精灵，每帧只做 drawImage。
import type { BrickKind, PowerType, TimedPower } from './config';
import {
  BALL_R,
  brickColor,
  CHAPTER_HUES,
  H,
  ITEM_H,
  ITEM_W,
  MAX_BOUNCE,
  PADDLE_H,
  PADDLE_Y,
  POWERS,
  SHIELD_Y,
  TIMED,
  W,
} from './config';
import type { Fx } from './fx';
import type { Ball, Body, Game } from './game';
import type { Shape } from './geometry';

export const FONT =
  '"Segoe UI", system-ui, -apple-system, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Noto Sans CJK SC", sans-serif';

export interface View {
  hint: string | null;
  banner: { title: string; sub: string; note: string | null; age: number } | null;
  comboLabel: string;
}

type Ctx = CanvasRenderingContext2D;

const PAD = 10;
const TAU = Math.PI * 2;

function rgba(hex: string, a: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

export function tracePath(ctx: Ctx, s: Shape): void {
  ctx.beginPath();
  if (s.kind === 'circle') ctx.arc(s.x, s.y, s.r, 0, TAU);
  else if (s.kind === 'poly') {
    ctx.moveTo(s.pts[0].x, s.pts[0].y);
    for (let i = 1; i < s.pts.length; i++) ctx.lineTo(s.pts[i].x, s.pts[i].y);
    ctx.closePath();
  } else {
    const a = Math.atan2(s.by - s.ay, s.bx - s.ax);
    ctx.arc(s.ax, s.ay, s.r, a + Math.PI / 2, a + Math.PI * 1.5);
    ctx.arc(s.bx, s.by, s.r, a - Math.PI / 2, a + Math.PI / 2);
    ctx.closePath();
  }
}

/** 道具图标（胶囊内的符号），s 为图标高度 */
export function drawPowerIcon(
  c: Ctx,
  type: PowerType,
  x: number,
  y: number,
  s: number,
  color: string,
): void {
  const u = s / 2;
  c.save();
  c.translate(x, y);
  c.strokeStyle = color;
  c.fillStyle = color;
  c.lineWidth = Math.max(1.4, s * 0.15);
  c.lineCap = 'round';
  c.lineJoin = 'round';
  const line = (pts: number[]) => {
    c.beginPath();
    c.moveTo(pts[0], pts[1]);
    for (let i = 2; i < pts.length; i += 2) c.lineTo(pts[i], pts[i + 1]);
    c.stroke();
  };
  switch (type) {
    case 'wide':
      line([-u * 1.3, 0, u * 1.3, 0]);
      line([-u * 0.7, -u * 0.55, -u * 1.3, 0, -u * 0.7, u * 0.55]);
      line([u * 0.7, -u * 0.55, u * 1.3, 0, u * 0.7, u * 0.55]);
      break;
    case 'shrink':
      line([-u * 1.4, 0, -u * 0.25, 0]);
      line([u * 1.4, 0, u * 0.25, 0]);
      line([-u * 0.8, -u * 0.55, -u * 0.25, 0, -u * 0.8, u * 0.55]);
      line([u * 0.8, -u * 0.55, u * 0.25, 0, u * 0.8, u * 0.55]);
      break;
    case 'slow':
      c.beginPath();
      c.moveTo(-u * 0.65, -u);
      c.lineTo(u * 0.65, -u);
      c.lineTo(-u * 0.65, u);
      c.lineTo(u * 0.65, u);
      c.closePath();
      c.stroke();
      break;
    case 'fast':
      line([-u, -u * 0.7, -u * 0.2, 0, -u, u * 0.7]);
      line([0, -u * 0.7, u * 0.8, 0, 0, u * 0.7]);
      break;
    case 'multi':
      for (const dx of [-0.6, 0.6]) {
        c.beginPath();
        c.arc(dx * u, 0, u * 0.48, 0, TAU);
        c.fill();
      }
      break;
    case 'spread':
      for (let i = -2; i <= 2; i++) {
        const a = i * 0.5;
        c.beginPath();
        c.arc(Math.sin(a) * u * 1.25, u * 0.7 - Math.cos(a) * u * 1.25, u * 0.24, 0, TAU);
        c.fill();
      }
      break;
    case 'pierce':
      line([0, u, 0, -u]);
      line([-u * 0.55, -u * 0.4, 0, -u, u * 0.55, -u * 0.4]);
      line([-u * 1.2, u * 0.2, -u * 0.4, u * 0.2]);
      line([u * 0.4, u * 0.2, u * 1.2, u * 0.2]);
      break;
    case 'laser':
      line([-u * 0.5, u, -u * 0.5, -u * 0.2]);
      line([u * 0.5, u, u * 0.5, -u * 0.2]);
      for (const dx of [-0.5, 0.5]) {
        c.beginPath();
        c.arc(dx * u, -u * 0.8, u * 0.2, 0, TAU);
        c.fill();
      }
      break;
    case 'magnet':
      c.lineWidth = s * 0.22;
      c.beginPath();
      c.moveTo(-u * 0.75, -u);
      c.lineTo(-u * 0.75, 0);
      c.arc(0, 0, u * 0.75, Math.PI, 0, true);
      c.lineTo(u * 0.75, -u);
      c.stroke();
      break;
    case 'shield':
      c.beginPath();
      c.arc(0, u * 0.55, u * 1.05, Math.PI, TAU);
      c.stroke();
      line([-u * 1.3, u * 0.7, u * 1.3, u * 0.7]);
      break;
    case 'life':
      c.beginPath();
      c.moveTo(0, u * 0.85);
      c.bezierCurveTo(-u * 1.5, -u * 0.2, -u * 0.6, -u * 1.25, 0, -u * 0.4);
      c.bezierCurveTo(u * 0.6, -u * 1.25, u * 1.5, -u * 0.2, 0, u * 0.85);
      c.fill();
      break;
  }
  c.restore();
}

function paintItem(c: Ctx, type: PowerType, scale: number): void {
  const def = POWERS[type];
  c.save();
  c.beginPath();
  c.roundRect(0, 0, ITEM_W, ITEM_H, ITEM_H / 2);
  c.shadowColor = def.color;
  c.shadowBlur = 10 * scale;
  if (def.good) {
    const g = c.createLinearGradient(0, 0, 0, ITEM_H);
    g.addColorStop(0, '#ffffff');
    g.addColorStop(0.35, def.color);
    g.addColorStop(1, rgba(def.color, 0.75));
    c.fillStyle = g;
    c.fill();
    c.shadowBlur = 0;
    c.strokeStyle = 'rgba(255,255,255,0.8)';
    c.lineWidth = 1.2;
    c.stroke();
  } else {
    c.fillStyle = '#3a0712';
    c.fill();
    c.shadowBlur = 0;
    c.save();
    c.clip();
    c.strokeStyle = 'rgba(255,51,85,0.35)';
    c.lineWidth = 3;
    for (let x = -ITEM_H; x < ITEM_W + ITEM_H; x += 8) {
      c.beginPath();
      c.moveTo(x, ITEM_H);
      c.lineTo(x + ITEM_H, 0);
      c.stroke();
    }
    c.restore();
    c.strokeStyle = def.color;
    c.lineWidth = 2;
    c.stroke();
  }
  c.restore();
  drawPowerIcon(
    c,
    type,
    ITEM_W / 2,
    ITEM_H / 2,
    ITEM_H * 0.62,
    def.good ? '#08101e' : '#ffffff',
  );
}

function paintBrick(
  c: Ctx,
  w: number,
  h: number,
  brick: BrickKind,
  hp: number,
  scale: number,
): void {
  const color = brickColor(brick, hp);
  const x = 2;
  const y = 2;
  const bw = w - 4;
  const bh = h - 4;
  c.save();
  c.beginPath();
  c.roundRect(x, y, bw, bh, 4);
  if (brick === 'gold') {
    const g = c.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, '#fff6c2');
    g.addColorStop(0.45, '#ffd54a');
    g.addColorStop(1, '#a8720c');
    c.fillStyle = g;
  } else if (brick === 'bomb') {
    c.fillStyle = '#3b0d08';
  } else {
    const g = c.createLinearGradient(0, y, 0, y + bh);
    g.addColorStop(0, rgba(color, 0.5));
    g.addColorStop(1, rgba(color, 0.16));
    c.fillStyle = g;
  }
  c.fill();
  c.shadowColor = color;
  c.shadowBlur = 9 * scale;
  c.lineWidth = 2;
  c.strokeStyle = color;
  c.stroke();
  c.restore();
  c.strokeStyle = 'rgba(255,255,255,0.4)';
  c.lineWidth = 1;
  c.beginPath();
  c.moveTo(x + 5, y + 2.5);
  c.lineTo(x + bw - 5, y + 2.5);
  c.stroke();
  const cx = w / 2;
  const cy = h / 2;
  if (brick === 'bomb') {
    c.fillStyle = '#12060a';
    c.strokeStyle = color;
    c.lineWidth = 1.6;
    c.beginPath();
    c.arc(cx - 1, cy + 1, 5.5, 0, TAU);
    c.fill();
    c.stroke();
    c.beginPath();
    c.moveTo(cx + 3, cy - 3);
    c.quadraticCurveTo(cx + 6, cy - 8, cx + 10, cy - 6);
    c.stroke();
    return;
  }
  if (brick === 'gold') {
    c.fillStyle = 'rgba(255,255,255,0.9)';
    c.beginPath();
    const sx = x + 9;
    const sy = cy;
    c.moveTo(sx, sy - 5);
    c.lineTo(sx + 1.5, sy - 1.5);
    c.lineTo(sx + 5, sy);
    c.lineTo(sx + 1.5, sy + 1.5);
    c.lineTo(sx, sy + 5);
    c.lineTo(sx - 1.5, sy + 1.5);
    c.lineTo(sx - 5, sy);
    c.lineTo(sx - 1.5, sy - 1.5);
    c.closePath();
    c.fill();
  }
  if (hp >= 2) {
    c.font = `800 12px ${FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillStyle = brick === 'gold' ? '#5a3a00' : '#ffffff';
    c.shadowColor = brick === 'gold' ? 'transparent' : color;
    c.shadowBlur = 6 * scale;
    c.fillText(String(hp), cx, cy + 0.5);
    c.shadowBlur = 0;
  }
}

function paintBallGlow(c: Ctx, color: string): void {
  const r = BALL_R * 3;
  const g = c.createRadialGradient(r, r, 0, r, r, r);
  g.addColorStop(0, rgba(color, 0.9));
  g.addColorStop(0.35, rgba(color, 0.35));
  g.addColorStop(1, rgba(color, 0));
  c.fillStyle = g;
  c.fillRect(0, 0, r * 2, r * 2);
}

export class Renderer {
  private ctx: Ctx;
  private canvas: HTMLCanvasElement;
  private scale = 1;
  private sprites = new Map<string, HTMLCanvasElement>();
  private bg: HTMLCanvasElement | null = null;
  private bgHue = -1;
  private dark: HTMLCanvasElement | null = null;
  private trails = new WeakMap<Ball, number[]>();
  private comboShown = 0;
  private comboPop = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
  }

  resize(cssW: number, cssH: number, dpr: number): void {
    const w = Math.max(1, Math.round(cssW * dpr));
    const h = Math.max(1, Math.round(cssH * dpr));
    if (w === this.canvas.width && h === this.canvas.height) return;
    this.canvas.width = w;
    this.canvas.height = h;
    this.scale = w / W;
    this.sprites.clear();
    this.bg = null;
    this.dark = null;
  }

  private sprite(
    key: string,
    w: number,
    h: number,
    pad: number,
    paint: (c: Ctx) => void,
  ): HTMLCanvasElement {
    let c = this.sprites.get(key);
    if (!c) {
      c = document.createElement('canvas');
      c.width = Math.ceil((w + pad * 2) * this.scale);
      c.height = Math.ceil((h + pad * 2) * this.scale);
      const x = c.getContext('2d')!;
      x.scale(this.scale, this.scale);
      x.translate(pad, pad);
      paint(x);
      this.sprites.set(key, c);
    }
    return c;
  }

  private background(hue: number): HTMLCanvasElement {
    if (this.bg && this.bgHue === hue) return this.bg;
    const c = document.createElement('canvas');
    c.width = this.canvas.width;
    c.height = this.canvas.height;
    const x = c.getContext('2d')!;
    x.scale(this.scale, this.scale);
    const g = x.createLinearGradient(0, 0, 0, H);
    g.addColorStop(0, `hsl(${hue} 55% 7%)`);
    g.addColorStop(0.6, `hsl(${(hue + 40) % 360} 50% 4%)`);
    g.addColorStop(1, '#030309');
    x.fillStyle = g;
    x.fillRect(0, 0, W, H);
    // 透视网格地面
    x.strokeStyle = `hsla(${hue} 90% 60% / 0.07)`;
    x.lineWidth = 1;
    for (let gx = 0; gx <= W; gx += 40) {
      x.beginPath();
      x.moveTo(gx, 0);
      x.lineTo(gx, H);
      x.stroke();
    }
    for (let gy = 0; gy <= H; gy += 40) {
      x.beginPath();
      x.moveTo(0, gy);
      x.lineTo(W, gy);
      x.stroke();
    }
    const horizon = H * 0.7;
    x.strokeStyle = `hsla(${(hue + 60) % 360} 100% 65% / 0.12)`;
    for (let i = -10; i <= 10; i++) {
      x.beginPath();
      x.moveTo(W / 2 + i * 30, horizon);
      x.lineTo(W / 2 + i * 150, H);
      x.stroke();
    }
    for (let k = 1; k < 8; k++) {
      const yy = horizon + (H - horizon) * (k / 8) ** 1.8;
      x.beginPath();
      x.moveTo(0, yy);
      x.lineTo(W, yy);
      x.stroke();
    }
    // 底部危险区
    const d = x.createLinearGradient(0, H - 70, 0, H);
    d.addColorStop(0, 'rgba(255,40,90,0)');
    d.addColorStop(1, 'rgba(255,40,90,0.14)');
    x.fillStyle = d;
    x.fillRect(0, H - 70, W, 70);
    // 暗角
    const v = x.createRadialGradient(W / 2, H / 2, H * 0.3, W / 2, H / 2, H * 0.75);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, 'rgba(0,0,0,0.55)');
    x.fillStyle = v;
    x.fillRect(0, 0, W, H);
    // 霓虹墙
    const wall = `hsl(${hue} 100% 62%)`;
    x.shadowColor = wall;
    x.shadowBlur = 12 * this.scale;
    x.strokeStyle = wall;
    x.lineWidth = 2.5;
    x.beginPath();
    x.moveTo(1.5, H);
    x.lineTo(1.5, 1.5);
    x.lineTo(W - 1.5, 1.5);
    x.lineTo(W - 1.5, H);
    x.stroke();
    this.bg = c;
    this.bgHue = hue;
    return c;
  }

  draw(g: Game, fx: Fx, view: View, time: number): void {
    const ctx = this.ctx;
    const s = this.scale;
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
    const hue =
      g.level.chapter > 0
        ? CHAPTER_HUES[g.level.chapter - 1]
        : (200 + Number(g.level.id.slice(1)) * 37) % 360;
    ctx.drawImage(this.background(hue), 0, 0);
    const sh = fx.shakeOffset();
    ctx.setTransform(s, 0, 0, s, sh.x * s, sh.y * s);

    this.drawPortals(g, time);
    for (const b of g.bodies) {
      if (!b.alive) continue;
      if (b.kind === 'blocker') this.drawBlocker(b);
      else if (b.kind === 'bumper') this.drawBumper(b);
      else if (b.kind === 'brick') {
        if (b.brick === 'core') this.drawCore(b, time);
        else this.drawBrick(b, time);
      }
    }
    this.drawShield(g, time);
    this.drawItems(g);
    this.drawLasers(g);
    this.drawPaddle(g, time);
    this.drawBalls(g);
    if (g.phase === 'aim' && g.balls.length) this.drawAim(g, time);
    this.drawFx(fx);
    if (g.level.dark) this.drawDarkness(g, fx, sh);
    this.drawTexts(fx);
    this.drawHud(g, view, time);
    if (fx.flash > 0) {
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.fillStyle = `rgba(${fx.flashColor},${fx.flash * 0.45})`;
      ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }
  }

  private drawBrick(b: Body, time: number): void {
    const ctx = this.ctx;
    const w = Math.round(b.aabb.maxX - b.aabb.minX);
    const h = Math.round(b.aabb.maxY - b.aabb.minY);
    const spr = this.sprite(`b|${w}|${h}|${b.brick}|${b.hp}`, w, h, PAD, (c) =>
      paintBrick(c, w, h, b.brick, b.hp, this.scale),
    );
    const k = 1 + b.pulse * 0.12;
    const dw = (w + PAD * 2) * k;
    const dh = (h + PAD * 2) * k;
    ctx.drawImage(spr, b.x - dw / 2, b.y - dh / 2, dw, dh);
    if (b.flash > 0) {
      ctx.globalAlpha = Math.min(1, b.flash / 0.1) * 0.75;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(b.x - w / 2 + 2, b.y - h / 2 + 2, w - 4, h - 4);
      ctx.globalAlpha = 1;
    }
    if (b.brick === 'bomb') {
      // 引信火花闪烁
      const a = 0.5 + 0.5 * Math.sin(time * 9 + b.x * 0.1);
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = `rgba(255,${160 + a * 80},60,${0.4 + a * 0.6})`;
      ctx.beginPath();
      ctx.arc(b.x + 10, b.y - 6, 1.8 + a * 1.6, 0, TAU);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }
  }

  private drawCore(b: Body, time: number): void {
    const ctx = this.ctx;
    const base = b.shape.kind === 'circle' ? b.shape.r : 30;
    const r = base * (1 + b.pulse * 0.08);
    const glow = ctx.createRadialGradient(b.x, b.y, r * 0.3, b.x, b.y, r * 1.9);
    glow.addColorStop(0, 'rgba(255,79,216,0.55)');
    glow.addColorStop(1, 'rgba(255,79,216,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(b.x - r * 2, b.y - r * 2, r * 4, r * 4);
    ctx.fillStyle = '#240521';
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#ff4fd8';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.rotate(time * 0.9);
    ctx.setLineDash([7, 6]);
    ctx.strokeStyle = 'rgba(255,170,240,0.8)';
    ctx.beginPath();
    ctx.arc(0, 0, r - 6, 0, TAU);
    ctx.stroke();
    ctx.restore();
    ctx.setLineDash([]);
    const frac = Math.max(0, b.hp / b.maxHp);
    ctx.strokeStyle = frac > 0.5 ? '#ff4fd8' : frac > 0.25 ? '#ffab2e' : '#ff3355';
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(b.x, b.y, r + 7, -Math.PI / 2, -Math.PI / 2 + TAU * frac);
    ctx.stroke();
    ctx.lineCap = 'butt';
    const pr = r * (0.42 + 0.07 * Math.sin(time * 5));
    const eye = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, pr);
    eye.addColorStop(0, '#ffffff');
    eye.addColorStop(0.5, '#ff9df0');
    eye.addColorStop(1, 'rgba(255,79,216,0.1)');
    ctx.fillStyle = eye;
    ctx.beginPath();
    ctx.arc(b.x, b.y, pr, 0, TAU);
    ctx.fill();
    ctx.font = `800 15px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#2a0626';
    ctx.fillText(String(b.hp), b.x, b.y + 1);
    if (b.flash > 0) {
      ctx.globalAlpha = Math.min(1, b.flash / 0.1) * 0.6;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, TAU);
      ctx.fill();
      ctx.globalAlpha = 1;
    }
  }

  private drawBlocker(b: Body): void {
    const ctx = this.ctx;
    tracePath(ctx, b.shape);
    const bb = b.aabb;
    const g = ctx.createLinearGradient(0, bb.minY, 0, bb.maxY);
    g.addColorStop(0, '#2c3346');
    g.addColorStop(1, '#131722');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.lineJoin = 'round';
    ctx.lineWidth = 2;
    ctx.strokeStyle = b.flash > 0 ? '#f2f6ff' : b.def.motion ? '#aebde6' : '#7d879f';
    ctx.stroke();
    if (b.def.motion?.type === 'spin') {
      ctx.fillStyle = '#d6def5';
      ctx.beginPath();
      ctx.arc(b.x, b.y, 3, 0, TAU);
      ctx.fill();
    }
  }

  private drawBumper(b: Body): void {
    const ctx = this.ctx;
    const r0 = b.shape.kind === 'circle' ? b.shape.r : 16;
    const r = r0 * (1 + b.pulse * 0.25);
    const lit = Math.max(0, b.flash / 0.3);
    const glow = ctx.createRadialGradient(b.x, b.y, r * 0.5, b.x, b.y, r * 2.2);
    glow.addColorStop(0, `rgba(61,255,234,${0.25 + lit * 0.5})`);
    glow.addColorStop(1, 'rgba(61,255,234,0)');
    ctx.fillStyle = glow;
    ctx.fillRect(b.x - r * 2.2, b.y - r * 2.2, r * 4.4, r * 4.4);
    ctx.fillStyle = lit > 0 ? `rgba(61,255,234,${0.3 + lit * 0.5})` : '#062a2d';
    ctx.beginPath();
    ctx.arc(b.x, b.y, r, 0, TAU);
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#3dffea';
    ctx.stroke();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = 'rgba(61,255,234,0.6)';
    ctx.beginPath();
    ctx.arc(b.x, b.y, r * 0.55, 0, TAU);
    ctx.stroke();
  }

  private drawPortals(g: Game, time: number): void {
    const ctx = this.ctx;
    const seen = new Set<number>();
    for (const b of g.bodies) {
      if (b.kind !== 'portal') continue;
      const first = !seen.has(b.def.pair);
      seen.add(b.def.pair);
      const color = first ? '#ff9d3d' : '#3dc5ff';
      const r = b.shape.kind === 'circle' ? b.shape.r : 20;
      const lit = Math.max(0, b.flash / 0.3);
      const glow = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, r * 1.6);
      glow.addColorStop(0, rgba(color, 0.45 + lit * 0.4));
      glow.addColorStop(0.7, rgba(color, 0.12));
      glow.addColorStop(1, rgba(color, 0));
      ctx.fillStyle = glow;
      ctx.fillRect(b.x - r * 1.6, b.y - r * 1.6, r * 3.2, r * 3.2);
      ctx.strokeStyle = color;
      ctx.lineWidth = 2.5;
      ctx.setLineDash([8, 5]);
      ctx.lineDashOffset = -time * 40;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r, 0, TAU);
      ctx.stroke();
      ctx.lineWidth = 1.5;
      ctx.lineDashOffset = time * 60;
      ctx.beginPath();
      ctx.arc(b.x, b.y, r * 0.6, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.lineDashOffset = 0;
    }
  }

  private drawShield(g: Game, time: number): void {
    const left = g.effects.shield;
    if (left <= 0 || g.phase !== 'play') return;
    if (left < 2 && Math.sin(time * 30) < 0) return;
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    ctx.strokeStyle = 'rgba(158,240,255,0.25)';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.moveTo(4, SHIELD_Y);
    ctx.lineTo(W - 4, SHIELD_Y);
    ctx.stroke();
    ctx.strokeStyle = '#c8f7ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let x = 4; x <= W - 4; x += 12)
      ctx.lineTo(x, SHIELD_Y + Math.sin(x * 0.08 + time * 8) * 1.5);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
  }

  private itemSprite(type: PowerType): HTMLCanvasElement {
    return this.sprite(`i|${type}`, ITEM_W, ITEM_H, PAD, (c) =>
      paintItem(c, type, this.scale),
    );
  }

  private drawItems(g: Game): void {
    const ctx = this.ctx;
    const fading = g.phase === 'clear' || g.phase === 'lost';
    for (const it of g.items) {
      const spr = this.itemSprite(it.type);
      ctx.save();
      ctx.globalAlpha = fading ? 0.55 : 1;
      ctx.translate(it.x, it.y);
      ctx.rotate(Math.sin(it.age * 5) * 0.14);
      ctx.drawImage(
        spr,
        -ITEM_W / 2 - PAD,
        -ITEM_H / 2 - PAD,
        ITEM_W + PAD * 2,
        ITEM_H + PAD * 2,
      );
      ctx.restore();
    }
  }

  private drawLasers(g: Game): void {
    if (!g.lasers.length) return;
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    for (const l of g.lasers) {
      ctx.strokeStyle = 'rgba(255,79,216,0.35)';
      ctx.lineWidth = 7;
      ctx.beginPath();
      ctx.moveTo(l.x, l.y);
      ctx.lineTo(l.x, l.y + 16);
      ctx.stroke();
      ctx.strokeStyle = '#ffd6f6';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawPaddle(g: Game, time: number): void {
    const ctx = this.ctx;
    const p = g.paddle;
    const shape = g.paddleShape();
    const fading = g.phase === 'clear' || g.phase === 'lost';
    ctx.globalAlpha = fading ? Math.max(0.12, 1 - g.phaseTime * 1.6) : 1;
    ctx.globalCompositeOperation = 'lighter';
    ctx.lineCap = 'round';
    ctx.strokeStyle =
      g.effects.shrink > 0 ? 'rgba(255,51,85,0.25)' : 'rgba(0,229,255,0.2)';
    ctx.lineWidth = PADDLE_H + 16;
    ctx.beginPath();
    ctx.moveTo(shape.ax, PADDLE_Y);
    ctx.lineTo(shape.bx, PADDLE_Y);
    ctx.stroke();
    ctx.globalCompositeOperation = 'source-over';
    const grad = ctx.createLinearGradient(p.x - p.w / 2, 0, p.x + p.w / 2, 0);
    grad.addColorStop(0, '#00e5ff');
    grad.addColorStop(0.5, '#8f7bff');
    grad.addColorStop(1, '#ff4fd8');
    tracePath(ctx, shape);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.strokeStyle = 'rgba(4,6,20,0.55)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(shape.ax + 2, PADDLE_Y + 2);
    ctx.lineTo(shape.bx - 2, PADDLE_Y + 2);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(shape.ax, PADDLE_Y - PADDLE_H / 2 + 2.5);
    ctx.lineTo(shape.bx, PADDLE_Y - PADDLE_H / 2 + 2.5);
    ctx.stroke();
    ctx.lineCap = 'butt';
    if (p.flash > 0) {
      tracePath(ctx, shape);
      ctx.fillStyle = `rgba(255,255,255,${(p.flash / 0.15) * 0.6})`;
      ctx.fill();
    }
    if (g.effects.laser > 0) {
      ctx.fillStyle = '#ff4fd8';
      for (const sgn of [-1, 1])
        ctx.fillRect(p.x + sgn * (p.w / 2 - 10) - 3, PADDLE_Y - PADDLE_H / 2 - 7, 6, 8);
    }
    if (g.effects.magnet > 0) {
      ctx.strokeStyle = '#4cff9a';
      ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const k = (time * 1.4 + i / 3) % 1;
        ctx.globalAlpha = (1 - k) * 0.7;
        ctx.beginPath();
        ctx.ellipse(p.x, PADDLE_Y - 4, p.w / 2 + k * 10, 6 + k * 16, 0, Math.PI, TAU);
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }

  private drawBalls(g: Game): void {
    const ctx = this.ctx;
    const pierce = g.effects.pierce > 0;
    for (const b of g.balls) {
      let tr = this.trails.get(b);
      if (!tr) {
        tr = [];
        this.trails.set(b, tr);
      }
      tr.push(b.x, b.y);
      if (tr.length > 22) tr.splice(0, 2);
      const color = pierce ? '#ff8a3d' : b.boost > 1.15 ? '#ffe066' : '#6ff3ff';
      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = color;
      for (let i = 0; i < tr.length - 2; i += 2) {
        const k = i / tr.length;
        ctx.globalAlpha = k * 0.45;
        ctx.beginPath();
        ctx.arc(tr[i], tr[i + 1], BALL_R * (0.25 + 0.75 * k), 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      const spr = this.sprite(`ball|${color}`, BALL_R * 6, BALL_R * 6, 0, (c) =>
        paintBallGlow(c, color),
      );
      ctx.drawImage(spr, b.x - BALL_R * 3, b.y - BALL_R * 3, BALL_R * 6, BALL_R * 6);
      ctx.globalCompositeOperation = 'source-over';
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(b.x, b.y, BALL_R, 0, TAU);
      ctx.fill();
      if (b.stuck && g.phase === 'play') {
        const a =
          Math.max(-1, Math.min(1, b.stuckOffset / (g.paddle.w / 2))) * MAX_BOUNCE * 0.8;
        ctx.strokeStyle = 'rgba(76,255,154,0.8)';
        ctx.setLineDash([4, 5]);
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(b.x, b.y);
        ctx.lineTo(b.x + Math.sin(a) * 46, b.y - Math.cos(a) * 46);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }
  }

  private drawAim(g: Game, time: number): void {
    const ctx = this.ctx;
    const { pts, ghost } = g.predictPath();
    const spacing = 15;
    let carry = (time * 45) % spacing;
    let traveled = 0;
    ctx.fillStyle = '#c9fbff';
    for (let i = 0; i < pts.length - 1; i++) {
      const a = pts[i];
      const b = pts[i + 1];
      const len = Math.hypot(b.x - a.x, b.y - a.y);
      let d = carry;
      while (d < len) {
        const total = traveled + d;
        if (total > 16) {
          ctx.globalAlpha = Math.max(0, 1 - total / 640) * 0.95;
          ctx.beginPath();
          ctx.arc(
            a.x + ((b.x - a.x) * d) / len,
            a.y + ((b.y - a.y) * d) / len,
            2.6,
            0,
            TAU,
          );
          ctx.fill();
        }
        d += spacing;
      }
      carry = d - len;
      traveled += len;
    }
    if (ghost) {
      ctx.globalAlpha = 0.75;
      ctx.strokeStyle = '#c9fbff';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(ghost.x, ghost.y, BALL_R, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.globalAlpha = 1;
  }

  private drawFx(fx: Fx): void {
    const ctx = this.ctx;
    ctx.globalCompositeOperation = 'lighter';
    for (const p of fx.particles) {
      ctx.globalAlpha = Math.min(1, (p.life / p.max) * 1.4);
      if (p.kind === 'spark') {
        ctx.strokeStyle = p.color;
        ctx.lineWidth = p.size;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y);
        ctx.lineTo(p.x - p.vx * 0.03, p.y - p.vy * 0.03);
        ctx.stroke();
      } else if (p.kind === 'shard') {
        const c = Math.cos(p.rot);
        const s = Math.sin(p.rot);
        const hw = p.size / 2;
        const hh = p.size / 4;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.moveTo(p.x + c * hw - s * hh, p.y + s * hw + c * hh);
        ctx.lineTo(p.x - c * hw - s * hh, p.y - s * hw + c * hh);
        ctx.lineTo(p.x - c * hw + s * hh, p.y - s * hw - c * hh);
        ctx.lineTo(p.x + c * hw + s * hh, p.y + s * hw - c * hh);
        ctx.fill();
      } else {
        ctx.fillStyle = p.color;
        ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      }
    }
    for (const r of fx.rings) {
      ctx.globalAlpha = r.life / r.max;
      ctx.strokeStyle = r.color;
      ctx.lineWidth = r.width * (0.4 + (r.life / r.max) * 0.6);
      ctx.beginPath();
      ctx.arc(r.x, r.y, r.r, 0, TAU);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private drawDarkness(g: Game, fx: Fx, sh: { x: number; y: number }): void {
    const cw = this.canvas.width;
    const chh = this.canvas.height;
    if (!this.dark || this.dark.width !== cw || this.dark.height !== chh) {
      this.dark = document.createElement('canvas');
      this.dark.width = cw;
      this.dark.height = chh;
    }
    const d = this.dark.getContext('2d')!;
    const s = this.scale;
    d.setTransform(1, 0, 0, 1, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, cw, chh);
    d.fillStyle = 'rgba(2,3,10,0.965)';
    d.fillRect(0, 0, cw, chh);
    d.setTransform(s, 0, 0, s, sh.x * s, sh.y * s);
    d.globalCompositeOperation = 'destination-out';
    const hole = (x: number, y: number, r: number, a = 1) => {
      const gr = d.createRadialGradient(x, y, 0, x, y, r);
      gr.addColorStop(0, `rgba(0,0,0,${a})`);
      gr.addColorStop(0.55, `rgba(0,0,0,${a * 0.8})`);
      gr.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = gr;
      d.fillRect(x - r, y - r, r * 2, r * 2);
    };
    for (const b of g.balls) hole(b.x, b.y, 125);
    hole(g.paddle.x, PADDLE_Y, 70 + g.paddle.w / 2, 0.9);
    for (const it of g.items) hole(it.x, it.y, 46, 0.9);
    for (const l of g.lasers) hole(l.x, l.y, 34, 0.8);
    for (const b of g.bodies)
      if (b.alive && (b.kind === 'bumper' || b.kind === 'portal' || b.brick === 'core'))
        hole(b.x, b.y, 44, 0.55);
    for (const l of fx.lights) hole(l.x, l.y, l.r, l.life / l.max);
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.drawImage(this.dark, 0, 0);
    this.ctx.setTransform(s, 0, 0, s, sh.x * s, sh.y * s);
  }

  private drawTexts(fx: Fx): void {
    const ctx = this.ctx;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.lineJoin = 'round';
    for (const t of fx.texts) {
      ctx.globalAlpha = Math.min(1, (t.life / t.max) * 2.5);
      ctx.font = `800 ${t.size}px ${FONT}`;
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(4,5,16,0.85)';
      ctx.strokeText(t.text, t.x, t.y);
      ctx.fillStyle = t.color;
      ctx.fillText(t.text, t.x, t.y);
    }
    ctx.globalAlpha = 1;
  }

  private drawHud(g: Game, view: View, time: number): void {
    const ctx = this.ctx;
    // 生效中的道具与剩余时间
    const active = TIMED.filter((k) => g.effects[k] > 0);
    active.forEach((k: TimedPower, i) => {
      const x = W - 32 - i * 48;
      const y = 22;
      const left = g.effects[k];
      if (left < 2 && Math.sin(time * 20) < 0) return;
      ctx.globalAlpha = 0.95;
      ctx.drawImage(
        this.itemSprite(k),
        x - (ITEM_W / 2 + PAD) * 0.8,
        y - (ITEM_H / 2 + PAD) * 0.8,
        (ITEM_W + PAD * 2) * 0.8,
        (ITEM_H + PAD * 2) * 0.8,
      );
      ctx.fillStyle = 'rgba(255,255,255,0.18)';
      ctx.fillRect(x - 16, y + 11, 32, 3);
      ctx.fillStyle = POWERS[k].color;
      ctx.fillRect(x - 16, y + 11, 32 * Math.min(1, left / POWERS[k].duration), 3);
      ctx.globalAlpha = 1;
    });

    // 连击
    if (g.combo !== this.comboShown) {
      if (g.combo > this.comboShown) this.comboPop = 1;
      this.comboShown = g.combo;
    }
    this.comboPop = Math.max(0, this.comboPop - 0.08);
    if (g.combo >= 3) {
      const size = 17 + Math.min(12, g.combo / 2);
      const color = g.combo >= 20 ? '#ff4fd8' : g.combo >= 10 ? '#ffe53b' : '#6ff3ff';
      ctx.save();
      ctx.translate(16, 30);
      ctx.scale(1 + this.comboPop * 0.35, 1 + this.comboPop * 0.35);
      ctx.font = `900 italic ${size}px ${FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.lineWidth = 4;
      ctx.strokeStyle = 'rgba(4,5,16,0.85)';
      const txt = `${view.comboLabel} ×${g.combo}`;
      ctx.strokeText(txt, 0, 0);
      ctx.shadowColor = color;
      ctx.shadowBlur = 10 * this.scale;
      ctx.fillStyle = color;
      ctx.fillText(txt, 0, 0);
      ctx.restore();
    }

    // 关卡开场横幅
    const bn = view.banner;
    if (bn && bn.age < 2.8) {
      const a =
        bn.age < 0.3
          ? bn.age / 0.3
          : bn.age > 2.2
            ? Math.max(0, 1 - (bn.age - 2.2) / 0.6)
            : 1;
      ctx.globalAlpha = a;
      ctx.fillStyle = 'rgba(3,4,14,0.6)';
      ctx.fillRect(0, 548, W, bn.note ? 116 : 96);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.font = `900 34px ${FONT}`;
      ctx.shadowColor = '#00e5ff';
      ctx.shadowBlur = 16 * this.scale;
      ctx.fillStyle = '#e9fdff';
      ctx.fillText(bn.title, W / 2, 582);
      ctx.shadowBlur = 0;
      ctx.font = `700 15px ${FONT}`;
      ctx.fillStyle = '#9fb3d9';
      ctx.fillText(bn.sub, W / 2, 620);
      if (bn.note) {
        ctx.fillStyle = '#ffab2e';
        ctx.fillText(bn.note, W / 2, 646);
      }
      ctx.globalAlpha = 1;
    }

    if (view.hint) {
      ctx.globalAlpha = 0.55 + 0.35 * Math.sin(time * 3);
      ctx.font = `600 14px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#d7f9ff';
      ctx.fillText(view.hint, W / 2, H - 16);
      ctx.globalAlpha = 1;
    }
  }
}

/** 给说明页画一个道具胶囊 */
export function paintPowerChip(canvas: HTMLCanvasElement, type: PowerType): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = (ITEM_W + PAD * 2) * dpr;
  canvas.height = (ITEM_H + PAD * 2) * dpr;
  const c = canvas.getContext('2d')!;
  c.scale(dpr, dpr);
  c.translate(PAD, PAD);
  paintItem(c, type, dpr);
}

export type ChipKind =
  | 'normal'
  | 'bomb'
  | 'gold'
  | 'core'
  | 'blocker'
  | 'bumper'
  | 'portal'
  | 'mover'
  | 'dark';

/** 给说明页画砖块/障碍示意 */
export function paintLegendChip(canvas: HTMLCanvasElement, kind: ChipKind): void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const w = 64;
  const h = 40;
  canvas.width = w * dpr;
  canvas.height = h * dpr;
  const c = canvas.getContext('2d')!;
  c.scale(dpr, dpr);
  if (kind === 'normal' || kind === 'bomb' || kind === 'gold') {
    c.translate(8, 8);
    paintBrick(c, 48, 24, kind, kind === 'normal' ? 5 : kind === 'gold' ? 2 : 1, dpr);
    return;
  }
  const cx = w / 2;
  const cy = h / 2;
  if (kind === 'core') {
    c.fillStyle = '#240521';
    c.strokeStyle = '#ff4fd8';
    c.lineWidth = 2;
    c.beginPath();
    c.arc(cx, cy, 13, 0, TAU);
    c.fill();
    c.stroke();
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx, cy, 17, -Math.PI / 2, Math.PI);
    c.stroke();
    c.fillStyle = '#ff9df0';
    c.beginPath();
    c.arc(cx, cy, 6, 0, TAU);
    c.fill();
  } else if (kind === 'blocker' || kind === 'mover') {
    c.fillStyle = '#20263a';
    c.strokeStyle = kind === 'mover' ? '#aebde6' : '#7d879f';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(cx - 20, cy + 12);
    c.lineTo(cx, cy - 14);
    c.lineTo(cx + 20, cy + 12);
    c.closePath();
    c.fill();
    c.stroke();
    if (kind === 'mover') {
      c.strokeStyle = '#6ff3ff';
      c.beginPath();
      c.arc(cx, cy + 2, 24, -0.6, 0.6);
      c.stroke();
      c.beginPath();
      c.arc(cx, cy + 2, 24, Math.PI - 0.6, Math.PI + 0.6);
      c.stroke();
    }
  } else if (kind === 'bumper') {
    c.fillStyle = '#062a2d';
    c.strokeStyle = '#3dffea';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(cx, cy, 13, 0, TAU);
    c.fill();
    c.stroke();
  } else if (kind === 'portal') {
    for (const [dx, col] of [
      [-14, '#ff9d3d'],
      [14, '#3dc5ff'],
    ] as const) {
      c.strokeStyle = col;
      c.lineWidth = 2.5;
      c.setLineDash([5, 3]);
      c.beginPath();
      c.arc(cx + dx, cy, 11, 0, TAU);
      c.stroke();
    }
  } else if (kind === 'dark') {
    const g = c.createRadialGradient(cx, cy, 2, cx, cy, 22);
    g.addColorStop(0, '#6ff3ff');
    g.addColorStop(0.3, 'rgba(111,243,255,0.25)');
    g.addColorStop(1, 'rgba(0,0,0,0)');
    c.fillStyle = '#02030a';
    c.fillRect(0, 0, w, h);
    c.fillStyle = g;
    c.fillRect(0, 0, w, h);
  }
}
