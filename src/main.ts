// 入口：组装 游戏逻辑 / 渲染 / 音频 / 输入 / 界面，驱动固定步长主循环，处理关卡流程与存档。
import './styles.css';

import { Sound } from './audio';
import { Autopilot } from './autopilot';
import { CAMPAIGN } from './campaign';
import { H, HP_COLORS, LIVES, POWERS, W } from './config';
import { endlessLevel } from './endless';
import { Fx } from './fx';
import type { GameEvent, Keys, Mode } from './game';
import { Game } from './game';
import type { TKey } from './i18n';
import { detectLang, getLang, isLang, setLang, t } from './i18n';
import { Input } from './input';
import type { View } from './render';
import { Renderer } from './render';
import { defaults, loadSave, writeSave } from './storage';
import type { Modal, Result, Screen } from './ui';
import { nextLevelIndex, Ui } from './ui';

const app = document.getElementById('app')!;
app.innerHTML = `
  <div class="frame">
    <header class="hud">
      <button id="hud-pause" class="hud-btn" data-action="pause">❚❚</button>
      <div class="hud-level"><b id="hud-id"></b><span id="hud-name"></span></div>
      <div class="hud-score" id="hud-score">0</div>
      <div class="hud-lives" id="hud-lives"></div>
    </header>
    <div class="stage"><canvas id="game"></canvas></div>
    <div class="overlay" hidden></div>
  </div>`;

const frameEl = app.querySelector<HTMLElement>('.frame')!;
const hudEl = app.querySelector<HTMLElement>('.hud')!;
const canvas = app.querySelector<HTMLCanvasElement>('#game')!;

const save = loadSave();
setLang(
  save.lang ??
    detectLang(navigator.languages?.length ? navigator.languages : [navigator.language]),
);

const sound = new Sound();
sound.sfxOn = save.sound;
sound.musicOn = save.music;
const renderer = new Renderer(canvas);
const fx = new Fx();
fx.reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const autopilot = new Autopilot();
const NO_KEYS: Keys = { left: false, right: false };

interface Session {
  game: Game;
  mode: Mode;
  /** 战役：关卡下标；无尽：层数 */
  index: number;
  seed: number;
  age: number;
}

let screen: Screen = 'menu';
let modal: Modal = null;
let result: Result | null = null;
let paused = false;
let runStartBest = 0;
let session = demoSession();

const ui = new Ui(app, onAction);
const input = new Input(canvas, {
  game: () => (screen === 'game' ? session.game : null),
  active: () => screen === 'game' && !modal && !paused,
  togglePause: onEscape,
  gesture: () => sound.unlock(),
});

function demoSession(): Session {
  const pool = CAMPAIGN.filter((l) => !l.dark && l.chapter <= 4);
  const level = pool[Math.floor(Math.random() * pool.length)];
  return {
    game: new Game(level, { mode: 'demo', seed: Math.floor(Math.random() * 1e9) }),
    mode: 'demo',
    index: 0,
    seed: 0,
    age: 0,
  };
}

function applyLang(): void {
  document.documentElement.lang = getLang();
  document.title = t('appTitle');
}

function render(): void {
  ui.render({ screen, modal, save, result });
}

function enterGame(game: Game, mode: Mode, index: number, seed = 0): void {
  session = { game, mode, index, seed, age: 0 };
  screen = 'game';
  modal = null;
  result = null;
  paused = false;
  fx.clear();
  sound.muffle(false);
  render();
}

function startCampaign(i: number): void {
  enterGame(
    new Game(CAMPAIGN[i], { mode: 'campaign', seed: Math.floor(Math.random() * 1e9) }),
    'campaign',
    i,
  );
}

function startEndless(depth: number, seed: number, score: number, lives = LIVES): void {
  if (depth === 1 || session.mode !== 'endless') runStartBest = save.endlessBest;
  enterGame(
    new Game(endlessLevel(depth, seed), {
      mode: 'endless',
      seed: seed + depth,
      score,
      lives,
    }),
    'endless',
    depth,
    seed,
  );
}

function newSeed(): number {
  return Math.floor(Math.random() * 1e6);
}

function toMenu(): void {
  session = demoSession();
  screen = 'menu';
  modal = null;
  paused = false;
  fx.clear();
  sound.muffle(false);
  render();
}

