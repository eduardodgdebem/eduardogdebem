import { getCollection } from 'astro:content';

// The field notes as the listing pages show them: newest first, each with its
// chapter number (the order they were written), and every subject in use.

export async function notes() {
  const all = await getCollection('blog');
  const posts = all.toSorted((a, b) => b.data.pubDate.valueOf() - a.data.pubDate.valueOf());
  const chapters = new Map(posts.toReversed().map((p, i) => [p.id, i + 1]));
  const allTags = [...new Set(all.flatMap((p) => p.data.tags ?? []))].sort();
  return { posts, chapters, allTags };
}
