import type { Lang, StringKey } from '../../i18n/strings';

// The page's language, from scripts. Each page is rendered in one language
// (English at /, Portuguese under /pt/); the inline script at the end of
// Codex.astro hands its strings to scripts, and this reads them.

interface Runtime {
  lang: Lang;
  t(key: StringKey): string;
}

const runtime = () => (window as unknown as { codexLang?: Runtime }).codexLang;

export const lang = (): Lang => runtime()?.lang ?? 'en';

/** A string in the page's language (a key built at run time, like `place.${id}`, is taken on trust). */
export const t = (key: StringKey | (string & {})) => runtime()?.t(key as StringKey) ?? key;

/** Pick between an English and a Portuguese value. */
export const pick = <T>(en: T, pt: T) => (lang() === 'pt' ? pt : en);
