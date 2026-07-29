import {
  LEVEL_CLEAR_PADDLE_FADE_MS,
  PAUSE_BUTTON_HEIGHT,
  PAUSE_BUTTON_MARGIN,
  PAUSE_BUTTON_WIDTH,
  POWERUPS,
} from './constants';
import { getBrickColor } from './game';
import {
  getObstacleCircle,
  getObstaclePolygonPoints,
  getPaddleRect,
  getRenderPixelRatio,
  getWorldViewport,
  isMobileRenderTarget,
  roundRect,
} from './geometry';
import i18n from './i18n';
import { getPowerupIcon } from './powerupIcons';
import type { Brick, GameState } from './types';

/** 静态背景缓存，避免每帧重复绘制网格和渐变 */
let backgroundCanvas: HTMLCanvasElement | null = null;
let backgroundWidth = 0;
let backgroundHeight = 0;

/** 绘制完整游戏画面 */
export function drawGame(
  context: CanvasRenderingContext2D,
  canvas: HTMLCanvasElement,
  game: GameState,
  time: number,
) {
  const canvasRect = canvas.getBoundingClientRect();
  const lowPowerRender = isMobileRenderTarget(canvasRect);
  const pixelRatio = getRenderPixelRatio(canvasRect);
  const targetWidth = Math.max(1, Math.floor(canvasRect.width * pixelRatio));
  const targetHeight = Math.max(1, Math.floor(canvasRect.height * pixelRatio));

  if (canvas.width !== targetWidth || canvas.height !== targetHeight) {
    canvas.width = targetWidth;
    canvas.height = targetHeight;
  }

  const { scaleX, scaleY, offsetX, offsetY, worldWidth, worldHeight } = getWorldViewport(
    targetWidth,
    targetHeight,
  );
  const shakeX = game.shake ? (Math.random() - 0.5) * game.shake : 0;
  const shakeY = game.shake ? (Math.random() - 0.5) * game.shake : 0;

  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, targetWidth, targetHeight);
  context.fillStyle = '#01030b';
  context.fillRect(0, 0, targetWidth, targetHeight);
  context.setTransform(
    scaleX,
    0,
    0,
    scaleY,
    offsetX + shakeX * scaleX,
    offsetY + shakeY * scaleY,
  );
  drawBackground(context, worldWidth, worldHeight);
  if (!shouldHideWorldBoundary(game)) {
    drawWorldBoundary(context, worldWidth, worldHeight, lowPowerRender);
  }
  drawBricks(context, game, lowPowerRender);
  drawPowerups(context, game);
  drawPaddle(context, game, time);
  drawBalls(context, game, time, lowPowerRender);
  drawAimGuide(context, game, lowPowerRender);
  drawParticles(context, game);
  drawLevelBadge(context, game);
  drawPauseButton(context, game);
}

/** 铺满视口时隐藏边界线，避免游戏中四周出现多余描边 */
function shouldHideWorldBoundary(game: GameState) {
  return (
    game.status === 'aiming' ||
    game.status === 'playing' ||
    game.status === 'paused' ||
    game.status === 'lifeLost' ||
    game.status === 'levelClear' ||
    game.status === 'gameOver'
  );
}

