// 游戏规则与模拟：纯逻辑，不依赖 DOM。表现层（渲染/音效/UI）通过 events 队列获知发生了什么。
import type { PowerType, TimedPower } from './config';
import {
  BALL_R,
  BALL_SPEED,
  brickColor,
  CELL_H,
  CELL_W,
  CLEAR_BONUS_MAX_LIVES,
  H,
  ITEM_H,
  ITEM_W,
  LIVES,
  MAX_BALLS,
  MAX_BOUNCE,
  MAX_LIVES,
  MIN_AIM,
  MIN_VERTICAL,
  PADDLE_H,
  PADDLE_KEY_SPEED,
  PADDLE_MAX_SPEED,
  PADDLE_W,
  PADDLE_Y,
  POWER_ORDER,
  POWERS,
  SHIELD_Y,
  TIMED,
  W,
} from './config';
import type { AABB, CapsuleShape, Shape, Vec } from './geometry';
import { circleOverlap, clamp, reflect, shapeAABB, sweepCircle } from './geometry';
import type { BodyDef, BodyKind, BrickType, LevelDef } from './levels';
import { motionAt, worldShape } from './levels';
import type { Rng } from './rng';
import { createRng } from './rng';

export type Phase = 'aim' | 'play' | 'clear' | 'lost';
export type Mode = 'campaign' | 'endless' | 'demo';

export interface Body {
  def: BodyDef;
  kind: BodyKind;
  brick: BrickType;
  x: number;
  y: number;
  angle: number;
  shape: Shape;
  aabb: AABB;
  hp: number;
  maxHp: number;
  alive: boolean;
  /** 受击闪光剩余时间（秒） */
  flash: number;
  /** 受击弹跳动画 1 → 0 */
  pulse: number;
}

export interface Ball {
  id: number;
  x: number;
  y: number;
  dx: number;
  dy: number;
  /** 弹射器带来的临时加速倍率，逐渐回落到 1 */
  boost: number;
  stuck: boolean;
  stuckOffset: number;
  stuckTime: number;
  /** 距上次有效碰撞（砖块/挡板）的时间，用于防止无限循环 */
  idle: number;
  portalCd: number;
  lost: boolean;
}

export interface Item {
  type: PowerType;
  x: number;
  y: number;
  vy: number;
  age: number;
  dead: boolean;
}

export interface Laser {
  x: number;
  y: number;
  dead: boolean;
}

export interface Paddle {
  x: number;
  targetX: number;
  w: number;
  flash: number;
}

export type GameEvent =
  | { type: 'launch'; x: number; y: number }
  | { type: 'wall'; x: number; y: number }
  | { type: 'paddle'; x: number; y: number }
  | { type: 'blocker'; x: number; y: number }
  | { type: 'bumper'; x: number; y: number }
  | { type: 'brickHit'; x: number; y: number; color: string; combo: number }
  | {
      type: 'brickBreak';
      x: number;
      y: number;
      w: number;
      h: number;
      color: string;
      combo: number;
      points: number;
      brick: BrickType;
    }
  | { type: 'explode'; x: number; y: number; big: boolean }
  | { type: 'portal'; x: number; y: number; x2: number; y2: number }
  | { type: 'power'; power: PowerType; x: number; y: number }
  | { type: 'laser'; x: number; y: number }
  | { type: 'shield'; x: number; y: number }
  | { type: 'combo'; combo: number }
  | { type: 'lifeLost'; lives: number }
  | { type: 'clear' }
  | { type: 'gameOver' };

export interface Keys {
  left: boolean;
  right: boolean;
}

interface CastHit {
  t: number;
  nx: number;
  ny: number;
  kind: 'wall' | 'paddle' | 'shield' | 'body';
  body: Body | null;
}

interface Explosion {
  x: number;
  y: number;
  delay: number;
  big: boolean;
}

const AIM_KEY_SPEED = 1.5;
const LASER_SPEED = 900;
const SERVE_Y = PADDLE_Y - PADDLE_H / 2 - BALL_R - 0.5;

