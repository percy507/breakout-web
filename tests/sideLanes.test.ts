import { describe, expect, it } from 'vitest';

import { CAMPAIGN } from '../src/campaign';
import { BALL_R, PADDLE_Y, SIDE_LANE_WIDTH, W } from '../src/config';
import { endlessLevel } from '../src/endless';
import { Game } from '../src/game';
import { shapeAABB } from '../src/geometry';
import type { LevelDef } from '../src/levels';
import { Builder, motionAt, slide, worldShape } from '../src/levels';
import { levelIssues } from '../src/validate';

const keys = { left: false, right: false };
const endless = [1, 5, 10, 30, 100].flatMap((depth) =>
  [1, 5, 42].map((seed) => endlessLevel(depth, seed)),
);

function expectClearLanes(level: LevelDef): void {
  for (const body of level.bodies) {
    const motion = body.motion;
    const period = !motion
      ? 0
      : motion.type === 'slide'
        ? motion.period
        : (Math.PI * 2) / Math.abs(motion.speed);
    for (let sample = 0; sample <= 48; sample++) {
      const t = motionAt(body, (period * sample) / 48);
      const bounds = shapeAABB(worldShape(body.shape, t.x, t.y, t.angle));
      expect(bounds.minX, `${level.id}: left lane`).toBeGreaterThanOrEqual(
        SIDE_LANE_WIDTH - 0.01,
      );
      expect(bounds.maxX, `${level.id}: right lane`).toBeLessThanOrEqual(
        W - SIDE_LANE_WIDTH + 0.01,
      );
    }
  }
}

function expectTopBypass(level: LevelDef, x: number): void {
  const game = new Game(level, { mode: 'campaign' });
  game.launch();
  const ball = game.balls[0];
  Object.assign(ball, { x, y: PADDLE_Y - 100, dx: 0, dy: -1 });
  game.drainEvents();
  for (let step = 0; step < 360 && ball.dy < 0; step++) {
    game.update(1 / 120, keys);
    const events = game.drainEvents();
    expect(
      events.some((event) =>
        ['brickHit', 'brickBreak', 'blocker', 'bumper', 'portal'].includes(event.type),
      ),
      `${level.id}: side lane collision`,
    ).toBe(false);
  }
  expect(ball.x, `${level.id}: horizontal drift`).toBeCloseTo(x);
  expect(ball.y, `${level.id}: reaches the top wall`).toBeLessThan(BALL_R * 2);
  expect(ball.dy).toBeGreaterThan(0);
  expect(game.lives).toBe(3);
}

describe('side lanes', () => {
  it('reserves more than one ball diameter on both sides for all level bodies', () => {
    expect(SIDE_LANE_WIDTH).toBeGreaterThan(BALL_R * 2);
    for (const level of [...CAMPAIGN, ...endless]) expectClearLanes(level);
  });

  it.each([SIDE_LANE_WIDTH / 2, W - SIDE_LANE_WIDTH / 2])(
    'lets a ball reach the top through the lane at x=%i',
    (x) => {
      for (const level of [...CAMPAIGN, ...endless]) expectTopBypass(level, x);
    },
  );

  it('rejects moving obstacles that enter a side lane during their cycle', () => {
    const builder = new Builder();
    builder.brick(300, 100, 1);
    builder.rect(100, 300, 20, 20, 0, slide(60, 0, 4));
    const level: LevelDef = {
      id: 'lane-test',
      name: 'LANE TEST',
      chapter: 1,
      speed: 1,
      dark: false,
      drop: 0,
      traps: false,
      bodies: builder.bodies,
    };
    expect(levelIssues(level)).toContain('blocker@(100,300) blocks side lane');
  });
});
