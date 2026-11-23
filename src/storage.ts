// 本地存档（localStorage）：进度、星星、最佳分数、声音与语言偏好。
// 存储不可用时保留游戏可玩性，并记录警告以便定位未保存的原因
import type { Lang } from './i18n';
import { isLang } from './i18n';

export interface SaveData {
  lang: Lang | null;
  sound: boolean;
  music: boolean;
  /** 已解锁的最高关卡下标（0 起） */
  unlocked: number;
  stars: number[];
  best: number[];
  endlessBest: number;
  endlessLevel: number;
  endlessRun: EndlessRun | null;
}

export interface EndlessRun {
  depth: number;
  seed: number;
  score: number;
  lives: number;
}

const KEY = 'neon-breakout:v1';

export function defaults(): SaveData {
  return {
    lang: null,
    sound: true,
    music: true,
    unlocked: 0,
    stars: [],
    best: [],
    endlessBest: 0,
    endlessLevel: 0,
    endlessRun: null,
  };
}

const num = (v: unknown, fallback: number) =>
  typeof v === 'number' && Number.isFinite(v) ? v : fallback;
const nums = (v: unknown) => (Array.isArray(v) ? v.map((x) => num(x, 0)) : []);

function endlessRun(v: unknown): EndlessRun | null {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
  const o = v as Record<string, unknown>;
  const depth = Math.floor(num(o.depth, 0));
  const seed = Math.floor(num(o.seed, 0));
  const score = Math.max(0, Math.floor(num(o.score, 0)));
  const lives = Math.floor(num(o.lives, 0));
  if (depth < 1 || lives < 1) return null;
  return { depth, seed, score, lives };
}

/** 解析并校验存档，字段缺失或类型不对时用默认值 */
export function parseSave(raw: string | null): SaveData {
  const d = defaults();
  if (!raw) return d;
  try {
    const o = JSON.parse(raw) as Record<string, unknown>;
    return {
      lang: isLang(o.lang) ? o.lang : null,
      sound: typeof o.sound === 'boolean' ? o.sound : d.sound,
      music: typeof o.music === 'boolean' ? o.music : d.music,
      unlocked: Math.max(0, Math.floor(num(o.unlocked, 0))),
      stars: nums(o.stars).map((n) => Math.max(0, Math.min(3, Math.floor(n)))),
      best: nums(o.best).map((n) => Math.max(0, Math.floor(n))),
      endlessBest: Math.max(0, Math.floor(num(o.endlessBest, 0))),
      endlessLevel: Math.max(0, Math.floor(num(o.endlessLevel, 0))),
      endlessRun: endlessRun(o.endlessRun),
    };
  } catch {
    console.warn('本地存档无法解析，已使用默认记录');
    return d;
  }
}

export function loadSave(): SaveData {
  try {
    return parseSave(localStorage.getItem(KEY));
  } catch {
    console.warn('无法读取本地存档，已使用默认记录');
    return defaults();
  }
}

export function writeSave(data: SaveData): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(data));
  } catch {
    console.warn('无法保存游戏记录，请检查浏览器的存储设置');
  }
}
