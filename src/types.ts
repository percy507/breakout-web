/** 游戏当前流程状态 */
export type GameStatus =
  | 'ready'
  | 'aiming'
  | 'playing'
  | 'paused'
  | 'lifeLost'
  | 'levelClear'
  | 'gameOver';

/** 可掉落道具类型 */
export type PowerType = 'wide' | 'slow' | 'multi' | 'pierce' | 'burst';

/** 玩家可配置的场上小球共存上限 */
export type BallLimit = 150 | 100 | 50 | 20;

/** 多球后剩余砖块强化模式 */
export type BrickSurgeMode = 'off' | 'normal' | 'super';

/** 可持久化的游戏玩法配置 */
export type GameConfig = {
  maxBalls: BallLimit;
  brickSurgeMode: BrickSurgeMode;
};

/** 拦截物外部形状，始终限制在单个砖块格内 */
export type ObstacleShape =
  | 'block'
  | 'circle'
  | 'diamond'
  | 'slopeLeft'
  | 'slopeRight'
  | 'wedgeLeft'
  | 'wedgeRight';

/** 游戏内音效类型 */
export type SoundType = 'paddle' | 'wall' | 'brick' | 'break' | 'power' | 'lose' | 'win';

/** 小球实体，位置和速度都使用游戏世界坐标 */
export type Ball = {
  id: number;
  centerX: number;
  centerY: number;
  radius: number;
  velocityX: number;
  velocityY: number;
  /** 穿透状态下当前仍在接触的砖块，避免同一砖块被连续帧反复灼烧 */
  piercingBrickIds: number[];
};

/** 挡板实体，centerX 表示水平中心点 */
export type Paddle = {
  centerX: number;
  top: number;
  width: number;
  height: number;
};

/** 砖块实体，obstacle 为 true 时表示只拦截不破碎 */
export type Brick = {
  id: number;
  left: number;
  top: number;
  width: number;
  height: number;
  hp: number;
  maxHp: number;
  obstacle: boolean;
  /** 仅拦截物使用的外部形状，用于改变反弹轨道 */
  obstacleShape: ObstacleShape;
};

/** 掉落中的道具实体 */
export type Powerup = {
  id: number;
  centerX: number;
  centerY: number;
  size: number;
  velocityY: number;
  type: PowerType;
};

/** 砖块破碎粒子实体 */
export type Particle = {
  id: number;
  centerX: number;
  centerY: number;
  velocityX: number;
  velocityY: number;
  size: number;
  ttl: number;
  color: string;
};

/** 持久化到 localStorage 的最小状态 */
export type StoredState = {
  highestUnlocked: number;
  bestScore: number;
  muted: boolean;
  config: GameConfig;
};

/** 游戏完整运行态，React 只读取 Snapshot 避免每帧重渲染 */
export type GameState = StoredState & {
  level: number;
  score: number;
  /** 本关开始时的分数，重试本关时回滚到这里 */
  levelStartScore: number;
  lives: number;
  status: GameStatus;
  /** 当前生命的存活时间，用于单局球速递增，死亡复活后重置 */
  elapsedSeconds: number;
  nextId: number;
  balls: Ball[];
  bricks: Brick[];
  powerups: Powerup[];
  particles: Particle[];
  /** 当前逻辑世界宽度，竖屏移动端会比 PC 更窄 */
  worldWidth: number;
  /** 当前逻辑世界高度，竖屏移动端会比 PC 更高 */
  worldHeight: number;
  paddle: Paddle;
  /** 瞄准状态下的发射角度，单位是弧度 */
  aimAngle: number;
  keyboardDirection: number;
  /** 加宽等级，死亡或重开关卡时清零 */
  wideLevel: number;
  /** 加宽效果过期时间，重新吃到加宽道具会刷新 */
  wideUntil: number;
  slowUntil: number;
  pierceUntil: number;
  /** 本关是否已触发高球数砖块强化 */
  ballSurgeApplied: boolean;
  /** 通关发生的时间戳，用于通关后挡板淡出和背景动效 */
  levelClearAt: number;
  shake: number;
  lastFrameTime: number;
  lastSnapshotTime: number;
  lastSoundTimes: Partial<Record<SoundType, number>>;
  audioContext: AudioContext | null;
};

/** React UI 使用的低频快照 */
export type Snapshot = {
  level: number;
  score: number;
  lives: number;
  status: GameStatus;
  bestScore: number;
  highestUnlocked: number;
  muted: boolean;
  config: GameConfig;
  ballCount: number;
  activePowers: string[];
};

/** 道具展示和随机权重配置 */
export type PowerupMeta = {
  color: string;
  weight: number;
};

/** 矩形碰撞使用的最小结构 */
export type RectLike = {
  left: number;
  top: number;
  width: number;
  height: number;
};
