# CLAUDE.md — Eduardo de Bem's site (branch `exp/classical-cyber`)

A from-scratch redesign, after Nous Research's Hermes Agent and Portal sites: classical statues, engravings and paintings printed in one green ink on a green-black night, beside light condensed headlines, mono text and flat sharp blocks. `main` still has the open-book site (Codex), the blog and the 3D scenes; this branch removes them.

## The page

One page, in English at `/` and Portuguese at `/pt/` (`src/pages/index.astro`, `src/pages/pt/index.astro`, both rendering `src/views/Site.astro`). Everything it says is in `src/data/site.ts` (both languages, `t(lang)`); the projects are in `src/data/projects.ts`.

- **Layout:** three columns on a wide screen. On the left a sticky index (`.side`): the mark and name, a Get in touch block, the sections with icons and dotted leaders (the one being read is lit), elsewhere links, EN · PT. In the middle the sections (`SECTIONS`: overview, work, projects, stack, about, contact) and a footer crediting every picture. On the right a sticky rail: a call to write, and the picture for the section being read (`RAIL` in `art.ts`), printed in with a stepped scan when its section comes up. Under 1180px the rail goes; under 820px the index becomes a bar with a Menu button and a full-screen sheet.
- **Behaviour** (`src/scripts/site.ts`): an IntersectionObserver picks the section being read (lights its index line, switches the rail picture); `.reveal` elements fade up once in view (`html.reveals`); the rail picture leans toward the pointer; the menu; copying the email address.
- **Pictures:** `src/components/Art.astro` paints a one-ink PNG (`public/art/<id>.png`) through a CSS mask in `--art-ink`, at its own proportions (sizes and credits in `src/data/art.ts`). Pictures in windows (`.screen`) are scanned in on arrival and drift a few percent on scroll (CSS scroll-driven animations). Project screenshots are inverted green duotones under a halftone screen.
- **Making pictures:** `npm run art` (`scripts/art.mjs`) reads sources from `art-src/` (gitignored), crops, tones and dithers them (ordered Bayer dither in 2px pixels for statues and engravings, round-dot halftone for paintings) into transparent PNGs. Add a picture: put the source in `art-src/`, add it to `ART` in the script and in `src/data/art.ts` with its size and credit. Only use public domain or freely licensed images, and credit them (the footer lists `ART`).
- **Style:** `src/styles/site.css`. Oswald for headlines and upper-case labels, Geist Mono for text (Google Fonts, in `BaseHead.astro`). Accent `--accent` #34d27b; a 4px accent frame round the screen; a faint grain over everything.

## Kept

- `src/pages/api/now-playing.json.ts` (Jellyfin proxy, off on the page). Secrets: `JELLYFIN_URL`, `JELLYFIN_API_KEY`, `JELLYFIN_USER_ID` in `.dev.vars` or `npx wrangler secret put`. Never commit them.
- `src/seo.ts` (JSON-LD Person and WebSite, keep it in step with the CV), `BaseHead.astro` (meta, hreflang, icons), `public/eduardo-de-bem-cv.pdf` (`npm run cv`), project screenshots (`npm run previews`).
- `public/og.jpg` still shows the old design: re-render it from the new page.

## Commands

`npm run dev`, `npm run build`, `npm run preview` (Wrangler), `npm run deploy`, `npm run art`, `npm run previews`, `npm run cv`. Deploys to Cloudflare Workers; `main` is protected, so work goes through a branch and a PR.
