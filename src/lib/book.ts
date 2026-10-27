import { notes } from './notes';
import { href, type Page } from '../i18n/paths';
import type { Lang } from '../i18n/strings';

// The order of the book: its sections, with the field notes' chapters bound in
// after their listing. The running head lists the sections in this order, the
// top corners turn to the leaf before and after, and the folios (page numbers)
// run through it, so a page turn goes back or forward as the book does.

export interface Leaf {
  /** `home`, `about`, `notes`, `projects`, `ludus`, or `post:<id>`. */
  key: string;
  href: string;
  /** As the corners and the running head name it. */
  name: string;
  /** The left page's folio; the right page is the next. */
  folio: number;
}

/** The sections, in the book's order (the running head's links). */
export const SECTIONS: { page: Page; name: string }[] = [
  { page: 'home', name: 'Index' },
  { page: 'about', name: 'De auctore' },
  { page: 'notes', name: 'Commentarii' },
  { page: 'projects', name: 'Officina' },
  { page: 'ludus', name: 'Ludus' },
];

export async function book(lang: Lang): Promise<Leaf[]> {
  const { posts, chapters } = await notes();
  const leaves: Leaf[] = [];
  const add = (key: string, to: string, name: string) => leaves.push({ key, href: to, name, folio: 1 + leaves.length * 2 });
  for (const { page, name } of SECTIONS) {
    add(page, href(lang, page), name);
    // The chapters follow their listing, in the order they were written (posts are in English only).
    if (page === 'notes') for (const p of posts.toSorted((a, b) => chapters.get(a.id)! - chapters.get(b.id)!)) add(`post:${p.id}`, `/blog/${p.id}/`, p.data.title);
  }
  return leaves;
}
