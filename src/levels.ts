// 关卡数据结构与构建器。关卡 = 网格字符串（砖块/灰块）+ 用 Builder 添加的自由形状与机关。
import type { BrickKind } from './config';
import { CELL_H, CELL_W, COLS, GRID_X, GRID_Y } from './config';
import type { Shape, Vec } from './geometry';
import { makePoly, rectPts, regularPts, transformPts } from './geometry';

export type Motion =
  | { type: 'slide'; dx: number; dy: number; period: number; phase: number }
  | { type: 'spin'; speed: number }
  | {
      type: 'orbit';
      cx: number;
      cy: number;
      radius: number;
      speed: number;
      phase: number;
    };

export type BodyKind = 'brick' | 'blocker' | 'bumper' | 'portal';
export type BrickType = BrickKind;

export type LocalShape =
  | { kind: 'poly'; pts: Vec[] }
  | { kind: 'circle'; r: number }
  | { kind: 'bar'; len: number; r: number };

export interface BodyDef {
  kind: BodyKind;
  x: number;
  y: number;
  angle: number;
  shape: LocalShape;
  hp: number;
  brick: BrickType;
  motion: Motion | null;
  /** 传送门配对编号，非传送门为 -1 */
  pair: number;
}

export interface LevelDef {
  id: string;
  name: string;
  /** 章节（1 起）；无尽模式为 0 */
  chapter: number;
  speed: number;
  dark: boolean;
  /** 普通砖块掉落道具的概率 */
  drop: number;
  /** 是否会掉落负面道具 */
  traps: boolean;
  bodies: BodyDef[];
}

export interface LevelSource {
  name: string;
  grid?: string[];
  speed?: number;
  dark?: boolean;
  build?: (b: Builder) => void;
}

const HP_CHARS = '123456789ABC';

export const deg = (d: number): number => (d * Math.PI) / 180;
/** 网格列/行中心坐标（可传小数） */
export const cx = (col: number): number => GRID_X + (col + 0.5) * CELL_W;
export const cy = (row: number): number => GRID_Y + (row + 0.5) * CELL_H;

export function slide(dx: number, dy: number, period: number, phase = 0): Motion {
  return { type: 'slide', dx, dy, period, phase };
}
export function spin(degPerSec: number): Motion {
  return { type: 'spin', speed: deg(degPerSec) };
}
export function orbit(
  ox: number,
  oy: number,
  radius: number,
  degPerSec: number,
  phaseDeg = 0,
): Motion {
  return {
    type: 'orbit',
    cx: ox,
    cy: oy,
    radius,
    speed: deg(degPerSec),
    phase: deg(phaseDeg),
  };
}

export function worldShape(s: LocalShape, x: number, y: number, angle: number): Shape {
  switch (s.kind) {
    case 'circle':
      return { kind: 'circle', x, y, r: s.r };
    case 'bar': {
      const hx = (Math.cos(angle) * s.len) / 2;
      const hy = (Math.sin(angle) * s.len) / 2;
      return { kind: 'capsule', ax: x - hx, ay: y - hy, bx: x + hx, by: y + hy, r: s.r };
    }
    case 'poly':
      return makePoly(transformPts(s.pts, x, y, angle));
  }
}

export interface Transform {
  x: number;
  y: number;
  angle: number;
}

export function motionAt(def: BodyDef, t: number): Transform {
  const m = def.motion;
  if (!m) return { x: def.x, y: def.y, angle: def.angle };
  switch (m.type) {
    case 'slide': {
      const k = Math.sin((t / m.period + m.phase) * Math.PI * 2);
      return { x: def.x + m.dx * k, y: def.y + m.dy * k, angle: def.angle };
    }
    case 'spin':
      return { x: def.x, y: def.y, angle: def.angle + m.speed * t };
    case 'orbit': {
      const a = m.phase + m.speed * t;
      return {
        x: m.cx + Math.cos(a) * m.radius,
        y: m.cy + Math.sin(a) * m.radius,
        angle: def.angle + a,
      };
    }
  }
}

