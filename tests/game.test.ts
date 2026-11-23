import { describe, expect, it } from 'vitest';

import {
  BALL_R,
  BALL_SPEED,
  H,
  MAX_BALLS,
  MAX_LIVES,
  MIN_AIM,
  MIN_VERTICAL,
  PADDLE_Y,
  POWER_ORDER,
  W,
} from '../src/config';
import type { GameEvent } from '../src/game';
import { Game } from '../src/game';
import type { LevelDef } from '../src/levels';
import { Builder } from '../src/levels';

const keys = { left: false, right: false };

function level(build: (b: Builder) => void): LevelDef {
  const b = new Builder();
  build(b);
  return {
    id: 't',
    name: 'TEST',
    chapter: 1,
    speed: 1,
    dark: false,
    drop: 0,
    traps: false,
    bodies: b.bodies,
  };
}

/** 以固定步长推进，直到条件满足或超时；返回期间产生的事件 */
function run(g: Game, seconds: number, until?: (e: GameEvent[]) => boolean): GameEvent[] {
  const all: GameEvent[] = [];
  for (let t = 0; t < seconds; t += 1 / 120) {
    g.update(1 / 120, keys);
    all.push(...g.drainEvents());
    if (until?.(all)) break;
  }
  return all;
}

const has = (type: GameEvent['type']) => (e: GameEvent[]) =>
  e.some((x) => x.type === type);

/** 让唯一的球从挡板够不到的位置垂直下落 */
function dropBall(g: Game) {
  g.paddle.x = g.paddle.targetX = 60;
  Object.assign(g.balls[0], { x: 540, y: 600, dx: 0, dy: 1, stuck: false });
}

describe('serve & aim', () => {
  it('starts in the aim phase with the ball resting on the paddle', () => {
    const g = new Game(
      level((b) => b.brick(300, 200, 1)),
      { mode: 'campaign' },
    );
    expect(g.phase).toBe('aim');
    expect(g.balls).toHaveLength(1);
    expect(g.balls[0].stuck).toBe(true);
    expect(g.balls[0].y).toBeLessThan(PADDLE_Y);
  });

  it('clamps the aim above the horizon', () => {
    const g = new Game(
      level((b) => b.brick(300, 200, 1)),
      { mode: 'campaign' },
    );
    g.aimAt(W, PADDLE_Y + 100);
    expect(g.aimAngle).toBeCloseTo(MIN_AIM);
    g.aimAt(0, PADDLE_Y + 100);
    expect(g.aimAngle).toBeCloseTo(Math.PI - MIN_AIM);
    g.aimAt(g.balls[0].x, 0);
    expect(g.aimAngle).toBeCloseTo(Math.PI / 2);
  });

  it('launches in the aimed direction', () => {
    const g = new Game(
      level((b) => b.brick(300, 100, 1)),
      { mode: 'campaign' },
    );
    g.aimAt(g.balls[0].x + 100, g.balls[0].y - 100);
    g.launch();
    expect(g.phase).toBe('play');
    expect(g.balls[0].dx).toBeCloseTo(Math.SQRT1_2);
    expect(g.balls[0].dy).toBeCloseTo(-Math.SQRT1_2);
  });

  it('predicts a guide path that stops at the first brick', () => {
    const g = new Game(
      level((b) => b.brick(300, 200, 1)),
      { mode: 'campaign' },
    );
    const { pts, ghost } = g.predictPath();
    expect(pts.length).toBeGreaterThan(1);
    expect(ghost!.y).toBeCloseTo(212 + BALL_R, 0);
  });
});

