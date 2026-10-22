// DOM 界面层：菜单、选关、说明、设置、弹窗与顶部 HUD。
// 只负责展示与收集点击（data-action），状态与流程由 main.ts 决定。
import { CAMPAIGN, CHAPTER_COUNT, LEVELS_PER_CHAPTER } from './campaign';
import { CHAPTER_HUES, POWER_ORDER, POWERS } from './config';
import type { TKey } from './i18n';
import { getLang, LANGS, t } from './i18n';
import type { ChipKind } from './render';
import { paintLegendChip, paintPowerChip } from './render';
import type { SaveData } from './storage';

export type Screen = 'menu' | 'levels' | 'help' | 'settings' | 'game';
export type Modal = 'pause' | 'clear' | 'over' | 'reset' | null;

export interface Result {
  endless: boolean;
  stars: number;
  score: number;
  bonus: number;
  maxCombo: number;
  time: number;
  best: number;
  record: boolean;
  hasNext: boolean;
  allClear: boolean;
  depth: number;
}

export interface UiState {
  screen: Screen;
  modal: Modal;
  save: SaveData;
  result: Result | null;
}

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
const fmt = (n: number) => new Intl.NumberFormat(getLang()).format(Math.round(n));
const clock = (sec: number) =>
  `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, '0')}`;

function stars(n: number, animated = false): string {
  return [0, 1, 2]
    .map(
      (i) =>
        `<span class="star ${i < n ? 'on' : ''}" ${animated ? `style="--i:${i}"` : ''}>★</span>`,
    )
    .join('');
}

function btn(action: string, label: string, cls = '', arg = ''): string {
  return `<button class="btn ${cls}" data-action="${action}"${arg ? ` data-arg="${esc(arg)}"` : ''}>${esc(label)}</button>`;
}

function head(title: string, extra = ''): string {
  return `<header class="screen-head">${btn('back', '←', 'icon', '')}<h2>${esc(title)}</h2><span class="head-extra">${extra}</span></header>`;
}

export function totalStars(save: SaveData): number {
  return CAMPAIGN.reduce((s, _, i) => s + (save.stars[i] ?? 0), 0);
}

/** 下一个要玩的关卡：第一个未通关且已解锁的关卡 */
export function nextLevelIndex(save: SaveData): number {
  for (let i = 0; i <= Math.min(save.unlocked, CAMPAIGN.length - 1); i++)
    if (!save.stars[i]) return i;
  return Math.min(save.unlocked, CAMPAIGN.length - 1);
}

export class Ui {
  private root: HTMLElement;
  private overlay: HTMLElement;
  private hud: {
    id: HTMLElement;
    name: HTMLElement;
    score: HTMLElement;
    lives: HTMLElement;
    pause: HTMLButtonElement;
  };
  private last = { id: '', name: '', score: -1, lives: -1, lang: '' };

  constructor(root: HTMLElement, onAction: (action: string, arg: string) => void) {
    this.root = root;
    this.overlay = root.querySelector('.overlay')!;
    this.hud = {
      id: root.querySelector('#hud-id')!,
      name: root.querySelector('#hud-name')!,
      score: root.querySelector('#hud-score')!,
      lives: root.querySelector('#hud-lives')!,
      pause: root.querySelector('#hud-pause')!,
    };
    root.addEventListener('click', (e) => {
      const el = (e.target as Element).closest<HTMLElement>('[data-action]');
      if (!el || el instanceof HTMLSelectElement || (el as HTMLButtonElement).disabled)
        return;
      onAction(el.dataset.action!, el.dataset.arg ?? '');
    });
    root.addEventListener('change', (e) => {
      const el = e.target as HTMLSelectElement;
      if (el.dataset.action) onAction(el.dataset.action, el.value);
    });
  }

  render(s: UiState): void {
    this.root.dataset.screen = s.screen;
    const html =
      (s.screen !== 'game' ? this.screen(s) : '') + (s.modal ? this.modal(s) : '');
    this.overlay.innerHTML = html;
    this.overlay.hidden = !html;
    this.hud.pause.setAttribute('aria-label', t('pause'));
    this.overlay
      .querySelectorAll<HTMLCanvasElement>('canvas[data-chip]')
      .forEach((c) => paintLegendChip(c, c.dataset.chip as ChipKind));
    this.overlay
      .querySelectorAll<HTMLCanvasElement>('canvas[data-power]')
      .forEach((c) => paintPowerChip(c, c.dataset.power as keyof typeof POWERS));
    const focus = this.overlay.querySelector<HTMLElement>('[data-autofocus]');
    focus?.focus({ preventScroll: true });
  }

  toast(msg: string): void {
    const el = document.createElement('div');
    el.className = 'toast';
    el.textContent = msg;
    this.root.querySelector('.frame')!.appendChild(el);
    setTimeout(() => el.remove(), 1800);
  }