export class Builder {
  bodies: BodyDef[] = [];
  private pairs = 0;

  private add(
    kind: BodyKind,
    x: number,
    y: number,
    shape: LocalShape,
    extra: Partial<BodyDef> = {},
  ): BodyDef {
    const def: BodyDef = {
      kind,
      x,
      y,
      angle: 0,
      shape,
      hp: 0,
      brick: 'normal',
      motion: null,
      pair: -1,
      ...extra,
    };
    this.bodies.push(def);
    return def;
  }

  brick(
    x: number,
    y: number,
    hp: number,
    opts: { type?: BrickType; w?: number; h?: number; motion?: Motion } = {},
  ): this {
    const shape: LocalShape = {
      kind: 'poly',
      pts: rectPts(opts.w ?? CELL_W, opts.h ?? CELL_H),
    };
    this.add('brick', x, y, shape, {
      hp,
      brick: opts.type ?? 'normal',
      motion: opts.motion ?? null,
    });
    return this;
  }

  /** 首领核心：圆形、高血量、穿透球无法穿过 */
  core(x: number, y: number, r: number, hp: number, motion?: Motion): this {
    this.add(
      'brick',
      x,
      y,
      { kind: 'circle', r },
      { hp, brick: 'core', motion: motion ?? null },
    );
    return this;
  }

  rect(x: number, y: number, w: number, h: number, angleDeg = 0, motion?: Motion): this {
    this.add(
      'blocker',
      x,
      y,
      { kind: 'poly', pts: rectPts(w, h) },
      { angle: deg(angleDeg), motion: motion ?? null },
    );
    return this;
  }

  /** 正三角形，size 为外接圆半径，rot=0 时尖角朝上 */
  tri(x: number, y: number, size: number, rotDeg = 0, motion?: Motion): this {
    this.add(
      'blocker',
      x,
      y,
      { kind: 'poly', pts: regularPts(size, 3) },
      { angle: deg(rotDeg), motion: motion ?? null },
    );
    return this;
  }

