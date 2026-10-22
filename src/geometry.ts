// 几何与碰撞：所有碰撞都用「圆沿射线扫掠」做连续检测（CCD），高速小球不会穿透。
// 约定：方向向量 (dx, dy) 必须是单位向量；返回的 t 是沿方向移动的距离。

export interface Vec {
  x: number;
  y: number;
}

export interface AABB {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** 凸多边形（世界坐标），normals[i] 是边 pts[i] → pts[i+1] 的外法线 */
export interface PolyShape {
  kind: 'poly';
  pts: Vec[];
  normals: Vec[];
}
export interface CircleShape {
  kind: 'circle';
  x: number;
  y: number;
  r: number;
}
/** 胶囊体：线段 a-b 外扩半径 r（挡板、旋转杆） */
export interface CapsuleShape {
  kind: 'capsule';
  ax: number;
  ay: number;
  bx: number;
  by: number;
  r: number;
}
export type Shape = PolyShape | CircleShape | CapsuleShape;

export interface Hit {
  t: number;
  nx: number;
  ny: number;
}

export interface Overlap {
  depth: number;
  nx: number;
  ny: number;
}

/** 允许的最大「已嵌入」深度：在此深度内仍视为 t=0 的接触，避免浮点误差导致穿透 */
const TOL = 0.75;

export function polyNormals(pts: Vec[]): Vec[] {
  const n = pts.length;
  let cx = 0;
  let cy = 0;
  for (const p of pts) {
    cx += p.x;
    cy += p.y;
  }
  cx /= n;
  cy /= n;
  return pts.map((a, i) => {
    const b = pts[(i + 1) % n];
    let nx = b.y - a.y;
    let ny = a.x - b.x;
    const len = Math.hypot(nx, ny) || 1;
    nx /= len;
    ny /= len;
    // 凸多边形：外法线应背离质心
    if (nx * ((a.x + b.x) / 2 - cx) + ny * ((a.y + b.y) / 2 - cy) < 0) {
      nx = -nx;
      ny = -ny;
    }
    return { x: nx, y: ny };
  });
}

export function makePoly(pts: Vec[]): PolyShape {
  return { kind: 'poly', pts, normals: polyNormals(pts) };
}

/** 以原点为中心的矩形顶点 */
export function rectPts(w: number, h: number): Vec[] {
  const hw = w / 2;
  const hh = h / 2;
  return [
    { x: -hw, y: -hh },
    { x: hw, y: -hh },
    { x: hw, y: hh },
    { x: -hw, y: hh },
  ];
}

/** 正多边形顶点，rot=0 时第一个顶点朝正上方 */
export function regularPts(r: number, n: number, rot = 0): Vec[] {
  const pts: Vec[] = [];
  for (let i = 0; i < n; i++) {
    const a = rot - Math.PI / 2 + (i * Math.PI * 2) / n;
    pts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r });
  }
  return pts;
}

export function transformPts(local: Vec[], x: number, y: number, angle: number): Vec[] {
  const c = Math.cos(angle);
  const s = Math.sin(angle);
  return local.map((p) => ({ x: x + p.x * c - p.y * s, y: y + p.x * s + p.y * c }));
}

export function shapeAABB(s: Shape): AABB {
  switch (s.kind) {
    case 'circle':
      return { minX: s.x - s.r, minY: s.y - s.r, maxX: s.x + s.r, maxY: s.y + s.r };
    case 'capsule':
      return {
        minX: Math.min(s.ax, s.bx) - s.r,
        minY: Math.min(s.ay, s.by) - s.r,
        maxX: Math.max(s.ax, s.bx) + s.r,
        maxY: Math.max(s.ay, s.by) + s.r,
      };
    case 'poly': {
      let minX = Infinity;
      let minY = Infinity;
      let maxX = -Infinity;
      let maxY = -Infinity;
      for (const p of s.pts) {
        if (p.x < minX) minX = p.x;
        if (p.y < minY) minY = p.y;
        if (p.x > maxX) maxX = p.x;
        if (p.y > maxY) maxY = p.y;
      }
      return { minX, minY, maxX, maxY };
    }
  }
}

export function aabbOverlap(a: AABB, b: AABB): boolean {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minY <= b.maxY && a.maxY >= b.minY;
}

