import type { GameState } from './types';

/** 将数值限制在指定区间内 */
export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

/** 根据关卡号生成稳定伪随机数，保证同一关布局一致 */
export function seededRandom(seed: number) {
  let state = seed;
  return () => {
    state += 0x6d2b79f5;
    let mixed = state;
    mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
    mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
    return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
  };
}

/** 生成游戏内实体 id */
export function nextId(game: GameState) {
  game.nextId += 1;
  return game.nextId;
}