/** 绘制缓存背景 */
export function drawBackground(
  context: CanvasRenderingContext2D,
  worldWidth: number,
  worldHeight: number,
) {
  if (
    backgroundCanvas &&
    backgroundWidth === worldWidth &&
    backgroundHeight === worldHeight
  ) {
    context.drawImage(backgroundCanvas, 0, 0);
    return;
  }

  backgroundWidth = worldWidth;
  backgroundHeight = worldHeight;
  backgroundCanvas = document.createElement('canvas');
  backgroundCanvas.width = worldWidth;
  backgroundCanvas.height = worldHeight;
  const backgroundContext = backgroundCanvas.getContext('2d');
  if (!backgroundContext) {
    return;
  }

  const gradient = backgroundContext.createLinearGradient(0, 0, 0, worldHeight);
  gradient.addColorStop(0, '#0a1730');
  gradient.addColorStop(1, '#071020');
  backgroundContext.fillStyle = gradient;
  backgroundContext.fillRect(0, 0, worldWidth, worldHeight);

  backgroundContext.save();
  backgroundContext.strokeStyle = 'rgba(96, 239, 255, 0.08)';
  backgroundContext.lineWidth = 1;
  for (let lineX = 0; lineX <= worldWidth; lineX += 45) {
    backgroundContext.beginPath();
    backgroundContext.moveTo(lineX, 0);
    backgroundContext.lineTo(lineX, worldHeight);
    backgroundContext.stroke();
  }
  for (let lineY = 0; lineY <= worldHeight; lineY += 45) {
    backgroundContext.beginPath();
    backgroundContext.moveTo(0, lineY);
    backgroundContext.lineTo(worldWidth, lineY);
    backgroundContext.stroke();
  }
  backgroundContext.restore();
  context.drawImage(backgroundCanvas, 0, 0);
}

/** 绘制游戏逻辑区域边界，区分可操作区域和外部留黑 */
export function drawWorldBoundary(
  context: CanvasRenderingContext2D,
  worldWidth: number,
  worldHeight: number,
  lowPowerRender = false,
) {
  context.save();
  context.shadowColor = 'rgba(67, 245, 255, 0.42)';
  context.shadowBlur = lowPowerRender ? 0 : 14;
  context.strokeStyle = 'rgba(67, 245, 255, 0.42)';
  context.lineWidth = 4;
  context.strokeRect(2, 2, worldWidth - 4, worldHeight - 4);
  context.shadowBlur = 0;
  context.strokeStyle = 'rgba(255, 255, 255, 0.14)';
  context.lineWidth = 1.5;
  context.strokeRect(8, 8, worldWidth - 16, worldHeight - 16);
  context.restore();
}

/** 绘制砖块和拦截物 */
export function drawBricks(
  context: CanvasRenderingContext2D,
  game: GameState,
  lowPowerRender = false,
) {
  for (const brick of game.bricks) {
    const color = getBrickColor(brick);
    const brickRadius = Math.min(brick.height / 2, lowPowerRender ? 12 : 8);
    context.shadowColor = color;
    context.shadowBlur = 0;
    context.fillStyle = brick.obstacle ? getObstacleFill(context, brick) : color;
    drawBrickPath(context, brick, brickRadius);
    context.fill();

    if (lowPowerRender) {
      context.fillStyle = brick.obstacle
        ? 'rgba(255,255,255,0.12)'
        : 'rgba(255,255,255,0.15)';
      drawBrickGlossPath(context, brick, brickRadius);
      context.fill();
    } else {
      context.strokeStyle = brick.obstacle ? 'rgba(220,238,255,0.34)' : color;
      context.lineWidth = 1.5;
      drawBrickPath(context, brick, brickRadius);
      context.stroke();
      const gloss = context.createLinearGradient(
        brick.left,
        brick.top,
        brick.left,
        brick.top + brick.height,
      );
      gloss.addColorStop(0, 'rgba(255,255,255,0.32)');
      gloss.addColorStop(1, 'rgba(255,255,255,0.02)');
      context.fillStyle = gloss;
      drawBrickGlossPath(context, brick, brickRadius);
      context.fill();
    }

    if (!brick.obstacle && brick.maxHp > 1) {
      context.shadowBlur = 0;
      context.fillStyle = 'rgba(3, 8, 20, 0.72)';
      context.font = '700 14px Inter, system-ui, sans-serif';
      context.textAlign = 'center';
      context.textBaseline = 'middle';
      context.fillText(
        String(brick.hp),
        brick.left + brick.width / 2,
        brick.top + brick.height / 2 + 1,
      );
    }
  }
}

