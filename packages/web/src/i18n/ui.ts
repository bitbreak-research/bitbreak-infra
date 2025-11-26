import enTranslations from './locales/en.json';
import esTranslations from './locales/es.json';
import ptTranslations from './locales/pt.json';
import koTranslations from './locales/ko.json';

export const languages = {
  en: 'English',
  es: 'Español',
  pt: 'Português',
  ko: '한국어',
} as const;

export type Language = keyof typeof languages;

export const defaultLang: Language = 'en';

export const ui = {
  en: enTranslations,
  es: esTranslations,
  pt: ptTranslations,
  ko: koTranslations,
} as const;

export type TranslationKey = keyof typeof enTranslations;

