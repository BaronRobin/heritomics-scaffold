// Route map: one entry per page, with its path segment in each language.
// Every link in the site is built with path(), so URLs stay consistent and respect the deploy base.

export const languages = { de: 'Deutsch', en: 'English' } as const;
export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'de';
export const langs = Object.keys(languages) as Lang[];

export const routes = {
  home: { de: '', en: '' },
  experiences: { de: 'erlebnisse', en: 'experiences' },
  about: { de: 'ueber', en: 'about' },
  styleguide: { de: 'styleguide', en: 'styleguide' },
  imprint: { de: 'impressum', en: 'imprint' },
  privacy: { de: 'datenschutz', en: 'privacy' },
} as const;
export type RouteKey = keyof typeof routes;

const base = import.meta.env.BASE_URL.replace(/\/$/, '');

/** URL of a page, e.g. path('en', 'experiences', 'leben-aus-nebel') → /en/experiences/leben-aus-nebel/ */
export function path(lang: Lang, key: RouteKey, slug?: string): string {
  const parts = [lang, routes[key][lang], slug].filter(Boolean);
  return `${base}/${parts.join('/')}/`;
}

/** URL of a file in public/, e.g. asset('media/clip.mp4') */
export function asset(file: string): string {
  return `${base}/${file.replace(/^\//, '')}`;
}

export function otherLang(lang: Lang): Lang {
  return lang === 'de' ? 'en' : 'de';
}
