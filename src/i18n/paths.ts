import type { Lang } from './strings';

// The pages that exist in both languages, at their English and Portuguese
// addresses. The posts, the subject pages and the not-found page are English only.

export type Page = 'home' | 'about' | 'notes' | 'ludus';

export const PATHS: Record<Page, Record<Lang, string>> = {
  home: { en: '/', pt: '/pt/' },
  about: { en: '/about/', pt: '/pt/sobre/' },
  notes: { en: '/blog/', pt: '/pt/notas/' },
  ludus: { en: '/ludus/', pt: '/pt/ludus/' },
};

export const href = (lang: Lang, page: Page) => PATHS[page][lang];
