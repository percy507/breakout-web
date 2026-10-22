// 关卡校验：越界、两侧通道、重叠、传送门配对、可达性（每块砖都能被球碰到）
// 测试会对全部战役关卡和大量无尽关卡跑一遍；无尽生成器也用它剔除坏关卡。
import { BALL_R, H, PADDLE_Y, SIDE_LANE_WIDTH, W } from './config';
import type { Shape } from './geometry';
import { pointDistance, shapeAABB } from './geometry';
import type { BodyDef, LevelDef } from './levels';
import { motionAt, worldShape } from './levels';

const STEP = 4;
/** 所有物体都必须在这条线以上，给挡板区留出空间 */
export const PLAY_BOTTOM = 660;

function sampleTimes(def: BodyDef): number[] {
  const m = def.motion;
  if (!m) return [0];
  const period = m.type === 'slide' ? m.period : (Math.PI * 2) / Math.abs(m.speed);
  return Array.from({ length: 49 }, (_, k) => (k / 48) * period);
}

function polyPolyOverlap(a: Shape, b: Shape): boolean {
  if (a.kind !== 'poly' || b.kind !== 'poly') return false;
  for (const n of [...a.normals, ...b.normals]) {
    let aMin = Infinity;
    let aMax = -Infinity;
    let bMin = Infinity;
    let bMax = -Infinity;
    for (const p of a.pts) {
      const d = p.x * n.x + p.y * n.y;
      aMin = Math.min(aMin, d);
      aMax = Math.max(aMax, d);
    }
    for (const p of b.pts) {
      const d = p.x * n.x + p.y * n.y;
      bMin = Math.min(bMin, d);
      bMax = Math.max(bMax, d);
    }
    // 允许贴边（0.5px 容差）
    if (aMax - bMin <= 0.5 || bMax - aMin <= 0.5) return false;
  }
  return true;
}

export function shapesOverlap(a: Shape, b: Shape): boolean {
  if (a.kind === 'poly' && b.kind === 'poly') return polyPolyOverlap(a, b);
  const [round, other] = a.kind !== 'poly' ? [a, b] : [b, a];
  if (round.kind === 'circle')
    return pointDistance(round.x, round.y, other) < round.r - 0.5;
  if (round.kind === 'capsule') {
    for (let k = 0; k <= 16; k++) {
      const u = k / 16;
      const x = round.ax + (round.bx - round.ax) * u;
      const y = round.ay + (round.by - round.ay) * u;
      if (pointDistance(x, y, other) < round.r - 0.5) return true;
    }
  }
  return false;
}

function shapeAt(def: BodyDef, t: number): Shape {
  const tr = motionAt(def, t);
  return worldShape(def.shape, tr.x, tr.y, tr.angle);
}

