// 多语言：首次访问按浏览器语言自动选择；用户手动选择后存入本地存档。
import { de } from './de';
import type { Dict, TKey } from './en';
import { en } from './en';
import { es } from './es';
import { fr } from './fr';
import { ja } from './ja';
import { ko } from './ko';
import { ru } from './ru';
import { zhCN } from './zh-CN';
import { zhTW } from './zh-TW';

export type Lang = 'zh-CN' | 'zh-TW' | 'en' | 'ja' | 'ko' | 'es' | 'fr' | 'de' | 'ru';
export type { TKey };

export const LANGS: { code: Lang; name: string }[] = [
  { code: 'zh-CN', name: '简体中文' },
  { code: 'zh-TW', name: '繁體中文' },
  { code: 'en', name: 'English' },
  { code: 'ja', name: '日本語' },
  { code: 'ko', name: '한국어' },
  { code: 'es', name: 'Español' },
  { code: 'fr', name: 'Français' },
  { code: 'de', name: 'Deutsch' },
  { code: 'ru', name: 'Русский' },
];

export const DICTS: Record<Lang, Dict> = {
  'zh-CN': zhCN,
  'zh-TW': zhTW,
  en,
  ja,
  ko,
  es,
  fr,
  de,
  ru,
};

export function isLang(x: unknown): x is Lang {
  return typeof x === 'string' && Object.prototype.hasOwnProperty.call(DICTS, x);
}

/** 按浏览器语言列表挑选界面语言；繁体地区（台湾/香港/澳门/Hant）映射到 zh-TW */
export function detectLang(langs: readonly string[]): Lang {
  for (const raw of langs) {
    const l = raw.toLowerCase();
    if (l.startsWith('zh')) return /(tw|hk|mo|hant)/.test(l) ? 'zh-TW' : 'zh-CN';
    const base = l.split('-')[0];
    if (isLang(base)) return base;
  }
  return 'en';
}

let current: Lang = 'en';

export function setLang(lang: Lang): void {
  current = lang;
}

export function getLang(): Lang {
  return current;
}

export function t(key: TKey, vars?: Record<string, string | number>): string {
  let s = DICTS[current][key] ?? en[key];
  if (vars)
    for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