describe('bricks & level flow', () => {
  it('carries unlimited lives in endless mode while keeping campaign capped', () => {
    const endless = new Game(
      level((b) => b.brick(300, 100, 1)),
      {
        mode: 'endless',
        lives: MAX_LIVES,
      },
    );
    endless.applyPower('life');
    expect(endless.lives).toBe(MAX_LIVES + 1);

    const next = new Game(
      level((b) => b.brick(300, 100, 1)),
      {
        mode: 'endless',
        lives: endless.lives,
      },
    );
    expect(next.lives).toBe(endless.lives);

    const campaign = new Game(
      level((b) => b.brick(300, 100, 1)),
      {
        mode: 'campaign',
        lives: MAX_LIVES,
      },
    );
    campaign.applyPower('life');
    expect(campaign.lives).toBe(MAX_LIVES);
  });

  it('keeps unlimited lives while limiting their clear bonus contribution', () => {
    const g = new Game(
      level((b) => b.brick(300, 100, 1)),
      {
        mode: 'endless',
        lives: 100,
      },
    );
    g.damageBrick(g.bodies[0], 1);
    expect(g.lives).toBe(100);
    expect(g.clearBonus).toBe(10000);
  });

  it('damages a brick and bounces the ball back', () => {
    const g = new Game(
      level((b) => b.brick(300, 200, 3)),
      { mode: 'campaign' },
    );
    g.launch();
    run(g, 3, has('brickHit'));
    const brick = g.bodies[0];
    expect(brick.hp).toBe(2);
    expect(g.balls[0].dy).toBeGreaterThan(0);
  });

  it('clears the level when every breakable brick is gone, ignoring gray blockers', () => {
    const g = new Game(
      level((b) => {
        b.brick(300, 200, 1);
        b.rect(100, 300, 48, 24);
      }),
      { mode: 'campaign' },
    );
    g.launch();
    const ev = run(g, 3, has('clear'));
    expect(ev.some((e) => e.type === 'clear')).toBe(true);
    expect(g.phase).toBe('clear');
    expect(g.stars).toBe(3);
    expect(g.clearBonus).toBe(3000);
  });

  it('lets balls leave through the paddle after the level is cleared', () => {
    const g = new Game(
      level((b) => b.brick(300, 200, 1)),
      { mode: 'campaign' },
    );
    g.launch();
    run(g, 3, has('clear'));
    Object.assign(g.balls[0], { x: g.paddle.x, y: PADDLE_Y - 60, dx: 0, dy: 1 });
    const ev = run(g, 2);
    expect(g.balls).toHaveLength(0);
    expect(ev.some((e) => e.type === 'paddle' || e.type === 'lifeLost')).toBe(false);
  });

  it('keeps the clear animation and bumper collisions without awarding more points', () => {
    const g = new Game(
      level((b) => {
        b.brick(300, 200, 1);
        b.bumper(300, 400, 20);
      }),
      { mode: 'campaign' },
    );
    g.launch();
    g.damageBrick(g.bodies[0], 1);
    expect(g.phase).toBe('clear');
    expect(g.score).toBe(3060);
    Object.assign(g.balls[0], { x: 300, y: 450, dx: 0, dy: -1 });
    g.drainEvents();
    const ev = run(g, 0.3, has('bumper'));
    expect(ev.some((e) => e.type === 'bumper')).toBe(true);
    expect(g.balls[0].y).not.toBe(450);
    expect(g.score).toBe(3060);
    expect(g.lives).toBe(3);
    expect(g.livesLost).toBe(0);
  });

  it.each(['clear', 'lost'] as const)(
    'freezes rewards and life effects after %s',
    (phase) => {
      const g = new Game(
        level((b) => {
          b.brick(100, 100, 1, { type: 'bomb' });
          b.brick(148, 100, 5, { type: 'gold' });
        }),
        { mode: 'campaign' },
      );
      g.launch();
      g.damageBrick(g.bodies[0], 1);
      if (phase === 'clear') {
        g.damageBrick(g.bodies[1], 5);
      } else {
        g.lives = 1;
        dropBall(g);
        // 保留尚未触发的爆炸，模拟最后一条生命丢失时的延迟伤害
        Object.assign(g.balls[0], { y: H + BALL_R + 10 });
        run(g, 1 / 120);
      }
      expect(g.phase).toBe(phase);
      const { score, lives, livesLost, combo, maxCombo, bricksLeft, clearBonus } = g;
      const hp = g.bodies[1].hp;
      const effects = { ...g.effects };
      const balls = g.balls.length;
      g.drainEvents();
      for (const power of POWER_ORDER) g.applyPower(power);
      g.damageBrick(g.bodies[1], 100);
      expect(g.balls).toHaveLength(balls);
      expect(g.effects).toEqual(effects);
      // 结算时仍在飞行的激光和爆炸可以消退，但不能继续伤害或奖励
      g.lasers.push({ x: 148, y: 130, dead: false });
      const ev = run(g, 0.2);
      expect(ev.some((e) => e.type === 'explode')).toBe(true);
      expect(
        ev.some((e) =>
          [
            'power',
            'brickHit',
            'brickBreak',
            'combo',
            'lifeLost',
            'gameOver',
            'clear',
            'shield',
            'paddle',
          ].includes(e.type),
        ),
      ).toBe(false);
      expect(g.bodies[1].hp).toBe(hp);
      expect({
        score: g.score,
        lives: g.lives,
        livesLost: g.livesLost,
        combo: g.combo,
        maxCombo: g.maxCombo,
        bricksLeft: g.bricksLeft,
        clearBonus: g.clearBonus,
      }).toEqual({ score, lives, livesLost, combo, maxCombo, bricksLeft, clearBonus });
      expect(g.phase).toBe(phase);
    },
  );

  it('costs a life when the last ball falls and serves again', () => {
    const g = new Game(
      level((b) => b.brick(300, 100, 5)),
      { mode: 'campaign' },
    );
    g.launch();
    dropBall(g);
    const ev = run(g, 2, has('lifeLost'));
    expect(ev.some((e) => e.type === 'lifeLost')).toBe(true);
    expect(g.lives).toBe(2);
    expect(g.phase).toBe('aim');
    expect(g.balls).toHaveLength(1);
  });

  it('ends the game after three lost lives', () => {
    const g = new Game(
      level((b) => b.brick(300, 100, 5)),
      { mode: 'campaign' },
    );
    for (let i = 0; i < 3; i++) {
      g.launch();
      dropBall(g);
      run(g, 2, has('lifeLost'));
    }
    expect(g.lives).toBe(0);
    expect(g.phase).toBe('lost');
  });

  it('never loses lives in demo mode', () => {
    const g = new Game(
      level((b) => b.brick(300, 100, 5)),
      { mode: 'demo' },
    );
    g.launch();
    dropBall(g);
    run(g, 2, has('lifeLost'));
    expect(g.lives).toBe(3);
  });

  it('chains bomb explosions', () => {
    const g = new Game(
      level((b) => {
        b.brick(300, 200, 1, { type: 'bomb' });
        b.brick(348, 176, 1, { type: 'bomb' });
        b.brick(444, 176, 3);
        b.brick(100, 100, 9);
      }),
      { mode: 'campaign' },
    );
    g.launch();
    const ev = run(g, 3, (e) => e.filter((x) => x.type === 'explode').length >= 2);
    expect(ev.filter((e) => e.type === 'explode')).toHaveLength(2);
    run(g, 0.2);
    expect(g.bodies.slice(0, 3).every((b) => !b.alive)).toBe(true);
    expect(g.bodies[3].alive).toBe(true);
  });
});