  /** 直角楔形：直角位于 corner 指定的角 */
  wedge(
    x: number,
    y: number,
    w: number,
    h: number,
    corner: 'bl' | 'br' | 'tl' | 'tr',
  ): this {
    const hw = w / 2;
    const hh = h / 2;
    const all: Record<typeof corner, Vec[]> = {
      bl: [
        { x: -hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh },
      ],
      br: [
        { x: hw, y: -hh },
        { x: hw, y: hh },
        { x: -hw, y: hh },
      ],
      tl: [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: -hw, y: hh },
      ],
      tr: [
        { x: -hw, y: -hh },
        { x: hw, y: -hh },
        { x: hw, y: hh },
      ],
    };
    this.add('blocker', x, y, { kind: 'poly', pts: all[corner] });
    return this;
  }

  circle(x: number, y: number, r: number, motion?: Motion): this {
    this.add('blocker', x, y, { kind: 'circle', r }, { motion: motion ?? null });
    return this;
  }

  hex(x: number, y: number, r: number, rotDeg = 0, motion?: Motion): this {
    this.add(
      'blocker',
      x,
      y,
      { kind: 'poly', pts: regularPts(r, 6) },
      { angle: deg(rotDeg), motion: motion ?? null },
    );
    return this;
  }

  diamond(x: number, y: number, rx: number, ry: number, motion?: Motion): this {
    const pts = [
      { x: 0, y: -ry },
      { x: rx, y: 0 },
      { x: 0, y: ry },
      { x: -rx, y: 0 },
    ];
    this.add('blocker', x, y, { kind: 'poly', pts }, { motion: motion ?? null });
    return this;
  }

  /** 圆头长杆（胶囊体），适合做旋转杆 */
  bar(
    x: number,
    y: number,
    len: number,
    angleDeg = 0,
    motion?: Motion,
    thick = 12,
  ): this {
    this.add(
      'blocker',
      x,
      y,
      { kind: 'bar', len, r: thick / 2 },
      { angle: deg(angleDeg), motion: motion ?? null },
    );
    return this;
  }

  /** 十字旋转器：两根交叉的杆 */
  cross(x: number, y: number, len: number, degPerSec: number, thick = 12): this {
    this.bar(x, y, len, 0, spin(degPerSec), thick);
    this.bar(x, y, len, 90, spin(degPerSec), thick);
    return this;
  }

  bumper(x: number, y: number, r = 18, motion?: Motion): this {
    this.add('bumper', x, y, { kind: 'circle', r }, { motion: motion ?? null });
    return this;
  }

  portals(ax: number, ay: number, bx: number, by: number, r = 20): this {
    const pair = this.pairs++;
    this.add('portal', ax, ay, { kind: 'circle', r }, { pair });
    this.add('portal', bx, by, { kind: 'circle', r }, { pair });
    return this;
  }

  /**
   * 解析网格：'.' 空，'1'-'9','A','B','C' = 血量 1–12，'#' 灰色拦截块，'*' 炸弹，'$' 金砖。
   * rowOffset 可让网格整体下移若干行。
   */
  grid(rows: string[], rowOffset = 0): this {
    rows.forEach((row, r) => {
      if (row.length !== COLS)
        throw new Error(`grid row ${r} must be ${COLS} chars: "${row}"`);
      for (let c = 0; c < COLS; c++) {
        const ch = row[c] ?? '.';
        const x = cx(c);
        const y = cy(r + rowOffset);
        if (ch === '#') this.rect(x, y, CELL_W, CELL_H);
        else if (ch === '*') this.brick(x, y, 1, { type: 'bomb' });
        else if (ch === '$') this.brick(x, y, 2, { type: 'gold' });
        else {
          const hp = HP_CHARS.indexOf(ch) + 1;
          if (hp > 0) this.brick(x, y, hp);
        }
      }
    });
    return this;
  }
}

const GOLD_COUNT = 6;
const GOLD_MIN_HP = 1;
const GOLD_MAX_HP = 5;

/** 统一关卡中的金砖数量与生命值范围 */
export function normalizeGold(
  bodies: BodyDef[],
  nextHp: (index: number) => number = (index) => 1 + (index % 5),
): void {
  const gold = bodies.filter((body) => body.kind === 'brick' && body.brick === 'gold');
  for (const body of gold.splice(GOLD_COUNT)) body.brick = 'normal';

  const candidates = bodies
    .filter((body) => body.kind === 'brick' && body.brick === 'normal')
    .sort(
      (a, b) =>
        Number(a.motion !== null) - Number(b.motion !== null) || a.y - b.y || a.x - b.x,
    );
  for (const body of candidates) {
    if (gold.length >= GOLD_COUNT) break;
    body.brick = 'gold';
    gold.push(body);
  }
  if (gold.length !== GOLD_COUNT)
    throw new Error(`level must contain ${GOLD_COUNT} gold bricks`);

  gold.forEach((body, index) => {
    body.hp = Math.max(GOLD_MIN_HP, Math.min(GOLD_MAX_HP, Math.round(nextHp(index))));
  });
}

export interface ChapterMeta {
  speed: number;
  drop: number;
  traps: boolean;
}

export function buildLevel(
  src: LevelSource,
  id: string,
  chapter: number,
  meta: ChapterMeta,
): LevelDef {
  const b = new Builder();
  if (src.grid) b.grid(src.grid);
  src.build?.(b);
  normalizeGold(b.bodies);
  return {
    id,
    name: src.name,
    chapter,
    speed: src.speed ?? meta.speed,
    dark: src.dark ?? false,
    drop: meta.drop,
    traps: meta.traps,
    bodies: b.bodies,
  };
}