export class Game {
  readonly level: LevelDef;
  readonly mode: Mode;
  phase: Phase = 'aim';
  phaseTime = 0;
  /** 机关运动时钟（暂停时冻结） */
  clock = 0;
  /** 本关实际游戏时间（只在 play 阶段累计） */
  time = 0;
  bodies: Body[] = [];
  balls: Ball[] = [];
  items: Item[] = [];
  lasers: Laser[] = [];
  paddle: Paddle = { x: W / 2, targetX: W / 2, w: PADDLE_W, flash: 0 };
  lives = LIVES;
  livesLost = 0;
  score: number;
  combo = 0;
  maxCombo = 0;
  aimAngle = Math.PI / 2;
  clearBonus = 0;
  bricksLeft = 0;
  effects: Record<TimedPower, number> = {
    wide: 0,
    shrink: 0,
    slow: 0,
    fast: 0,
    pierce: 0,
    laser: 0,
    magnet: 0,
    shield: 0,
  };
  events: GameEvent[] = [];

  private rng: Rng;
  private ballId = 1;
  private laserCd = 0;
  private explosions: Explosion[] = [];
  private moving: Body[] = [];
  private partner = new Map<Body, Body>();

  constructor(
    level: LevelDef,
    opts: { mode: Mode; seed?: number; score?: number; lives?: number },
  ) {
    this.level = level;
    this.mode = opts.mode;
    const startingLives = Math.max(0, Math.floor(opts.lives ?? LIVES));
    this.lives =
      this.mode === 'endless' ? startingLives : Math.min(MAX_LIVES, startingLives);
    this.score = opts.score ?? 0;
    this.rng = createRng(opts.seed ?? 12345);
    const portals = new Map<number, Body>();
    for (const def of level.bodies) {
      const tr = motionAt(def, 0);
      const shape = worldShape(def.shape, tr.x, tr.y, tr.angle);
      const body: Body = {
        def,
        kind: def.kind,
        brick: def.brick,
        x: tr.x,
        y: tr.y,
        angle: tr.angle,
        shape,
        aabb: shapeAABB(shape),
        hp: def.hp,
        maxHp: def.hp,
        alive: true,
        flash: 0,
        pulse: 0,
      };
      this.bodies.push(body);
      if (def.motion) this.moving.push(body);
      if (def.kind === 'brick') this.bricksLeft++;
      if (def.kind === 'portal') {
        const other = portals.get(def.pair);
        if (other) {
          this.partner.set(body, other);
          this.partner.set(other, body);
        } else portals.set(def.pair, body);
      }
    }
    this.serve();
  }

  // ───────────────────────── 输入接口 ─────────────────────────

  aimAt(px: number, py: number): void {
    const b = this.balls[0];
    if (this.phase !== 'aim' || !b) return;
    let a = Math.atan2(b.y - py, px - b.x);
    if (a < MIN_AIM || a > Math.PI - MIN_AIM) a = px >= b.x ? MIN_AIM : Math.PI - MIN_AIM;
    this.aimAngle = a;
  }

  nudgeAim(delta: number): void {
    this.aimAngle = clamp(this.aimAngle + delta, MIN_AIM, Math.PI - MIN_AIM);
  }

  movePaddleTo(x: number): void {
    if (this.phase === 'play') this.paddle.targetX = x;
  }

  movePaddleBy(dx: number): void {
    if (this.phase === 'play') this.paddle.targetX += dx;
  }

  /** 瞄准阶段发射；游戏中释放被磁力吸住的球 */
  launch(): void {
    if (this.phase === 'aim') {
      const b = this.balls[0];
      if (!b) return;
      b.stuck = false;
      b.dx = Math.cos(this.aimAngle);
      b.dy = -Math.sin(this.aimAngle);
      this.setPhase('play');
      this.emit({ type: 'launch', x: b.x, y: b.y });
    } else if (this.phase === 'play') {
      for (const b of this.balls) if (b.stuck) this.release(b);
    }
  }

  hasStuckBall(): boolean {
    return this.phase === 'play' && this.balls.some((b) => b.stuck);
  }

