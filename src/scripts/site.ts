// The page's behaviour (src/views/Site.astro): the bar marks the section being
// read and darkens once the hero is behind; Caesar turns; things are printed in as they come
// into view; the phone's menu; copying the address.

const root = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── The section being read, and the bar over the hero ── */

const sections = [...document.querySelectorAll<HTMLElement>('[data-section]')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav]')];
const show = (id: string) => links.forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === id));
const reading = new IntersectionObserver(
  (entries) => {
    for (const e of entries) if (e.isIntersecting) show((e.target as HTMLElement).dataset.section!);
  },
  { rootMargin: '-45% 0px -50% 0px' },
);
sections.forEach((s) => reading.observe(s));

const hero = document.querySelector<HTMLElement>('.hero');
if (hero) new IntersectionObserver(([e]) => root.classList.toggle('past-hero', !e.isIntersecting), { rootMargin: '-80px 0px 0px 0px' }).observe(hero);

/* ── Caesar turns all the way round as the hero scrolls away ── */

const turn = document.querySelector<HTMLElement>('[data-turn]');
if (turn && !still) {
  const frames = Number(turn.dataset.turn);
  const cols = Number(turn.dataset.cols);
  const ink = turn.querySelector<HTMLElement>('.art-ink')!;
  let shown = -1;
  let queued = false;
  const step = () => {
    queued = false;
    const p = Math.min(1, Math.max(0, scrollY / innerHeight));
    const f = Math.round(p * frames) % frames;
    if (f === shown) return;
    shown = f;
    ink.style.setProperty('--col', String(f % cols));
    ink.style.setProperty('--row', String(Math.floor(f / cols)));
  };
  addEventListener('scroll', () => queued || ((queued = true), requestAnimationFrame(step)), { passive: true });
  step();
}

/* ── Printed in as it comes into view ── */

const reveals = [...document.querySelectorAll<HTMLElement>('.reveal')];
if (still) {
  reveals.forEach((el) => el.classList.add('is-in'));
} else {
  root.classList.add('reveals');
  const seen = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (!e.isIntersecting) continue;
        e.target.classList.add('is-in');
        seen.unobserve(e.target);
      }
    },
    { rootMargin: '0px 0px -10% 0px' },
  );
  reveals.forEach((el) => seen.observe(el));
}
// The hero is there at once.
requestAnimationFrame(() => root.classList.add('loaded'));

/* ── The phone's menu ── */

const menu = document.querySelector<HTMLButtonElement>('[data-menu]')!;
const label = menu.querySelector<HTMLElement>('[data-menu-label]')!;
const setMenu = (open: boolean) => {
  menu.setAttribute('aria-expanded', String(open));
  label.textContent = open ? menu.dataset.close! : menu.dataset.open!;
  root.classList.toggle('menu-open', open);
};
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
document.getElementById('bar-nav')!.addEventListener('click', (e) => (e.target as Element).closest('a') && setMenu(false));
addEventListener('keydown', (e) => e.key === 'Escape' && root.classList.contains('menu-open') && (setMenu(false), menu.focus()));

/* ── Copying the address ── */

for (const b of document.querySelectorAll<HTMLButtonElement>('[data-copy]')) {
  const text = b.querySelector<HTMLElement>('[data-copy-label]')!;
  const idle = text.textContent;
  b.addEventListener('click', async () => {
    try {
      await navigator.clipboard.writeText(b.dataset.copy!);
    } catch {
      return;
    }
    text.textContent = b.dataset.copied!;
    setTimeout(() => (text.textContent = idle), 1600);
  });
}
