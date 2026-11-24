// @ts-check

import sitemap from '@astrojs/sitemap';
import { defineConfig, fontProviders } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

// The fonts are downloaded at build and served from the site, so no stylesheet from another origin holds up the first paint.
const google = fontProviders.google();

export default defineConfig({
  site: 'https://eduardogdebem.com',
  integrations: [sitemap()],
  adapter: cloudflare(),
  // The page's CSS goes in the HTML itself: one request fewer before anything shows.
  build: { inlineStylesheets: 'always' },
  fonts: [
    { provider: google, name: 'Oswald', cssVariable: '--font-oswald', weights: [200, 300, 400, 500], subsets: ['latin'], fallbacks: ['Arial Narrow', 'sans-serif'] },
    { provider: google, name: 'Geist Mono', cssVariable: '--font-geist-mono', weights: [300, 400, 500], subsets: ['latin'], fallbacks: ['ui-monospace', 'monospace'] },
    { provider: google, name: 'Cinzel', cssVariable: '--font-cinzel', weights: [400, 500], subsets: ['latin'], fallbacks: ['Georgia', 'serif'] },
  ],
});
