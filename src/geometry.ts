import {
  MAX_CANVAS_PIXELS,
  MAX_RENDER_PIXEL_RATIO,
  MOBILE_MAX_CANVAS_PIXELS,
  MOBILE_RENDER_PIXEL_RATIO,
  PADDLE_BASE_WIDTH,
  PADDLE_MAX_WIDE_LEVEL,
  PORTRAIT_WORLD_HEIGHT,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from './constants';
import type { Ball, Brick, GameState, Paddle, Powerup, RectLike } from './types';
import { clamp } from './utils';

type Point = { x: number; y: number };

/** 绘制圆角矩形路径，不直接填充或描边 */
export function roundRect(
  context: CanvasRenderingContext2D,
  left: number,
  top: number,
  width: number,
  height: number,
  radius: number,
) {
  const safeRadius = Math.max(0, Math.min(radius, width / 2, height / 2));
  context.beginPath();
  context.moveTo(left + safeRadius, top);
  context.arcTo(left + width, top, left + width, top + height, safeRadius);
  context.arcTo(left + width, top + height, left, top + height, safeRadius);
  context.arcTo(left, top + height, left, top, safeRadius);
  context.arcTo(left, top, left + width, top, safeRadius);
  context.closePath();
}

/** 判断圆形是否和矩形相交 */
export function circleIntersectsRect(
  ball: Pick<Ball, 'centerX' | 'centerY' | 'radius'>,
  rect: RectLike,
) {
  const nearestX = clamp(ball.centerX, rect.left, rect.left + rect.width);
  const nearestY = clamp(ball.centerY, rect.top, rect.top + rect.height);
  const distanceX = ball.centerX - nearestX;
  const distanceY = ball.centerY - nearestY;
  return distanceX * distanceX + distanceY * distanceY <= ball.radius * ball.radius;
}

/** 判断圆形是否碰到砖块或单格异形拦截物 */
export function circleIntersectsBrick(
  ball: Pick<Ball, 'centerX' | 'centerY' | 'radius'>,
  brick: Brick,
) {
  if (!brick.obstacle || brick.obstacleShape === 'block') {
    return circleIntersectsRect(ball, brick);
  }

  if (!circleIntersectsRect(ball, brick)) {
    return false;
  }
  if (brick.obstacleShape === 'circle') {
    const obstacleCircle = getObstacleCircle(brick);
    const hitDistance = ball.radius + obstacleCircle.radius;
    const distanceX = ball.centerX - obstacleCircle.centerX;
    const distanceY = ball.centerY - obstacleCircle.centerY;
    return distanceX * distanceX + distanceY * distanceY <= hitDistance * hitDistance;
  }

  return circleIntersectsPolygon(ball, getObstaclePolygonPoints(brick));
}

/** 单格圆形拦截物参数，渲染和碰撞共用 */
export function getObstacleCircle(brick: Brick) {
  return {
    centerX: brick.left + brick.width / 2,
    centerY: brick.top + brick.height / 2,
    radius: Math.min(brick.width, brick.height) * 0.48,
  };
}

/** 单格异形拦截物的外轮廓点，渲染和碰撞共用 */
export function getObstaclePolygonPoints(brick: Brick) {
  const left = brick.left;
  const right = brick.left + brick.width;
  const top = brick.top;
  const bottom = brick.top + brick.height;
  const centerX = brick.left + brick.width / 2;
  const centerY = brick.top + brick.height / 2;
  const skew = Math.min(brick.width * 0.22, brick.height * 0.55);

  if (brick.obstacleShape === 'diamond') {
    return [
      { x: centerX, y: top + 1 },
      { x: right - 1, y: centerY },
      { x: centerX, y: bottom - 1 },
      { x: left + 1, y: centerY },
    ];
  }
  if (brick.obstacleShape === 'slopeLeft') {
    return [
      { x: left + skew, y: top },
      { x: right, y: top },
      { x: right - skew, y: bottom },
      { x: left, y: bottom },
    ];
  }
  if (brick.obstacleShape === 'slopeRight') {
    return [
      { x: left, y: top },
      { x: right - skew, y: top },
      { x: right, y: bottom },
      { x: left + skew, y: bottom },
    ];
  }
  if (brick.obstacleShape === 'wedgeLeft') {
    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right, y: bottom },
      { x: left + brick.width * 0.34, y: bottom },
    ];
  }
  if (brick.obstacleShape === 'wedgeRight') {
    return [
      { x: left, y: top },
      { x: right, y: top },
      { x: right - brick.width * 0.34, y: bottom },
      { x: left, y: bottom },
    ];
  }

  return [
    { x: left, y: top },
    { x: right, y: top },
    { x: right, y: bottom },
    { x: left, y: bottom },
  ];
}