describe('power-ups', () => {
  const make = () => {
    const g = new Game(
      level((b) => b.brick(300, 100, 9)),
      { mode: 'campaign' },
    );
    g.launch();
    return g;
  };

  it('multi doubles every existing ball and spread multiplies each by five', () => {
    const g = make();
    g.applyPower('multi');
    expect(g.balls).toHaveLength(2);
    g.applyPower('multi');
    expect(g.balls).toHaveLength(4);
    const spread = make();
    spread.applyPower('spread');
    expect(spread.balls).toHaveLength(5);
    spread.applyPower('spread');
    expect(spread.balls).toHaveLength(25);
  });

  it.each(['multi', 'spread'] as const)(
    '%s splits at every source position with symmetric unit directions and unchanged speed',
    (power) => {
      const g = make();
      g.applyPower('spread');
      g.applyPower('slow');
      g.applyPower('pierce');
      g.balls.forEach((b, i) => {
        const angle = -Math.PI / 2 + i * 0.1;
        Object.assign(b, {
          x: 100 + i * 80,
          y: 400 + i * 10,
          dx: Math.cos(angle),
          dy: Math.sin(angle),
          boost: 1.2 + i * 0.05,
          portalCd: 0.3,
          idle: 0.4,
        });
      });
      const sources = g.balls.map((b) => ({ ...b }));
      const effects = { ...g.effects };
      const factor = power === 'multi' ? 2 : 5;
      const halfAngle = power === 'multi' ? 0.2 : (32 * Math.PI) / 180;
      g.applyPower(power);
      expect(g.balls).toHaveLength(sources.length * factor);
      expect(new Set(g.balls.map((b) => b.id)).size).toBe(g.balls.length);
      expect(g.effects).toEqual(effects);
      for (const source of sources) {
        const children = g.balls.filter((b) => b.x === source.x && b.y === source.y);
        expect(children).toHaveLength(factor);
        const angles = children
          .map((b) =>
            Math.atan2(
              source.dx * b.dy - source.dy * b.dx,
              source.dx * b.dx + source.dy * b.dy,
            ),
          )
          .sort((a, b) => a - b);
        angles.forEach((angle, i) => {
          expect(angle).toBeCloseTo(halfAngle * ((2 * i) / (factor - 1) - 1));
        });
        for (const b of children) {
          expect(Math.hypot(b.dx, b.dy)).toBeCloseTo(1);
          expect(Math.abs(b.dy)).toBeGreaterThanOrEqual(MIN_VERTICAL);
          expect(b.boost).toBe(source.boost);
          expect(b.portalCd).toBe(source.portalCd);
          expect(b.idle).toBe(source.idle);
        }
        if (power === 'spread') {
          const original = children.find((b) => b.id === source.id)!;
          expect(original.dx).toBeCloseTo(source.dx);
          expect(original.dy).toBeCloseTo(source.dy);
        }
      }
      const before = g.balls.map((b) => ({ ...b }));
      const dt = 1 / 120;
      g.update(dt, keys);
      g.balls.forEach((b, i) => {
        const speed =
          BALL_SPEED *
          g.level.speed *
          (1 + g.time / 600) *
          (1 + (before[i].boost - 1) * Math.exp(-dt * 2.2)) *
          0.62;
        expect(Math.hypot(b.x - before[i].x, b.y - before[i].y)).toBeCloseTo(speed * dt);
      });
    },
  );

  it.each(['multi', 'spread'] as const)(
    '%s clamps near-horizontal fan branches to the minimum vertical component',
    (power) => {
      const halfAngle = power === 'multi' ? 0.2 : (32 * Math.PI) / 180;
      const angles = (
        power === 'multi' ? [halfAngle] : [halfAngle, halfAngle / 2]
      ).flatMap((angle) => [angle - 0.05, angle, angle + 0.05]);
      for (const angle of angles) {
        for (const sign of [-1, 1]) {
          for (const heading of [0, Math.PI]) {
            const g = make();
            const a = heading + sign * angle;
            Object.assign(g.balls[0], { dx: Math.cos(a), dy: Math.sin(a) });
            g.applyPower(power);
            expect(g.balls).toHaveLength(power === 'multi' ? 2 : 5);
            for (const b of g.balls) {
              expect(Math.hypot(b.dx, b.dy)).toBeCloseTo(1);
              expect(Math.abs(b.dy)).toBeGreaterThanOrEqual(MIN_VERTICAL);
            }
            expect(g.balls.some((b) => Math.abs(b.dy) === MIN_VERTICAL)).toBe(true);
          }
        }
      }
    },
  );

  it.each(['multi', 'spread'] as const)(
    '%s respects the cap and leaves unsplit source balls unchanged',
    (power) => {
      for (const initial of [25, 30, 31, MAX_BALLS]) {
        const g = make();
        g.applyPower('spread');
        g.applyPower('spread');
        if (initial > 25) g.applyPower('multi');
        g.balls.length = Math.min(g.balls.length, initial);
        while (g.balls.length < initial) {
          g.balls.push({ ...g.balls[0], id: 1000 + g.balls.length });
        }
        g.balls.forEach((b, i) => Object.assign(b, { x: 50 + i, y: 400, dx: 0, dy: -1 }));
        const sources = g.balls.map((b) => ({ ...b }));
        const expected = Math.min(MAX_BALLS, initial * (power === 'multi' ? 2 : 5));
        g.applyPower(power);
        expect(g.balls).toHaveLength(expected);
        expect(new Set(g.balls.map((b) => b.id)).size).toBe(expected);
        for (const source of sources) {
          const children = g.balls.filter((b) => b.x === source.x && b.y === source.y);
          expect(children.length).toBeLessThanOrEqual(power === 'multi' ? 2 : 5);
          if (children.length === 1) expect(children[0]).toEqual(source);
          else {
            const sum = children.reduce((v, b) => ({ x: v.x + b.dx, y: v.y + b.dy }), {
              x: 0,
              y: 0,
            });
            expect(Math.atan2(sum.y, sum.x)).toBeCloseTo(
              Math.atan2(source.dy, source.dx),
            );
          }
        }
        const next = Math.min(MAX_BALLS, expected * (power === 'multi' ? 2 : 5));
        g.applyPower(power);
        expect(g.balls).toHaveLength(next);
      }
    },
  );

  it.each(['multi', 'spread'] as const)(
    '%s keeps a magnet ball launchable and releases only its new children',
    (power) => {
      const g = make();
      g.applyPower('magnet');
      Object.assign(g.balls[0], { x: g.paddle.x, y: PADDLE_Y - 80, dx: 0, dy: 1 });
      run(g, 1, () => g.balls[0].stuck);
      const source = { ...g.balls[0] };
      const effects = { ...g.effects };
      g.applyPower(power);
      expect(g.balls).toHaveLength(power === 'multi' ? 2 : 5);
      expect(g.hasStuckBall()).toBe(true);
      expect(g.balls[0].stuckTime).toBe(source.stuckTime);
      expect(g.balls[0].stuckOffset).toBe(source.stuckOffset);
      expect(g.effects).toEqual(effects);
      for (const b of g.balls.slice(1)) {
        expect(b.stuck).toBe(false);
        expect(b.stuckTime).toBe(0);
        expect(b.x).toBe(source.x);
        expect(b.y).toBe(source.y);
        expect(b.dy).toBeLessThan(0);
        expect(Math.hypot(b.dx, b.dy)).toBeCloseTo(1);
      }
      run(g, 1 / 120);
      expect(g.balls.slice(1).every((b) => b.y < source.y)).toBe(true);
      g.launch();
      expect(g.balls.every((b) => !b.stuck)).toBe(true);
    },
  );

  it.each(['multi', 'spread'] as const)(
    '%s inherits portal cooldown instead of teleporting new balls back immediately',
    (power) => {
      const g = new Game(
        level((b) => {
          b.brick(100, 100, 9);
          b.portals(300, 500, 500, 200);
        }),
        { mode: 'campaign' },
      );
      g.launch();
      run(g, 1, has('portal'));
      expect(g.balls[0].portalCd).toBeGreaterThan(0);
      g.applyPower(power);
      g.drainEvents();
      const events = run(g, 1 / 120);
      expect(events.some((e) => e.type === 'portal')).toBe(false);
      expect(g.balls.every((b) => b.x > 450 && b.y < 250)).toBe(true);
    },
  );

  it.each(['multi', 'spread'] as const)(
    '%s preserves piercing through a shared brick contact without duplicate rewards',
    (power) => {
      const g = new Game(
        level((b) => {
          b.brick(300, 300, 9);
          b.brick(100, 100, 9);
        }),
        { mode: 'campaign' },
      );
      g.launch();
      g.applyPower('pierce');
      Object.assign(g.balls[0], { x: 300, y: 300, dx: 0, dy: -1 });
      g.applyPower(power);
      expect(g.bodies[0].alive).toBe(true);
      const directions = g.balls.map((b) => ({ dx: b.dx, dy: b.dy }));
      g.drainEvents();
      const events = run(g, 1 / 120);
      expect(g.bodies[0].alive).toBe(false);
      expect(events.filter((e) => e.type === 'brickBreak')).toHaveLength(1);
      expect(g.balls.map((b) => ({ dx: b.dx, dy: b.dy }))).toEqual(directions);
      expect(g.effects.pierce).toBeGreaterThan(0);
    },
  );

  it.each(['clear', 'lost'] as const)(
    'splitting has no side effects after %s',
    (phase) => {
      const g = make();
      g.applyPower('pierce');
      g.phase = phase;
      g.drainEvents();
      const balls = g.balls.map((b) => ({ ...b }));
      const effects = { ...g.effects };
      const score = g.score;
      g.applyPower('multi');
      g.applyPower('spread');
      expect(g.balls).toEqual(balls);
      expect(g.effects).toEqual(effects);
      expect(g.score).toBe(score);
      expect(g.phase).toBe(phase);
      expect(g.drainEvents()).toEqual([]);
    },
  );

  it('wide grows the paddle and shrink cancels it', () => {
    const g = make();
    const w0 = g.paddle.w;
    g.applyPower('wide');
    run(g, 0.6);
    expect(g.paddle.w).toBeGreaterThan(w0 * 1.4);
    g.applyPower('shrink');
    expect(g.effects.wide).toBe(0);
    run(g, 0.6);
    expect(g.paddle.w).toBeLessThan(w0 * 0.7);
  });

  it('pierce smashes through bricks without bouncing', () => {
    const g = new Game(
      level((b) => {
        b.brick(300, 300, 9);
        b.brick(300, 200, 9);
        b.brick(100, 100, 9);
      }),
      { mode: 'campaign' },
    );
    g.launch();
    g.applyPower('pierce');
    run(g, 2.5, (e) => e.filter((x) => x.type === 'brickBreak').length >= 2);
    expect(g.bodies[0].alive).toBe(false);
    expect(g.bodies[1].alive).toBe(false);
    expect(g.balls[0].dy).toBeLessThan(0);
  });

  it('shield bounces a falling ball', () => {
    const g = make();
    g.applyPower('shield');
    dropBall(g);
    const ev = run(g, 1.5, has('shield'));
    expect(ev.some((e) => e.type === 'shield')).toBe(true);
    expect(g.balls[0].dy).toBeLessThan(0);
    expect(g.lives).toBe(3);
  });

  it('magnet catches the ball and launch releases it', () => {
    const g = make();
    g.applyPower('magnet');
    Object.assign(g.balls[0], { x: g.paddle.x, y: PADDLE_Y - 80, dx: 0, dy: 1 });
    run(g, 1, () => g.balls[0].stuck);
    expect(g.hasStuckBall()).toBe(true);
    g.launch();
    expect(g.balls[0].stuck).toBe(false);
    expect(g.balls[0].dy).toBeLessThan(0);
  });

  it('lasers damage bricks above the paddle', () => {
    const g = new Game(
      level((b) => b.brick(300, 300, 5, { w: 200 })),
      { mode: 'campaign' },
    );
    g.launch();
    Object.assign(g.balls[0], { x: 40, y: 500, dx: 0, dy: -1 });
    g.applyPower('laser');
    run(g, 1);
    expect(g.bodies[0].hp).toBeLessThan(5);
  });
});

describe('mechanisms', () => {
  it('teleports through portals', () => {
    const g = new Game(
      level((b) => {
        b.brick(100, 100, 9);
        b.portals(300, 500, 500, 200);
      }),
      { mode: 'campaign' },
    );
    g.launch();
    const ev = run(g, 1, has('portal'));
    expect(ev.some((e) => e.type === 'portal')).toBe(true);
    expect(Math.abs(g.balls[0].x - 500)).toBeLessThan(30);
  });

  it('bumpers kick the ball faster', () => {
    const g = new Game(
      level((b) => {
        b.brick(100, 100, 9);
        b.bumper(300, 400, 20);
      }),
      { mode: 'campaign' },
    );
    g.launch();
    run(g, 1, has('bumper'));
    expect(g.score).toBe(25);
    expect(g.balls[0].boost).toBeGreaterThan(1.4);
    expect(g.balls[0].dy).toBeGreaterThan(0);
  });
});
