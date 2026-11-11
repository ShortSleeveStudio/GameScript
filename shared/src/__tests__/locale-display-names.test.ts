import { describe, it, expect } from 'vitest';
import { LOCALE_AUTONYMS, getLocaleAutonym, findLocaleCode } from '../cldr/locale-display-names.js';
import { isKnownLocale } from '../cldr/plural-rules.js';

describe('LOCALE_AUTONYMS', () => {
  it('lists regional and script variants, not just base languages', () => {
    for (const code of ['zh', 'zh-Hans', 'zh-Hant', 'es', 'es-419', 'es-MX', 'fr-CA', 'pt-PT', 'en-GB', 'ko']) {
      expect(LOCALE_AUTONYMS.has(code), code).toBe(true);
    }
  });

  it('only lists locales that isKnownLocale accepts', () => {
    // The UI shows "Unknown locale" and hides the display name for codes isKnownLocale rejects
    const rejected = [...LOCALE_AUTONYMS.keys()].filter((code) => !isKnownLocale(code));
    expect(rejected).toEqual([]);
  });

  it('includes default-content locales commonly used as project codes', () => {
    for (const code of ['pt-BR', 'ja-JP', 'ko-KR', 'en-US', 'es-ES', 'fr-FR']) {
      expect(LOCALE_AUTONYMS.has(code), code).toBe(true);
    }
  });

  it('includes region-only aliases for script-qualified Chinese locales', () => {
    expect(LOCALE_AUTONYMS.get('zh-TW')).toBe(LOCALE_AUTONYMS.get('zh-Hant-TW'));
    expect(LOCALE_AUTONYMS.get('zh-HK')).toBe(LOCALE_AUTONYMS.get('zh-Hant-HK'));
    expect(LOCALE_AUTONYMS.get('zh-CN')).toBe(LOCALE_AUTONYMS.get('zh-Hans-CN'));
  });

  it('gives script variants distinct names', () => {
    expect(LOCALE_AUTONYMS.get('zh-Hans')).toBe('简体中文');
    expect(LOCALE_AUTONYMS.get('zh-Hant')).toBe('繁體中文');
    expect(LOCALE_AUTONYMS.get('zh-Hans')).not.toBe(LOCALE_AUTONYMS.get('zh-Hant'));
  });

  it('names default-content locales like their parent (exported as the player-facing name)', () => {
    expect(LOCALE_AUTONYMS.get('ja-JP')).toBe(LOCALE_AUTONYMS.get('ja'));
    expect(LOCALE_AUTONYMS.get('ko-KR')).toBe(LOCALE_AUTONYMS.get('ko'));
    expect(LOCALE_AUTONYMS.get('pt-BR')).toBe(LOCALE_AUTONYMS.get('pt'));
  });
});

describe('findLocaleCode', () => {
  it('ignores separator and case', () => {
    expect(findLocaleCode('zh-TW')).toBe('zh-TW');
    expect(findLocaleCode('zh_TW')).toBe('zh-TW');
    expect(findLocaleCode('zh-tw')).toBe('zh-TW');
    expect(findLocaleCode('ZH_HANT')).toBe('zh-Hant');
    expect(findLocaleCode('ja_JP')).toBe('ja-JP');
  });

  it('does not fall back to the language subtag', () => {
    expect(findLocaleCode('de-XX')).toBeNull();
    expect(findLocaleCode('x-custom')).toBeNull();
  });
});

describe('getLocaleAutonym', () => {
  it('normalizes separator and case', () => {
    expect(getLocaleAutonym('ja_JP')).toBe('日本語');
    expect(getLocaleAutonym('zh_Hant')).toBe('繁體中文');
    expect(getLocaleAutonym('zh-tw')).toBe('繁體中文');
    expect(getLocaleAutonym('pt-br')).toBe('português');
  });

  it('falls back to the language for unlisted regions, then to the code', () => {
    expect(getLocaleAutonym('de_XX')).toBe('Deutsch');
    expect(getLocaleAutonym('x-custom')).toBe('x-custom');
  });
});