  get stars(): number {
    return Math.max(1, 3 - this.livesLost);
  }

  drainEvents(): GameEvent[] {
    const e = this.events;
    this.events = [];
    return e;
  }

  // ───────────────────────── 主循环 ─────────────────────────

  update(dt: number, keys: Keys): void {
    this.clock += dt;
    this.phaseTime += dt;
    if (this.phase === 'play') this.time += dt;
    this.updateBodies(dt);

    if (this.phase === 'aim' || this.phase === 'play') {
      const dir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
      if (dir && this.phase === 'aim') this.nudgeAim(-dir * AIM_KEY_SPEED * dt);
      if (dir && this.phase === 'play')
        this.paddle.targetX += dir * PADDLE_KEY_SPEED * dt;
      this.updateEffects(dt);
    }
    this.updatePaddle(dt);

    for (const b of this.balls) this.stepBall(b, dt);
    if (this.balls.some((b) => b.lost)) this.balls = this.balls.filter((b) => !b.lost);

    this.updateItems(dt);
    this.updateLasers(dt);
    this.updateExplosions(dt);

    if (this.phase === 'play' && this.balls.length === 0) this.loseLife();
  }

  // ───────────────────────── 预测瞄准线 ─────────────────────────

  predictPath(maxLen = 640, maxBounces = 2): { pts: Vec[]; ghost: Vec | null } {
    const b = this.balls[0];
    if (!b) return { pts: [], ghost: null };
    let x = b.x;
    let y = b.y;
    let dx = Math.cos(this.aimAngle);
    let dy = -Math.sin(this.aimAngle);
    const pts: Vec[] = [{ x, y }];
    let ghost: Vec | null = null;
    let remaining = maxLen;
    for (let i = 0; i <= maxBounces && remaining > 0; i++) {
      const h = this.cast(x, y, dx, dy, remaining, false);
      if (!h) {
        pts.push({ x: x + dx * remaining, y: y + dy * remaining });
        break;
      }
      x += dx * h.t;
      y += dy * h.t;
      remaining -= h.t;
      pts.push({ x, y });
      if (!ghost && h.body?.kind === 'brick') ghost = { x, y };
      const r = reflect(dx, dy, h.nx, h.ny);
      dx = r.x;
      dy = r.y;
    }
    return { pts, ghost };
  }

  paddleShape(): CapsuleShape {
    const p = this.paddle;
    const r = PADDLE_H / 2;
    const half = Math.max(0, p.w / 2 - r);
    return {
      kind: 'capsule',
      ax: p.x - half,
      ay: PADDLE_Y,
      bx: p.x + half,
      by: PADDLE_Y,
      r,
    };
  }

  // ───────────────────────── 内部实现 ─────────────────────────

  private emit(e: GameEvent): void {
    this.events.push(e);
  }

  private setPhase(p: Phase): void {
    this.phase = p;
    this.phaseTime = 0;
  }

  private makeBall(x: number, y: number): Ball {
    return {
      id: this.ballId++,
      x,
      y,
      dx: 0,
      dy: -1,
      boost: 1,
      stuck: false,
      stuckOffset: 0,
      stuckTime: 0,
      idle: 0,
      portalCd: 0,
      lost: false,
    };
  }

  private serve(): void {
    const b = this.makeBall(this.paddle.x, SERVE_Y);
    b.stuck = true;
    b.stuckTime = Infinity;
    this.balls = [b];
    this.aimAngle = Math.PI / 2;
    this.setPhase('aim');
  }

  private speedOf(b: Ball): number {
    const ramp = Math.min(0.2, this.time / 600);
    let s = BALL_SPEED * this.level.speed * (1 + ramp) * b.boost;
    if (this.effects.slow > 0) s *= 0.62;
    if (this.effects.fast > 0) s *= 1.3;
    return s;
  }

  private addScore(n: number): void {
    // 结算后仍模拟离场动效，但成绩不再变化
    if (this.phase === 'clear' || this.phase === 'lost') return;
    this.score += n;
  }