  updateHud(id: string, name: string, score: number, lives: number): void {
    const L = this.last;
    const lang = getLang();
    if (id !== L.id || name !== L.name) {
      this.hud.id.textContent = id;
      this.hud.name.textContent = name;
      L.id = id;
      L.name = name;
    }
    if (score !== L.score || lang !== L.lang) {
      this.hud.score.textContent = fmt(score);
      L.score = score;
      L.lang = lang;
    }
    if (lives !== L.lives) {
      this.hud.lives.innerHTML = Array.from(
        { length: Math.max(lives, 3) },
        (_, i) => `<span class="${i < lives ? 'on' : ''}">♥</span>`,
      ).join('');
      this.hud.lives.setAttribute('aria-label', `♥ ${lives}`);
      if (L.lives >= 0 && lives < L.lives) {
        this.hud.lives.classList.remove('hurt');
        void this.hud.lives.offsetWidth;
        this.hud.lives.classList.add('hurt');
      }
      L.lives = lives;
    }
  }

  private screen(s: UiState): string {
    switch (s.screen) {
      case 'menu':
        return this.menu(s.save);
      case 'levels':
        return this.levels(s.save);
      case 'help':
        return this.help();
      case 'settings':
        return this.settings(s.save);
      default:
        return '';
    }
  }

  private menu(save: SaveData): string {
    const started = save.stars.some(Boolean);
    const next = CAMPAIGN[nextLevelIndex(save)];
    const play = started ? t('continueLevel', { level: next.id }) : t('play');
    return `<div class="screen menu">
      <div class="logo">
        <h1 class="title">${esc(t('appTitle'))}</h1>
        <p class="subtitle">${esc(t('appSubtitle'))}</p>
      </div>
      <nav class="menu-buttons">
        <button class="btn primary big" data-action="play" data-autofocus>${esc(play)}</button>
        ${btn('levels', t('levels'))}
        ${btn('endless', t('endless'))}
        <div class="row">${btn('help', t('howToPlay'), 'small')}${btn('settings', t('settings'), 'small')}</div>
      </nav>
      <footer class="menu-stats">
        <span>★ ${esc(t('totalStars', { n: totalStars(save), total: CAMPAIGN.length * 3 }))}</span>
        <span>∞ ${esc(t('endlessBest', { score: fmt(save.endlessBest) }))}</span>
      </footer>
    </div>`;
  }

  private levels(save: SaveData): string {
    const chapters: string[] = [];
    for (let c = 0; c < CHAPTER_COUNT; c++) {
      const items: string[] = [];
      let got = 0;
      for (let k = 0; k < LEVELS_PER_CHAPTER; k++) {
        const i = c * LEVELS_PER_CHAPTER + k;
        const lv = CAMPAIGN[i];
        const st = save.stars[i] ?? 0;
        got += st;
        const locked = i > save.unlocked;
        items.push(`<button class="level-btn ${locked ? 'locked' : ''} ${st ? 'done' : ''}" data-action="start-level" data-arg="${i}" ${locked ? `disabled aria-label="${esc(t('locked'))}"` : ''}>
          <span class="lv-id">${lv.id}</span>
          <span class="lv-name">${locked ? '🔒' : esc(lv.name)}</span>
          <span class="lv-stars">${stars(st)}</span>
        </button>`);
      }
      chapters.push(`<section class="chapter" style="--hue:${CHAPTER_HUES[c]}">
        <h3><span class="ch-no">${c + 1}</span>${esc(t(`chapter${c + 1}` as TKey))}<small>★ ${got}/${LEVELS_PER_CHAPTER * 3}</small></h3>
        <div class="level-grid">${items.join('')}</div>
      </section>`);
    }
    return `<div class="screen levels">${head(t('levels'), `★ ${totalStars(save)}/${CAMPAIGN.length * 3}`)}<div class="scroll">${chapters.join('')}</div></div>`;
  }

  private help(): string {
    const legend: [ChipKind, TKey][] = [
      ['normal', 'brickNormal'],
      ['blocker', 'blocker'],
      ['bomb', 'brickBomb'],
      ['gold', 'brickGold'],
      ['mover', 'mover'],
      ['bumper', 'bumper'],
      ['portal', 'portal'],
      ['core', 'brickCore'],
      ['dark', 'darkLevel'],
    ];
    const bricks = legend
      .map(
        ([k, key]) =>
          `<li><canvas data-chip="${k}"></canvas><span>${esc(t(key))}</span></li>`,
      )
      .join('');
    const powers = POWER_ORDER.map(
      (p) =>
        `<li class="${POWERS[p].good ? '' : 'trap'}"><canvas data-power="${p}"></canvas><span><b>${esc(t(`pw_${p}` as TKey))}</b>${esc(t(`pw_${p}_d` as TKey))}</span></li>`,
    ).join('');
    const para = (
      ['helpGoal', 'helpAim', 'helpMovePC', 'helpMoveTouch', 'helpScore'] as TKey[]
    )
      .map((k) => `<p>${esc(t(k))}</p>`)
      .join('');
    return `<div class="screen help">${head(t('howToPlay'))}<div class="scroll">
      ${para}
      <h3>${esc(t('helpBricksTitle'))}</h3><ul class="legend">${bricks}</ul>
      <h3>${esc(t('helpPowersTitle'))}</h3><p class="note">${esc(t('helpPowersNote'))}</p><ul class="legend powers">${powers}</ul>
    </div></div>`;
  }

