# CLAUDE.md — Eduardo de Bem's site (branch `exp/classical-cyber`)

A from-scratch redesign, after Nous Research's Hermes Agent and Portal sites: classical statues, engravings and paintings printed in one green ink on a green-black night, beside light condensed headlines, mono text and flat sharp blocks. `main` still has the open-book site (Codex), the blog and the 3D scenes; this branch removes them.

## The page

One page, in English at `/` and Portuguese at `/pt/` (`src/pages/index.astro`, `src/pages/pt/index.astro`, both rendering `src/views/Site.astro`). Everything it says is in `src/data/site.ts` (both languages, `t(lang)`); the projects are in `src/data/projects.ts`.

- **Layout:** a fixed bar across the top (brand, numbered sections with the one being read underlined, GitHub, LinkedIn, EN · PT, Get in touch; on a phone a Menu button and a full-screen sheet). Then: a full-screen hero (Julius Caesar, the Tusculum portrait, printed in row by row with slow rays behind; a huge upper-case headline whose words rise in; a ticker of the stack along its foot); Projects as a deck of cards (the screenshot, or code, on one side; the project on the other) that stack under the bar as the page scrolls, each held a little lower than the last (plain on phones), Melencolia faint behind the head; a full-screen painting with a Latin motto; About beside a sticky statue, holding the bio, where I've worked (a ruled list) and what I work with (a logo beside each, `src/data/logos.ts`: simple-icons where it has the brand, a line icon where it doesn't); Contact beside Giambologna's Mercury (the messenger) in an orbit: the address in a solid accent block with a copy button, then LinkedIn, GitHub and the CV as ruled rows. The footer has room round it: the brand and motto, columns for the sections, elsewhere and language, the picture credits (`SHOWN` in Site.astro), a back-to-top line, and the name, outlined, cut by the page's foot.
- **Behaviour** (`src/scripts/site.ts`): the section being read underlines its link; the bar fills once the hero is behind (`html.past-hero`); `.reveal` elements fade up once in view (`html.reveals`); the menu; copying the email address. Scroll-driven CSS sinks Caesar as the hero leaves and drifts the painting.
- **Pictures:** `src/components/Art.astro` paints a one-ink PNG (`public/art/<id>.png`) through a CSS mask in `--art-ink`, at its own proportions (sizes and credits in `src/data/art.ts`). Project windows are scanned in on arrival. Project screenshots are toned green under a halftone screen (`luminosity` over the accent), and show their own colours under the pointer.
- **Making pictures:** `npm run art` (`scripts/art.mjs`) reads sources from `art-src/` (gitignored), crops, tones and dithers them (ordered Bayer dither in 2px pixels for statues and engravings, round-dot halftone for paintings) into transparent PNGs. Add a picture: put the source in `art-src/`, add it to `ART` in the script and in `src/data/art.ts` with its size and credit. Only use public domain or freely licensed images, and credit them (the footer lists `ART`).
- **Style:** `src/styles/site.css`. Oswald for headlines and upper-case labels, Geist Mono for text (Google Fonts, in `BaseHead.astro`). Accent `--accent` #34d27b; a 4px accent frame round the screen; a faint grain over everything.

## Kept

- `src/pages/api/now-playing.json.ts` (Jellyfin proxy, off on the page). Secrets: `JELLYFIN_URL`, `JELLYFIN_API_KEY`, `JELLYFIN_USER_ID` in `.dev.vars` or `npx wrangler secret put`. Never commit them.
- `src/seo.ts` (JSON-LD Person and WebSite, keep it in step with the CV), `BaseHead.astro` (meta, hreflang, icons), `public/eduardo-de-bem-cv.pdf` (`npm run cv`), project screenshots (`npm run previews`).
- `public/og.jpg` still shows the old design: re-render it from the new page.

## Commands

`npm run dev`, `npm run build`, `npm run preview` (Wrangler), `npm run deploy`, `npm run art`, `npm run previews`, `npm run cv`. Deploys to Cloudflare Workers; `main` is protected, so work goes through a branch and a PR.