  private updateBodies(dt: number): void {
    for (const b of this.moving) {
      if (!b.alive) continue;
      const tr = motionAt(b.def, this.clock);
      b.x = tr.x;
      b.y = tr.y;
      b.angle = tr.angle;
      b.shape = worldShape(b.def.shape, tr.x, tr.y, tr.angle);
      b.aabb = shapeAABB(b.shape);
    }
    for (const b of this.bodies) {
      if (b.flash > 0) b.flash -= dt;
      if (b.pulse > 0) b.pulse = Math.max(0, b.pulse - dt * 5);
    }
  }

  private updateEffects(dt: number): void {
    for (const k of TIMED) {
      if (this.effects[k] <= 0) continue;
      this.effects[k] = Math.max(0, this.effects[k] - dt);
      if (k === 'magnet' && this.effects.magnet === 0)
        for (const b of this.balls) if (b.stuck) this.release(b);
    }
  }

  private updatePaddle(dt: number): void {
    const p = this.paddle;
    const targetW =
      PADDLE_W * (this.effects.wide > 0 ? 1.5 : 1) * (this.effects.shrink > 0 ? 0.62 : 1);
    p.w += (targetW - p.w) * Math.min(1, dt * 10);
    const half = p.w / 2;
    p.targetX = clamp(p.targetX, half, W - half);
    if (this.phase === 'play') {
      const step = PADDLE_MAX_SPEED * dt;
      p.x += clamp(p.targetX - p.x, -step, step);
    }
    p.x = clamp(p.x, half, W - half);
    if (p.flash > 0) p.flash -= dt;
  }

  private stepBall(b: Ball, dt: number): void {
    if (b.stuck) {
      const half = this.paddle.w / 2 - BALL_R;
      b.stuckOffset = clamp(b.stuckOffset, -half, half);
      b.x = this.paddle.x + b.stuckOffset;
      b.y = SERVE_Y;
      b.stuckTime -= dt;
      if (b.stuckTime <= 0) this.release(b);
      return;
    }
    if (b.portalCd > 0) b.portalCd -= dt;
    b.boost = 1 + (b.boost - 1) * Math.exp(-dt * 2.2);
    b.idle += dt;
    if (b.idle > 10) {
      // 长时间只在拦截物之间弹跳：随机扰动方向，避免死循环
      const a =
        Math.atan2(b.dy, b.dx) +
        (this.rng.chance(0.5) ? 1 : -1) * this.rng.range(0.15, 0.3);
      b.dx = Math.cos(a);
      b.dy = Math.sin(a);
      this.fixDir(b);
      b.idle = 0;
    }
    if (this.phase === 'clear') {
      // 通关后球逐渐下坠离场
      b.dy += dt * 1.2;
      const l = Math.hypot(b.dx, b.dy);
      b.dx /= l;
      b.dy /= l;
    }
    this.depenetrate(b);
    let remaining = this.speedOf(b) * dt;
    const withPaddle = this.phase === 'play';
    for (let iter = 0; iter < 8 && remaining > 1e-6 && !b.stuck; iter++) {
      const h = this.cast(b.x, b.y, b.dx, b.dy, remaining, withPaddle);
      if (!h) {
        b.x += b.dx * remaining;
        b.y += b.dy * remaining;
        break;
      }
      const adv = Math.max(0, h.t - 0.02);
      b.x += b.dx * adv;
      b.y += b.dy * adv;
      remaining -= Math.max(h.t, 0.01);
      this.resolve(b, h);
    }
    this.checkPortal(b);
    if (b.y - BALL_R > H + 4) b.lost = true;
  }