function pause(): void {
  if (screen !== 'game' || modal || paused) return;
  const phase = session.game.phase;
  if (phase !== 'aim' && phase !== 'play') return;
  paused = true;
  modal = 'pause';
  sound.muffle(true);
  render();
}

function resume(): void {
  paused = false;
  modal = null;
  sound.muffle(false);
  render();
}

function onEscape(): void {
  if (screen === 'game') {
    if (modal === 'pause') resume();
    else pause();
    return;
  }
  if (modal === 'reset') modal = null;
  else if (screen !== 'menu') screen = 'menu';
  render();
}

function onAction(action: string, arg: string): void {
  sound.unlock();
  sound.click();
  switch (action) {
    case 'play':
      startCampaign(nextLevelIndex(save));
      break;
    case 'levels':
    case 'help':
    case 'settings':
      screen = action;
      render();
      break;
    case 'back':
      screen = 'menu';
      render();
      break;
    case 'endless':
      if (save.endlessRun) {
        const run = save.endlessRun;
        startEndless(run.depth, run.seed, run.score, run.lives);
      } else startEndless(1, newSeed(), 0);
      break;
    case 'new-endless':
      save.endlessRun = null;
      writeSave(save);
      startEndless(1, newSeed(), 0);
      break;
    case 'start-level':
      startCampaign(Number(arg));
      break;
    case 'pause':
      pause();
      break;
    case 'resume':
      resume();
      break;
    case 'retry':
      if (session.mode === 'endless') {
        save.endlessRun = null;
        writeSave(save);
        startEndless(1, newSeed(), 0);
      } else startCampaign(session.index);
      break;
    case 'next':
      if (session.mode === 'endless')
        startEndless(
          session.index + 1,
          session.seed,
          session.game.score,
          session.game.lives,
        );
      else startCampaign(session.index + 1);
      break;
    case 'menu':
      toMenu();
      break;
    case 'toggle-sound':
      save.sound = !save.sound;
      sound.setSfx(save.sound);
      writeSave(save);
      render();
      break;
    case 'toggle-music':
      save.music = !save.music;
      sound.setMusic(save.music);
      writeSave(save);
      render();
      break;
    case 'lang':
      if (isLang(arg)) {
        save.lang = arg;
        setLang(arg);
        applyLang();
        writeSave(save);
        render();
      }
      break;
    case 'reset':
      modal = 'reset';
      render();
      break;
    case 'reset-yes': {
      const keep = { lang: save.lang, sound: save.sound, music: save.music };
      Object.assign(save, defaults(), keep);
      writeSave(save);
      modal = null;
      render();
      ui.toast(t('resetDone'));
      break;
    }
    case 'reset-no':
      modal = null;
      render();
      break;
  }
}

function onClear(): void {
  const g = session.game;
  if (session.mode === 'campaign') {
    const i = session.index;
    const prev = save.best[i] ?? 0;
    save.stars[i] = Math.max(save.stars[i] ?? 0, g.stars);
    save.best[i] = Math.max(prev, g.score);
    save.unlocked = Math.max(save.unlocked, Math.min(CAMPAIGN.length - 1, i + 1));
    writeSave(save);
    result = {
      endless: false,
      stars: g.stars,
      score: g.score,
      bonus: g.clearBonus,
      lives: g.lives,
      maxCombo: g.maxCombo,
      time: g.time,
      best: save.best[i],
      record: g.score > prev && prev > 0,
      hasNext: i + 1 < CAMPAIGN.length,
      allClear: i === CAMPAIGN.length - 1,
      depth: 0,
    };
  } else {
    save.endlessLevel = Math.max(save.endlessLevel, session.index);
    save.endlessBest = Math.max(save.endlessBest, g.score);
    save.endlessRun = {
      depth: session.index + 1,
      seed: session.seed,
      score: g.score,
      lives: g.lives,
    };
    writeSave(save);
    result = {
      endless: true,
      stars: 0,
      score: g.score,
      bonus: g.clearBonus,
      lives: g.lives,
      maxCombo: g.maxCombo,
      time: g.time,
      best: save.endlessBest,
      record: false,
      hasNext: true,
      allClear: false,
      depth: session.index,
    };
  }
  modal = 'clear';
  render();
}

