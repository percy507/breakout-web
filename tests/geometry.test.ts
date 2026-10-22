import { describe, expect, it } from 'vitest';

import type { Shape } from '../src/geometry';
import {
  circleOverlap,
  makePoly,
  pointDistance,
  rectPts,
  reflect,
  sweepCircle,
  transformPts,
} from '../src/geometry';

const box = (x: number, y: number, w: number, h: number, angle = 0) =>
  makePoly(transformPts(rectPts(w, h), x, y, angle));

describe('sweepCircle', () => {
  const b = box(100, 100, 40, 20); // x 80..120, y 90..110

  it('hits the bottom face when moving up', () => {
    const h = sweepCircle(100, 200, 0, -1, 500, 8, b)!;
    expect(h.t).toBeCloseTo(200 - 110 - 8, 6);
    expect(h.nx).toBeCloseTo(0);
    expect(h.ny).toBeCloseTo(1);
  });

  it('returns null when the contact is beyond maxT', () => {
    expect(sweepCircle(100, 200, 0, -1, 50, 8, b)).toBeNull();
  });

  it('ignores surfaces the ball is moving away from', () => {
    expect(sweepCircle(100, 200, 0, 1, 500, 8, b)).toBeNull();
  });

  it('uses a rounded normal when clipping a corner', () => {
    const h = sweepCircle(125, 200, 0, -1, 500, 8, b)!;
    expect(h.nx).toBeCloseTo(5 / 8, 5);
    expect(h.ny).toBeGreaterThan(0.7);
  });

  it('prefers the flat face at the seam between touching boxes', () => {
    const right = box(140, 100, 40, 20); // 共用 x=120 的边
    const hits = [b, right]
      .map((s) => sweepCircle(120, 200, 0, -1, 500, 8, s))
      .filter(Boolean);
    for (const h of hits) expect(h!.ny).toBeCloseTo(1);
  });

  it('handles rotated polygons', () => {
    const d = box(0, 0, 20, 20, Math.PI / 4); // 菱形，底部顶点在 (0, 14.14)
    const h = sweepCircle(0, 100, 0, -1, 500, 8, d)!;
    expect(h.t).toBeCloseTo(100 - Math.SQRT2 * 10 - 8, 4);
  });

  it('hits circles and capsules', () => {
    const c: Shape = { kind: 'circle', x: 0, y: 0, r: 10 };
    expect(sweepCircle(-100, 0, 1, 0, 500, 8, c)!.t).toBeCloseTo(82, 6);
    const cap: Shape = { kind: 'capsule', ax: -50, ay: 0, bx: 50, by: 0, r: 7 };
    const top = sweepCircle(0, -100, 0, 1, 500, 8, cap)!;
    expect(top.t).toBeCloseTo(85, 6);
    expect(top.ny).toBeCloseTo(-1);
    const end = sweepCircle(100, 0, -1, 0, 500, 8, cap)!;
    expect(end.t).toBeCloseTo(35, 6);
    expect(end.nx).toBeCloseTo(1);
  });

  it('treats a shallow touch as an immediate contact', () => {
    const h = sweepCircle(100, 117.8, 0, -1, 500, 8, b)!;
    expect(h.t).toBe(0);
  });

  it('works as a point ray when r = 0', () => {
    expect(sweepCircle(100, 200, 0, -1, 500, 0, b)!.t).toBeCloseTo(90, 6);
  });
});

describe('circleOverlap & pointDistance', () => {
  const b = box(100, 100, 40, 20);

  it('pushes a circle out of the nearest face', () => {
    const o = circleOverlap(100, 115, 8, b)!;
    expect(o.ny).toBeCloseTo(1);
    expect(o.depth).toBeCloseTo(3, 6);
  });

  it('resolves a centre inside the polygon', () => {
    const o = circleOverlap(100, 105, 8, b)!;
    expect(o.ny).toBeCloseTo(1);
    expect(o.depth).toBeCloseTo(13, 6);
  });

  it('returns null when separated', () => {
    expect(circleOverlap(100, 130, 8, b)).toBeNull();
  });

  it('measures distances', () => {
    expect(pointDistance(100, 100, b)).toBe(0);
    expect(pointDistance(100, 130, b)).toBeCloseTo(20);
    expect(pointDistance(123, 114, b)).toBeCloseTo(5);
  });

  it('reflects only when moving into the surface', () => {
    expect(reflect(0.6, 0.8, 0, -1)).toEqual({ x: 0.6, y: -0.8 });
    expect(reflect(0.6, -0.8, 0, -1)).toEqual({ x: 0.6, y: -0.8 });
  });
});
