import { afterEach, describe, expect, it, vi } from 'vitest';

import { detectLang, DICTS, isLang, setLang, t } from '../src/i18n';
import { en } from '../src/i18n/en';
import { defaults, loadSave, parseSave, writeSave } from '../src/storage';

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('i18n', () => {
  it('rejects inherited object keys as language codes', () => {
    for (const lang of ['__proto__', 'constructor', 'toString']) {
      expect(isLang(lang)).toBe(false);
      expect(parseSave(JSON.stringify({ lang })).lang).toBeNull();
    }
  });
  it('detects languages from browser preferences', () => {
    expect(detectLang(['zh-CN', 'en'])).toBe('zh-CN');
    expect(detectLang(['zh-TW'])).toBe('zh-TW');
    expect(detectLang(['zh-HK'])).toBe('zh-TW');
    expect(detectLang(['zh-Hant-TW'])).toBe('zh-TW');
    expect(detectLang(['zh'])).toBe('zh-CN');
    expect(detectLang(['ja-JP'])).toBe('ja');
    expect(detectLang(['pt-BR', 'fr-CA'])).toBe('fr');
    expect(detectLang(['pt-BR'])).toBe('en');
    expect(detectLang([])).toBe('en');
  });

  it('keeps every placeholder in every language', () => {
    const ph = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join();
    for (const [lang, dict] of Object.entries(DICTS)) {
      for (const key of Object.keys(en) as (keyof typeof en)[]) {
        expect(ph(dict[key]), `${lang}.${key}`).toBe(ph(en[key]));
        expect(dict[key].trim().length, `${lang}.${key}`).toBeGreaterThan(0);
      }
    }
  });

  it('interpolates variables', () => {
    setLang('zh-CN');
    expect(t('continueLevel', { level: '2-3' })).toBe('继续 2-3');
    setLang('en');
    expect(t('totalStars', { n: 5, total: 90 })).toBe('Stars 5/90');
  });
});

describe('storage', () => {
  it('falls back to defaults on corrupt data', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(parseSave('{not json').unlocked).toBe(0);
    expect(warn).toHaveBeenCalledOnce();
    expect(parseSave(null).sound).toBe(true);
  });

  it('sanitises fields', () => {
    const s = parseSave(
      JSON.stringify({
        lang: 'xx',
        sound: false,
        unlocked: 3.7,
        stars: [3, 'a'],
        best: 'no',
      }),
    );
    expect(s.lang).toBeNull();
    expect(s.sound).toBe(false);
    expect(s.unlocked).toBe(3);
    expect(s.stars).toEqual([3, 0]);
    expect(s.best).toEqual([]);
  });

  it('sanitises endless checkpoints and score fields', () => {
    expect(
      parseSave(
        JSON.stringify({
          stars: [4, -1, 1.8],
          best: [-5, 12],
          endlessBest: -10,
          endlessLevel: -2.7,
          endlessRun: { depth: 4.8, seed: 17.9, score: -3, lives: 8.6 },
        }),
      ),
    ).toMatchObject({
      stars: [3, 0, 1],
      best: [0, 12],
      endlessBest: 0,
      endlessLevel: 0,
      endlessRun: { depth: 4, seed: 17, score: 0, lives: 8 },
    });
    expect(
      parseSave(JSON.stringify({ endlessRun: { depth: 0, lives: 0 } })).endlessRun,
    ).toBeNull();
  });
});

describe('storage availability', () => {
  it('reports storage failures without preventing play', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.stubGlobal('localStorage', {
      getItem: () => {
        throw new Error('storage blocked');
      },
      setItem: () => {
        throw new Error('quota exceeded');
      },
    });
    expect(loadSave()).toEqual(defaults());
    expect(() => writeSave(defaults())).not.toThrow();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it('keeps the Fable save key and leaves old repository records untouched', () => {
    const saved = { ...defaults(), unlocked: 5, stars: [3, 2, 1], endlessBest: 4000 };
    const records = new Map([
      ['breakout-web-state-v1', 'legacy-record'],
      ['neon-breakout:v1', JSON.stringify(saved)],
    ]);
    vi.stubGlobal('localStorage', {
      getItem: (key: string) => records.get(key) ?? null,
      setItem: (key: string, value: string) => records.set(key, value),
    });
    expect(loadSave()).toEqual(saved);
    writeSave({ ...saved, endlessBest: 5000 });
    expect(JSON.parse(records.get('neon-breakout:v1')!).endlessBest).toBe(5000);
    expect(records.get('breakout-web-state-v1')).toBe('legacy-record');
  });
});
