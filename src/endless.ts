// 无尽模式：按层数 n 程序化生成关卡。图案左右对称，难度（血量/机关/速度）随 n 递增。
// 每个候选关卡都要通过 validate.levelIssues，不合格就换种子重来，最后兜底为纯砖块关卡。
import { COLS, W } from './config';
import type { BrickType, LevelDef } from './levels';
import { Builder, cx, cy, normalizeGold, orbit, slide, spin } from './levels';
import type { Rng } from './rng';
import { createRng } from './rng';
import { levelIssues } from './validate';

type Mask = boolean[][];

const WORDS_A = [
  'NEON',
  'VOID',
  'PULSE',
  'HYPER',
  'CYBER',
  'NOVA',
  'ECHO',
  'FLUX',
  'ION',
  'LUMEN',
  'QUASAR',
  'VECTOR',
];
const WORDS_B = [
  'GRID',
  'STORM',
  'WAVE',
  'DRIFT',
  'BLOOM',
  'RIFT',
  'FORGE',
  'HAZE',
  'SPIRE',
  'NEST',
  'ORBIT',
  'MAZE',
];

/** 只生成左半边 6 列，右半边镜像 */
function mirrored(rows: number, fill: (r: number, c: number) => boolean): Mask {
  return Array.from({ length: rows }, (_, r) => {
    const half = Array.from({ length: COLS / 2 }, (_, c) => fill(r, c));
    return [...half, ...[...half].reverse()];
  });
}

const PATTERNS: ((rng: Rng, rows: number) => Mask)[] = [
  // 随机噪点
  (rng, rows) => {
    const p = rng.range(0.55, 0.85);
    return mirrored(rows, () => rng.chance(p));
  },
  // 太空入侵者：中间更密
  (rng, rows) => mirrored(rows, (_, c) => rng.chance(c >= 3 ? 0.8 : 0.45)),
  // 条纹
  (rng, rows) => {
    const keep = rng.chance(0.5) ? 0 : 1;
    return mirrored(rows, (r) => r % 2 === keep || r === 0);
  },
  // 菱形
  (_, rows) => {
    const ry = (rows - 1) / 2;
    return mirrored(
      rows,
      (r, c) => Math.abs(c - 5.5) / 6 + Math.abs(r - ry) / (ry + 0.6) <= 1.05,
    );
  },
  // 圆环
  (rng, rows) => {
    const ry = (rows - 1) / 2;
    const hole = rng.range(0.35, 0.6);
    return mirrored(rows, (r, c) => {
      const d = Math.hypot((c - 5.5) / 6, (r - ry) / (ry + 0.6));
      return d <= 1.02 && (d >= hole || d < 0.2);
    });
  },
  // 立柱
  (rng, rows) => {
    const w = rng.int(1, 2);
    const phase = rng.int(0, 1);
    return mirrored(rows, (r, c) => Math.floor(c / w) % 2 === phase || r === rows - 1);
  },
  // 金字塔（正/倒）
  (rng, rows) => {
    const flip = rng.chance(0.5);
    return mirrored(
      rows,
      (r, c) => Math.abs(c - 5.5) <= ((flip ? rows - r : r + 1) * 6) / rows,
    );
  },
  // 棋盘
  (rng, rows) => {
    const k = rng.int(0, 1);
    return mirrored(rows, (r, c) => (r + c + k) % 2 === 0);
  },
];

interface Placed {
  x: number;
  y: number;
  r: number;
}

/** 在机关区里找一个与已有物体保持间距的位置（对称成对放置） */
function spot(
  rng: Rng,
  placed: Placed[],
  r: number,
  top: number,
  bottom: number,
  pair: boolean,
): Placed | null {
  for (let i = 0; i < 40; i++) {
    const x = pair ? rng.range(40 + r, 260 - r) : W / 2;
    const y = rng.range(top + r, bottom - r);
    const cands = pair
      ? [
          { x, y, r },
          { x: W - x, y, r },
        ]
      : [{ x, y, r }];
    const ok = cands.every((c) =>
      placed.every((p) => Math.hypot(p.x - c.x, p.y - c.y) >= p.r + c.r + 30),
    );
    if (ok) {
      placed.push(...cands);
      return cands[0];
    }
  }
  return null;
}

