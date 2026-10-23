/**
 * Whether at least `share` of an element is on screen. A walk to a door only
 * plays when its plate can be seen; scrolled away (on a phone, say), a link
 * just turns the page.
 */
export function inView(el: Element, share = 0.5) {
  const r = el.getBoundingClientRect();
  if (!r.height || !r.width) return false;
  const seen = Math.min(r.bottom, innerHeight) - Math.max(r.top, 0);
  return seen / r.height >= share;
}