/** 拦截物使用冷色金属渐变，外形本身负责制造不同反弹轨道 */
function getObstacleFill(context: CanvasRenderingContext2D, brick: Brick) {
  const gradient = context.createLinearGradient(
    brick.left,
    brick.top,
    brick.left,
    brick.top + brick.height,
  );
  gradient.addColorStop(0, '#c9d4e4');
  gradient.addColorStop(0.52, '#8c9aae');
  gradient.addColorStop(1, '#566276');
  return gradient;
}

/** 绘制砖块或单格异形拦截物外轮廓 */
function drawBrickPath(context: CanvasRenderingContext2D, brick: Brick, radius: number) {
  if (!brick.obstacle || brick.obstacleShape === 'block') {
    roundRect(context, brick.left, brick.top, brick.width, brick.height, radius);
    return;
  }
  if (brick.obstacleShape === 'circle') {
    const { centerX, centerY, radius: circleRadius } = getObstacleCircle(brick);
    context.beginPath();
    context.arc(centerX, centerY, circleRadius, 0, Math.PI * 2);
    context.closePath();
    return;
  }

  const points = getObstaclePolygonPoints(brick);
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let pointIndex = 1; pointIndex < points.length; pointIndex += 1) {
    context.lineTo(points[pointIndex].x, points[pointIndex].y);
  }
  context.closePath();
}

/** 高光跟随外轮廓，避免障碍物内部再出现装饰符号 */
function drawBrickGlossPath(
  context: CanvasRenderingContext2D,
  brick: Brick,
  radius: number,
) {
  if (!brick.obstacle || brick.obstacleShape === 'block') {
    roundRect(
      context,
      brick.left + 3,
      brick.top + 3,
      brick.width - 6,
      brick.height / 2,
      6,
    );
    return;
  }

  const insetBrick = {
    ...brick,
    left: brick.left + 3,
    top: brick.top + 3,
    width: Math.max(1, brick.width - 6),
    height: Math.max(1, brick.height * 0.5 - 3),
  };
  drawBrickPath(context, insetBrick, Math.max(2, radius - 3));
}

/** 绘制挡板 */
export function drawPaddle(
  context: CanvasRenderingContext2D,
  game: GameState,
  time: number,
) {
  const opacity = getPaddleOpacity(game, time);
  if (opacity <= 0) {
    return;
  }

  const rect = getPaddleRect(game.paddle);
  const gradient = context.createLinearGradient(
    rect.left,
    rect.top,
    rect.left + rect.width,
    rect.top,
  );
  gradient.addColorStop(0, '#31e8ff');
  gradient.addColorStop(0.5, game.wideLevel > 0 ? '#fff56d' : '#ffffff');
  gradient.addColorStop(1, '#ff4fd8');

  context.save();
  context.globalAlpha = opacity;
  context.shadowBlur = 0;
  context.fillStyle = gradient;
  roundRect(context, rect.left, rect.top, rect.width, rect.height, rect.height / 2);
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.65)';
  context.lineWidth = 1.5;
  context.stroke();
  context.restore();
}

/** 通关后挡板仍绘制短暂淡出，但碰撞已立即失效 */
function getPaddleOpacity(game: GameState, time: number) {
  if (game.status !== 'levelClear' || game.levelClearAt <= 0) {
    return 1;
  }

  return Math.max(0, 1 - (time - game.levelClearAt) / LEVEL_CLEAR_PADDLE_FADE_MS);
}

/** 绘制所有小球 */
export function drawBalls(
  context: CanvasRenderingContext2D,
  game: GameState,
  time: number,
  lowPowerRender = false,
) {
  const piercing = time < game.pierceUntil;
  context.save();
  context.shadowColor = piercing ? '#ff5eea' : '#ffffff';
  context.shadowBlur = lowPowerRender || game.balls.length > 24 ? 0 : piercing ? 10 : 6;
  context.fillStyle = piercing ? '#ffb8f5' : '#ffffff';
  for (const ball of game.balls) {
    context.beginPath();
    context.arc(ball.centerX, ball.centerY, ball.radius, 0, Math.PI * 2);
    context.fill();
  }
  context.restore();
}

