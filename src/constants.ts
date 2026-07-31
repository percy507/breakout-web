import type {
  BallLimit,
  BrickSurgeMode,
  GameConfig,
  PowerType,
  PowerupMeta,
} from './types';

/** 游戏逻辑世界宽度，渲染时再映射到真实屏幕 */
export const WORLD_WIDTH = 900;

/** 游戏逻辑世界高度，渲染时再映射到真实屏幕 */
export const WORLD_HEIGHT = 620;

/** 竖屏移动端使用更高的逻辑世界，拉开砖块和挡板间距 */
export const PORTRAIT_WORLD_HEIGHT = 960;

/** 挡板初始宽度 */
export const PADDLE_BASE_WIDTH = 132;

/** 挡板加宽最高等级 */
export const PADDLE_MAX_WIDE_LEVEL = 5;

/** 挡板高度 */
export const PADDLE_HEIGHT = 16;

/** 挡板顶部 Y 坐标，让挡板底边离底部约为原先一半 */
export const PADDLE_TOP = 582;

/** 挡板距离逻辑世界底部的间距，竖屏高度变化时保持一致 */
export const PADDLE_BOTTOM_GAP = WORLD_HEIGHT - PADDLE_TOP;

/** 竖屏移动端挡板底边也贴近底部，减少无效留白 */
export const PORTRAIT_PADDLE_BOTTOM_GAP = 58;

/** 小球半径 */
export const BALL_RADIUS = 7;

/** 每个关卡和每次复活后的统一初始球速 */
export const BALL_BASE_SPEED = 360;

/** 当前生命存活越久，每秒递增的球速 */
export const BALL_SPEED_GROWTH_PER_SECOND = 5.2;

/** 球速向目标速度靠拢的最大加速度，避免减速结束时突然变快 */
export const BALL_SPEED_SMOOTHING_PER_SECOND = 85;

/** 单局时间加速后的最高球速 */
export const BALL_MAX_SPEED = 760;

/** 球和挡板反弹后的最小间距，避免高速连续碰撞 */
export const BALL_PADDLE_GAP = 18;

/** 键盘控制挡板的水平速度 */
export const PADDLE_SPEED = 680;

/** 默认发球角度，负数表示向上 */
export const DEFAULT_AIM_ANGLE = -Math.PI / 2;

/** 最小发球角度，允许更大侧向弹道但避免完全水平 */
export const MIN_AIM_ANGLE = -Math.PI + 0.16;

/** 最大发球角度，允许更大侧向弹道但避免完全水平 */
export const MAX_AIM_ANGLE = -0.16;

/** 玩家可选的小球共存上限 */
export const BALL_LIMIT_OPTIONS: BallLimit[] = [150, 100, 50, 20];

/** 玩家可选的砖块强化模式 */
export const BRICK_SURGE_MODES: BrickSurgeMode[] = ['off', 'normal', 'super'];

/** 默认游戏玩法配置 */
export const DEFAULT_GAME_CONFIG: GameConfig = {
  maxBalls: 100,
  brickSurgeMode: 'normal',
};

/** 场上球数超过这个值时，剩余砖块进入高打击次数阶段 */
export const BALL_SURGE_THRESHOLD = 25;

/** 普通强化模式下剩余砖块统一提高到的命中次数 */
export const BALL_SURGE_NORMAL_HP = 30;

/** 超级强化模式下剩余砖块统一提高到的命中次数 */
export const BALL_SURGE_SUPER_HP = 100;

/** 超级强化模式下挡板至少保持的加宽等级 */
export const SUPER_SURGE_MIN_WIDE_LEVEL = 3;

/** 关卡初始生成的可破坏砖块最高血量，数字表示需要命中的次数 */
export const MAX_BRICK_HP = 12;

/** 场上最大粒子数 */
export const MAX_PARTICLES = 140;

/** 移动端粒子上限，减少连续破碎时的 Canvas 写入压力 */
export const MOBILE_MAX_PARTICLES = 70;

/** Canvas 最大渲染像素比，限制高 DPI 绘制负载 */
export const MAX_RENDER_PIXEL_RATIO = 1.5;

/** 移动端 Canvas 渲染像素比，兼顾圆角清晰度和触控流畅度 */
export const MOBILE_RENDER_PIXEL_RATIO = 1.25;

/** Canvas 最大实际绘制像素数，防止长时间高负载发热 */
export const MAX_CANVAS_PIXELS = 2_000_000;

/** 移动端 Canvas 最大实际绘制像素数，优先保证触控流畅度 */
export const MOBILE_MAX_CANVAS_PIXELS = 1_100_000;

/** 游戏运行态帧间隔，限制到约 60 FPS */
export const PLAYING_FRAME_MS = 1000 / 60;

/** 非游戏态帧间隔，降低待机耗电 */
export const IDLE_FRAME_MS = 1000 / 15;

/** Pointer Lock 模式下的鼠标相对位移灵敏度 */
export const POINTER_LOCK_SENSITIVITY = 1.35;

/** React UI 快照更新间隔 */
export const SNAPSHOT_INTERVAL_MS = 250;

/** 砖块区顶部 Y 坐标，比旧布局减少约三分之一顶部空白 */
export const BRICK_TOP = 48;

/** 砖块碰撞宽相位顶部边界，略高于砖块区以避免漏判顶部碰撞 */
export const BRICK_HIT_TEST_TOP = BRICK_TOP - 12;

/** 游戏内暂停按钮尺寸 */
export const PAUSE_BUTTON_WIDTH = 70;

/** 游戏内暂停按钮高度 */
export const PAUSE_BUTTON_HEIGHT = 36;

/** 游戏内暂停按钮距离上右边界的间距 */
export const PAUSE_BUTTON_MARGIN = 14;

/** 加宽道具持续时间，每次重新吃到都会刷新 */
export const WIDE_DURATION_MS = 30_000;

/** 穿透球穿过单个砖块时固定扣除的命中次数 */
export const PIERCE_DAMAGE = 3;

/** 通关瞬间挡板淡出时长 */
export const LEVEL_CLEAR_PADDLE_FADE_MS = 900;

/** 本地存储键名 */
export const STORAGE_KEY = 'breakout-web-state-v1';

/** 音效整体音量倍率 */
export const AUDIO_VOLUME_MULTIPLIER = 2.4;

/** 道具配置，weight 是掉落权重，不是百分比 */
export const POWERUPS: Record<PowerType, PowerupMeta> = {
  wide: { color: '#0284c7', weight: 32 },
  slow: { color: '#16a34a', weight: 26 },
  multi: { color: '#7c3aed', weight: 20 },
  pierce: { color: '#db2777', weight: 14 },
  burst: { color: '#ea580c', weight: 16 },
};