  /** 从 (x,y) 沿 (dx,dy) 扫掠小球，返回最早的碰撞 */
  private cast(
    x: number,
    y: number,
    dx: number,
    dy: number,
    maxT: number,
    withPaddle: boolean,
  ): CastHit | null {
    let best: CastHit | null = null;
    let bestT = maxT;
    const R = BALL_R;
    if (dx < 0) {
      const t = Math.max(0, (x - R) / -dx);
      if (t <= bestT) {
        bestT = t;
        best = { t, nx: 1, ny: 0, kind: 'wall', body: null };
      }
    } else if (dx > 0) {
      const t = Math.max(0, (W - R - x) / dx);
      if (t <= bestT) {
        bestT = t;
        best = { t, nx: -1, ny: 0, kind: 'wall', body: null };
      }
    }
    if (dy < 0) {
      const t = Math.max(0, (y - R) / -dy);
      if (t <= bestT) {
        bestT = t;
        best = { t, nx: 0, ny: 1, kind: 'wall', body: null };
      }
    }
    if (
      dy > 0 &&
      this.effects.shield > 0 &&
      this.phase === 'play' &&
      y <= SHIELD_Y - R + 1
    ) {
      const t = Math.max(0, (SHIELD_Y - R - y) / dy);
      if (t <= bestT) {
        bestT = t;
        best = { t, nx: 0, ny: -1, kind: 'shield', body: null };
      }
    }
    if (withPaddle) {
      const h = sweepCircle(x, y, dx, dy, bestT, R, this.paddleShape());
      if (h && h.t <= bestT) {
        bestT = h.t;
        best = { ...h, kind: 'paddle', body: null };
      }
    }
    const minX = Math.min(x, x + dx * bestT) - R;
    const maxX = Math.max(x, x + dx * bestT) + R;
    const minY = Math.min(y, y + dy * bestT) - R;
    const maxY = Math.max(y, y + dy * bestT) + R;
    for (const body of this.bodies) {
      if (!body.alive || body.kind === 'portal') continue;
      const bb = body.aabb;
      if (bb.maxX < minX || bb.minX > maxX || bb.maxY < minY || bb.minY > maxY) continue;
      const h = sweepCircle(x, y, dx, dy, bestT, R, body.shape);
      if (h && h.t < bestT) {
        bestT = h.t;
        best = { ...h, kind: 'body', body };
      }
    }
    return best;
  }

  private resolve(b: Ball, h: CastHit): void {
    switch (h.kind) {
      case 'wall':
        this.bounce(b, h.nx, h.ny);
        this.emit({ type: 'wall', x: b.x, y: b.y });
        break;
      case 'shield':
        this.bounce(b, 0, -1);
        this.emit({ type: 'shield', x: b.x, y: SHIELD_Y });
        break;
      case 'paddle':
        this.hitPaddle(b, h.nx, h.ny);
        break;
      case 'body':
        this.hitBody(b, h.body!, h.nx, h.ny);
        break;
    }
  }

  private bounce(b: Ball, nx: number, ny: number): void {
    const r = reflect(b.dx, b.dy, nx, ny);
    b.dx = r.x;
    b.dy = r.y;
    this.fixDir(b);
  }

  /** 归一化并保证最小竖直分量 */
  private fixDir(b: Ball): void {
    const l = Math.hypot(b.dx, b.dy) || 1;
    b.dx /= l;
    b.dy /= l;
    if (Math.abs(b.dy) < MIN_VERTICAL) {
      const sy = b.dy > 0 ? 1 : -1;
      b.dy = sy * MIN_VERTICAL;
      b.dx = (b.dx < 0 ? -1 : 1) * Math.sqrt(1 - MIN_VERTICAL * MIN_VERTICAL);
    }
  }

  private hitPaddle(b: Ball, nx: number, ny: number): void {
    const p = this.paddle;
    if (ny < -0.25 && b.dy > 0) {
      // 经典打砖块手感：落点越靠边，反弹越斜
      const off = clamp((b.x - p.x) / (p.w / 2), -1, 1);
      const a = off * MAX_BOUNCE;
      b.dx = Math.sin(a);
      b.dy = -Math.cos(a);
      b.idle = 0;
      if (this.effects.magnet > 0) {
        b.stuck = true;
        b.stuckOffset = b.x - p.x;
        b.stuckTime = 2.5;
      }
      this.combo = 0;
    } else {
      this.bounce(b, nx, ny);
    }
    p.flash = 0.15;
    this.emit({ type: 'paddle', x: b.x, y: b.y });
  }

