import {
  BALL_LIMIT_OPTIONS,
  BRICK_SURGE_MODES,
  DEFAULT_GAME_CONFIG,
  STORAGE_KEY,
} from './constants';
import type { GameState, StoredState } from './types';
import type { BallLimit, BrickSurgeMode, GameConfig } from './types';

/** 从 localStorage 读取最高关、最高分、静音偏好和玩法配置 */
export function readStoredState(): StoredState {
  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return createDefaultStoredState();
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredState>;
    return {
      highestUnlocked: Math.max(1, Number(parsedValue.highestUnlocked) || 1),
      bestScore: Math.max(0, Number(parsedValue.bestScore) || 0),
      muted: Boolean(parsedValue.muted),
      config: readGameConfig(parsedValue.config),
    };
  } catch (error) {
    console.warn('读取本地记录失败', error);
    return createDefaultStoredState();
  }
}

function createDefaultStoredState(): StoredState {
  return {
    highestUnlocked: 1,
    bestScore: 0,
    muted: false,
    config: { ...DEFAULT_GAME_CONFIG },
  };
}

function readGameConfig(config: Partial<GameConfig> | undefined): GameConfig {
  const maxBalls = Number(config?.maxBalls);
  const brickSurgeMode = config?.brickSurgeMode;
  return {
    maxBalls: BALL_LIMIT_OPTIONS.includes(maxBalls as BallLimit)
      ? (maxBalls as BallLimit)
      : DEFAULT_GAME_CONFIG.maxBalls,
    brickSurgeMode: BRICK_SURGE_MODES.includes(brickSurgeMode as BrickSurgeMode)
      ? (brickSurgeMode as BrickSurgeMode)
      : DEFAULT_GAME_CONFIG.brickSurgeMode,
  };
}

/** 将最高关、最高分、静音偏好和玩法配置写入 localStorage */
export function persistStoredState(game: GameState) {
  try {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        highestUnlocked: game.highestUnlocked,
        bestScore: game.bestScore,
        muted: game.muted,
        config: game.config,
      }),
    );
  } catch (error) {
    console.warn('保存本地记录失败', error);
  }
}