/** 瞄准状态下绘制发射方向指示线 */
export function drawAimGuide(
  context: CanvasRenderingContext2D,
  game: GameState,
  lowPowerRender = false,
) {
  if (game.status !== 'aiming' || !game.balls[0]) {
    return;
  }

  const ball = game.balls[0];
  const guidePoints = [{ x: ball.centerX, y: ball.centerY }];
  let currentX = ball.centerX;
  let currentY = ball.centerY;
  let aimAngle = game.aimAngle;
  let remainingLength = 1500;

  while (remainingLength > 1 && guidePoints.length < 8) {
    const directionX = Math.cos(aimAngle);
    const directionY = Math.sin(aimAngle);
    const distanceToSide =
      Math.abs(directionX) < 0.0001
        ? Infinity
        : directionX > 0
          ? (game.worldWidth - ball.radius - currentX) / directionX
          : (ball.radius - currentX) / directionX;
    const distanceToBrick = getNearestAimBrickDistance(
      game,
      currentX,
      currentY,
      directionX,
      directionY,
    );
    const segmentLength = Math.min(remainingLength, distanceToSide, distanceToBrick);
    if (!Number.isFinite(segmentLength) || segmentLength <= 0) {
      break;
    }

    currentX += directionX * segmentLength;
    currentY += directionY * segmentLength;
    guidePoints.push({ x: currentX, y: currentY });
    remainingLength -= segmentLength;

    if (distanceToBrick <= segmentLength + 0.01) {
      break;
    }
    if (distanceToSide > segmentLength + 0.01) {
      break;
    }
    currentX = Math.max(ball.radius, Math.min(game.worldWidth - ball.radius, currentX));
    aimAngle = Math.PI - aimAngle;
  }
  const endPoint = guidePoints[guidePoints.length - 1];

  context.save();
  context.shadowColor = '#43f5ff';
  context.shadowBlur = lowPowerRender ? 0 : 6;
  context.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  context.lineWidth = 2;
  context.setLineDash([10, 8]);
  context.beginPath();
  context.moveTo(guidePoints[0].x, guidePoints[0].y);
  for (const point of guidePoints.slice(1)) {
    context.lineTo(point.x, point.y);
  }
  context.stroke();
  context.setLineDash([]);
  context.shadowBlur = lowPowerRender ? 0 : 8;
  context.strokeStyle = 'rgba(67, 245, 255, 0.84)';
  context.lineWidth = 1.5;
  context.beginPath();
  context.arc(endPoint.x, endPoint.y, 8, 0, Math.PI * 2);
  context.stroke();
  context.restore();
}

/** 返回瞄准射线首次碰到砖块或拦截物的距离 */
function getNearestAimBrickDistance(
  game: GameState,
  originX: number,
  originY: number,
  directionX: number,
  directionY: number,
) {
  let nearestDistance = Infinity;
  for (const brick of game.bricks) {
    nearestDistance = Math.min(
      nearestDistance,
      getRayRectDistance(originX, originY, directionX, directionY, brick),
    );
  }
  return nearestDistance;
}

/** 射线与矩形的最近正向交点距离，用于让瞄准线刚碰到砖块就停止 */
function getRayRectDistance(
  originX: number,
  originY: number,
  directionX: number,
  directionY: number,
  rect: { left: number; top: number; width: number; height: number },
) {
  let nearDistance = -Infinity;
  let farDistance = Infinity;

  if (Math.abs(directionX) < 0.0001) {
    if (originX < rect.left || originX > rect.left + rect.width) {
      return Infinity;
    }
  } else {
    const distanceA = (rect.left - originX) / directionX;
    const distanceB = (rect.left + rect.width - originX) / directionX;
    nearDistance = Math.max(nearDistance, Math.min(distanceA, distanceB));
    farDistance = Math.min(farDistance, Math.max(distanceA, distanceB));
  }

  if (Math.abs(directionY) < 0.0001) {
    if (originY < rect.top || originY > rect.top + rect.height) {
      return Infinity;
    }
  } else {
    const distanceA = (rect.top - originY) / directionY;
    const distanceB = (rect.top + rect.height - originY) / directionY;
    nearDistance = Math.max(nearDistance, Math.min(distanceA, distanceB));
    farDistance = Math.min(farDistance, Math.max(distanceA, distanceB));
  }

  if (farDistance < Math.max(nearDistance, 0)) {
    return Infinity;
  }
  return nearDistance > 0.0001 ? nearDistance : Infinity;
}