  private hitBody(b: Ball, body: Body, nx: number, ny: number): void {
    if (body.kind === 'brick') {
      b.idle = 0;
      const pierce = this.effects.pierce > 0;
      if (pierce && body.brick !== 'core') {
        this.destroyBrick(body);
        return;
      }
      this.bounce(b, nx, ny);
      this.damageBrick(body, pierce ? 3 : 1);
    } else if (body.kind === 'bumper') {
      this.bounce(b, nx, ny);
      b.boost = 1.55;
      body.flash = 0.3;
      body.pulse = 1;
      this.addScore(25);
      this.emit({ type: 'bumper', x: body.x, y: body.y });
    } else {
      this.bounce(b, nx, ny);
      body.flash = 0.12;
      this.emit({ type: 'blocker', x: b.x - nx * BALL_R, y: b.y - ny * BALL_R });
    }
  }

  /** 被移动的机关挤进球里时，把球推出来 */
  private depenetrate(b: Ball): void {
    for (const body of this.bodies) {
      if (!body.alive || body.kind === 'portal') continue;
      const bb = body.aabb;
      if (
        b.x + BALL_R < bb.minX ||
        b.x - BALL_R > bb.maxX ||
        b.y + BALL_R < bb.minY ||
        b.y - BALL_R > bb.maxY
      )
        continue;
      const o = circleOverlap(b.x, b.y, BALL_R, body.shape);
      if (!o) continue;
      if (body.kind === 'brick' && this.effects.pierce > 0 && body.brick !== 'core') {
        this.destroyBrick(body);
        continue;
      }
      b.x += o.nx * (o.depth + 0.05);
      b.y += o.ny * (o.depth + 0.05);
      if (b.dx * o.nx + b.dy * o.ny < 0) this.hitBody(b, body, o.nx, o.ny);
    }
    if (this.phase === 'play') {
      const o = circleOverlap(b.x, b.y, BALL_R, this.paddleShape());
      if (o) {
        b.x += o.nx * (o.depth + 0.05);
        b.y += o.ny * (o.depth + 0.05);
        if (b.dx * o.nx + b.dy * o.ny < 0) this.hitPaddle(b, o.nx, o.ny);
      }
    }
    b.x = clamp(b.x, BALL_R, W - BALL_R);
    if (b.y < BALL_R) b.y = BALL_R;
  }

  private checkPortal(b: Ball): void {
    if (b.portalCd > 0) return;
    for (const [p, other] of this.partner) {
      const r = p.shape.kind === 'circle' ? p.shape.r : 20;
      if ((b.x - p.x) ** 2 + (b.y - p.y) ** 2 < r * r) {
        const fx = b.x;
        const fy = b.y;
        b.x = other.x + b.dx * 2;
        b.y = other.y + b.dy * 2;
        b.portalCd = 0.45;
        p.flash = other.flash = 0.3;
        this.emit({ type: 'portal', x: fx, y: fy, x2: b.x, y2: b.y });
        return;
      }
    }
  }

  private release(b: Ball): void {
    const off = clamp(b.stuckOffset / (this.paddle.w / 2), -1, 1);
    const a = off * MAX_BOUNCE * 0.8;
    b.dx = Math.sin(a);
    b.dy = -Math.cos(a);
    b.stuck = false;
    this.emit({ type: 'launch', x: b.x, y: b.y });
  }

  damageBrick(body: Body, amount: number): void {
    if (this.phase === 'clear' || this.phase === 'lost') return;
    if (!body.alive || body.kind !== 'brick') return;
    const color = brickColor(body.brick, body.hp);
    body.hp -= amount;
    body.flash = 0.1;
    body.pulse = 1;
    this.addScore(10);
    if (body.hp <= 0) this.destroyBrick(body, color);
    else this.emit({ type: 'brickHit', x: body.x, y: body.y, color, combo: this.combo });
  }