function onGameOver(): void {
  const g = session.game;
  if (session.mode === 'endless') {
    const record = g.score > runStartBest;
    save.endlessBest = Math.max(save.endlessBest, g.score);
    save.endlessRun = null;
    writeSave(save);
    result = {
      endless: true,
      stars: 0,
      score: g.score,
      bonus: 0,
      lives: g.lives,
      maxCombo: g.maxCombo,
      time: g.time,
      best: save.endlessBest,
      record,
      hasNext: false,
      allClear: false,
      depth: session.index,
    };
  } else {
    result = {
      endless: false,
      stars: 0,
      score: g.score,
      bonus: 0,
      lives: g.lives,
      maxCombo: g.maxCombo,
      time: g.time,
      best: save.best[session.index] ?? 0,
      record: false,
      hasNext: false,
      allClear: false,
      depth: 0,
    };
  }
  modal = 'over';
  render();
}

function onEvent(e: GameEvent): void {
  const live = session.mode !== 'demo';
  const dark = session.game.level.dark;
  switch (e.type) {
    case 'launch':
      if (live) sound.launch();
      fx.ring(e.x, e.y, '#6ff3ff', 28, 2, 0.3);
      break;
    case 'wall':
      if (live) sound.wall();
      fx.burst(e.x, e.y, '#6ff3ff', 3, 120);
      break;
    case 'paddle':
      if (live) sound.paddle();
      fx.burst(e.x, e.y + 6, '#b8a8ff', 6, 170);
      break;
    case 'blocker':
      if (live) sound.blocker();
      fx.burst(e.x, e.y, '#e2e8ff', 5, 210);
      break;
    case 'bumper':
      if (live) sound.bumper();
      fx.ring(e.x, e.y, '#3dffea', 48, 3, 0.35);
      fx.burst(e.x, e.y, '#3dffea', 10, 250);
      fx.shake(0.08);
      break;
    case 'brickHit':
      if (live) sound.brickHit(e.combo);
      fx.burst(e.x, e.y, e.color, 6, 180);
      break;
    case 'brickBreak':
      if (live) sound.brickBreak(e.combo);
      fx.shatter(e.x, e.y, e.w, e.h, e.color);
      fx.text(e.x, e.y, `+${e.points}`, e.color, 13, 0.7);
      fx.shake(e.brick === 'core' ? 0 : 0.04);
      if (dark) fx.light(e.x, e.y, 90, 0.5);
      if (e.brick === 'gold') fx.ring(e.x, e.y, '#ffd54a', 50, 3, 0.4);
      break;
    case 'explode':
      if (live) sound.explode(e.big);
      fx.ring(e.x, e.y, '#ffb347', e.big ? 190 : 95, e.big ? 7 : 5, e.big ? 0.8 : 0.5);
      fx.burst(e.x, e.y, '#ffcf70', e.big ? 90 : 34, e.big ? 560 : 360);
      fx.burst(e.x, e.y, '#ff5a36', e.big ? 40 : 16, e.big ? 420 : 260, 'shard', 400);
      fx.shake(e.big ? 0.9 : 0.32);
      fx.flashScreen('255,150,60', e.big ? 0.8 : 0.22);
      fx.light(e.x, e.y, e.big ? 280 : 160, e.big ? 1.2 : 0.6);
      if (e.big) fx.text(e.x, e.y - 50, t('coreDown'), '#ff9df0', 28, 1.8);
      break;
    case 'portal':
      if (live) sound.portal();
      fx.ring(e.x, e.y, '#ff9d3d', 42, 3, 0.4);
      fx.ring(e.x2, e.y2, '#3dc5ff', 42, 3, 0.4);
      break;
    case 'power': {
      const def = POWERS[e.power];
      if (live) sound.power(def.good);
      fx.text(
        e.x,
        e.y - 26,
        t(`pw_${e.power}` as TKey),
        def.good ? def.color : '#ff5577',
        19,
        1.2,
      );
      fx.ring(e.x, e.y, def.color, 64, 3, 0.45);
      if (!def.good) fx.flashScreen('255,40,80', 0.2);
      break;
    }
    case 'laser':
      if (live) sound.laser();
      break;
    case 'shield':
      if (live) sound.shield();
      fx.burst(e.x, e.y, '#c8f7ff', 10, 200);
      break;
    case 'combo':
      if (live) sound.combo(e.combo);
      break;
    case 'lifeLost':
      if (!live) break;
      sound.lifeLost();
      fx.flashScreen('255,40,80', 0.85);
      fx.shake(0.5);
      if (e.lives > 0) fx.text(W / 2, 620, t('lifeLost'), '#ff5577', 24, 1.4);
      break;
    case 'clear':
      fx.celebrate(W, H, [
        HP_COLORS[0],
        HP_COLORS[3],
        HP_COLORS[7],
        '#ffffff',
        HP_COLORS[1],
      ]);
      if (!live) break;
      sound.clear();
      fx.flashScreen('160,255,255', 0.3);
      onClear();
      break;
    case 'gameOver':
      if (!live) break;
      sound.gameOver();
      onGameOver();
      break;
  }
}

