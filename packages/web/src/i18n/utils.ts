import { ui, defaultLang, languages, type Language, type TranslationKey } from './ui';

export type { Language, TranslationKey };
export { languages };

export function getLangFromUrl(url: URL): Language {
  const segments = url.pathname.split('/').filter(Boolean);
  const firstSegment = segments[0]?.toLowerCase();

  if (['es', 'pt', 'ko'].includes(firstSegment ?? '')) {
    return firstSegment as Language;
  }

  return 'en';
}

export function useTranslations(lang: Language) {
  return function t(key: TranslationKey): string {
    const safeLang = (lang && ui[lang]) ? lang : defaultLang;
    return ui[safeLang][key] || ui[defaultLang][key];
  };
}

export function getLocalizedPath(path: string): string {
  if (typeof window === 'undefined') {
    throw new Error('getLocalizedPath() can only be used client-side');
  }

  const currentLang = getLangFromUrl(new URL(window.location.href));
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  const pathWithSlash = cleanPath.endsWith('/') ? cleanPath : `${cleanPath}/`;

  if (currentLang === 'en') {
    return `/${pathWithSlash}`;
  }

  return `/${currentLang}/${pathWithSlash}`;
}

export function getAlternateRoutes(currentPath: string) {
  const cleanPath = currentPath
    .replace(/^\/(es|pt|ko)/, '')
    .replace(/\/$/, '') || '/';

  const pathWithSlash = cleanPath === '/' ? '/' : `${cleanPath}/`;

  return {
    en: pathWithSlash,
    es: `/es${pathWithSlash}`,
    pt: `/pt${pathWithSlash}`,
    ko: `/ko${pathWithSlash}`,
  };
}

