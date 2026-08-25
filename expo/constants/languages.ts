export const LANGUAGES = {
  de: {
    code: 'de',
    name: 'Deutsch',
    flag: '🇩🇪'
  },
  en: {
    code: 'en',
    name: 'English',
    flag: '🇺🇸'
  }
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export const DEFAULT_LANGUAGE: LanguageCode = 'de';