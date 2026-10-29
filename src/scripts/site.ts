// The page's behaviour (src/views/Site.astro): the section being read lights
// its line in the index and brings up its picture on the right; things are
// printed in as they come into view; the phone's menu; copying the address.

const root = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;

/* ── The section being read ── */

const sections = [...document.querySelectorAll<HTMLElement>('[data-section]')];
const links = [...document.querySelectorAll<HTMLAnchorElement>('[data-nav]')];
const layers = [...document.querySelectorAll<HTMLElement>('[data-rail]')];

const show = (id: string) => {
  links.forEach((a) => a.toggleAttribute('aria-current', a.dataset.nav === id));
  layers.forEach((l) => l.classList.toggle('is-on', l.dataset.rail === id));
};
show(sections[0]?.dataset.section ?? 'overview');

// The one crossing a line a little above the middle of the screen is the one being read.
const reading = new IntersectionObserver(
  (entries) => {
    for (const e of entries) if (e.isIntersecting) show((e.target as HTMLElement).dataset.section!);
  },
  { rootMargin: '-40% 0px -55% 0px' },
);
sections.forEach((s) => reading.observe(s));

/* ── Printed in as it comes into view ── */

const reveals = [...document.querySelectorAll<HTMLElement>('.reveal')];
if (still || !('IntersectionObserver' in window)) {
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
    { rootMargin: '0px 0px -8% 0px' },
  );
  reveals.forEach((el) => seen.observe(el));
}

/* ── The picture on the right leans a little toward the pointer ── */

const rail = document.querySelector<HTMLElement>('.rail-art');
if (rail && !still && matchMedia('(hover: hover)').matches) {
  let raf = 0;
  addEventListener(
    'pointermove',
    (e) => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(() => {
        const x = e.clientX / innerWidth - 0.5;
        const y = e.clientY / innerHeight - 0.5;
        rail.style.setProperty('--lean-x', `${(-x * 14).toFixed(1)}px`);
        rail.style.setProperty('--lean-y', `${(-y * 10).toFixed(1)}px`);
      });
    },
    { passive: true },
  );
}

/* ── The phone's menu ── */

const menu = document.querySelector<HTMLButtonElement>('[data-menu]')!;
const label = menu.querySelector<HTMLElement>('[data-menu-label]')!;
const setMenu = (open: boolean) => {
  menu.setAttribute('aria-expanded', String(open));
  label.textContent = open ? menu.dataset.close! : menu.dataset.open!;
  root.classList.toggle('menu-open', open);
};
menu.addEventListener('click', () => setMenu(menu.getAttribute('aria-expanded') !== 'true'));
document.getElementById('side-nav')!.addEventListener('click', (e) => (e.target as Element).closest('a') && setMenu(false));
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
    b.classList.add('is-done');
    setTimeout(() => {
      text.textContent = idle;
      b.classList.remove('is-done');
    }, 1600);
  });
}
