// @ts-check

import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';

import cloudflare from '@astrojs/cloudflare';

export default defineConfig({
  site: 'https://eduardogdebem.com',
  integrations: [sitemap()],
  adapter: cloudflare(),
});
