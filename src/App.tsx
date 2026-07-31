import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { unlockAudio } from './audio';
import {
  BALL_LIMIT_OPTIONS,
  BRICK_SURGE_MODES,
  IDLE_FRAME_MS,
  MAX_AIM_ANGLE,
  MIN_AIM_ANGLE,
  PAUSE_BUTTON_HEIGHT,
  PAUSE_BUTTON_MARGIN,
  PAUSE_BUTTON_WIDTH,
  PLAYING_FRAME_MS,
  POINTER_LOCK_SENSITIVITY,
  SNAPSHOT_INTERVAL_MS,
} from './constants';
import {
  aimAtPoint,
  createGame,
  getPrimaryActionLabel,
  goToNextLevel,
  launchAimedBall,
  resetLevel,
  retryLevel,
  setGameConfig,
  syncGameLayout,
  toSnapshot,
  updateGame,
} from './game';
import {
  getCanvasWorldPoint,
  getCanvasWorldScale,
  getWorldSizeForViewport,
  movePaddleTo,
} from './geometry';
import {
  changeLanguage as switchLanguage,
  getStatusText,
  type Language,
  LANGUAGE_LABELS,
  SUPPORTED_LANGUAGES,
} from './i18n';
import { drawGame } from './render';
import { persistStoredState, readStoredState } from './storage';
import type { BallLimit, BrickSurgeMode, GameConfig, Snapshot } from './types';

