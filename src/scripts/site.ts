// The page's behaviour (src/views/Site.astro): the bar marks the section being
// read and darkens once the hero is behind; things are printed in as they come
// into view; a job's picture follows the pointer over its row; the phone's
// menu; copying the address.

const root = document.documentElement;
const still = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;

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

/* ── A job's picture follows the pointer over its row ── */

const follow = document.querySelector<HTMLElement>('[data-follow]');
if (follow && fine && !still) {
  const layers = [...follow.querySelectorAll<HTMLElement>('[data-follow-art]')];
  const at = { x: innerWidth / 2, y: innerHeight / 2 };
  const pos = { ...at };
  let raf = 0;
  let on = false;
  const loop = () => {
    pos.x += (at.x - pos.x) * 0.16;
    pos.y += (at.y - pos.y) * 0.16;
    const lean = Math.max(-8, Math.min(8, (at.x - pos.x) * 0.06));
    follow.style.transform = `translate(${pos.x}px, ${pos.y}px) translate(-50%, -50%) rotate(${lean}deg)`;
    raf = on || Math.abs(at.x - pos.x) > 0.5 ? requestAnimationFrame(loop) : 0;
  };
  for (const row of document.querySelectorAll<HTMLElement>('[data-hover-art]')) {
    row.addEventListener('pointerenter', (e) => {
      on = true;
      at.x = e.clientX;
      at.y = e.clientY;
      if (!follow.classList.contains('is-on')) Object.assign(pos, at);
      follow.classList.add('is-on');
      layers.forEach((l) => l.classList.toggle('is-on', l.dataset.followArt === row.dataset.hoverArt));
      if (!raf) raf = requestAnimationFrame(loop);
    });
    row.addEventListener('pointermove', (e) => {
      at.x = e.clientX;
      at.y = e.clientY;
    });
    row.addEventListener('pointerleave', () => {
      on = false;
      follow.classList.remove('is-on');
    });
  }
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