function generate(n: number, rng: Rng, mechanisms: boolean): LevelDef {
  const b = new Builder();
  const base = 1 + Math.floor((n - 1) / 2);
  const brickHp = (hp: number) => Math.max(1, Math.min(12, hp));
  const hpAt = (r: number, rows: number) =>
    brickHp(base + Math.round((1 - r / rows) * 2) + rng.int(-1, 1));
  const boss = mechanisms && n % 10 === 0;
  let fieldBottom: number;

  if (boss) {
    // 首领层：顶部三排砖 + 两侧砖墙 + 中央核心与护卫
    for (let r = 0; r < 3; r++)
      for (let c = 0; c < COLS; c++)
        b.brick(cx(c), cy(r), hpAt(r, 3), {
          type: r === 1 && (c === 2 || c === 9) ? 'gold' : 'normal',
        });
    for (let r = 3; r < 10; r++)
      for (const c of [0, COLS - 1]) b.brick(cx(c), cy(r), brickHp(base - 1));
    b.core(300, 310, 40, 26 + n);
    for (const p of [0, 120, 240]) b.bar(0, 0, 42, 90, orbit(300, 310, 76, 50, p), 12);
    if (n >= 20)
      for (const p of [60, 180, 300]) b.circle(0, 0, 14, orbit(300, 310, 140, -30, p));
    fieldBottom = 470;
  } else {
    const rows = 5 + Math.min(7, Math.floor(n / 2));
    const offset = rng.int(0, 1);
    const mask = rng.pick(PATTERNS)(rng, rows);
    const bombP = n >= 2 ? Math.min(0.1, 0.02 + n * 0.008) : 0;
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < COLS / 2; c++) {
        if (!mask[r][c]) continue;
        const hp = hpAt(r, rows);
        const roll = rng.next();
        const type: BrickType = roll < bombP ? 'bomb' : 'normal';
        const h = type === 'bomb' ? 1 : hp;
        b.brick(cx(c), cy(r + offset), h, { type });
        b.brick(cx(COLS - 1 - c), cy(r + offset), h, { type });
      }
    }
    fieldBottom = cy(rows + offset) + 12;
  }

  if (mechanisms) {
    const top = fieldBottom + 36;
    const bottom = 600;
    const placed: Placed[] = [];
    if (boss) placed.push({ x: 300, y: 310, r: n >= 20 ? 156 : 92 });
    if (n >= 3 && bottom - top > 60) {
      const motif = rng.int(0, 4);
      const count = Math.min(3, 1 + Math.floor(n / 6));
      for (let i = 0; i < count; i++) {
        const size = rng.range(18, 30);
        const radius = motif === 4 ? size * 1.5 + 6 : size + 6;
        const p = spot(rng, placed, radius, top, bottom, true);
        if (!p) break;
        for (const x of [p.x, W - p.x]) {
          const mirror = x !== p.x;
          if (motif === 0) b.tri(x, p.y, size, rng.chance(0.5) ? 0 : 180);
          else if (motif === 1) b.circle(x, p.y, size * 0.8);
          else if (motif === 2) b.hex(x, p.y, size * 0.9);
          else if (motif === 3) b.diamond(x, p.y, size * 0.7, size);
          else b.bar(x, p.y, size * 3, mirror ? -25 : 25);
        }
      }
    }
    if (n >= 5 && rng.chance(0.6)) {
      const p = spot(rng, placed, 56, top, bottom, rng.chance(0.5));
      if (p) {
        const speed = rng.range(60, 110) * (rng.chance(0.5) ? 1 : -1);
        const xs = p.x === W / 2 ? [p.x] : [p.x, W - p.x];
        xs.forEach((x, i) => b.bar(x, p.y, 96, 0, spin(i ? -speed : speed)));
      }
    }
    if (n >= 6 && rng.chance(0.55)) {
      for (let i = 0; i < 2; i++) {
        const p = spot(rng, placed, 18, top, bottom, true);
        if (p) for (const x of [p.x, W - p.x]) b.bumper(x, p.y, 16);
      }
    }
    if (n >= 7 && rng.chance(0.45) && bottom - top > 50) {
      const y = rng.range(top + 10, Math.min(bottom, top + 120));
      if (placed.every((p) => Math.abs(p.y - y) > p.r + 30)) {
        b.rect(300, y, 96, 14, 0, slide(rng.range(120, 190), 0, rng.range(2.8, 4.5)));
        placed.push({ x: 300, y, r: 300 });
      }
    }
    if (n >= 8 && rng.chance(0.35)) {
      const a = spot(rng, placed, 24, top, bottom, true);
      if (a) b.portals(a.x, a.y, W - a.x, a.y);
    }
  }

  normalizeGold(b.bodies, () => rng.int(1, 5));

  return {
    id: `∞${n}`,
    name: `${rng.pick(WORDS_A)} ${rng.pick(WORDS_B)}`,
    chapter: 0,
    speed: 1 + Math.min(0.3, (n - 1) * 0.02),
    dark: mechanisms && n >= 6 && rng.chance(0.18),
    drop: 0.35,
    traps: n >= 3,
    bodies: b.bodies,
  };
}

export function endlessLevel(n: number, runSeed: number): LevelDef {
  for (let attempt = 0; attempt < 8; attempt++) {
    const lv = generate(n, createRng(runSeed * 7919 + n * 104729 + attempt * 31), true);
    if (levelIssues(lv).length === 0) return lv;
  }
  return generate(n, createRng(runSeed + n), false);
}