  private toggle(action: string, label: string, on: boolean): string {
    return `<div class="setting"><span>${esc(label)}</span><button class="toggle ${on ? 'on' : ''}" data-action="${action}" aria-pressed="${on}">${esc(on ? t('on') : t('off'))}</button></div>`;
  }

  private settings(save: SaveData): string {
    const opts = LANGS.map(
      (l) =>
        `<option value="${l.code}" ${l.code === getLang() ? 'selected' : ''}>${esc(l.name)}</option>`,
    ).join('');
    return `<div class="screen settings">${head(t('settings'))}<div class="settings-list">
      <label class="setting"><span>${esc(t('language'))}</span><select data-action="lang">${opts}</select></label>
      ${this.toggle('toggle-sound', t('sound'), save.sound)}
      ${this.toggle('toggle-music', t('music'), save.music)}
      ${btn('reset', t('resetProgress'), 'danger')}
    </div></div>`;
  }

  private modal(s: UiState): string {
    const r = s.result;
    switch (s.modal) {
      case 'pause':
        return `<div class="modal"><div class="card">
          <h2>${esc(t('paused'))}</h2>
          <button class="btn primary" data-action="resume" data-autofocus>${esc(t('resume'))}</button>
          ${btn('retry', t('retry'))}
          <div class="row">
            <button class="btn small ${s.save.sound ? '' : 'off'}" data-action="toggle-sound">${esc(t('sound'))}: ${esc(s.save.sound ? t('on') : t('off'))}</button>
            <button class="btn small ${s.save.music ? '' : 'off'}" data-action="toggle-music">${esc(t('music'))}: ${esc(s.save.music ? t('on') : t('off'))}</button>
          </div>
          ${btn('menu', t('mainMenu'), 'ghost')}
        </div></div>`;
      case 'clear': {
        if (!r) return '';
        const rows = [
          [t('score'), fmt(r.score)],
          [t('livesBonus'), `+${fmt(r.bonus)}`],
          [t('maxCombo'), `×${r.maxCombo}`],
          [t('time'), clock(r.time)],
        ];
        return `<div class="modal delayed"><div class="card clear-card">
          <h2 class="glow">${esc(t('levelClear'))}</h2>
          ${r.endless ? `<p class="sub">${esc(t('endlessLevel', { n: r.depth }))}</p>` : `<div class="stars big">${stars(r.stars, true)}</div>`}
          <dl class="stats">${rows.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join('')}
            ${r.endless ? '' : `<dt>${esc(t('best'))}</dt><dd>${fmt(r.best)}${r.record ? ` <em class="badge">${esc(t('newRecord'))}</em>` : ''}</dd>`}
          </dl>
          ${r.allClear ? `<p class="legend-text">${esc(t('allClear'))}</p>` : ''}
          ${r.hasNext ? `<button class="btn primary" data-action="next" data-autofocus>${esc(t('nextLevel'))}</button>` : ''}
          <div class="row">${r.endless ? '' : btn('retry', t('retry'), 'small')}${btn('menu', t('mainMenu'), 'small ghost')}</div>
        </div></div>`;
      }
      case 'over': {
        if (!r) return '';
        return `<div class="modal delayed"><div class="card over-card">
          <h2 class="danger-text">${esc(t('gameOver'))}</h2>
          ${r.endless ? `<p class="sub">${esc(t('endlessReached', { n: r.depth }))}</p>` : ''}
          <dl class="stats"><dt>${esc(t('score'))}</dt><dd>${fmt(r.score)}</dd><dt>${esc(t('maxCombo'))}</dt><dd>×${r.maxCombo}</dd>
            <dt>${esc(t('best'))}</dt><dd>${fmt(r.best)}${r.record ? ` <em class="badge">${esc(t('newRecord'))}</em>` : ''}</dd></dl>
          <button class="btn primary" data-action="retry" data-autofocus>${esc(t('retry'))}</button>
          ${btn('menu', t('mainMenu'), 'ghost')}
        </div></div>`;
      }
      case 'reset':
        return `<div class="modal"><div class="card">
          <p class="confirm-text">${esc(t('resetConfirm'))}</p>
          <div class="row">${btn('reset-yes', t('confirm'), 'small danger')}${btn('reset-no', t('cancel'), 'small')}</div>
        </div></div>`;
      default:
        return '';
    }
  }
}