/** 游戏 React 容器，只负责 UI、输入和浏览器能力接入 */
export default function App() {
  const { t, i18n } = useTranslation();
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const gameRef = useRef(createGame(readStoredState()));
  const aimingTouchPointerIdRef = useRef<number | null>(null);
  const aimingPointerClientXRef = useRef<number | null>(null);
  const [snapshot, setSnapshot] = useState<Snapshot>(() => toSnapshot(gameRef.current));
  const [menuOpen, setMenuOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const activeLanguage = i18n.resolvedLanguage || i18n.language;
  const currentLanguage = SUPPORTED_LANGUAGES.includes(activeLanguage as Language)
    ? (activeLanguage as Language)
    : 'en';

  /** 将可变游戏状态同步成低频 React 快照 */
  const syncSnapshot = useCallback(() => {
    setSnapshot(toSnapshot(gameRef.current));
  }, []);

  /** 切换界面语言并刷新低频快照里的道具文案 */
  const changeLanguage = useCallback(
    (event: React.ChangeEvent<HTMLSelectElement>) => {
      const language = event.target.value as Language;
      void switchLanguage(language).then(syncSnapshot);
    },
    [syncSnapshot],
  );

  useEffect(() => {
    document.title = t('app.title');
    document.documentElement.lang = currentLanguage;
  }, [currentLanguage, t]);

  /** 鼠标模式使用 Pointer Lock，避免鼠标移出游戏区域导致失控 */
  const lockGamePointer = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || document.pointerLockElement === canvas) {
      return;
    }

    try {
      const result = canvas.requestPointerLock?.() as Promise<void> | undefined;
      void result?.catch?.(() => undefined);
    } catch {
      // Pointer Lock 是可选增强，失败时继续使用普通鼠标坐标
    }
  }, []);

  /** 释放游戏鼠标锁 */
  const exitGamePointerLock = useCallback(() => {
    if (document.pointerLockElement === canvasRef.current) {
      document.exitPointerLock?.();
    }
  }, []);

  /** 开始、继续、重试失败关卡或进入下一关 */
  const startOrAdvance = useCallback(() => {
    const game = gameRef.current;
    aimingTouchPointerIdRef.current = null;
    aimingPointerClientXRef.current = null;
    setMenuOpen(false);
    setHelpOpen(false);
    setSettingsOpen(false);
    unlockAudio(game);

    if (game.status === 'levelClear') {
      goToNextLevel(game);
      game.status = 'aiming';
    } else if (game.status === 'gameOver') {
      retryLevel(game);
      game.status = 'aiming';
    } else if (game.status === 'lifeLost') {
      game.status = 'aiming';
    } else if (game.status === 'aiming') {
      launchAimedBall(game, performance.now());
    } else if (game.status === 'paused') {
      game.status = 'playing';
    } else if (game.status === 'ready') {
      game.status = 'aiming';
    }

    if (game.status === 'playing') {
      lockGamePointer();
    }

    syncSnapshot();
  }, [lockGamePointer, syncSnapshot]);

  /** 切换暂停，暂停时释放鼠标锁 */
  const togglePause = useCallback(() => {
    const game = gameRef.current;
    if (game.status === 'playing') {
      game.status = 'paused';
      exitGamePointerLock();
      setMenuOpen(false);
      setHelpOpen(false);
      setSettingsOpen(false);
    } else if (game.status === 'paused') {
      game.status = 'playing';
      lockGamePointer();
      setMenuOpen(false);
      setHelpOpen(false);
      setSettingsOpen(false);
    }
    syncSnapshot();
  }, [exitGamePointerLock, lockGamePointer, syncSnapshot]);

  /** 游戏内死亡/失败弹窗使用的重试本关 */
  const retryCurrentLevel = useCallback(() => {
    retryLevel(gameRef.current);
    gameRef.current.status = 'aiming';
    setMenuOpen(false);
    setHelpOpen(false);
    setSettingsOpen(false);
    exitGamePointerLock();
    syncSnapshot();
  }, [exitGamePointerLock, syncSnapshot]);

  /** 从游戏内弹窗返回主菜单，保留当前状态以便继续或下一步 */
  const returnToMenu = useCallback(() => {
    aimingTouchPointerIdRef.current = null;
    aimingPointerClientXRef.current = null;
    setMenuOpen(true);
    setHelpOpen(false);
    setSettingsOpen(false);
    exitGamePointerLock();
    syncSnapshot();
  }, [exitGamePointerLock, syncSnapshot]);

  /** 保存并应用首页玩法配置 */
  const changeGameConfig = useCallback(
    (config: GameConfig) => {
      const game = gameRef.current;
      setGameConfig(game, config);
      persistStoredState(game);
      syncSnapshot();
    },
    [syncSnapshot],
  );

  /** 切换静音并保存偏好 */
  const toggleMuted = useCallback(() => {
    const game = gameRef.current;
    game.muted = !game.muted;
    persistStoredState(game);
    syncSnapshot();
  }, [syncSnapshot]);

  /** 重置本地关卡记录和最高分，保留静音偏好 */
  const resetProgress = useCallback(() => {
    if (!window.confirm(t('app.resetConfirm'))) {
      return;
    }

    const game = gameRef.current;
    game.highestUnlocked = 1;
    game.bestScore = 0;
    game.level = 1;
    game.score = 0;
    game.levelStartScore = 0;
    resetLevel(game, 1);
    persistStoredState(game);
    setMenuOpen(false);
    setHelpOpen(false);
    setSettingsOpen(false);
    exitGamePointerLock();
    syncSnapshot();
  }, [exitGamePointerLock, syncSnapshot, t]);

  /** 使用鼠标或触摸的屏幕 X 坐标控制挡板 */
  const movePaddleFromClientX = useCallback((clientX: number) => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    movePaddleTo(game, getCanvasWorldPoint(canvas, clientX, 0).x);
  }, []);

  /** 瞄准态只调整弹道角度，不移动挡板和待发球 */
  const aimFromClientPoint = useCallback((clientX: number, clientY: number) => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    const point = getCanvasWorldPoint(canvas, clientX, clientY);
    const previousClientX = aimingPointerClientXRef.current;
    if (previousClientX === null) {
      aimAtPoint(game, point.x, point.y);
    } else {
      game.aimAngle = Math.min(
        MAX_AIM_ANGLE,
        Math.max(MIN_AIM_ANGLE, game.aimAngle + (clientX - previousClientX) * 0.01),
      );
    }
    aimingPointerClientXRef.current = clientX;
  }, []);

  /** Pointer Lock 生效时用相对位移控制挡板 */
  const movePaddleByClientDelta = useCallback((deltaX: number) => {
    const game = gameRef.current;
    const canvas = canvasRef.current;
    if (!canvas) {
      return;
    }

    movePaddleTo(
      game,
      game.paddle.centerX +
        (deltaX * POINTER_LOCK_SENSITIVITY) / getCanvasWorldScale(canvas),
    );
  }, []);

  /** 处理画布按下：运行态移动挡板，瞄准态鼠标点击直接发射 */
  const handlePointerDown = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      event.preventDefault();
      try {
        event.currentTarget.setPointerCapture(event.pointerId);
      } catch {
        // 旧移动浏览器可能不支持 Pointer Capture，失败不影响触摸控制
      }
      const game = gameRef.current;
      if (game.status === 'playing') {
        const point = getCanvasWorldPoint(
          event.currentTarget,
          event.clientX,
          event.clientY,
        );
        if (isPauseButtonPoint(game.worldWidth, point.x, point.y)) {
          togglePause();
          return;
        }
        movePaddleFromClientX(event.clientX);
        if (event.pointerType === 'mouse') {
          lockGamePointer();
        }
        return;
      }

      if (game.status === 'aiming') {
        if (event.pointerType === 'touch' || event.pointerType === 'pen') {
          aimFromClientPoint(event.clientX, event.clientY);
          aimingTouchPointerIdRef.current = event.pointerId;
          return;
        }
        startOrAdvance();
        return;
      }

      startOrAdvance();
    },
    [
      aimFromClientPoint,
      lockGamePointer,
      movePaddleFromClientX,
      startOrAdvance,
      togglePause,
    ],
  );

  /** 处理画布内鼠标和触摸移动 */
  const handlePointerMove = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (gameRef.current.status === 'aiming') {
        if (
          (event.pointerType === 'touch' || event.pointerType === 'pen') &&
          aimingTouchPointerIdRef.current !== null &&
          aimingTouchPointerIdRef.current !== event.pointerId
        ) {
          return;
        }
        event.preventDefault();
        aimFromClientPoint(event.clientX, event.clientY);
        return;
      }
      if (gameRef.current.status !== 'playing') {
        return;
      }
      if (document.pointerLockElement === canvasRef.current) {
        return;
      }
      if (event.pointerType !== 'mouse' && event.buttons !== 1) {
        return;
      }
      event.preventDefault();
      movePaddleFromClientX(event.clientX);
    },
    [aimFromClientPoint, movePaddleFromClientX],
  );

  /** 触摸和触控笔在松手时发射，给移动端留出拖动瞄准时间 */
  const handlePointerUp = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (
        gameRef.current.status !== 'aiming' ||
        aimingTouchPointerIdRef.current !== event.pointerId
      ) {
        return;
      }

      event.preventDefault();
      aimingTouchPointerIdRef.current = null;
      aimFromClientPoint(event.clientX, event.clientY);
      startOrAdvance();
    },
    [aimFromClientPoint, startOrAdvance],
  );

  /** 触摸被系统取消时只清理指针状态，不误发射 */
  const handlePointerCancel = useCallback(
    (event: React.PointerEvent<HTMLCanvasElement>) => {
      if (aimingTouchPointerIdRef.current === event.pointerId) {
        aimingTouchPointerIdRef.current = null;
        aimingPointerClientXRef.current = null;
      }
    },
    [],
  );

  useEffect(() => {
    const game = gameRef.current;

    /** 键盘控制挡板、开始和暂停 */
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') {
        game.keyboardDirection = -1;
      } else if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') {
        game.keyboardDirection = 1;
      } else if (event.code === 'Space') {
        event.preventDefault();
        if (game.status === 'playing') {
          togglePause();
        } else {
          startOrAdvance();
        }
      } else if (event.key === 'Escape' || event.key.toLowerCase() === 'p') {
        togglePause();
      }
    };

    /** 松开键盘时停止对应方向移动 */
    const handleKeyUp = (event: KeyboardEvent) => {
      if (
        (event.key === 'ArrowLeft' && game.keyboardDirection < 0) ||
        (event.key === 'ArrowRight' && game.keyboardDirection > 0) ||
        (event.key.toLowerCase() === 'a' && game.keyboardDirection < 0) ||
        (event.key.toLowerCase() === 'd' && game.keyboardDirection > 0)
      ) {
        game.keyboardDirection = 0;
      }
    };

    /** 页面隐藏时自动暂停 */
    const pauseWhenHidden = () => {
      if (game.status === 'playing' && document.hidden) {
        game.status = 'paused';
        setMenuOpen(false);
        exitGamePointerLock();
        syncSnapshot();
      }
    };

    /** 未锁鼠标时，全局鼠标移动也能控制挡板 */
    const handleWindowPointerMove = (event: PointerEvent) => {
      if (event.pointerType === 'mouse' && game.status === 'aiming') {
        aimFromClientPoint(event.clientX, event.clientY);
      } else if (
        event.pointerType === 'mouse' &&
        game.status === 'playing' &&
        document.pointerLockElement !== canvasRef.current
      ) {
        movePaddleFromClientX(event.clientX);
      }
    };

    /** 锁鼠标后，使用相对位移控制挡板 */
    const handleWindowMouseMove = (event: MouseEvent) => {
      if (
        game.status === 'playing' &&
        document.pointerLockElement === canvasRef.current
      ) {
        movePaddleByClientDelta(event.movementX);
      }
    };

    /** 用户手动释放鼠标锁时自动暂停 */
    const pauseWhenPointerUnlocks = () => {
      if (
        game.status === 'playing' &&
        document.pointerLockElement !== canvasRef.current
      ) {
        game.status = 'paused';
        setMenuOpen(false);
        syncSnapshot();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleWindowMouseMove);
    window.addEventListener('pointermove', handleWindowPointerMove);
    document.addEventListener('pointerlockchange', pauseWhenPointerUnlocks);
    document.addEventListener('visibilitychange', pauseWhenHidden);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleWindowMouseMove);
      window.removeEventListener('pointermove', handleWindowPointerMove);
      document.removeEventListener('pointerlockchange', pauseWhenPointerUnlocks);
      document.removeEventListener('visibilitychange', pauseWhenHidden);
    };
  }, [
    aimFromClientPoint,
    exitGamePointerLock,
    movePaddleByClientDelta,
    movePaddleFromClientX,
    startOrAdvance,
    syncSnapshot,
    togglePause,
  ]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const renderingContext = canvas?.getContext('2d', { alpha: false });
    if (!canvas || !renderingContext) {
      return;
    }

    let frameId = 0;

    /** 游戏主循环，操作中 60FPS，非操作态 15FPS */
    const runFrame = (time: number) => {
      const game = gameRef.current;
      const shouldUpdateWorld = !menuOpen;
      const isActiveStatus =
        shouldUpdateWorld &&
        (game.status === 'aiming' ||
          game.status === 'playing' ||
          game.status === 'levelClear');
      const frameMs = isActiveStatus ? PLAYING_FRAME_MS : IDLE_FRAME_MS;
      if (time - game.lastFrameTime < frameMs) {
        frameId = window.requestAnimationFrame(runFrame);
        return;
      }

      const elapsedSeconds = Math.min((time - game.lastFrameTime) / 1000 || 0, 0.033);
      game.lastFrameTime = time;

      if (shouldUpdateWorld) {
        const canvasRect = canvas.getBoundingClientRect();
        const worldSize = getWorldSizeForViewport(canvasRect.width, canvasRect.height);
        if (game.status !== 'paused') {
          syncGameLayout(game, worldSize.worldWidth, worldSize.worldHeight);
        }
        updateGame(game, elapsedSeconds, time);
      }
      drawGame(renderingContext, canvas, game, time);

      if (shouldUpdateWorld && game.status !== 'playing') {
        exitGamePointerLock();
      }

      if (time - game.lastSnapshotTime > SNAPSHOT_INTERVAL_MS) {
        game.lastSnapshotTime = time;
        syncSnapshot();
      }

      frameId = window.requestAnimationFrame(runFrame);
    };

    frameId = window.requestAnimationFrame(runFrame);

    return () => window.cancelAnimationFrame(frameId);
  }, [exitGamePointerLock, menuOpen, syncSnapshot]);

  const primaryActionLabel = getPrimaryActionLabel(snapshot.status);
  const shouldUseViewportPanel = shouldFillViewport(snapshot.status) && !menuOpen;
  const heroCardClassName = shouldUseViewportPanel
    ? 'hero-card is-viewport-host'
    : 'hero-card';
  const gamePanelClassName = shouldUseViewportPanel
    ? 'game-panel is-viewport'
    : 'game-panel';
  const canvasClassName = shouldUseViewportPanel
    ? 'game-canvas'
    : 'game-canvas is-hidden';
  const shouldShowGameModal =
    !menuOpen &&
    (snapshot.status === 'paused' ||
      snapshot.status === 'lifeLost' ||
      snapshot.status === 'levelClear' ||
      snapshot.status === 'gameOver');

  return (
    <main className="app-shell">
      <section className={heroCardClassName}>
        <div className="title-row">
          <div>
            <p className="eyebrow">{t('app.eyebrow')}</p>
            <h1>{t('app.title')}</h1>
          </div>
          <div className="title-actions">
            <button className="ghost-button" type="button" onClick={toggleMuted}>
              {snapshot.muted ? t('app.unmute') : t('app.mute')}
            </button>
            <PillSelect
              value={currentLanguage}
              options={SUPPORTED_LANGUAGES.map((language) => ({
                value: language,
                label: LANGUAGE_LABELS[language],
              }))}
              onChange={changeLanguage}
            />
          </div>
        </div>

        <div className="stats-grid" aria-live="polite">
          <Stat label={t('stats.level')} value={snapshot.level} />
          <Stat label={t('stats.lives')} value={snapshot.lives} />
          <Stat label={t('stats.score')} value={snapshot.score} />
          <Stat label={t('stats.bestScore')} value={snapshot.bestScore} />
          <Stat label={t('stats.highestUnlocked')} value={snapshot.highestUnlocked} />
          <Stat label={t('stats.ballCount')} value={snapshot.ballCount} />
        </div>

        <div className={gamePanelClassName}>
          <canvas
            ref={canvasRef}
            className={canvasClassName}
            data-mark="gameCanvas"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerCancel}
          />
          {!shouldUseViewportPanel && (
            <MenuPanel
              snapshot={snapshot}
              primaryActionLabel={primaryActionLabel}
              onPrimaryAction={startOrAdvance}
              onHelp={() => {
                setHelpOpen(true);
                setSettingsOpen(false);
              }}
              onSettings={() => {
                setSettingsOpen(true);
                setHelpOpen(false);
              }}
              onReset={resetProgress}
            />
          )}
          {!shouldUseViewportPanel && helpOpen && (
            <HelpDialog snapshot={snapshot} onClose={() => setHelpOpen(false)} />
          )}
          {!shouldUseViewportPanel && settingsOpen && (
            <SettingsDialog
              config={snapshot.config}
              onChange={changeGameConfig}
              onClose={() => setSettingsOpen(false)}
            />
          )}
          {shouldShowGameModal && (
            <GameModal
              status={snapshot.status}
              level={snapshot.level}
              lives={snapshot.lives}
              onBackToMenu={returnToMenu}
              onPrimaryAction={startOrAdvance}
              onRetry={retryCurrentLevel}
            />
          )}
        </div>
      </section>
    </main>
  );
}