/** 射线与圆（半径 R）的首次接触距离；起点已在圆内且向内运动（浅嵌入）时返回 0 */
export function rayCircle(
  px: number,
  py: number,
  dx: number,
  dy: number,
  cx: number,
  cy: number,
  R: number,
): number | null {
  const mx = px - cx;
  const my = py - cy;
  const b = mx * dx + my * dy;
  const c = mx * mx + my * my - R * R;
  if (c <= 0) {
    if (b < 0 && Math.sqrt(mx * mx + my * my) > R - TOL) return 0;
    return null;
  }
  if (b >= 0) return null;
  const disc = b * b - c;
  if (disc < 0) return null;
  return -b - Math.sqrt(disc);
}

/** 圆心沿射线运动，撞上「线段 a-b 沿法线 n 外扩 R」这条边的距离；没撞上返回 -1 */
function faceHit(
  px: number,
  py: number,
  dx: number,
  dy: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
  nx: number,
  ny: number,
  R: number,
  maxT: number,
): number {
  const denom = dx * nx + dy * ny;
  if (denom > -1e-9) return -1;
  const s = (px - ax) * nx + (py - ay) * ny;
  if (s < R - TOL) return -1;
  let t = (s - R) / -denom;
  if (t < 0) t = 0;
  if (t > maxT) return -1;
  const hx = px + dx * t;
  const hy = py + dy * t;
  const ex = bx - ax;
  const ey = by - ay;
  const u = ((hx - ax) * ex + (hy - ay) * ey) / (ex * ex + ey * ey);
  if (u < 0 || u > 1) return -1;
  return t;
}

/**
 * 半径 r 的圆从 (px,py) 沿单位方向 (dx,dy) 移动最多 maxT，求与形状的首次接触。
 * 原理：把形状按 r 做 Minkowski 外扩（边平移 + 顶点变圆角），再做射线求交。
 */
export function sweepCircle(
  px: number,
  py: number,
  dx: number,
  dy: number,
  maxT: number,
  r: number,
  s: Shape,
): Hit | null {
  if (s.kind === 'circle') {
    const t = rayCircle(px, py, dx, dy, s.x, s.y, s.r + r);
    if (t === null || t > maxT) return null;
    return normalHit(t, px + dx * t - s.x, py + dy * t - s.y);
  }
  let best: Hit | null = null;
  let bestT = maxT;
  if (s.kind === 'capsule') {
    const R = r + s.r;
    const ex = s.bx - s.ax;
    const ey = s.by - s.ay;
    const len = Math.hypot(ex, ey) || 1;
    const nx = -ey / len;
    const ny = ex / len;
    for (let sgn = 1; sgn >= -1; sgn -= 2) {
      const t = faceHit(
        px,
        py,
        dx,
        dy,
        s.ax,
        s.ay,
        s.bx,
        s.by,
        nx * sgn,
        ny * sgn,
        R,
        bestT,
      );
      if (t >= 0) {
        bestT = t;
        best = { t, nx: nx * sgn, ny: ny * sgn };
      }
    }
    for (let k = 0; k < 2; k++) {
      const vx = k === 0 ? s.ax : s.bx;
      const vy = k === 0 ? s.ay : s.by;
      const t = rayCircle(px, py, dx, dy, vx, vy, R);
      if (t !== null && t < bestT) {
        bestT = t;
        best = normalHit(t, px + dx * t - vx, py + dy * t - vy);
      }
    }
    return best;
  }
  const { pts, normals } = s;
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const nm = normals[i];
    const t = faceHit(px, py, dx, dy, a.x, a.y, b.x, b.y, nm.x, nm.y, r, bestT);
    if (t >= 0) {
      bestT = t;
      best = { t, nx: nm.x, ny: nm.y };
    }
  }
  if (r > 0) {
    // 顶点圆角：严格小于，平局时优先使用平面法线，避免相邻砖块接缝处的异常反弹
    for (const v of pts) {
      const t = rayCircle(px, py, dx, dy, v.x, v.y, r);
      if (t !== null && t < bestT) {
        bestT = t;
        best = normalHit(t, px + dx * t - v.x, py + dy * t - v.y);
      }
    }
  }
  return best;
}

