// @ts-check

import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import tailwindcss from '@tailwindcss/vite';

import cloudflare from '@astrojs/cloudflare';
import { readdirSync, readFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Posts marked `noindex: true` stay out of the sitemap (and carry a robots
// noindex), as do the subject pages, which are too thin to stand alone.
const BLOG = 'src/content/blog';
const walk = (dir) => readdirSync(dir, { withFileTypes: true }).flatMap((e) => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const hidden = new Set(
  walk(BLOG)
    .filter((f) => /\.mdx?$/.test(f) && /^noindex:\s*true\s*$/m.test(readFileSync(f, 'utf8')))
    .map((f) => `/blog/${relative(BLOG, f).replace(/\.mdx?$/, '')}/`),
);

export default defineConfig({
  site: 'https://eduardogdebem.com',
  integrations: [
    mdx(),
    sitemap({
      filter: (page) => {
        const path = new URL(page).pathname;
        return !path.startsWith('/blog/tag/') && !hidden.has(path);
      },
    }),
  ],

  vite: {
    plugins: [tailwindcss()],
  },

  adapter: cloudflare(),
});