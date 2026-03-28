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
  },
  fr: {
    code: 'fr',
    name: 'Français',
    flag: '🇫🇷'
  },
  es: {
    code: 'es',
    name: 'Español',
    flag: '🇪🇸'
  },
  it: {
    code: 'it',
    name: 'Italiano',
    flag: '🇮🇹'
  }
} as const;

export type LanguageCode = keyof typeof LANGUAGES;

export const DEFAULT_LANGUAGE: LanguageCode = 'de';