/** 返回无法被球碰到的砖块（移动的拦截物不计入封堵，因为它们不会永久封死通道） */
export function unreachableBricks(level: LevelDef): BodyDef[] {
  const cols = Math.ceil(W / STEP);
  const rows = Math.ceil(H / STEP);
  const clearance = BALL_R + 0.5;
  const solids = level.bodies
    .filter((d) => (d.kind === 'blocker' || d.kind === 'bumper') && !d.motion)
    .map((d) => {
      const s = shapeAt(d, 0);
      return { s, bb: shapeAABB(s) };
    });
  const free = new Uint8Array(cols * rows);
  for (let j = 0; j < rows; j++) {
    const y = (j + 0.5) * STEP;
    for (let i = 0; i < cols; i++) {
      const x = (i + 0.5) * STEP;
      if (x < BALL_R || x > W - BALL_R || y < BALL_R) continue;
      let ok = true;
      for (const o of solids) {
        if (x < o.bb.minX - clearance || x > o.bb.maxX + clearance) continue;
        if (y < o.bb.minY - clearance || y > o.bb.maxY + clearance) continue;
        if (pointDistance(x, y, o.s) < clearance) {
          ok = false;
          break;
        }
      }
      if (ok) free[j * cols + i] = 1;
    }
  }
  const reach = new Uint8Array(cols * rows);
  const start = Math.floor((PADDLE_Y - 40) / STEP) * cols + Math.floor(W / 2 / STEP);
  const queue: number[] = [start];
  reach[start] = 1;
  while (queue.length) {
    const k = queue.pop()!;
    const i = k % cols;
    const j = (k - i) / cols;
    const next = [
      i > 0 ? k - 1 : -1,
      i < cols - 1 ? k + 1 : -1,
      j > 0 ? k - cols : -1,
      j < rows - 1 ? k + cols : -1,
    ];
    for (const n of next) {
      if (n >= 0 && free[n] && !reach[n]) {
        reach[n] = 1;
        queue.push(n);
      }
    }
  }
  return level.bodies.filter((def) => {
    if (def.kind !== 'brick') return false;
    const s = shapeAt(def, 0);
    const bb = shapeAABB(s);
    const m = BALL_R + 3;
    const i0 = Math.max(0, Math.floor((bb.minX - m) / STEP));
    const i1 = Math.min(cols - 1, Math.ceil((bb.maxX + m) / STEP));
    const j0 = Math.max(0, Math.floor((bb.minY - m) / STEP));
    const j1 = Math.min(rows - 1, Math.ceil((bb.maxY + m) / STEP));
    for (let j = j0; j <= j1; j++) {
      for (let i = i0; i <= i1; i++) {
        if (
          reach[j * cols + i] &&
          pointDistance((i + 0.5) * STEP, (j + 0.5) * STEP, s) <= BALL_R + 2
        )
          return false;
      }
    }
    return true;
  });
}

export function levelIssues(level: LevelDef): string[] {
  const issues: string[] = [];
  const label = (d: BodyDef) => `${d.kind}@(${Math.round(d.x)},${Math.round(d.y)})`;
  if (!level.bodies.some((d) => d.kind === 'brick')) issues.push('no breakable bricks');

  for (const def of level.bodies) {
    if (def.kind === 'brick' && def.brick !== 'core' && (def.hp < 1 || def.hp > 12))
      issues.push(`${label(def)} hp ${def.hp}`);
    for (const t of sampleTimes(def)) {
      const bb = shapeAABB(shapeAt(def, t));
      if (bb.minX < -0.01 || bb.maxX > W + 0.01 || bb.minY < 0 || bb.maxY > PLAY_BOTTOM) {
        issues.push(`${label(def)} out of bounds`);
        break;
      }
      if (bb.minX < SIDE_LANE_WIDTH - 0.01 || bb.maxX > W - SIDE_LANE_WIDTH + 0.01) {
        issues.push(`${label(def)} blocks side lane`);
        break;
      }
    }
  }

  // 静态物体两两不重叠；移动物体在整个周期内不与静态物体重叠
  // 灰块之间可以重叠（组合外形），只要有砖块或传送门参与就不允许
  const matters = (a: BodyDef, b: BodyDef) =>
    [a, b].some((d) => d.kind === 'brick' || d.kind === 'portal');
  const statics = level.bodies
    .filter((d) => !d.motion)
    .map((d) => ({ d, s: shapeAt(d, 0) }));
  for (let i = 0; i < statics.length; i++) {
    for (let j = i + 1; j < statics.length; j++) {
      const a = statics[i];
      const b = statics[j];
      if (matters(a.d, b.d) && shapesOverlap(a.s, b.s))
        issues.push(`${label(a.d)} overlaps ${label(b.d)}`);
    }
  }
  for (const def of level.bodies.filter((d) => d.motion)) {
    for (const t of sampleTimes(def)) {
      const s = shapeAt(def, t);
      const hit = statics.find((o) => matters(def, o.d) && shapesOverlap(s, o.s));
      if (hit) {
        issues.push(`moving ${label(def)} hits ${label(hit.d)}`);
        break;
      }
    }
  }

  const pairs = new Map<number, number>();
  for (const d of level.bodies)
    if (d.kind === 'portal') pairs.set(d.pair, (pairs.get(d.pair) ?? 0) + 1);
  for (const [p, n] of pairs) if (n !== 2) issues.push(`portal pair ${p} has ${n} ends`);

  const lost = unreachableBricks(level);
  if (lost.length) issues.push(`unreachable: ${lost.map(label).join(', ')}`);
  return issues;
}
