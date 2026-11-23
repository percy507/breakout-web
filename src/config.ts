// 全局常量：逻辑坐标系固定为 W×H，渲染时整体缩放，关卡难度与屏幕尺寸无关。

export const W = 600;
export const H = 840;

// 砖阵两侧保留通道，允许直径 16 的小球绕到顶部
export const SIDE_LANE_WIDTH = 36;
export const COLS = 12;
export const CELL_W = (W - SIDE_LANE_WIDTH * 2) / COLS;
export const CELL_H = 24;
export const GRID_X = SIDE_LANE_WIDTH;
export const GRID_Y = 72;

export const PADDLE_Y = 776;
export const PADDLE_H = 14;
export const PADDLE_W = 104;
export const PADDLE_KEY_SPEED = 820;
export const PADDLE_MAX_SPEED = 3400;
/** 挡板边缘最大反弹角（与竖直方向夹角） */
export const MAX_BOUNCE = (62 * Math.PI) / 180;

export const BALL_R = 8;
export const BALL_SPEED = 470;
export const MAX_BALLS = 200;
/** 瞄准角下限（与水平线夹角） */
export const MIN_AIM = (12 * Math.PI) / 180;
/** 反弹后竖直分量下限，防止小球水平来回弹 */
export const MIN_VERTICAL = Math.sin((11 * Math.PI) / 180);

export const SHIELD_Y = 818;
export const LIVES = 3;
/** 战役模式生命上限；无尽模式不设上限 */
export const MAX_LIVES = 5;
/** 清关生命奖励最多按 10 条计算，生命本身仍可无限累加 */
export const CLEAR_BONUS_MAX_LIVES = 10;

export const ITEM_W = 40;
export const ITEM_H = 18;

export type PowerType =
  | 'wide'
  | 'slow'
  | 'multi'
  | 'pierce'
  | 'spread'
  | 'laser'
  | 'magnet'
  | 'shield'
  | 'life'
  | 'shrink'
  | 'fast';

export type TimedPower =
  | 'wide'
  | 'slow'
  | 'pierce'
  | 'laser'
  | 'magnet'
  | 'shield'
  | 'shrink'
  | 'fast';

export interface PowerDef {
  color: string;
  good: boolean;
  /** 持续时间（秒），0 表示瞬时效果 */
  duration: number;
  /** 掉落权重 */
  weight: number;
}

export const POWERS: Record<PowerType, PowerDef> = {
  wide: { color: '#22e5ff', good: true, duration: 15, weight: 12 },
  slow: { color: '#5b8cff', good: true, duration: 10, weight: 9 },
  multi: { color: '#ffd23f', good: true, duration: 0, weight: 18 },
  pierce: { color: '#ff8a3d', good: true, duration: 8, weight: 12 },
  spread: { color: '#b56bff', good: true, duration: 0, weight: 15 },
  laser: { color: '#ff4fd8', good: true, duration: 10, weight: 11 },
  magnet: { color: '#4cff9a', good: true, duration: 12, weight: 7 },
  shield: { color: '#9ef0ff', good: true, duration: 12, weight: 10 },
  life: { color: '#ff5c8a', good: true, duration: 0, weight: 5 },
  shrink: { color: '#ff3355', good: false, duration: 12, weight: 10 },
  fast: { color: '#ff3355', good: false, duration: 10, weight: 10 },
};

export const POWER_ORDER: PowerType[] = [
  'wide',
  'slow',
  'multi',
  'pierce',
  'spread',
  'laser',
  'magnet',
  'shield',
  'life',
  'shrink',
  'fast',
];

export const TIMED: TimedPower[] = [
  'wide',
  'shrink',
  'slow',
  'fast',
  'pierce',
  'laser',
  'magnet',
  'shield',
];

/** 砖块颜色按剩余血量取色（1–12） */
export const HP_COLORS = [
  '#00e5ff',
  '#00ff9d',
  '#b2ff3b',
  '#ffe53b',
  '#ffab2e',
  '#ff6a3d',
  '#ff3d6e',
  '#ff3dbb',
  '#d53dff',
  '#8f5bff',
  '#4d7bff',
  '#f2f5ff',
];

export function hpColor(hp: number): string {
  return HP_COLORS[Math.max(0, Math.min(HP_COLORS.length - 1, hp - 1))];
}

/** 每章的主题色相（背景网格、墙壁霓虹） */
export const CHAPTER_HUES = [190, 280, 20, 165, 325];

export type BrickKind = 'normal' | 'bomb' | 'gold' | 'core';

export function brickColor(brick: BrickKind, hp: number): string {
  if (brick === 'bomb') return '#ff5a36';
  if (brick === 'gold') return '#ffd54a';
  if (brick === 'core') return '#ff4fd8';
  return hpColor(hp);
}