function view(): View {
  const g = session.game;
  const lv = g.level;
  if (session.mode === 'demo')
    return { hint: null, banner: null, comboLabel: t('combo') };
  let hint: string | null = null;
  if (!modal && g.phase === 'aim')
    hint =
      input.pointer === 'touch'
        ? t('hintAimTouch')
        : `${t('hintAimMouse')} · ${t('hintAimKeys')}`;
  else if (!modal && g.hasStuckBall()) hint = t('hintCaught');
  const endless = session.mode === 'endless';
  return {
    hint,
    banner: {
      title: `${endless ? `∞ ${session.index}` : lv.id}  ${lv.name}`,
      sub: endless
        ? t('endlessLevel', { n: session.index })
        : t(`chapter${lv.chapter}` as TKey),
      note: lv.dark ? t('darkLevel') : null,
      age: session.age,
    },
    comboLabel: t('combo'),
  };
}

function layout(): void {
  const cs = getComputedStyle(app);
  const availW =
    app.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight);
  const availH =
    app.clientHeight -
    parseFloat(cs.paddingTop) -
    parseFloat(cs.paddingBottom) -
    hudEl.offsetHeight -
    8;
  const cw = Math.max(240, Math.floor(Math.min(availW, (availH * W) / H)));
  const ch = Math.floor((cw * H) / W);
  frameEl.style.width = `${cw}px`;
  canvas.style.width = `${cw}px`;
  canvas.style.height = `${ch}px`;
  frameEl.style.setProperty(
    '--fs',
    `${Math.max(12, Math.min(17, cw / 34)).toFixed(2)}px`,
  );
  renderer.resize(cw, ch, Math.min(2, window.devicePixelRatio || 1));
}

const STEP = 1 / 120;
let last = performance.now();
let acc = 0;
let vis = 0;

function frame(now: number): void {
  const dt = Math.min(0.1, Math.max(0, (now - last) / 1000));
  last = now;
  if (!paused) {
    const g = session.game;
    const keys = session.mode === 'demo' || screen !== 'game' ? NO_KEYS : input.keys;
    acc += dt;
    let n = 0;
    while (acc >= STEP && n < 12) {
      if (session.mode === 'demo') autopilot.update(g, STEP);
      g.update(STEP, keys);
      acc -= STEP;
      n++;
    }
    if (n === 12) acc = 0;
    for (const e of g.drainEvents()) onEvent(e);
    fx.update(dt);
    session.age += dt;
    vis += dt;
    if (session.mode === 'demo' && g.phase === 'clear' && g.phaseTime > 2.5) {
      session = demoSession();
      fx.clear();
    }
  }
  const g = session.game;
  renderer.draw(g, fx, view(), vis);
  if (screen === 'game')
    ui.updateHud(
      session.mode === 'endless' ? `∞${session.index}` : g.level.id,
      g.level.name,
      g.score,
      g.lives,
    );
  requestAnimationFrame(frame);
}

document.addEventListener('visibilitychange', () => {
  if (document.hidden) pause();
});
window.addEventListener('blur', () => {
  if (session.game.phase === 'play') pause();
});
window.addEventListener('resize', layout);
window.visualViewport?.addEventListener('resize', layout);

applyLang();
render();
layout();
requestAnimationFrame(frame);
