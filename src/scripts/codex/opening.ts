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
    if (!root.classList.contains('opening') || root.classList.contains('uncovered')) return resolve();
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

  // Let the sigil tool in, but never hold the reader past 2.5s.
  await Promise.race([Promise.all([loaded(), document.fonts.ready, wait(900)]), wait(2500)]);

  // Once the board is over, the pages (blank while it opened) fade in and
  // everything on them starts at once: the plates engrave, the banderoles
  // unroll, and the text is written in with the quill (Codex.astro).
  const uncover = () => {
    root.classList.add('uncovered');
    (window as unknown as { codexWrite?: () => void }).codexWrite?.();
    document.dispatchEvent(new Event(OPENED));
  };
  const done = () => {
    root.classList.remove('opening', 'uncovered');
    gsap.set([book, board, verso, ...faces, ...document.querySelectorAll('.roller')], { clearProps: 'all' });
  };

  const tl = gsap.timeline({ onComplete: done });
  if (spread) {
    // The book lifts a touch, then the board swings over on the spine.
    tl.to(board, { z: 18, duration: 0.25, ease: 'power1.out' });
    tl.to(board, { rotateY: -180, z: 0, duration: 1.15, ease: 'power2.inOut' }, '>-0.05');
    // Closed, the book sits centred; open, the spread is. The left page is
    // uncovered from the spine as the board passes over it.
    // x: 0 matters: GSAP reads the CSS translateX(-25%) as a pixel x and would
    // stack it under xPercent, holding the book off-centre until clearProps.
    tl.fromTo(book, { x: 0, xPercent: -25 }, { x: 0, xPercent: 0, duration: 1.15, ease: 'power2.inOut' }, '<');
    tl.fromTo(
      verso,
      { clipPath: 'inset(0% 0% 0% 100%)' },
      { clipPath: 'inset(0% 0% 0% 0%)', duration: 0.6, ease: 'power2.out' },
      '<0.55',
    );
    // The inside of the board is blank endpaper; it lifts away off the left
    // page as the pages come alive.
    tl.call(uncover, [], '>-0.1');
    tl.to(faces, { autoAlpha: 0, duration: 0.5, ease: 'power1.inOut' }, '<');
  } else {
    // On a phone it's a scroll, not a book: it lies rolled up in the middle of
    // the screen, and is opened both ways at once, as two hands open one.
    const [top, bottom] = [...document.querySelectorAll<HTMLElement>('.roller')];
    // The CSS holds them together in the middle until now; measured at rest,
    // they're eased out from there to it.
    gsap.set([top, bottom], { translate: 'none' });
    const half = (bottom.getBoundingClientRect().top - top.getBoundingClientRect().top) / 2;
    const unroll = { duration: 1.1, ease: 'power2.inOut' };
    tl.fromTo(book, { clipPath: 'inset(50% 0% 50% 0%)' }, { clipPath: 'inset(0% 0% 0% 0%)', ...unroll });
    tl.fromTo(top, { y: half }, { y: 0, ...unroll }, '<');
    tl.fromTo(bottom, { y: -half }, { y: 0, ...unroll }, '<');
    tl.call(uncover, [], '>-0.15');
  }
}