  private destroyBrick(body: Body, color = brickColor(body.brick, body.hp)): void {
    if (this.phase === 'clear' || this.phase === 'lost') return;
    if (!body.alive) return;
    body.alive = false;
    body.hp = 0;
    this.bricksLeft--;
    this.combo++;
    this.maxCombo = Math.max(this.maxCombo, this.combo);
    const base = body.brick === 'core' ? 2500 : 40 + 10 * body.maxHp;
    const points = Math.round(base * (1 + 0.1 * Math.min(this.combo - 1, 30)));
    this.addScore(points);
    const bb = body.aabb;
    this.emit({
      type: 'brickBreak',
      x: body.x,
      y: body.y,
      w: bb.maxX - bb.minX,
      h: bb.maxY - bb.minY,
      color,
      combo: this.combo,
      points,
      brick: body.brick,
    });
    if (this.combo >= 5 && this.combo % 5 === 0)
      this.emit({ type: 'combo', combo: this.combo });
    if (
      body.brick === 'gold' ||
      (body.brick === 'normal' && this.rng.next() < this.level.drop)
    )
      this.dropItem(body.x, body.y);
    if (body.brick === 'bomb')
      this.explosions.push({ x: body.x, y: body.y, delay: 0.09, big: false });
    if (body.brick === 'core')
      this.explosions.push({ x: body.x, y: body.y, delay: 0.05, big: true });
    if (this.bricksLeft === 0) this.onClear();
  }

  private updateExplosions(dt: number): void {
    if (!this.explosions.length) return;
    const list = this.explosions;
    this.explosions = [];
    for (const e of list) {
      e.delay -= dt;
      if (e.delay > 0) {
        this.explosions.push(e);
        continue;
      }
      this.emit({ type: 'explode', x: e.x, y: e.y, big: e.big });
      // 菱形范围（格子单位）：普通炸弹覆盖周围 13 格
      const reach = e.big ? 3.2 : 2.2;
      const dmg = e.big ? 4 : 3;
      for (const b of this.bodies) {
        if (!b.alive || b.kind !== 'brick') continue;
        const dc = Math.abs(b.x - e.x) / CELL_W;
        const dr = Math.abs(b.y - e.y) / CELL_H;
        if (dc + dr <= reach) this.damageBrick(b, dmg);
      }
    }
  }

  private dropItem(x: number, y: number): void {
    const pool = POWER_ORDER.filter((t) => this.level.traps || POWERS[t].good);
    const total = pool.reduce((s, t) => s + POWERS[t].weight, 0);
    let r = this.rng.next() * total;
    let type = pool[0];
    for (const t of pool) {
      r -= POWERS[t].weight;
      if (r <= 0) {
        type = t;
        break;
      }
    }
    this.items.push({ type, x, y, vy: 110 + this.rng.next() * 40, age: 0, dead: false });
  }

  private updateItems(dt: number): void {
    if (!this.items.length) return;
    const p = this.paddle;
    const canCatch = this.phase === 'play';
    for (const it of this.items) {
      it.age += dt;
      it.vy = Math.min(it.vy + 50 * dt, 300);
      it.y += it.vy * dt;
      if (
        canCatch &&
        Math.abs(it.x - p.x) < p.w / 2 + ITEM_W / 2 - 4 &&
        Math.abs(it.y - PADDLE_Y) < (PADDLE_H + ITEM_H) / 2
      ) {
        it.dead = true;
        this.applyPower(it.type, it.x, it.y);
      }
      if (it.y > H + 30) it.dead = true;
    }
    this.items = this.items.filter((it) => !it.dead);
  }

  applyPower(type: PowerType, x = this.paddle.x, y = PADDLE_Y): void {
    if (this.phase === 'clear' || this.phase === 'lost') return;
    const e = this.effects;
    switch (type) {
      case 'wide':
        e.wide = POWERS.wide.duration;
        e.shrink = 0;
        break;
      case 'shrink':
        e.shrink = POWERS.shrink.duration;
        e.wide = 0;
        break;
      case 'slow':
        e.slow = POWERS.slow.duration;
        e.fast = 0;
        break;
      case 'fast':
        e.fast = POWERS.fast.duration;
        e.slow = 0;
        break;
      case 'pierce':
      case 'laser':
      case 'magnet':
      case 'shield':
        e[type] = POWERS[type].duration;
        break;
      case 'life':
        this.lives =
          this.mode === 'endless' ? this.lives + 1 : Math.min(MAX_LIVES, this.lives + 1);
        break;
      case 'multi':
        this.splitBalls(2);
        break;
      case 'spread':
        this.splitBalls(5);
        break;
    }
    if (POWERS[type].good) this.addScore(100);
    this.emit({ type: 'power', power: type, x, y });
  }