/** 胶囊形下拉框，用于顶部语言和配置项选择 */
function PillSelect({
  value,
  options,
  onChange,
}: {
  value: string | number;
  options: { value: string | number; label: string | number }[];
  onChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
}) {
  return (
    <span className="pill-select">
      <select value={value} onChange={onChange}>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </span>
  );
}

/** 首页只展示垂直菜单，避免长帮助文案撑出滚动 */
function MenuPanel({
  snapshot,
  primaryActionLabel,
  onPrimaryAction,
  onHelp,
  onSettings,
  onReset,
}: {
  snapshot: Snapshot;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
  onHelp: () => void;
  onSettings: () => void;
  onReset: () => void;
}) {
  const { t } = useTranslation();

  return (
    <div className="help-overlay menu-overlay">
      <div className="menu-card" role="dialog" aria-label={t('help.aria')}>
        <strong>{getStatusText(snapshot.status)}</strong>
        <span>{t('menu.subtitle')}</span>
        <div className="menu-actions">
          <button type="button" onClick={onPrimaryAction}>
            {primaryActionLabel}
          </button>
          <button className="secondary-button" type="button" onClick={onHelp}>
            {t('actions.help')}
          </button>
          <button className="secondary-button" type="button" onClick={onSettings}>
            {t('actions.settings')}
          </button>
          <button className="danger-button" type="button" onClick={onReset}>
            {t('actions.resetProgress')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 完整玩法说明只在点击帮助后弹出 */
function HelpDialog({ snapshot, onClose }: { snapshot: Snapshot; onClose: () => void }) {
  const { t } = useTranslation();
  const powerSeparator = t('help.powerSeparator');
  const powerText = snapshot.activePowers.length
    ? t('help.activePowers', { powers: snapshot.activePowers.join(powerSeparator) })
    : t('help.inactivePowers');

  return (
    <div className="game-modal-overlay help-dialog-overlay">
      <div
        className="help-card help-dialog-card"
        role="dialog"
        aria-label={t('help.aria')}>
        <button
          className="icon-button help-close-button"
          type="button"
          onClick={onClose}
          aria-label={t('actions.close')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6.7 5.3 12 10.6l5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3z" />
          </svg>
        </button>
        <strong>{getStatusText(snapshot.status)}</strong>
        <p>{t('help.intro')}</p>
        <div className="help-grid">
          <section className="help-block">
            <h2>{t('help.controlsTitle')}</h2>
            <ul>
              <li>{t('help.controlsPc')}</li>
              <li>{t('help.controlsMobile')}</li>
              <li>{t('help.controlsPause')}</li>
            </ul>
          </section>
          <section className="help-block">
            <h2>{t('help.bricksTitle')}</h2>
            <ul>
              <li>{t('help.bricksNormal')}</li>
              <li>{t('help.bricksNumber')}</li>
              <li>{t('help.bricksObstacle')}</li>
            </ul>
          </section>
          <section className="help-block">
            <h2>{t('help.powerupsTitle')}</h2>
            <ul>
              <li>{powerText}</li>
              <li>{t('help.powerupsPierce')}</li>
              <li>{t('help.powerupsMulti')}</li>
              <li>{t('help.powerupsLimit', { maxBalls: snapshot.config.maxBalls })}</li>
            </ul>
          </section>
          <section className="help-block">
            <h2>{t('help.rulesTitle')}</h2>
            <ul>
              <li>{t('help.rulesLives')}</li>
              <li>{t('help.rulesClear')}</li>
              <li>{t('help.rulesSpeed')}</li>
              <li>{t('help.rulesSave')}</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}

/** 首页玩法配置弹窗 */
function SettingsDialog({
  config,
  onChange,
  onClose,
}: {
  config: GameConfig;
  onChange: (config: GameConfig) => void;
  onClose: () => void;
}) {
  const { t } = useTranslation();

  const changeMaxBalls = (event: React.ChangeEvent<HTMLSelectElement>) => {
    onChange({
      ...config,
      maxBalls: Number(event.target.value) as BallLimit,
    });
  };

  const changeBrickSurgeMode = (mode: BrickSurgeMode) => {
    onChange({ ...config, brickSurgeMode: mode });
  };

  return (
    <div className="game-modal-overlay help-dialog-overlay">
      <div
        className="help-card help-dialog-card settings-card"
        role="dialog"
        aria-label={t('settings.aria')}>
        <button
          className="icon-button help-close-button"
          type="button"
          onClick={onClose}
          aria-label={t('actions.close')}>
          <svg viewBox="0 0 24 24" aria-hidden="true" focusable="false">
            <path d="M6.7 5.3 12 10.6l5.3-5.3 1.4 1.4-5.3 5.3 5.3 5.3-1.4 1.4-5.3-5.3-5.3 5.3-1.4-1.4 5.3-5.3-5.3-5.3z" />
          </svg>
        </button>
        <strong>{t('settings.title')}</strong>
        <p>{t('settings.subtitle')}</p>
        <section className="settings-section">
          <label className="settings-select-row">
            <span>{t('settings.maxBalls')}</span>
            <PillSelect
              value={config.maxBalls}
              options={BALL_LIMIT_OPTIONS.map((maxBalls) => ({
                value: maxBalls,
                label: maxBalls,
              }))}
              onChange={changeMaxBalls}
            />
          </label>
        </section>
        <section className="settings-section">
          <h2>{t('settings.brickSurge')}</h2>
          <div className="settings-radio-grid">
            {BRICK_SURGE_MODES.map((mode) => (
              <label key={mode} className="settings-radio-card">
                <input
                  type="radio"
                  name="brickSurgeMode"
                  checked={config.brickSurgeMode === mode}
                  onChange={() => changeBrickSurgeMode(mode)}
                />
                <span>
                  <strong>{t(`settings.surgeModes.${mode}.label`)}</strong>
                  <small>{t(`settings.surgeModes.${mode}.hint`)}</small>
                </span>
              </label>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

/** 游戏内暂停、丢命、失败和通关浮层，保留当前游戏画面作为背景 */
function GameModal({
  status,
  level,
  lives,
  onBackToMenu,
  onPrimaryAction,
  onRetry,
}: {
  status: Snapshot['status'];
  level: number;
  lives: number;
  onBackToMenu: () => void;
  onPrimaryAction: () => void;
  onRetry: () => void;
}) {
  const { t } = useTranslation();
  const passed = status === 'levelClear';
  const lostLife = status === 'lifeLost';
  const failed = status === 'gameOver';
  const nextLevel = level + 1;
  const title = passed
    ? t('modal.passedTitle', { level })
    : failed
      ? t('modal.failedTitle')
      : lostLife
        ? t('modal.lostLifeTitle')
        : t('modal.pausedTitle');
  const description = passed
    ? t('modal.passedDescription', { level, nextLevel })
    : failed
      ? t('modal.failedDescription')
      : lostLife
        ? t('modal.lostLifeDescription', { lives })
        : t('modal.pausedDescription');
  const overlayClassName = passed
    ? 'game-modal-overlay is-level-clear'
    : 'game-modal-overlay';
  const cardClassName = passed ? 'game-modal-card is-level-clear' : 'game-modal-card';

  return (
    <div className={overlayClassName}>
      <div className={cardClassName} role="dialog" aria-label={title}>
        <strong>{title}</strong>
        <span>{description}</span>
        <div className="game-modal-actions">
          {!failed && (
            <button type="button" onClick={onPrimaryAction}>
              {passed ? t('actions.nextLevel') : t('actions.continue')}
            </button>
          )}
          {(lostLife || failed) && (
            <button className="secondary-button" type="button" onClick={onRetry}>
              {t('actions.retry')}
            </button>
          )}
          <button
            className={
              passed || lostLife || failed ? 'secondary-button' : 'danger-button'
            }
            type="button"
            onClick={onBackToMenu}>
            {t('actions.backToMenu')}
          </button>
        </div>
      </div>
    </div>
  );
}

/** 展示单个统计项 */
function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="stat-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

/** 判断当前状态是否需要让游戏区域铺满浏览器视口 */
function shouldFillViewport(status: Snapshot['status']) {
  return (
    status === 'aiming' ||
    status === 'playing' ||
    status === 'paused' ||
    status === 'lifeLost' ||
    status === 'levelClear' ||
    status === 'gameOver'
  );
}

/** 判断点击位置是否命中 Canvas 内暂停按钮 */
function isPauseButtonPoint(worldWidth: number, worldX: number, worldY: number) {
  const left = worldWidth - PAUSE_BUTTON_MARGIN - PAUSE_BUTTON_WIDTH;
  return (
    worldX >= left &&
    worldX <= left + PAUSE_BUTTON_WIDTH &&
    worldY >= PAUSE_BUTTON_MARGIN &&
    worldY <= PAUSE_BUTTON_MARGIN + PAUSE_BUTTON_HEIGHT
  );
}
