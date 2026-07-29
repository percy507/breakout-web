import { describe, expect, it } from 'vitest';

import i18n, {
  changeLanguage,
  getActionLabel,
  initI18n,
  selectPreferredLanguage,
} from './i18n';
import de from './locales/de';
import en from './locales/en';
import es from './locales/es';
import fr from './locales/fr';
import ja from './locales/ja';
import ko from './locales/ko';
import ru from './locales/ru';
import zhCN from './locales/zh-CN';
import zhTW from './locales/zh-TW';

function flattenKeys(value: unknown, prefix = ''): string[] {
  if (!value || typeof value !== 'object') {
    return [prefix];
  }

  return Object.entries(value).flatMap(([key, nestedValue]) =>
    flattenKeys(nestedValue, prefix ? `${prefix}.${key}` : key),
  );
}

describe('i18n resources', () => {
  it('keeps all locale files on the same key set', () => {
    const baseKeys = flattenKeys(en).sort();

    expect(flattenKeys(zhCN).sort()).toEqual(baseKeys);
    expect(flattenKeys(zhTW).sort()).toEqual(baseKeys);
    expect(flattenKeys(ja).sort()).toEqual(baseKeys);
    expect(flattenKeys(es).sort()).toEqual(baseKeys);
    expect(flattenKeys(fr).sort()).toEqual(baseKeys);
    expect(flattenKeys(de).sort()).toEqual(baseKeys);
    expect(flattenKeys(ko).sort()).toEqual(baseKeys);
    expect(flattenKeys(ru).sort()).toEqual(baseKeys);
  });

  it('detects the best supported language from browser language tags', () => {
    expect(selectPreferredLanguage(['fr-CA', 'en-US'])).toBe('fr');
    expect(selectPreferredLanguage(['es-MX'])).toBe('es');
    expect(selectPreferredLanguage(['zh-Hant-HK'])).toBe('zh-TW');
    expect(selectPreferredLanguage(['zh-SG'])).toBe('zh-CN');
    expect(selectPreferredLanguage(['pt-BR', 'it-IT'])).toBe('en');
  });

  it('loads non-default language resources only when switching', async () => {
    await initI18n();
    expect(i18n.hasResourceBundle('ja', 'translation')).toBe(false);

    await changeLanguage('ja');

    expect(i18n.hasResourceBundle('ja', 'translation')).toBe(true);
    expect(getActionLabel('ready')).toBe('開始');
  });
});