/** 绘制掉落中的道具 */
export function drawPowerups(context: CanvasRenderingContext2D, game: GameState) {
  for (const powerup of game.powerups) {
    const meta = POWERUPS[powerup.type];
    context.save();
    context.shadowBlur = 0;
    context.fillStyle = meta.color;
    context.beginPath();
    context.arc(powerup.centerX, powerup.centerY, powerup.size, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = 'rgba(255, 255, 255, 0.52)';
    context.lineWidth = 1.4;
    context.stroke();
    const icon = getPowerupIcon(powerup.type);
    if (icon.complete && icon.naturalWidth > 0) {
      context.drawImage(icon, powerup.centerX - 11, powerup.centerY - 11, 22, 22);
    }
    context.restore();
  }
}

/** 绘制砖块破碎粒子 */
export function drawParticles(context: CanvasRenderingContext2D, game: GameState) {
  context.save();
  for (const particle of game.particles) {
    context.globalAlpha = Math.min(Math.max(particle.ttl / 0.6, 0), 1);
    context.fillStyle = particle.color;
    context.fillRect(particle.centerX, particle.centerY, particle.size, particle.size);
  }
  context.restore();
}

/** 绘制 Canvas 内暂停按钮，方便移动端游戏中暂停 */
export function drawPauseButton(context: CanvasRenderingContext2D, game: GameState) {
  if (game.status !== 'playing') {
    return;
  }

  const left = game.worldWidth - PAUSE_BUTTON_MARGIN - PAUSE_BUTTON_WIDTH;
  context.save();
  context.fillStyle = 'rgba(5, 7, 17, 0.62)';
  roundRect(
    context,
    left,
    PAUSE_BUTTON_MARGIN,
    PAUSE_BUTTON_WIDTH,
    PAUSE_BUTTON_HEIGHT,
    18,
  );
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.28)';
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = '#f4f7ff';
  context.font = '800 16px Inter, system-ui, sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText(
    i18n.t('canvas.pause'),
    left + PAUSE_BUTTON_WIDTH / 2,
    PAUSE_BUTTON_MARGIN + PAUSE_BUTTON_HEIGHT / 2,
  );
  context.restore();
}

/** 绘制游戏内当前关卡角标，补充全屏游戏时隐藏的顶部统计 */
export function drawLevelBadge(context: CanvasRenderingContext2D, game: GameState) {
  if (game.status === 'ready') {
    return;
  }

  const label = `${i18n.t('stats.level')} ${game.level}`;
  const left = 14;
  const height = 30;
  const bottom = game.worldHeight - 14;

  context.save();
  context.font = '800 15px Inter, system-ui, sans-serif';
  const width = Math.ceil(context.measureText(label).width) + 24;
  context.fillStyle = 'rgba(5, 7, 17, 0.58)';
  roundRect(context, left, bottom - height, width, height, 15);
  context.fill();
  context.strokeStyle = 'rgba(255, 255, 255, 0.2)';
  context.lineWidth = 1.2;
  context.stroke();
  context.fillStyle = '#f4f7ff';
  context.textAlign = 'left';
  context.textBaseline = 'middle';
  context.fillText(label, left + 12, bottom - height / 2 + 1);
  context.restore();
}
