// The book opening on the first page of a visit. Codex.astro's inline script
// sets `html.opening` before first paint (so the closed board is what paints),
// and the CSS in codex.css holds the closed state. This swings the board open
// once the page has loaded, then hands the spread back.
import { gsap } from 'gsap';

const root = document.documentElement;
const OPENED = 'codex:opened';

/** Resolves once the board has opened (immediately when the book never closed). */
export function bookOpened(): Promise<void> {
  return new Promise((resolve) => {
    if (!root.classList.contains('opening')) return resolve();
    document.addEventListener(OPENED, () => resolve(), { once: true });
  });
}

const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
const loaded = () =>
  new Promise<void>((r) => (document.readyState === 'complete' ? r() : addEventListener('load', () => r(), { once: true })));

export async function openBook() {
  if (!root.classList.contains('opening')) return;
  (window as unknown as { __codexOpening?: boolean }).__codexOpening = true;

  const book = document.querySelector<HTMLElement>('.book')!;
  const board = book.querySelector<HTMLElement>('.board')!;
  const verso = book.querySelector<HTMLElement>('.verso')!;
  // Fade the faces, never the board: opacity on a preserve-3d element
  // flattens it, and the mirrored front then shows through the endpaper.
  const faces = board.querySelectorAll<HTMLElement>('.board-front, .board-back');
  // Matches the portrait breakpoint in codex.css, where the spread is one column.
  const spread = !matchMedia('(max-aspect-ratio: 1/1)').matches;

  // Let the sigil finish tooling, but never hold the reader past 3.5s.
  await Promise.race([Promise.all([loaded(), document.fonts.ready, wait(1700)]), wait(3500)]);

  // Open, the pages are uncovered (they were blank while it opened) and
  // everything on them starts at once: the plates engrave, the banderoles
  // unroll, and the text is written in with the quill (Codex.astro).
  const done = () => {
    root.classList.remove('opening');
    gsap.set([book, board, verso, ...faces], { clearProps: 'all' });
    (window as unknown as { codexWrite?: () => void }).codexWrite?.();
    document.dispatchEvent(new Event(OPENED));
  };

  const tl = gsap.timeline({ onComplete: done });
  // The book lifts a touch, then the board swings over on the spine.
  tl.to(board, { z: 18, duration: 0.35, ease: 'power1.out' });
  tl.to(board, { rotateY: -180, z: 0, duration: 1.5, ease: 'power2.inOut' }, '>-0.05');
  if (spread) {
    // Closed, the book sits centred; open, the spread is. The left page is
    // uncovered from the spine as the board passes over it.
    // x: 0 matters: GSAP reads the CSS translateX(-25%) as a pixel x and would
    // stack it under xPercent, holding the book off-centre until clearProps.
    tl.fromTo(book, { x: 0, xPercent: -25 }, { x: 0, xPercent: 0, duration: 1.5, ease: 'power2.inOut' }, '<');
    tl.fromTo(
      verso,
      { clipPath: 'inset(0% 0% 0% 100%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.75, ease: 'power2.out' },
      '<0.75',
    );
  } else {
    tl.to(faces, { autoAlpha: 0, duration: 0.6, ease: 'power1.in' }, '<0.7');
  }
  // The inside of the board is blank endpaper; it lifts away off the left page.
  tl.to(faces, { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut' });
}
