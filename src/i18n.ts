import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import type { GameStatus, PowerType } from './types';

export const SUPPORTED_LANGUAGES = [
  'en',
  'zh-CN',
  'zh-TW',
  'ja',
  'es',
  'fr',
  'de',
  'ko',
  'ru',
] as const;
export type Language = (typeof SUPPORTED_LANGUAGES)[number];

export const LANGUAGE_LABELS: Record<Language, string> = {
  en: 'English',
  'zh-CN': '简体中文',
  'zh-TW': '繁體中文',
  ja: '日本語',
  es: 'Español',
  fr: 'Français',
  de: 'Deutsch',
  ko: '한국어',
  ru: 'Русский',
};

const LANGUAGE_STORAGE_KEY = 'breakout-web-language';
const FALLBACK_LANGUAGE: Language = 'en';

const localeLoaders: Record<
  Language,
  () => Promise<{ default: Record<string, unknown> }>
> = {
  en: () => import('./locales/en'),
  'zh-CN': () => import('./locales/zh-CN'),
  'zh-TW': () => import('./locales/zh-TW'),
  ja: () => import('./locales/ja'),
  es: () => import('./locales/es'),
  fr: () => import('./locales/fr'),
  de: () => import('./locales/de'),
  ko: () => import('./locales/ko'),
  ru: () => import('./locales/ru'),
};

function isLanguage(value: string | null): value is Language {
  return Boolean(value && SUPPORTED_LANGUAGES.includes(value as Language));
}

/** 从浏览器语言列表推断最合适的界面语言 */
export function selectPreferredLanguage(languageTags: readonly string[]): Language {
  for (const languageTag of languageTags) {
    const normalizedTag = languageTag.trim().replace('_', '-');
    if (isLanguage(normalizedTag)) {
      return normalizedTag;
    }

    const lowerTag = normalizedTag.toLowerCase();
    if (
      lowerTag.startsWith('zh-hant') ||
      lowerTag.startsWith('zh-tw') ||
      lowerTag.startsWith('zh-hk') ||
      lowerTag.startsWith('zh-mo')
    ) {
      return 'zh-TW';
    }
    if (lowerTag.startsWith('zh')) {
      return 'zh-CN';
    }

    const baseLanguage = lowerTag.split('-')[0];
    if (isLanguage(baseLanguage)) {
      return baseLanguage;
    }
  }

  return FALLBACK_LANGUAGE;
}

function getBrowserLanguages() {
  if (typeof navigator === 'undefined') {
    return [];
  }

  return navigator.languages?.length
    ? navigator.languages
    : [navigator.language].filter(Boolean);
}

function getInitialLanguage(): Language {
  try {
    const storedLanguage = window.localStorage.getItem(LANGUAGE_STORAGE_KEY);
    return isLanguage(storedLanguage)
      ? storedLanguage
      : selectPreferredLanguage(getBrowserLanguages());
  } catch {
    return selectPreferredLanguage(getBrowserLanguages());
  }
}

export async function loadLanguage(language: Language) {
  if (i18n.hasResourceBundle(language, 'translation')) {
    return;
  }

  const { default: translation } = await localeLoaders[language]();
  i18n.addResourceBundle(language, 'translation', translation, true, true);
}

export async function initI18n() {
  if (i18n.isInitialized) {
    return;
  }

  const language = getInitialLanguage();
  const languagesToLoad =
    language === FALLBACK_LANGUAGE ? [FALLBACK_LANGUAGE] : [FALLBACK_LANGUAGE, language];
  const resources = Object.fromEntries(
    await Promise.all(
      languagesToLoad.map(async (locale) => {
        const { default: translation } = await localeLoaders[locale]();
        return [locale, { translation }];
      }),
    ),
  );

  await i18n.use(initReactI18next).init({
    resources,
    lng: language,
    fallbackLng: FALLBACK_LANGUAGE,
    interpolation: { escapeValue: false },
  });
}

export async function changeLanguage(language: Language) {
  await loadLanguage(language);
  await i18n.changeLanguage(language);
  saveLanguage(language);
}

export function saveLanguage(language: Language) {
  try {
    window.localStorage.setItem(LANGUAGE_STORAGE_KEY, language);
  } catch {
    // 语言偏好保存失败时，不影响本次切换
  }
}

export function getPowerupLabel(type: PowerType) {
  return i18n.t(`powerups.${type}`);
}

export function getStatusText(status: GameStatus) {
  return i18n.t(`status.${status}`);
}

export function getActionLabel(status: GameStatus) {
  if (status === 'aiming') {
    return i18n.t('actions.fire');
  }
  if (status === 'levelClear') {
    return i18n.t('actions.nextLevel');
  }
  if (status === 'gameOver') {
    return i18n.t('actions.retry');
  }
  if (status === 'ready') {
    return i18n.t('actions.start');
  }
  return i18n.t('actions.continue');
}

export default i18n;