/** 判断圆形是否和凸多边形相交，避免采样漏判斜边或尖角 */
function circleIntersectsPolygon(
  ball: Pick<Ball, 'centerX' | 'centerY' | 'radius'>,
  points: Point[],
) {
  if (pointInPolygon(ball.centerX, ball.centerY, points)) {
    return true;
  }

  const radiusSquared = ball.radius * ball.radius;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    const start = points[pointIndex];
    const end = points[(pointIndex + 1) % points.length];
    const closest = getClosestPointOnSegment(
      ball.centerX,
      ball.centerY,
      start.x,
      start.y,
      end.x,
      end.y,
    );
    const distanceX = ball.centerX - closest.x;
    const distanceY = ball.centerY - closest.y;
    if (distanceX * distanceX + distanceY * distanceY <= radiusSquared) {
      return true;
    }
  }

  return false;
}

/** 射线法判断点是否在多边形内 */
function pointInPolygon(x: number, y: number, points: Point[]) {
  let inside = false;
  for (
    let index = 0, previousIndex = points.length - 1;
    index < points.length;
    previousIndex = index, index += 1
  ) {
    const point = points[index];
    const previousPoint = points[previousIndex];
    const crossesRay = point.y > y !== previousPoint.y > y;
    if (
      crossesRay &&
      x <
        ((previousPoint.x - point.x) * (y - point.y)) / (previousPoint.y - point.y || 1) +
          point.x
    ) {
      inside = !inside;
    }
  }
  return inside;
}

/** 将挡板中心点结构转换成矩形结构 */
export function getPaddleRect(paddle: Paddle): RectLike {
  return {
    left: paddle.centerX - paddle.width / 2,
    top: paddle.top,
    width: paddle.width,
    height: paddle.height,
  };
}

/** 将圆形道具转换为圆形碰撞结构 */
export function powerupToBall(powerup: Powerup) {
  return {
    centerX: powerup.centerX,
    centerY: powerup.centerY,
    radius: powerup.size,
  };
}

/** 移动挡板并限制在游戏世界内 */
export function movePaddleTo(game: GameState, centerX: number) {
  game.paddle.centerX = clamp(
    centerX,
    game.paddle.width / 2 + 8,
    game.worldWidth - game.paddle.width / 2 - 8,
  );
}

/** 将加宽等级线性映射为挡板宽度，5 级正好是当前游戏视口一半 */
export function getPaddleWidth(wideLevel: number, worldWidth: number) {
  const safeWideLevel = clamp(wideLevel, 0, PADDLE_MAX_WIDE_LEVEL);
  return (
    PADDLE_BASE_WIDTH +
    ((worldWidth / 2 - PADDLE_BASE_WIDTH) * safeWideLevel) / PADDLE_MAX_WIDE_LEVEL
  );
}

/** 计算 Canvas CSS 尺寸到游戏世界坐标的缩放比例 */
export function getCanvasWorldScale(canvas: HTMLCanvasElement) {
  const rect = canvas.getBoundingClientRect();
  return getWorldViewport(rect.width, rect.height).scaleX || 1;
}

/** 将浏览器客户区坐标转换为游戏世界坐标 */
export function getCanvasWorldPoint(
  canvas: HTMLCanvasElement,
  clientX: number,
  clientY: number,
) {
  const rect = canvas.getBoundingClientRect();
  const { scaleX, scaleY, offsetX, offsetY } = getWorldViewport(rect.width, rect.height);
  const safeScaleX = scaleX || 1;
  const safeScaleY = scaleY || 1;
  return {
    x: (clientX - rect.left - offsetX) / safeScaleX,
    y: (clientY - rect.top - offsetY) / safeScaleY,
  };
}

/** 计算实际渲染像素比，兼顾清晰度和发热控制 */
export function getRenderPixelRatio(rect: DOMRect) {
  const mobileRender = isMobileRenderTarget(rect);
  const maxRenderPixelRatio = mobileRender
    ? MOBILE_RENDER_PIXEL_RATIO
    : MAX_RENDER_PIXEL_RATIO;
  const maxCanvasPixels = mobileRender ? MOBILE_MAX_CANVAS_PIXELS : MAX_CANVAS_PIXELS;
  const rawPixelRatio = Math.min(window.devicePixelRatio || 1, maxRenderPixelRatio);
  const maxPixelRatioByArea = Math.sqrt(
    maxCanvasPixels / Math.max(1, rect.width * rect.height),
  );
  return Math.max(0.75, Math.min(rawPixelRatio, maxPixelRatioByArea));
}

