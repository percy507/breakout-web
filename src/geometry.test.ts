import { describe, expect, it } from 'vitest';

import {
  circleIntersectsBrick,
  reflectBallFromBrick,
  reflectBallFromRect,
} from './geometry';
import type { Ball, Brick, ObstacleShape } from './types';

function makeObstacle(shape: ObstacleShape): Brick {
  return {
    id: 1,
    left: 100,
    top: 100,
    width: 70,
    height: 24,
    hp: 99,
    maxHp: 99,
    obstacle: true,
    obstacleShape: shape,
  };
}

function makeBall(overrides: Partial<Ball>): Ball {
  return {
    id: 1,
    centerX: 135,
    centerY: 95,
    radius: 7,
    velocityX: 40,
    velocityY: 180,
    piercingBrickIds: [],
    ...overrides,
  };
}

describe('obstacle geometry', () => {
  it('reflects a rising ball from the bottom face when it enters a brick seam', () => {
    const ball = makeBall({
      centerX: 174,
      centerY: 76,
      velocityX: 0,
      velocityY: -760,
    });

    reflectBallFromRect(ball, {
      left: 178,
      top: 48,
      width: 70,
      height: 24,
    });

    expect(ball.velocityX).toBe(0);
    expect(ball.velocityY).toBeGreaterThan(0);
    expect(ball.centerY).toBeGreaterThan(72);
  });

  it('detects hits against non-rect obstacle outlines', () => {
    expect(
      circleIntersectsBrick(
        makeBall({ centerX: 135, centerY: 112 }),
        makeObstacle('circle'),
      ),
    ).toBe(true);
    expect(
      circleIntersectsBrick(
        makeBall({ centerX: 100, centerY: 112 }),
        makeObstacle('diamond'),
      ),
    ).toBe(true);
    expect(
      circleIntersectsBrick(
        makeBall({ centerX: 80, centerY: 112 }),
        makeObstacle('diamond'),
      ),
    ).toBe(false);
  });

  it('reflects slope and wedge obstacles with different trajectories', () => {
    const slopeBall = makeBall({
      centerX: 116,
      centerY: 112,
      velocityX: 160,
      velocityY: 0,
    });
    reflectBallFromBrick(slopeBall, makeObstacle('slopeLeft'));
    expect(slopeBall.velocityX).toBeLessThan(0);
    expect(slopeBall.velocityY).toBeLessThan(0);

    const wedgeBall = makeBall({
      centerX: 112,
      centerY: 120,
      velocityX: 120,
      velocityY: -80,
    });
    reflectBallFromBrick(wedgeBall, makeObstacle('wedgeLeft'));
    expect(wedgeBall.velocityX).toBeLessThan(0);
    expect(wedgeBall.velocityY).toBeGreaterThan(0);
  });
});