  private splitBalls(factor: 2 | 5): void {
    const halfAngle = factor === 2 ? 0.2 : (32 * Math.PI) / 180;
    for (const b of [...this.balls]) {
      const count = Math.min(factor, MAX_BALLS - this.balls.length + 1);
      if (count < 2) break;
      if (b.lost) continue;
      const angle = Math.atan2(b.dy, b.dx);
      for (let i = 0; i < count; i++) {
        // 保留磁力源球的待发射状态，只有新球立即飞出
        const nb =
          i === Math.floor(count / 2)
            ? b
            : {
                ...b,
                id: this.ballId++,
                stuck: false,
                stuckOffset: 0,
                stuckTime: 0,
              };
        const a = angle + halfAngle * ((2 * i) / (count - 1) - 1);
        nb.dx = Math.cos(a);
        nb.dy = Math.sin(a);
        this.fixDir(nb);
        if (nb !== b) this.balls.push(nb);
      }
    }
  }

  private updateLasers(dt: number): void {
    if (this.phase === 'play' && this.effects.laser > 0) {
      this.laserCd -= dt;
      if (this.laserCd <= 0) {
        this.laserCd = 0.3;
        const off = this.paddle.w / 2 - 10;
        for (const s of [-1, 1])
          this.lasers.push({ x: this.paddle.x + s * off, y: PADDLE_Y - 12, dead: false });
        this.emit({ type: 'laser', x: this.paddle.x, y: PADDLE_Y - 12 });
      }
    }
    if (!this.lasers.length) return;
    const dist = LASER_SPEED * dt;
    for (const l of this.lasers) {
      let bestT = dist;
      let target: Body | null = null;
      for (const b of this.bodies) {
        if (!b.alive || b.kind === 'portal') continue;
        const bb = b.aabb;
        if (l.x < bb.minX || l.x > bb.maxX || bb.minY > l.y || bb.maxY < l.y - dist)
          continue;
        const h = sweepCircle(l.x, l.y, 0, -1, bestT, 0, b.shape);
        if (h && h.t < bestT) {
          bestT = h.t;
          target = b;
        }
      }
      if (target) {
        l.dead = true;
        if (target.kind === 'brick') this.damageBrick(target, 1);
        else this.emit({ type: 'blocker', x: l.x, y: l.y - bestT });
      } else {
        l.y -= dist;
        if (l.y < -20) l.dead = true;
      }
    }
    this.lasers = this.lasers.filter((l) => !l.dead);
  }

  private onClear(): void {
    if (this.phase === 'clear' || this.phase === 'lost') return;
    this.clearBonus =
      this.mode === 'demo' ? 0 : Math.min(this.lives, CLEAR_BONUS_MAX_LIVES) * 1000;
    this.addScore(this.clearBonus);
    for (const b of this.balls) {
      if (b.stuck) {
        b.stuck = false;
        b.dx = 0;
        b.dy = -1;
      }
    }
    this.effects.shield = 0;
    this.effects.magnet = 0;
    this.effects.laser = 0;
    this.setPhase('clear');
    this.emit({ type: 'clear' });
  }

  private loseLife(): void {
    this.combo = 0;
    if (this.mode !== 'demo') {
      this.lives--;
      this.livesLost++;
    }
    this.emit({ type: 'lifeLost', lives: this.lives });
    this.items = [];
    this.lasers = [];
    for (const k of TIMED) this.effects[k] = 0;
    if (this.lives <= 0) {
      this.setPhase('lost');
      this.emit({ type: 'gameOver' });
      return;
    }
    this.serve();
  }
}
