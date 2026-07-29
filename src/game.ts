import { playSound } from './audio';
import {
  BALL_BASE_SPEED,
  BALL_MAX_SPEED,
  BALL_PADDLE_GAP,
  BALL_RADIUS,
  BALL_SPEED_GROWTH_PER_SECOND,
  BALL_SPEED_SMOOTHING_PER_SECOND,
  BRICK_HIT_TEST_TOP,
  BRICK_TOP,
  DEFAULT_AIM_ANGLE,
  MAX_AIM_ANGLE,
  MAX_BALLS,
  MAX_BRICK_HP,
  MAX_PARTICLES,
  MIN_AIM_ANGLE,
  MOBILE_MAX_PARTICLES,
  PADDLE_BASE_WIDTH,
  PADDLE_BOTTOM_GAP,
  PADDLE_HEIGHT,
  PADDLE_MAX_WIDE_LEVEL,
  PADDLE_SPEED,
  PIERCE_DAMAGE,
  PORTRAIT_PADDLE_BOTTOM_GAP,
  POWERUPS,
  WIDE_DURATION_MS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import {
  circleIntersectsBrick,
  circleIntersectsRect,
  getPaddleRect,
  getPaddleWidth,
  movePaddleTo,
  powerupToBall,
  reflectBallFromBrick,
} from './geometry';
import { getActionLabel, getPowerupLabel } from './i18n';
import { persistStoredState } from './storage';
import type {
  Ball,
  Brick,
  GameState,
  ObstacleShape,
  PowerType,
  Snapshot,
  StoredState,
} from './types';
import { clamp, nextId, seededRandom } from './utils';

/** 创建一局完整游戏状态 */
export function createGame(storedState: StoredState): GameState {
  const game: GameState = {
    ...storedState,
    level: storedState.highestUnlocked,
    score: 0,
    levelStartScore: 0,
    lives: 3,
    status: 'ready',
    elapsedSeconds: 0,
    nextId: 1,
    balls: [],
    bricks: [],
    powerups: [],
    particles: [],
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
    paddle: {
      centerX: WORLD_WIDTH / 2,
      top: getPaddleTop(WORLD_HEIGHT),
      width: PADDLE_BASE_WIDTH,
      height: PADDLE_HEIGHT,
    },
    aimAngle: DEFAULT_AIM_ANGLE,
    keyboardDirection: 0,
    wideLevel: 0,
    wideUntil: 0,
    slowUntil: 0,
    pierceUntil: 0,
    levelClearAt: 0,
    shake: 0,
    lastFrameTime: performance.now(),
    lastSnapshotTime: 0,
    lastSoundTimes: {},
    audioContext: null,
  };

  resetLevel(game, game.level);
  return game;
}

/** 初始化整关：生命、临时效果、砖块布局和待发球状态都从头开始 */
export function resetLevel(game: GameState, level: number) {
  game.level = level;
  game.lives = 3;
  game.status = 'ready';
  game.elapsedSeconds = 0;
  game.levelClearAt = 0;
  game.aimAngle = DEFAULT_AIM_ANGLE;
  game.keyboardDirection = 0;
  resetLifeEffects(game);
  game.shake = 0;
  game.particles = [];
  game.paddle.top = getPaddleTop(game.worldHeight);
  game.paddle.centerX = game.worldWidth / 2;
  game.paddle.width = PADDLE_BASE_WIDTH;
  game.bricks = generateBricks(game, level);
  serveBall(game);
}

/** 重试当前关卡并回滚到本关开始分数 */
export function retryLevel(game: GameState) {
  game.score = game.levelStartScore;
  resetLevel(game, game.level);
}

/** 进入下一关并记录本关起始分数 */
export function goToNextLevel(game: GameState) {
  game.level += 1;
  game.levelStartScore = game.score;
  resetLevel(game, game.level);
  persistStoredState(game);
}

/** 每次待发球都先创建贴在挡板上方的小球 */
export function serveBall(game: GameState) {
  game.balls = [
    {
      id: nextId(game),
      centerX: game.paddle.centerX,
      centerY: game.paddle.top - BALL_RADIUS,
      radius: BALL_RADIUS,
      velocityX: 0,
      velocityY: 0,
      piercingBrickIds: [],
    },
  ];
}

/** 同步当前视口对应的逻辑尺寸，竖屏时使用更窄更高的游戏世界 */
export function syncGameLayout(game: GameState, worldWidth: number, worldHeight: number) {
  if (
    Math.abs(game.worldWidth - worldWidth) < 0.5 &&
    Math.abs(game.worldHeight - worldHeight) < 0.5
  ) {
    return;
  }

  const centerRatio = game.paddle.centerX / game.worldWidth;
  const shouldRegenerateBricks =
    (game.status === 'ready' || game.status === 'aiming') &&
    game.lives === 3 &&
    game.score === game.levelStartScore;
  game.worldWidth = worldWidth;
  game.worldHeight = worldHeight;
  game.paddle.centerX = worldWidth * centerRatio;
  game.paddle.top = getPaddleTop(worldHeight);
  game.paddle.width = getPaddleWidth(game.wideLevel, game.worldWidth);
  movePaddleTo(game, game.paddle.centerX);
  if (shouldRegenerateBricks) {
    game.bricks = generateBricks(game, game.level);
  }
  if (game.status === 'ready' || game.status === 'aiming' || game.status === 'lifeLost') {
    attachReadyBall(game);
  }
}

/** 由逻辑世界高度推导挡板 Y 坐标，保持底部安全距离一致 */
export function getPaddleTop(worldHeight: number) {
  return (
    worldHeight -
    (worldHeight > WORLD_HEIGHT ? PORTRAIT_PADDLE_BOTTOM_GAP : PADDLE_BOTTOM_GAP)
  );
}

/** 根据当前瞄准角度发射待发球 */
export function launchAimedBall(game: GameState, time: number) {
  const ball = game.balls[0];
  if (!ball) {
    serveBall(game);
  }

  game.elapsedSeconds = 0;
  game.levelClearAt = 0;
  const speed = getBallSpeed(game, time);
  const targetBall = game.balls[0];
  targetBall.velocityX = Math.cos(game.aimAngle) * speed;
  targetBall.velocityY = Math.sin(game.aimAngle) * speed;
  game.status = 'playing';
}

/** 根据玩家指向的位置更新发球瞄准角度 */
export function aimAtPoint(game: GameState, worldX: number, worldY: number) {
  const ball = game.balls[0];
  const originX = ball?.centerX ?? game.paddle.centerX;
  const originY = ball?.centerY ?? game.paddle.top - BALL_RADIUS;
  const rawAngle = Math.atan2(worldY - originY, worldX - originX);
  game.aimAngle = clamp(rawAngle, MIN_AIM_ANGLE, MAX_AIM_ANGLE);
}

type BrickLayoutMode = 'grid' | 'stagger' | 'hollow' | 'maze';

/** 根据关卡号选择砖阵形态，让难度增加时有交叉、镂空和拦截物迷宫变化 */
function getBrickLayoutMode(level: number): BrickLayoutMode {
  if (level === 1) {
    return 'grid';
  }

  const modes: BrickLayoutMode[] = ['stagger', 'hollow', 'maze', 'grid'];
  return modes[(level - 2) % modes.length];
}

/** 镂空布局保留外圈砖块，内部挖出可预判的空洞 */
function shouldSkipBrickCell(
  layoutMode: BrickLayoutMode,
  row: number,
  column: number,
  rows: number,
  columns: number,
) {
  if (layoutMode !== 'hollow') {
    return false;
  }

  const isEdgeCell =
    row === 0 || column === 0 || row === rows - 1 || column === columns - 1;
  if (isEdgeCell) {
    return false;
  }

  const centerRow = Math.floor(rows / 2);
  const centerColumn = Math.floor(columns / 2);
  const isCenterHole =
    Math.abs(row - centerRow) <= 1 && Math.abs(column - centerColumn) <= 1;
  const isSideHole = row % 2 === 0 && (column + row) % 5 === 0;
  return isCenterHole || isSideHole;
}

/** 迷宫布局用不会破碎的拦截物做简单折线路径，仍然保留足够可破坏砖块 */
function isMazeObstacleCell(row: number, column: number, rows: number, columns: number) {
  const isInnerCell = row > 0 && row < rows - 1 && column > 0 && column < columns - 1;
  if (!isInnerCell) {
    return false;
  }

  const leftWall =
    column === Math.max(1, Math.floor(columns * 0.34)) &&
    row > 1 &&
    row < rows - 2 &&
    row % 4 !== 2;
  const rightWall =
    column === Math.min(columns - 2, Math.ceil(columns * 0.66)) &&
    row > 1 &&
    row < rows - 2 &&
    row % 4 !== 1;
  const crossWall =
    row === Math.floor(rows * 0.55) &&
    column > 1 &&
    column < columns - 2 &&
    column % 3 !== 0;
  return leftWall || rightWall || crossWall;
}

/** 拦截物外形按格子稳定轮换，全部限制在单个砖块格内 */
const OBSTACLE_SHAPES: ObstacleShape[] = [
  'slopeLeft',
  'slopeRight',
  'wedgeLeft',
  'wedgeRight',
  'diamond',
  'circle',
  'block',
];

/** 根据关卡和格子位置选择拦截物外部形状 */
function getObstacleShape(level: number, row: number, column: number) {
  return OBSTACLE_SHAPES[(level + row * 2 + column * 3) % OBSTACLE_SHAPES.length];
}

/** 判断格子是否已被布局规则排除 */
function isBlockedBrickCell(
  layoutMode: BrickLayoutMode,
  row: number,
  column: number,
  rows: number,
  columns: number,
) {
  const staggerTailCell =
    layoutMode === 'stagger' && row % 2 === 1 && column === columns - 1;
  return (
    column < 0 ||
    column >= columns ||
    row < 0 ||
    row >= rows ||
    staggerTailCell ||
    shouldSkipBrickCell(layoutMode, row, column, rows, columns)
  );
}

/** 关卡按关卡号稳定生成，拦截物保持单格网格对齐，避免空洞和重叠 */
export function generateBricks(game: GameState, level: number) {
  const random = seededRandom(level * 1009);
  const webColumns = clamp(10 + Math.floor((level - 1) / 3), 10, 16);
  const webRows = clamp(4 + Math.floor(level / 2), 4, 11);
  const portraitLayout = game.worldWidth < WORLD_WIDTH;
  const columns = portraitLayout ? Math.ceil(webColumns / 2) : webColumns;
  const rows = portraitLayout ? webRows * 2 : webRows;
  const layoutMode = getBrickLayoutMode(level);
  const gap = clamp(8 - Math.floor((level - 1) / 8), 5, 8);
  const sidePadding = BALL_RADIUS * 4;
  const brickHeight = clamp(28 - Math.floor((level - 1) / 6) * 2, 20, 28);
  const brickWidth = (game.worldWidth - sidePadding * 2 - gap * (columns - 1)) / columns;
  const maxObstacles =
    layoutMode === 'maze'
      ? Math.min(4 + Math.floor(level / 2), Math.floor(columns * rows * 0.18))
      : Math.min(2 + Math.floor(level / 3), Math.floor(columns * rows * 0.12));
  const bricks: Brick[] = [];
  let obstacleCount = 0;

  for (let row = 0; row < rows; row += 1) {
    const rowOffset =
      layoutMode === 'stagger' && row % 2 === 1 ? (brickWidth + gap) / 2 : 0;
    for (let column = 0; column < columns; column += 1) {
      if (isBlockedBrickCell(layoutMode, row, column, rows, columns)) {
        continue;
      }

      const canPlaceObstacle = row > 0 && row < rows - 1 && obstacleCount < maxObstacles;
      const mazeObstacle =
        layoutMode === 'maze' && isMazeObstacleCell(row, column, rows, columns);
      const randomObstacle =
        layoutMode !== 'maze' && random() < Math.min(0.04 + level * 0.006, 0.13);
      const obstacle = canPlaceObstacle && (mazeObstacle || randomObstacle);
      if (obstacle) {
        obstacleCount += 1;
      }

      const maxLevelHp = clamp(3 + Math.floor((level - 1) / 3), 3, MAX_BRICK_HP);
      const hardChance = Math.min(0.05 + level * 0.018, 0.42);
      const mediumChance = Math.min(0.16 + level * 0.022, 0.46);
      const roll = random();
      const toughHp = 3 + Math.floor(Math.pow(random(), 1.7) * (maxLevelHp - 2));
      const maxHp = obstacle
        ? 99
        : roll < hardChance
          ? toughHp
          : roll < hardChance + mediumChance
            ? 2
            : 1;

      bricks.push({
        id: nextId(game),
        left: sidePadding + rowOffset + column * (brickWidth + gap),
        top: BRICK_TOP + row * (brickHeight + gap),
        width: brickWidth,
        height: brickHeight,
        hp: maxHp,
        maxHp,
        obstacle,
        obstacleShape: obstacle ? getObstacleShape(level, row, column) : 'block',
      });
    }
  }

  return bricks;
}

/** 每帧更新顺序：先更新可视状态，只有游戏中继续推进球和道具 */
export function updateGame(game: GameState, elapsedSeconds: number, time: number) {
  updatePaddleWidth(game, time);
  attachReadyBall(game);
  updateParticles(game, elapsedSeconds);
  game.shake = Math.max(0, game.shake - elapsedSeconds * 18);

  if (game.status === 'levelClear') {
    updateLevelClearBalls(game, elapsedSeconds, time);
    return;
  }

  if (game.status !== 'playing') {
    return;
  }

  game.elapsedSeconds += elapsedSeconds;

  if (game.keyboardDirection !== 0) {
    movePaddleTo(
      game,
      game.paddle.centerX + game.keyboardDirection * PADDLE_SPEED * elapsedSeconds,
    );
  }

  updateBalls(game, elapsedSeconds, time);
  updatePowerups(game, elapsedSeconds, time);
  checkLevelClear(game, time);
}

/** 通关弹窗背后保留球和道具自然运动，不再碰挡板或结算死亡 */
function updateLevelClearBalls(game: GameState, elapsedSeconds: number, time: number) {
  const nextBalls: Ball[] = [];

  for (const ball of game.balls) {
    normalizeBallSpeed(
      ball,
      getBallSpeed(game, time),
      BALL_SPEED_SMOOTHING_PER_SECOND * elapsedSeconds,
    );
    ball.centerX += ball.velocityX * elapsedSeconds;
    ball.centerY += ball.velocityY * elapsedSeconds;

    handleWallCollision(game, ball);
    handleBrickCollisions(game, ball, time);

    if (ball.centerY - ball.radius <= game.worldHeight) {
      nextBalls.push(ball);
    }
  }

  game.balls = nextBalls;
  updateLevelClearPowerups(game, elapsedSeconds);
}

/** 通关后掉落道具只继续下落并离场，不再被挡板拾取 */
function updateLevelClearPowerups(game: GameState, elapsedSeconds: number) {
  game.powerups = game.powerups.filter((powerup) => {
    powerup.centerY += powerup.velocityY * elapsedSeconds;
    return powerup.centerY - powerup.size <= game.worldHeight;
  });
}

/** 挡板宽度由加宽等级决定，过期后回到基础宽度 */
export function updatePaddleWidth(game: GameState, time: number) {
  if (game.wideLevel > 0 && time >= game.wideUntil) {
    game.wideLevel = 0;
    game.wideUntil = 0;
  }

  game.paddle.width = getPaddleWidth(game.wideLevel, game.worldWidth);
  movePaddleTo(game, game.paddle.centerX);
}

/** 待发球和瞄准时球固定悬停在挡板上方 */
export function attachReadyBall(game: GameState) {
  if (
    (game.status === 'ready' || game.status === 'aiming' || game.status === 'lifeLost') &&
    game.balls[0]
  ) {
    game.balls[0].centerX = game.paddle.centerX;
    game.balls[0].centerY = game.paddle.top - game.balls[0].radius;
  }
}

/** 场上允许多球，只有所有球都掉落才扣生命 */
export function updateBalls(game: GameState, elapsedSeconds: number, time: number) {
  const nextBalls: Ball[] = [];

  for (const ball of game.balls) {
    normalizeBallSpeed(
      ball,
      getBallSpeed(game, time),
      BALL_SPEED_SMOOTHING_PER_SECOND * elapsedSeconds,
    );
    ball.centerX += ball.velocityX * elapsedSeconds;
    ball.centerY += ball.velocityY * elapsedSeconds;

    handleWallCollision(game, ball);
    handlePaddleCollision(game, ball, time);
    handleBrickCollisions(game, ball, time);

    if (ball.centerY - ball.radius <= game.worldHeight) {
      nextBalls.push(ball);
    }
  }

  game.balls = nextBalls;

  if (game.balls.length > 0) {
    return;
  }

  game.lives -= 1;
  playSound(game, 'lose');
  if (game.lives <= 0) {
    game.status = 'gameOver';
    game.bestScore = Math.max(game.bestScore, game.score);
    persistStoredState(game);
  } else {
    game.elapsedSeconds = 0;
    resetLifeEffects(game);
    game.aimAngle = DEFAULT_AIM_ANGLE;
    game.status = 'lifeLost';
    serveBall(game);
  }
}

/** 复活时清掉所有临时加成和未接住的掉落道具 */
export function resetLifeEffects(game: GameState) {
  game.wideLevel = 0;
  game.wideUntil = 0;
  game.paddle.width = PADDLE_BASE_WIDTH;
  game.slowUntil = 0;
  game.pierceUntil = 0;
  game.powerups = [];
}

/** 处理球和墙体的反弹 */
export function handleWallCollision(game: GameState, ball: Ball) {
  if (ball.centerX - ball.radius < 0) {
    ball.centerX = ball.radius;
    ball.velocityX = Math.abs(ball.velocityX);
    playSound(game, 'wall');
  } else if (ball.centerX + ball.radius > game.worldWidth) {
    ball.centerX = game.worldWidth - ball.radius;
    ball.velocityX = -Math.abs(ball.velocityX);
    playSound(game, 'wall');
  }

  if (ball.centerY - ball.radius < 0) {
    ball.centerY = ball.radius;
    ball.velocityY = Math.abs(ball.velocityY);
    playSound(game, 'wall');
  }
}

/** 处理球和挡板的反弹，并按命中位置改变水平速度 */
export function handlePaddleCollision(game: GameState, ball: Ball, time: number) {
  const paddleRect = getPaddleRect(game.paddle);
  if (ball.velocityY <= 0 || !circleIntersectsRect(ball, paddleRect)) {
    return;
  }

  const speed = getCollisionBallSpeed(ball, getBallSpeed(game, time));
  const hitRatio = clamp(
    (ball.centerX - game.paddle.centerX) / (game.paddle.width / 2),
    -0.95,
    0.95,
  );
  ball.centerY = game.paddle.top - ball.radius - BALL_PADDLE_GAP;
  ball.velocityX = speed * hitRatio * 0.82;
  ball.velocityY = -Math.sqrt(
    Math.max(0, speed * speed - ball.velocityX * ball.velocityX),
  );
  playSound(game, 'paddle');
}

/** 处理球和砖块、拦截物的碰撞 */
export function handleBrickCollisions(game: GameState, ball: Ball, time: number) {
  if (
    ball.centerY + ball.radius < BRICK_HIT_TEST_TOP ||
    ball.centerY - ball.radius > game.paddle.top
  ) {
    return;
  }

  const piercing = time < game.pierceUntil;
  if (piercing) {
    ball.piercingBrickIds ??= [];
    clearExitedPiercingBricks(game, ball);
  }

  for (let brickIndex = game.bricks.length - 1; brickIndex >= 0; brickIndex -= 1) {
    const brick = game.bricks[brickIndex];
    if (!circleIntersectsBrick(ball, brick)) {
      continue;
    }

    if (brick.obstacle) {
      reflectBallFromBrick(ball, brick);
      playSound(game, 'wall');
      return;
    }

    if (piercing && ball.piercingBrickIds.includes(brick.id)) {
      continue;
    }

    brick.hp -= piercing ? PIERCE_DAMAGE : 1;
    if (piercing) {
      ball.piercingBrickIds.push(brick.id);
    }
    if (brick.hp <= 0) {
      game.bricks.splice(brickIndex, 1);
      game.score += 20 * brick.maxHp + game.level * 3;
      game.bestScore = Math.max(game.bestScore, game.score);
      spawnBreakEffects(game, brick);
      maybeDropPowerup(game, brick);
      playSound(game, 'break');
    } else {
      spawnHitParticles(game, brick);
      playSound(game, 'brick');
    }

    if (!piercing) {
      reflectBallFromBrick(ball, brick);
      return;
    }
  }
}

/** 穿透球离开砖块后清掉接触记录，下次重新穿过才会再次结算伤害 */
export function clearExitedPiercingBricks(game: GameState, ball: Ball) {
  if (ball.piercingBrickIds.length === 0) {
    return;
  }

  ball.piercingBrickIds = ball.piercingBrickIds.filter((brickId) => {
    const brick = game.bricks.find((candidate) => candidate.id === brickId);
    return brick ? circleIntersectsBrick(ball, brick) : false;
  });
}

/** 更新掉落道具位置并处理挡板拾取 */
export function updatePowerups(game: GameState, elapsedSeconds: number, time: number) {
  for (
    let powerupIndex = game.powerups.length - 1;
    powerupIndex >= 0;
    powerupIndex -= 1
  ) {
    const powerup = game.powerups[powerupIndex];
    powerup.centerY += powerup.velocityY * elapsedSeconds;

    if (circleIntersectsRect(powerupToBall(powerup), getPaddleRect(game.paddle))) {
      applyPowerup(game, powerup.type, time);
      game.powerups.splice(powerupIndex, 1);
      playSound(game, 'power');
    } else if (powerup.centerY - powerup.size > game.worldHeight) {
      game.powerups.splice(powerupIndex, 1);
    }
  }
}

/** 检查是否清空所有可破坏砖块，并进入通关展示状态 */
export function checkLevelClear(game: GameState, time = performance.now()) {
  if (game.status !== 'playing' || game.bricks.some((brick) => !brick.obstacle)) {
    return;
  }

  game.status = 'levelClear';
  game.keyboardDirection = 0;
  game.levelClearAt = time;
  game.highestUnlocked = Math.max(game.highestUnlocked, game.level + 1);
  game.bestScore = Math.max(game.bestScore, game.score);
  persistStoredState(game);
  playSound(game, 'win');
}

/** 道具只在接住时生效，双球和发散五球都作用于当前所有球 */
export function applyPowerup(game: GameState, type: PowerType, time: number) {
  if (type === 'wide') {
    game.wideLevel = Math.min(PADDLE_MAX_WIDE_LEVEL, game.wideLevel + 1);
    game.wideUntil = time + WIDE_DURATION_MS;
  } else if (type === 'slow') {
    game.slowUntil = Math.max(game.slowUntil, time + 7500);
  } else if (type === 'pierce') {
    game.pierceUntil = Math.max(game.pierceUntil, time + 8000);
  } else if (type === 'multi') {
    spawnFanBalls(game, game.balls.slice(), 1);
  } else if (type === 'burst') {
    spawnFanBalls(game, game.balls.slice(), 5);
  }
}

/** 从每个源球周围生成新球，达到球数上限后静默停止 */
export function spawnFanBalls(
  game: GameState,
  sourceBalls: Ball[],
  countPerBall: number,
) {
  const speed = getBallSpeed(game, performance.now());

  for (const sourceBall of sourceBalls) {
    for (let countIndex = 0; countIndex < countPerBall; countIndex += 1) {
      if (game.balls.length >= MAX_BALLS) {
        return;
      }

      const sourceAngle = Math.atan2(sourceBall.velocityY, sourceBall.velocityX);
      const angle =
        countPerBall === 1
          ? sourceAngle + (sourceBall.velocityX >= 0 ? -0.55 : 0.55)
          : (Math.PI * 2 * countIndex) / countPerBall + Math.random() * 0.35;
      game.balls.push({
        id: nextId(game),
        centerX: sourceBall.centerX,
        centerY: sourceBall.centerY,
        radius: sourceBall.radius,
        velocityX: Math.cos(angle) * speed,
        velocityY: Math.sin(angle) * speed,
        piercingBrickIds: [],
      });
    }
  }
}

/** 先判断是否掉落，再按权重抽取道具类型 */
export function maybeDropPowerup(game: GameState, brick: Brick) {
  const dropChance = Math.min(0.18 + game.level * 0.004, 0.28);
  if (Math.random() > dropChance) {
    return;
  }

  const totalWeight = Object.values(POWERUPS).reduce(
    (total, powerup) => total + powerup.weight,
    0,
  );
  let roll = Math.random() * totalWeight;

  for (const [type, powerup] of Object.entries(POWERUPS) as [
    PowerType,
    (typeof POWERUPS)[PowerType],
  ][]) {
    roll -= powerup.weight;
    if (roll <= 0) {
      game.powerups.push({
        id: nextId(game),
        centerX: brick.left + brick.width / 2,
        centerY: brick.top + brick.height / 2,
        size: 16,
        velocityY: 120,
        type,
      });
      return;
    }
  }
}

/** 生成砖块破碎时的屏幕震动和粒子 */
export function spawnBreakEffects(game: GameState, brick: Brick) {
  game.shake = Math.max(game.shake, 5);
  spawnParticles(game, brick, 13, getBrickColor(brick));
}

/** 生成砖块受击但未破碎时的少量粒子 */
export function spawnHitParticles(game: GameState, brick: Brick) {
  spawnParticles(game, brick, 5, getBrickColor(brick));
}

/** 在砖块中心生成粒子并控制总量上限 */
export function spawnParticles(
  game: GameState,
  brick: Brick,
  count: number,
  color: string,
) {
  const mobileLayout = game.worldHeight > WORLD_HEIGHT;
  const maxParticles = mobileLayout ? MOBILE_MAX_PARTICLES : MAX_PARTICLES;
  const spawnCount = mobileLayout ? Math.ceil(count * 0.55) : count;

  for (let countIndex = 0; countIndex < spawnCount; countIndex += 1) {
    if (game.particles.length >= maxParticles) {
      return;
    }

    const angle = Math.random() * Math.PI * 2;
    const speed = 70 + Math.random() * 180;
    game.particles.push({
      id: nextId(game),
      centerX: brick.left + brick.width / 2,
      centerY: brick.top + brick.height / 2,
      velocityX: Math.cos(angle) * speed,
      velocityY: Math.sin(angle) * speed,
      size: 2 + Math.random() * 4,
      ttl: 0.35 + Math.random() * 0.45,
      color,
    });
  }
}

/** 更新粒子位置并移除过期粒子 */
export function updateParticles(game: GameState, elapsedSeconds: number) {
  for (
    let particleIndex = game.particles.length - 1;
    particleIndex >= 0;
    particleIndex -= 1
  ) {
    const particle = game.particles[particleIndex];
    particle.ttl -= elapsedSeconds;
    particle.centerX += particle.velocityX * elapsedSeconds;
    particle.centerY += particle.velocityY * elapsedSeconds;
    particle.velocityY += 260 * elapsedSeconds;
    if (particle.ttl <= 0) {
      game.particles.splice(particleIndex, 1);
    }
  }
}

/** 根据砖块类型和剩余血量返回颜色 */
export function getBrickColor(brick: Brick) {
  if (brick.obstacle) {
    return '#7d8799';
  }

  const hpColors = [
    '#21f3a3',
    '#43f5ff',
    '#ffd166',
    '#ff9f1c',
    '#ff5a7a',
    '#f472b6',
    '#c084fc',
    '#a78bfa',
    '#818cf8',
    '#60a5fa',
    '#38bdf8',
    '#22d3ee',
  ];
  return hpColors[clamp(brick.hp, 1, MAX_BRICK_HP) - 1];
}

/** 计算当前小球目标速度 */
export function getBallSpeed(game: GameState, time: number) {
  const baseSpeed = Math.min(
    BALL_BASE_SPEED + game.elapsedSeconds * BALL_SPEED_GROWTH_PER_SECOND,
    BALL_MAX_SPEED,
  );
  return time < game.slowUntil ? baseSpeed * 0.72 : baseSpeed;
}

/** 归一化小球速度，并避免小球长期接近水平运动 */
export function normalizeBallSpeed(ball: Ball, speed: number, maxDelta = Infinity) {
  const currentSpeed = Math.hypot(ball.velocityX, ball.velocityY) || 1;
  const delta = speed - currentSpeed;
  const maxChange = delta > 0 ? maxDelta : maxDelta * 3;
  const nextSpeed = currentSpeed + clamp(delta, -maxChange, maxChange);
  ball.velocityX = (ball.velocityX / currentSpeed) * nextSpeed;
  ball.velocityY = (ball.velocityY / currentSpeed) * nextSpeed;

  if (Math.abs(ball.velocityY) < nextSpeed * 0.22) {
    ball.velocityY = Math.sign(ball.velocityY || -1) * nextSpeed * 0.22;
    ball.velocityX =
      Math.sign(ball.velocityX || 1) *
      Math.sqrt(nextSpeed * nextSpeed - ball.velocityY * ball.velocityY);
  }
}

/** 挡板反弹时限制单次提速，避免减速道具结束后突然弹快 */
export function getCollisionBallSpeed(ball: Ball, targetSpeed: number) {
  const currentSpeed = Math.hypot(ball.velocityX, ball.velocityY) || targetSpeed;
  return targetSpeed > currentSpeed
    ? Math.min(targetSpeed, currentSpeed + 35)
    : targetSpeed;
}

/** 生成 React UI 需要的低频快照 */
export function toSnapshot(game: GameState): Snapshot {
  const time = performance.now();
  const activePowers: string[] = [];
  if (game.wideLevel > 0) {
    activePowers.push(`${getPowerupLabel('wide')} Lv.${game.wideLevel}`);
  }
  if (time < game.slowUntil) {
    activePowers.push(getPowerupLabel('slow'));
  }
  if (time < game.pierceUntil) {
    activePowers.push(getPowerupLabel('pierce'));
  }

  return {
    level: game.level,
    score: game.score,
    lives: game.lives,
    status: game.status,
    bestScore: game.bestScore,
    highestUnlocked: game.highestUnlocked,
    muted: game.muted,
    ballCount: game.balls.length,
    activePowers,
  };
}

/** 根据当前状态返回主操作按钮文案 */
export function getPrimaryActionLabel(status: GameState['status']) {
  return getActionLabel(status);
}
