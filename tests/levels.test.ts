import { describe, expect, it } from 'vitest';

import { CAMPAIGN, CHAPTER_COUNT, LEVELS_PER_CHAPTER } from '../src/campaign';
import { endlessLevel } from '../src/endless';
import { levelIssues } from '../src/validate';

describe('campaign levels', () => {
  it('has the expected size', () => {
    expect(CAMPAIGN).toHaveLength(CHAPTER_COUNT * LEVELS_PER_CHAPTER);
  });

  it.each(CAMPAIGN.map((l) => [l.id, l.name, l] as const))(
    '%s %s is valid and fully reachable',
    (_id, _name, level) => {
      expect(levelIssues(level)).toEqual([]);
      const gold = level.bodies.filter(
        (body) => body.kind === 'brick' && body.brick === 'gold',
      );
      expect(gold).toHaveLength(6);
      expect(gold.every((body) => body.hp >= 1 && body.hp <= 5)).toBe(true);
    },
  );
});

describe('endless generator', () => {
  it('is deterministic for a run seed', () => {
    expect(endlessLevel(7, 42)).toEqual(endlessLevel(7, 42));
  });

  it('produces valid levels across many depths and seeds', () => {
    for (const seed of [1, 2, 3]) {
      for (let n = 1; n <= 30; n++) {
        const lv = endlessLevel(n, seed);
        expect(levelIssues(lv), `seed ${seed} level ${n}`).toEqual([]);
        const gold = lv.bodies.filter(
          (body) => body.kind === 'brick' && body.brick === 'gold',
        );
        expect(gold, `seed ${seed} level ${n} gold count`).toHaveLength(6);
        expect(gold.every((body) => body.hp >= 1 && body.hp <= 5)).toBe(true);
      }
    }
  });

  it.each([30, 40, 50, 100])('preserves the boss and mechanisms at depth %i', (n) => {
    for (const seed of [1, 2, 3, 5, 42]) {
      const lv = endlessLevel(n, seed);
      expect(levelIssues(lv), `seed ${seed} level ${n}`).toEqual([]);
      const core = lv.bodies.filter((b) => b.kind === 'brick' && b.brick === 'core');
      expect(core).toHaveLength(1);
      expect(core[0].hp).toBe(26 + n);
      expect(lv.bodies.filter((b) => b.motion?.type === 'orbit')).toHaveLength(6);
      expect(
        lv.bodies
          .filter((b) => b.kind === 'brick' && b.brick !== 'core')
          .every((b) => b.hp >= 1 && b.hp <= 12),
      ).toBe(true);
    }
  });

  it('adds mechanisms as depth grows', () => {
    const deep = Array.from({ length: 10 }, (_, i) => endlessLevel(12 + i, 5));
    expect(deep.some((l) => l.bodies.some((b) => b.kind !== 'brick'))).toBe(true);
    expect(endlessLevel(10, 5).bodies.some((b) => b.brick === 'core')).toBe(true);
  });
});