/** 判断当前视口是否启用移动端轻量绘制模式 */
export function isMobileRenderTarget(rect: Pick<DOMRect, 'width' | 'height'>) {
  const coarsePointer = window.matchMedia?.('(pointer: coarse)').matches ?? false;
  return coarsePointer || rect.width < 760 || rect.height > rect.width;
}

type RectSide = 'left' | 'right' | 'top' | 'bottom';

/** 按运动方向和最小重叠方向反弹小球 */
export function reflectBallFromRect(ball: Ball, rect: RectLike) {
  const overlapLeft = ball.centerX + ball.radius - rect.left;
  const overlapRight = rect.left + rect.width - (ball.centerX - ball.radius);
  const overlapTop = ball.centerY + ball.radius - rect.top;
  const overlapBottom = rect.top + rect.height - (ball.centerY - ball.radius);
  let selectedSide: RectSide = 'left';
  let selectedOverlap = Infinity;
  let hasApproachSide = false;

  const considerApproach = (side: RectSide, overlap: number) => {
    if (overlap <= 0) {
      return;
    }
    if (!hasApproachSide || overlap < selectedOverlap) {
      selectedSide = side;
      selectedOverlap = overlap;
      hasApproachSide = true;
    }
  };

  if (ball.velocityX > 0) considerApproach('left', overlapLeft);
  if (ball.velocityX < 0) considerApproach('right', overlapRight);
  if (ball.velocityY > 0) considerApproach('top', overlapTop);
  if (ball.velocityY < 0) considerApproach('bottom', overlapBottom);

  if (!hasApproachSide) {
    selectedSide = 'left';
    selectedOverlap = Infinity;
    const considerPositive = (side: RectSide, overlap: number) => {
      if (overlap > 0 && overlap < selectedOverlap) {
        selectedSide = side;
        selectedOverlap = overlap;
      }
    };
    considerPositive('left', overlapLeft);
    considerPositive('right', overlapRight);
    considerPositive('top', overlapTop);
    considerPositive('bottom', overlapBottom);
  }

  if (selectedSide === 'left') {
    ball.centerX = rect.left - ball.radius - 0.5;
    ball.velocityX = -Math.abs(ball.velocityX);
  } else if (selectedSide === 'right') {
    ball.centerX = rect.left + rect.width + ball.radius + 0.5;
    ball.velocityX = Math.abs(ball.velocityX);
  } else if (selectedSide === 'top') {
    ball.centerY = rect.top - ball.radius - 0.5;
    ball.velocityY = -Math.abs(ball.velocityY);
  } else {
    ball.centerY = rect.top + rect.height + ball.radius + 0.5;
    ball.velocityY = Math.abs(ball.velocityY);
  }
}

/** 单格异形拦截物按最近边或圆心反弹，产生更丰富轨道 */
export function reflectBallFromBrick(ball: Ball, brick: Brick) {
  if (!brick.obstacle || brick.obstacleShape === 'block') {
    reflectBallFromRect(ball, brick);
    return;
  }
  if (brick.obstacleShape === 'circle') {
    reflectBallFromCircleObstacle(ball, brick);
    return;
  }

  const points = getObstaclePolygonPoints(brick);
  const inside = pointInPolygon(ball.centerX, ball.centerY, points);
  const clockwise = getPolygonSignedArea(points) > 0;
  let nearestContact = {
    point: points[0],
    start: points[0],
    end: points[1] ?? points[0],
    distance: Infinity,
  };
  let nearestNormal = { x: 0, y: -1 };
  let nearestDistance = Infinity;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    const start = points[pointIndex];
    const end = points[(pointIndex + 1) % points.length];
    const closest = getClosestPointOnSegment(
      ball.centerX,
      ball.centerY,
      start.x,
      start.y,
      end.x,
      end.y,
    );
    const distance = Math.hypot(ball.centerX - closest.x, ball.centerY - closest.y);
    if (distance < nearestDistance) {
      nearestContact = { point: closest, start, end, distance };
      nearestDistance = distance;
    }
  }

  if (inside) {
    nearestNormal = getOutwardEdgeNormal(
      nearestContact.start,
      nearestContact.end,
      clockwise,
    );
  } else if (nearestContact.distance > 0) {
    nearestNormal = {
      x: (ball.centerX - nearestContact.point.x) / nearestContact.distance,
      y: (ball.centerY - nearestContact.point.y) / nearestContact.distance,
    };
  } else {
    nearestNormal = getOutwardEdgeNormal(
      nearestContact.start,
      nearestContact.end,
      clockwise,
    );
  }

  const pushDistance = inside
    ? ball.radius + nearestDistance + 0.5
    : Math.max(1.5, ball.radius - nearestDistance + 0.5);
  reflectBallByNormal(ball, nearestNormal.x, nearestNormal.y, pushDistance);
}