function normalHit(t: number, ox: number, oy: number): Hit {
  const l = Math.hypot(ox, oy) || 1;
  return { t, nx: ox / l, ny: oy / l };
}

export function closestOnSegment(
  px: number,
  py: number,
  ax: number,
  ay: number,
  bx: number,
  by: number,
): Vec {
  const ex = bx - ax;
  const ey = by - ay;
  const l2 = ex * ex + ey * ey;
  let u = l2 > 0 ? ((px - ax) * ex + (py - ay) * ey) / l2 : 0;
  u = u < 0 ? 0 : u > 1 ? 1 : u;
  return { x: ax + ex * u, y: ay + ey * u };
}

/** 圆与形状的重叠；法线从形状指向圆心，用于把被移动障碍挤进去的球推出来 */
export function circleOverlap(
  cx: number,
  cy: number,
  r: number,
  s: Shape,
): Overlap | null {
  if (s.kind === 'circle' || s.kind === 'capsule') {
    let qx: number;
    let qy: number;
    if (s.kind === 'circle') {
      qx = s.x;
      qy = s.y;
    } else {
      const q = closestOnSegment(cx, cy, s.ax, s.ay, s.bx, s.by);
      qx = q.x;
      qy = q.y;
    }
    const R = s.r + r;
    const ox = cx - qx;
    const oy = cy - qy;
    const d = Math.hypot(ox, oy);
    if (d >= R) return null;
    if (d < 1e-9) return { depth: R, nx: 0, ny: -1 };
    return { depth: R - d, nx: ox / d, ny: oy / d };
  }
  const { pts, normals } = s;
  const n = pts.length;
  let maxS = -Infinity;
  let mi = 0;
  for (let i = 0; i < n; i++) {
    const sd = (cx - pts[i].x) * normals[i].x + (cy - pts[i].y) * normals[i].y;
    if (sd > maxS) {
      maxS = sd;
      mi = i;
    }
  }
  if (maxS >= r) return null;
  if (maxS <= 0) return { depth: r - maxS, nx: normals[mi].x, ny: normals[mi].y };
  let bestD2 = Infinity;
  let qx = 0;
  let qy = 0;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const q = closestOnSegment(cx, cy, a.x, a.y, b.x, b.y);
    const d2 = (cx - q.x) ** 2 + (cy - q.y) ** 2;
    if (d2 < bestD2) {
      bestD2 = d2;
      qx = q.x;
      qy = q.y;
    }
  }
  const d = Math.sqrt(bestD2);
  if (d >= r || d < 1e-9) return null;
  return { depth: r - d, nx: (cx - qx) / d, ny: (cy - qy) / d };
}

/** 点到形状的距离，点在形状内返回 0 */
export function pointDistance(x: number, y: number, s: Shape): number {
  if (s.kind === 'circle') return Math.max(0, Math.hypot(x - s.x, y - s.y) - s.r);
  if (s.kind === 'capsule') {
    const q = closestOnSegment(x, y, s.ax, s.ay, s.bx, s.by);
    return Math.max(0, Math.hypot(x - q.x, y - q.y) - s.r);
  }
  const { pts, normals } = s;
  const n = pts.length;
  let inside = true;
  for (let i = 0; i < n; i++) {
    if ((x - pts[i].x) * normals[i].x + (y - pts[i].y) * normals[i].y > 0) {
      inside = false;
      break;
    }
  }
  if (inside) return 0;
  let best = Infinity;
  for (let i = 0; i < n; i++) {
    const a = pts[i];
    const b = pts[(i + 1) % n];
    const q = closestOnSegment(x, y, a.x, a.y, b.x, b.y);
    best = Math.min(best, Math.hypot(x - q.x, y - q.y));
  }
  return best;
}

/** 以法线 n 反射单位方向 d（仅当 d 朝向表面时） */
export function reflect(dx: number, dy: number, nx: number, ny: number): Vec {
  const dot = dx * nx + dy * ny;
  if (dot >= 0) return { x: dx, y: dy };
  return { x: dx - 2 * dot * nx, y: dy - 2 * dot * ny };
}

export function clamp(v: number, lo: number, hi: number): number {
  return v < lo ? lo : v > hi ? hi : v;
}
