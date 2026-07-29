import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  MAX_BALLS,
  MAX_BRICK_HP,
  PADDLE_MAX_WIDE_LEVEL,
  WIDE_DURATION_MS,
} from './constants';
import {
  applyPowerup,
  checkLevelClear,
  createGame,
  generateBricks,
  handleBrickCollisions,
  updateGame,
} from './game';
import type { Ball, Brick } from './types';

function makeGame() {
  return createGame({ highestUnlocked: 1, bestScore: 0, muted: true });
}

function makeBall(overrides: Partial<Ball> = {}): Ball {
  return {
    id: 1,
    centerX: 135,
    centerY: 95,
    radius: 7,
    velocityX: 0,
    velocityY: 180,
    piercingBrickIds: [],
    ...overrides,
  };
}

function makeBrick(overrides: Partial<Brick> = {}): Brick {
  return {
    id: 10,
    left: 100,
    top: 100,
    width: 70,
    height: 24,
    hp: 5,
    maxHp: 5,
    obstacle: false,
    obstacleShape: 'block',
    ...overrides,
  };
}

function stubStorage() {
  vi.stubGlobal('window', {
    localStorage: {
      getItem: vi.fn(),
      setItem: vi.fn(),
    },
  });
}

describe('level generation', () => {
  it('keeps each level on one brick grid and caps brick hp', () => {
    const game = makeGame();
    const obstacleShapes = new Set<string>();

    for (let level = 2; level <= 24; level += 1) {
      const bricks = generateBricks(game, level);
      const widths = new Set(bricks.map((brick) => Math.round(brick.width * 100) / 100));
      const heights = new Set(
        bricks.map((brick) => Math.round(brick.height * 100) / 100),
      );

      expect(widths.size).toBe(1);
      expect(heights.size).toBe(1);
      expect(
        bricks
          .filter((brick) => !brick.obstacle)
          .every((brick) => brick.hp >= 1 && brick.hp <= MAX_BRICK_HP),
      ).toBe(true);
      bricks
        .filter((brick) => brick.obstacle)
        .forEach((brick) => obstacleShapes.add(brick.obstacleShape));
    }

    expect(obstacleShapes.size).toBeGreaterThan(3);
  });
});

describe('powerups', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('applies multi-ball and burst to every current ball without exceeding the cap', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);
    const game = makeGame();
    game.balls = [
      makeBall({ id: 1, velocityX: 100 }),
      makeBall({ id: 2, velocityX: -100 }),
    ];

    applyPowerup(game, 'multi', 1000);
    expect(game.balls).toHaveLength(4);

    applyPowerup(game, 'burst', 1000);
    expect(game.balls).toHaveLength(24);

    game.balls = Array.from({ length: MAX_BALLS - 1 }, (_, index) =>
      makeBall({ id: index + 1 }),
    );
    applyPowerup(game, 'burst', 1000);
    expect(game.balls).toHaveLength(MAX_BALLS);
  });

  it('increments wide level up to level 5 and refreshes duration', () => {
    const game = makeGame();

    for (let count = 0; count < 8; count += 1) {
      applyPowerup(game, 'wide', 1000 + count * 100);
    }

    expect(game.wideLevel).toBe(PADDLE_MAX_WIDE_LEVEL);
    expect(game.wideUntil).toBe(1000 + 7 * 100 + WIDE_DURATION_MS);
  });

  it('pierce removes exactly 3 hits once while touching the same brick', () => {
    const game = makeGame();
    game.status = 'playing';
    game.pierceUntil = 10_000;
    game.balls = [makeBall()];
    game.bricks = [makeBrick()];

    handleBrickCollisions(game, game.balls[0], 1000);
    expect(game.bricks[0].hp).toBe(2);

    handleBrickCollisions(game, game.balls[0], 1000);
    expect(game.bricks[0].hp).toBe(2);
  });
});

describe('game state', () => {
  beforeEach(() => {
    stubStorage();
  });

  it('marks level clear when no breakable bricks remain', () => {
    const game = makeGame();
    game.status = 'playing';
    game.level = 3;
    game.score = 120;
    game.keyboardDirection = 1;
    game.bricks = [
      makeBrick({ obstacle: true, obstacleShape: 'circle', hp: 99, maxHp: 99 }),
    ];

    checkLevelClear(game, 1234);

    expect(game.status).toBe('levelClear');
    expect(game.keyboardDirection).toBe(0);
    expect(game.levelClearAt).toBe(1234);
    expect(game.highestUnlocked).toBe(4);
    expect(game.bestScore).toBe(120);
  });

  it('lets balls and drops leave the screen after level clear without losing lives', () => {
    const game = makeGame();
    game.status = 'levelClear';
    game.worldHeight = 620;
    game.lives = 3;
    game.balls = [
      makeBall({ id: 1, centerX: 450, centerY: 600, velocityX: 100, velocityY: 200 }),
      makeBall({ id: 2, centerX: 500, centerY: 640, velocityX: 80, velocityY: 200 }),
    ];
    game.powerups = [
      { id: 20, centerX: 120, centerY: 590, size: 12, velocityY: 120, type: 'slow' },
      { id: 21, centerX: 160, centerY: 635, size: 12, velocityY: 120, type: 'wide' },
    ];

    updateGame(game, 0.1, 1000);

    expect(game.status).toBe('levelClear');
    expect(game.lives).toBe(3);
    expect(game.balls).toHaveLength(1);
    expect(game.balls[0].centerX).toBeGreaterThan(450);
    expect(game.balls[0].velocityY).toBeGreaterThan(0);
    expect(game.powerups).toHaveLength(1);
    expect(game.powerups[0].id).toBe(20);
  });

  it('resets temporary powers and pending drops after losing a life', () => {
    const game = makeGame();
    game.status = 'playing';
    game.lives = 3;
    game.wideLevel = 3;
    game.wideUntil = 10_000;
    game.slowUntil = 10_000;
    game.pierceUntil = 10_000;
    game.powerups = [
      { id: 20, centerX: 100, centerY: 100, size: 12, velocityY: 120, type: 'slow' },
    ];
    game.balls = [makeBall({ centerY: game.worldHeight + 20, velocityY: 100 })];

    updateGame(game, 0.016, 1000);

    expect(game.status).toBe('lifeLost');
    expect(game.lives).toBe(2);
    expect(game.wideLevel).toBe(0);
    expect(game.wideUntil).toBe(0);
    expect(game.slowUntil).toBe(0);
    expect(game.pierceUntil).toBe(0);
    expect(game.powerups).toHaveLength(0);
    expect(game.balls).toHaveLength(1);
    expect(game.elapsedSeconds).toBe(0);
  });
});