/** 圆形拦截物按圆心法线反弹 */
function reflectBallFromCircleObstacle(ball: Ball, brick: Brick) {
  const obstacleCircle = getObstacleCircle(brick);
  let distanceX = ball.centerX - obstacleCircle.centerX;
  let distanceY = ball.centerY - obstacleCircle.centerY;
  let distance = Math.hypot(distanceX, distanceY);
  if (distance === 0) {
    const speed = Math.hypot(ball.velocityX, ball.velocityY) || 1;
    distanceX = -ball.velocityX / speed;
    distanceY = -ball.velocityY / speed;
    distance = 1;
  }
  const pushDistance = Math.max(
    1.5,
    ball.radius + obstacleCircle.radius - distance + 0.5,
  );
  reflectBallByNormal(ball, distanceX / distance, distanceY / distance, pushDistance);
}

/** 用法线反射速度，并轻微推出避免连续碰撞 */
function reflectBallByNormal(
  ball: Ball,
  normalX: number,
  normalY: number,
  pushDistance = 1.5,
) {
  const dot = ball.velocityX * normalX + ball.velocityY * normalY;
  if (dot < 0) {
    ball.velocityX -= 2 * dot * normalX;
    ball.velocityY -= 2 * dot * normalY;
  }
  ball.centerX += normalX * pushDistance;
  ball.centerY += normalY * pushDistance;
}

/** 多边形有向面积，用于判断边的外侧方向 */
function getPolygonSignedArea(points: Point[]) {
  let area = 0;
  for (let pointIndex = 0; pointIndex < points.length; pointIndex += 1) {
    const point = points[pointIndex];
    const nextPoint = points[(pointIndex + 1) % points.length];
    area += point.x * nextPoint.y - nextPoint.x * point.y;
  }
  return area / 2;
}

/** 根据顶点顺序计算多边形边的外侧法线 */
function getOutwardEdgeNormal(start: Point, end: Point, clockwise: boolean) {
  const edgeX = end.x - start.x;
  const edgeY = end.y - start.y;
  const normalX = clockwise ? edgeY : -edgeY;
  const normalY = clockwise ? -edgeX : edgeX;
  const length = Math.hypot(normalX, normalY) || 1;
  return { x: normalX / length, y: normalY / length };
}

/** 点到线段最近点，用于多边形边反弹 */
function getClosestPointOnSegment(
  pointX: number,
  pointY: number,
  startX: number,
  startY: number,
  endX: number,
  endY: number,
) {
  const segmentX = endX - startX;
  const segmentY = endY - startY;
  const segmentLengthSquared = segmentX * segmentX + segmentY * segmentY || 1;
  const ratio = clamp(
    ((pointX - startX) * segmentX + (pointY - startY) * segmentY) / segmentLengthSquared,
    0,
    1,
  );
  return {
    x: startX + segmentX * ratio,
    y: startY + segmentY * ratio,
  };
}

/** 根据画布宽高选择当前使用的逻辑世界尺寸 */
export function getWorldSizeForViewport(targetWidth: number, targetHeight: number) {
  const safeAspectRatio =
    targetWidth > 0 && targetHeight > 0
      ? targetWidth / targetHeight
      : WORLD_WIDTH / WORLD_HEIGHT;
  const isPortrait = targetWidth < targetHeight;
  const worldHeight = isPortrait ? PORTRAIT_WORLD_HEIGHT : WORLD_HEIGHT;
  return {
    worldWidth: worldHeight * safeAspectRatio,
    worldHeight,
  };
}

/** 返回逻辑画布区域，始终等比缩放以避免小球和砖块变形 */
export function getWorldViewport(targetWidth: number, targetHeight: number) {
  const { worldWidth, worldHeight } = getWorldSizeForViewport(targetWidth, targetHeight);
  const scale = Math.min(targetWidth / worldWidth, targetHeight / worldHeight);
  return {
    scale,
    scaleX: scale,
    scaleY: scale,
    worldWidth,
    worldHeight,
    offsetX: (targetWidth - worldWidth * scale) / 2,
    offsetY: (targetHeight - worldHeight * scale) / 2,
  };
}
