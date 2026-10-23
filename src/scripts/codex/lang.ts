import type { Lang, StringKey } from '../../i18n/strings';

// The page's language, from scripts. The runtime itself is inline at the end of
// Codex.astro (so a stored choice applies before first paint); this reads it.

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

/** Call `fn` whenever the reader switches language. */
export const onLang = (fn: (lang: Lang) => void) => document.addEventListener('codex:lang', (e) => fn((e as CustomEvent<Lang>).detail));
