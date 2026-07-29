import { STORAGE_KEY } from './constants';
import type { GameState, StoredState } from './types';

/** 从 localStorage 读取最高关、最高分和静音偏好 */
export function readStoredState(): StoredState {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return { highestUnlocked: 1, bestScore: 0, muted: false };
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredState>;
    return {
      highestUnlocked: Math.max(1, Number(parsedValue.highestUnlocked) || 1),
      bestScore: Math.max(0, Number(parsedValue.bestScore) || 0),
      muted: Boolean(parsedValue.muted),
    };
  } catch (error) {
    console.warn('读取本地记录失败', error);
    return { highestUnlocked: 1, bestScore: 0, muted: false };
  }
}

/** 将最高关、最高分和静音偏好写入 localStorage */
export function persistStoredState(game: GameState) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        highestUnlocked: game.highestUnlocked,
        bestScore: game.bestScore,
        muted: game.muted,
      }),
    );
  } catch (error) {
    console.warn('保存本地记录失败', error);
  }
}
