// The top page corners turn back and forward through the browser history.
// Each page records its title as it's read, so a corner can name the page it
// turns to; the leaf's direction comes from the pagereveal script in Codex.astro.

type Entry = { url: string | null; index: number };
type Navigation = { canGoBack: boolean; canGoForward: boolean; currentEntry: Entry | null; entries(): Entry[] };

const KEY = 'codex-titles';
const path = (url: string) => new URL(url, location.href).pathname;

function titles(): Record<string, string> {
  try {
    return JSON.parse(sessionStorage.getItem(KEY) ?? '{}');
  } catch {
    return {};
  }
}

function remember() {
  const all = titles();
  // The index's title is the site's name; in the book it's the Index.
  all[location.pathname] = location.pathname === '/' ? 'Index' : document.title.split(' — ')[0];
  try {
    sessionStorage.setItem(KEY, JSON.stringify(all));
  } catch {}
}

function update() {
  const nav = (window as unknown as { navigation?: Navigation }).navigation;
  const known = titles();
  for (const corner of document.querySelectorAll<HTMLButtonElement>('[data-turn]')) {
    const back = corner.dataset.turn === 'back';
    // Without the Navigation API, back is a fair guess and forward isn't.
    const can = nav ? (back ? nav.canGoBack : nav.canGoForward) : back && history.length > 1;
    corner.hidden = !can;
    if (!can) continue;
    const here = nav?.currentEntry;
    const there = here && nav.entries()[here.index + (back ? -1 : 1)];
    const name = there?.url ? known[path(there.url)] : undefined;
    corner.querySelector('.corner-label')!.textContent = name ?? (back ? 'Retro' : 'Porro');
    corner.setAttribute('aria-label', `${back ? 'Back' : 'Forward'}${name ? `: ${name}` : ''}`);
  }
}

export function foldCorners() {
  remember();
  update();
  // Restored from the back/forward cache: where history leads has changed.
  addEventListener('pageshow', (e) => e.persisted && update());
  document.addEventListener('click', (e) => {
    const corner = (e.target as Element).closest<HTMLButtonElement>('[data-turn]');
    if (!corner) return;
    if (corner.dataset.turn === 'back') history.back();
    else history.forward();
  });
}
