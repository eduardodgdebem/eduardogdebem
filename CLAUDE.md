# CLAUDE.md — Eduardo de Bem Portfolio

Personal blog-first portfolio. The goal is "knows what he's saying, but is chill." Design direction: **Dead Reckoning** — dark tactical field notebook aesthetic, military green palette, Three.js terrain hero.

---

## Codex design (current)

The whole site is an open book. Round the pages are the open boards, the green leather of the closed cover with a gilt fillet (`.codex::before`, faded in as the book opens; `--squares` sets how far they stand out), and the leaves under the spread show edge-on (`.book`'s box-shadow). On the spread, a plate's caption is kept to one line (a long note ends in an ellipsis), so changing it never resizes the plate. `src/layouts/Codex.astro` renders every page as a spread: `slot="verso"` (left) and `slot="recto"` (right), 50/50, inside a fixed viewport (long pages scroll inside the page; on portrait screens the spread stacks and scrolls). Navigating between pages turns the leaf: cross-document View Transitions (`@view-transition { navigation: auto }` in `codex.css`), with `.verso`/`.recto` as named transition groups. An inline `pagereveal` script in the layout tags each transition `forward` or `back` (history traversal, or going "up" in URL depth), and `html:active-view-transition-type(back)` reverses the turn.

Home: the Via Sacra (`forum.ts`, geometry in `forum-models.ts`), a 2.5D orthographic street on a slab among the stars, with a FORUM banderole at the head of the plate. Every plate is framed as an old book frames its plates (`.plate-frame`): a Greek-key band between ruled lines with a rubric-dotted boss at each corner, one SVG used as a nine-slice `border-image` (`--band` sets its width). Every plate's banderole is drawn by `banner.ts` on a canvas of its own (`.plate-banner`), laid over the plate and a little wider and higher than its frame, so the ribbon spills onto the page as far as the nearest clipping ancestor allows (`.page-body` keeps `--spill` of room for it). Only the ribbon and its shadow are inked (`createPasses(…, { cutout: true })`), and a wave runs along it, strongest at the tails (still under reduced motion). On arrival it unrolls from the middle, two rolls running out to the tails, driven by the scene's tween of `banner.uniforms.uReveal` (the ribbon itself is always fully inked). The right page is the hero, set as a title page and centred: the name in two large lines beside a woodcut initial E (`Woodcut.astro`: the letter in rubric on hatching, with vines; its parts are drawn in on arrival), a double rule with a fleuron, the role, a one-line tagline (`home.tagline`) and the contact links (a pen stroke is drawn under one on hover). Below it, only the index of five chapters: on a chapter (hover, focus, or its building lit in the forum) a manicule points to it, the leader is inked red and the line leans in. Keep the home page short; the longer bio lives on /about. The now-playing note (Jellyfin) is off: `SHOW_NOW_PLAYING` in `consts.ts` keeps its markup, script and API route for later. On portrait screens the home spread scrolls like every other page (only the landscape spread is kept to one screen). The reader's citizen walks with ←/→/↑/↓ or WASD, or to a clicked spot. Three buildings are pages: the library → /blog, the statue → /about, the forge → GitHub (positions in `AT`). Hovering one in the scene or in the index inks it red and the camera pans to it. Standing at its door and pressing Enter, or clicking it, walks the citizen in (walking into a door doesn't), then the page turns; `sessionStorage['forum-at']` brings him back out at that door. The three page buildings stand 12% larger, with red standards and braziers at their doors. Focusing one (pointer, door or index) pins a label over it (`onTag` → `.place-tag` in index.astro). The other buildings are scenery: two arches, a tholos, a basilica, the Curia, insulae in two rows, a temple, and a garden with an exedra behind the statue. Keep the back row low so the sky and the planet still show. Townspeople (passers-by, a marching squad, an orator's crowd, merchants) and birds are animated in `drawPeople`/`drawBirds`. Within earshot of the orator (`ORATOR`, `EARSHOT`) the label shows his speeches from `orator.ts`, rotating every 8s. The lamp is fixed on the home plate; the pointer over the plate tilts the view a few degrees instead (`tilt` in `follow()`). The sky parallaxes: the planet follows the view at 0.82 and the composite's star field shifts by `uStarShift`. Red ink travels in the ink pass's red channel (`uGlow`, red in the lettering texture) to the paper pass.

/blog: inside the Bibliotheca (`library.ts`, geometry in `library-models.ts`, page wiring in `Library.astro`), walked like the street. Scroll cabinets line the back wall, and the number of cabinets grows with the posts. Each post is a red-tagged roll in a hole picked by a hash of its id, so it keeps its place as posts are added; the other holes hold plain rolls. Near a roll (or hovering it, or its line in the list) it is drawn out with a label; Enter or a click opens it. `sessionStorage['library-at']` brings the citizen back to that roll. The EXITVS door returns to the street outside the library. Also in the room: reading tables with readers, a librarian, browsers, a porter, and the Thinker (COGITATOR). Walking is shared with the forum through `walker.ts`, which also marks the ground (`marker.ts`, red ink in the ink pass): scenes call `walker.aim(point)` with the floor under a mouse (a slow-turning ring where he'd go, clamped to where he may walk), and `walkTo` plays a ping of closing chevrons; passes, ink, banner and helpers are shared through `passes.ts`.

/about: the author's plaza (`plaza.ts`, `plaza-models.ts`, `Plaza.astro`). The statue stands in the middle, ringed by a monument for each marginal note in `about.astro`; the `MONUMENT` map gives each one its plate and inscription, and the old home plates stand on the columns. Near a monument (or hovering its note) it inks red and its object turns; Enter turns it once round. The arch at the back leads to the street, by the statue. Easter egg: a blue police box (blue ink, `uBlue`) materializes every 25–75s, and a traveller in a red scarf has a look round. `?tardis` brings it every few seconds.

On a phone (portrait) the book is a scroll: the page lies between two wooden rollers (`.roller--top`, `.roller--bottom`, fixed outside `.book` in `Codex.astro`) on the dark of the desk, with no boards. A page change winds the old page up into the bottom roller as it rises to the top, then unwinds the new one down (`scroll-wind`, `scroll-unwind`, `roller-travel`: the roller is its own view-transition group, moved by `translate` over `--scroll-travel`, in step with the page's clip). A first visit finds it rolled up in the middle of the screen and opens it both ways (`opening.ts`).

The sigil (the site's mark) is one path in `src/components/sigil.ts`, drawn true on one centre line: `Logo.astro`, the binding's tooled sigil and the wax seal (`sigillum` in `scenes.ts`) all use it. Change it there, then regenerate the icons.

Icons: `public/favicon.svg` (square, the seal in rubric on paper), `favicon.ico` (16/32/48 PNGs in an ICO), `favicon-48.png`, `favicon-96.png`, `apple-touch-icon.png`, `icon-192.png`/`icon-512.png` and `site.webmanifest`. Search results need a square icon of 48px or more.

Phones: plates narrower than 560px zoom in (`plateZoom` in `passes.ts`) and the view follows the citizen in depth as well. On portrait the plate frame is 4:5 with an explicit width, because iOS Safari sizes an aspect-ratio-only frame too wide. With no hover and no Enter key, the label the citizen stands at becomes the button (`.place-tag.is-actionable`, whose `.tag-act` line says "Tap here to …"), and a `.touch-hint` replaces the keyboard hint. The view tilt follows a mouse only. Links in the index or chapter list only walk the citizen there when at least half the plate is on screen (`inView` in `visible.ts`); otherwise they turn the page straight away.

Languages: English at `/` and Portuguese under `/pt/`. Home, about and the field-notes listing exist in both (`/pt/`, `/pt/sobre/`, `/pt/notas/`; addresses in `src/i18n/paths.ts`). The pages are views in `src/views/` (`Home.astro`, `About.astro`), plus `Commentarii.astro`, that take `lang` and render through `tr(lang)` from `src/i18n/strings.ts`, which holds every key in both languages. Latin stays Latin, and the posts, subject pages and 404 are English only. Each bilingual page names its pair (`alternates`): `BaseHead` emits hreflang (en, pt-BR, x-default → en), and the EN · PT toggle in the running head links the two. Following the toggle skips the page turn (`pageswap`), and the new page writes its on-screen `data-i18n`/`data-i18n-html` text in with the quill (inline script in `Codex.astro`; long paragraphs a word at a time). Scripts read the page's language and its strings through `src/scripts/codex/lang.ts` (`t`, `pick`, `lang`), for the 3D labels and captions. To add text: give it a key in both languages, render it with `s(key)`, and mark the element `data-i18n`.

CV: `public/eduardo-de-bem-cv.pdf` is exported from the cv project (`../../../cv/cv.html`) by `npm run cv` (headless Chrome, A4). Re-run it after editing the CV. It's linked from the home and about pages and from the correspondence card (`CV_PDF` in `consts.ts`), and it includes the phone number.

SEO: the site lives at https://eduardogdebem.com (`site` in `astro.config.mjs`, `SITE_URL` in `src/seo.ts`), and canonicals, the sitemap and social previews derive from it. `BaseHead` takes `noindex`, `schema` (JSON-LD) and `canonical`. The home page carries `WebSite` + `Person` and the about page a `ProfilePage`, both from `src/seo.ts`: keep that in step with the CV. Posts with `noindex: true` in their frontmatter, and subject pages with fewer than three posts, carry a robots noindex and are filtered out of the sitemap in `astro.config.mjs`. The default link preview is `public/og.jpg`, a 1200×630 render of the home spread (re-render it when the home page changes). `public/robots.txt` names the sitemap, and `src/pages/404.astro` is the not-found page. Internal links use the trailing slash (`/blog/`, `/about/`), as the URLs are served.

Ludus (`/ludus/`, `/pt/ludus/`): a battle game behind the fourth door on the street, the Colosseum at the east end past the Arch of Severus (`amphitheatrum` in `forum.ts`; the slab runs to `SLAB`). `src/scripts/codex/ludus/sim.ts` is the battle with nothing to draw. It's deterministic, steps at 20 Hz, works at the level of cohorts, and holds the unit stats, the counters, formations, flanking, morale, the one horn call, the Gallic host, the presets and plan links (`#plan=`, two letters a slot). `ludus/ludus.ts` draws it: the arena from `ludus-models.ts`, and soldiers as one InstancedMesh a kind, the living and the fallen together. The engraving vertex shader takes `instanceMatrix`, and `instanceColor.r` picks an instance out in red. The page is `src/views/Ludus.astro`. The game is played on the plate: the coin purse and the tally, a badge over each cohort (`onMarkers` from `ludus.ts`, with icon and strength bar), a tray to drag soldiers from, a formation picker for the cohort in hand, and one round button (Pugnate!, then Signum!). The result card is shown on the plate too. The facing page has how-to-play in icons, the counters, the presets and the annals. A win sets the survivors leaping, the crowd (two halves, every other seat) rising in waves, rose petals falling, and a laurel drawn over the result. Romans are inked red and Gauls blue (`instanceColor`: r = red, g = blue), and each cohort is drawn with half its men as figures. Icons are in `src/components/icons.ts`. Every plate has `PlateTools.astro`, one ruled column of square cells down the plate's right side, the same on every scene: an info button (on the walkable scenes, `info="home|library|plaza"`) that opens a card of that scene's controls, built from `<scene>.hint` split at ' · ' (the touch line instead on touch screens), then zoom ±, and ⛶ to spread the plate over the whole open book (it stays spread on the next page: `sessionStorage['plate-spread']`, applied before first paint as `html.plate-spread` in `Codex.astro`, then handed to PlateTools; a page with no plate tools, like a post, drops it), not stretched there: it fades to paper, is laid at its new size, and the scene is engraved afresh (`plate:redraw` → `redrawOnSpread` in `banner.ts`: lines cut in again, the banderole unrolls): `.plate-frame.is-full`, with the pages' view-transition names dropped while it's spread so the plate isn't trapped under the facing page; on portrait it takes the screen), and its scene zooms through `src/scripts/codex/zoom.ts` (wheel, pinch, buttons). The arena zooms furthest and pans by dragging the sand. Balance is in `STATS`, `PACE` and `DREAD`: test a change by running presets headless (bundle sim.ts with esbuild and step it to the end). Aim for battles of about a minute that good plans win.

**Gotcha:** every engraved material shares one shader program, and a uniform a material doesn't declare keeps the last material's value. Declare every uniform the shader has, even at its default (`createInk` does), or a blue or pale surface leaks into everything drawn after it.

Plates per page: home's old plates I–III (galea, fides, currus) and IV stilus are no longer shown; /about → V sigillum (the logo in wax); subject pages and posts pick by tag via `plateForTags()` (dev → machina, notes → liber, thoughts → hora, tools → circinus; others → liber). To illustrate a new tag, add it to `SUBJECTS` in `catalogue.ts`.

Page corners (`Corner.astro`, `corners.ts`, styles in `codex.css`): the top-left corner goes back and the top-right forward through browser history, shown only when there's history that way (Navigation API `canGoBack`/`canGoForward`). Each page stores its title in `sessionStorage['codex-titles']` so a corner can name where it leads. Folios run in reading order (index 1, about 3, blog 5, subjects 7, chapters 10 + 2n). On a link the turn direction compares folios (`pageswap` stores the folio being left), and on a history traversal it compares entry indexes.

Opening: the first page of a visit arrives as a closed book. An inline script in `Codex.astro` sets `html.opening` before first paint (once per tab via `sessionStorage['codex-opened']`, and again on a reload; never under reduced motion); `Binding.astro` is the board, whose gilt sigil tools in while the page loads; `opening.ts` swings it open. The book opens on blank pages (`html.opening .verso > *` at opacity 0). As the board lands, `opening.ts` adds `html.uncovered`, which fades the pages (and the leather boards) in, and it call `window.codexWrite()` (the language toggle's quill, in `Codex.astro`) to write in the text, and fire `codex:opened`: plate intros wait on `bookOpened()`, so the engraving, banderole and title start then. To replay it, reload the page or open the site in a new tab. Fade the board's faces, never `.board` itself: opacity flattens `preserve-3d` and the mirrored front shows through.

**Gotcha:** the `@view-transition { navigation: auto }` opt-in must stay inline, first in `<head>` (`Codex.astro`). Put it in the bundled stylesheet and the dev server still turns pages, because it inlines CSS, but the production build drops every turn: the arriving page sees the opt-in too late. Test page turns on a production build (`npm run build`, then serve `dist/client` with `npx serve`), not only in dev.

**Gotcha:** in the page-turn CSS, back rules must use the full `animation:` shorthand. The forward rules' `animation: none` also resets `animation-duration` to 0, so a back rule that only sets `animation-name` runs instantly.

The Dead Reckoning notes below describe the previous design and are kept for history.

## Architecture Overview

Static site generated by Astro. No server, no database, no API. All content is Markdown/MDX files in `src/content/blog/`. The build outputs to `dist/` and is deployed as static HTML.

```
Browser → Astro SSG → Static HTML/CSS/JS
                    ↳ Three.js (bundled by Vite)
                    ↳ Google Fonts (CDN)
                    ↳ /rss.xml (generated)
                    ↳ /sitemap-index.xml (generated)
```

Key architectural decision: the Three.js canvas is `position: fixed; z-index: 0`. Hero content is `z-index: 10` (transparent, floats over canvas). Everything below the hero has `bg-void` (opaque), which covers the fixed canvas as the user scrolls. No canvas destruction/recreation needed.

---

## Full Tech Stack

| Layer | Technology | Version |
|---|---|---|
| Framework | Astro | ^6.3.1 |
| Styling | Tailwind CSS v4 | ^4.2.4 |
| Tailwind/Vite bridge | @tailwindcss/vite | ^4.2.4 |
| 3D | Three.js | ^0.184.0 |
| Three.js types | @types/three | ^0.184.1 |
| MDX support | @astrojs/mdx | ^5.0.4 |
| RSS feed | @astrojs/rss | ^4.0.18 |
| Sitemap | @astrojs/sitemap | ^3.7.2 |
| Image optimization | sharp | ^0.34.3 |
| Runtime | Node.js | >=22.12.0 |
| Fonts | Google Fonts (CDN) | — |
| Language | TypeScript (strict) | via astro |

**No React. No Vue. No client-side framework.** Everything is `.astro` components + vanilla TS scripts bundled by Vite.

---

## Environment Variables

Every page is static **except** `/api/now-playing.json`, which runs on the Cloudflare worker (`prerender = false`) and proxies Jellyfin so the API key never reaches the browser. It needs three secrets:

| Variable | Purpose |
|---|---|
| `JELLYFIN_URL` | `https://jellyfin.eduardogdebem.com` |
| `JELLYFIN_API_KEY` | Jellyfin API key (Dashboard → API Keys) |
| `JELLYFIN_USER_ID` | The `admin` user's id — only this user's playback is shown |

Local: `.dev.vars` (gitignored; template in `.dev.vars.example`). Production: `npx wrangler secret put <NAME>`. Without them the route returns 503 and the home page simply hides the widget.

Other configuration:

```js
// astro.config.mjs — hardcoded
site: 'https://eduardogdebem.com'
```

Update this before deploying to any other domain. No `.env` file is used or expected.

---

## Content Directory Structure

```
src/
├── components/
│   ├── BaseHead.astro       — <head> meta, OG tags, Google Fonts, favicon
│   ├── Header.astro         — Fixed nav: logo (EB), BLOG, ABOUT, GitHub icon
│   ├── HeaderLink.astro     — Nav link with active-state class via pathname detection
│   ├── Footer.astro         — Copyright, GitHub link, RSS link
│   ├── FormattedDate.astro  — Formats Date objects to "MMM DD, YYYY"
│   ├── Tag.astro            — Tag chip: optional href + active state
│
├── layouts/
│   ├── Codex.astro          — Every page: a two-page spread (verso/recto slots), running heads, folios, page-turn wiring
│   └── BlogPost.astro       — A post as a chapter: opener on the verso, text on the recto
│
├── pages/
│   ├── index.astro          — / (renders views/Home.astro in English; pt/index.astro in Portuguese) (no-scroll homepage: open codex — engraved plate + name banderole on the left, bio/index/engraved album cover on the right)
│   ├── about.astro          — /about (bio + interests sidebar)
│   ├── blog/
│   │   ├── index.astro      — /blog (all posts + tag filter row)
│   │   ├── [...slug].astro  — /blog/[slug]/ (dynamic post route)
│   │   └── tag/
│   │       └── [tag].astro  — /blog/tag/[tag]/ (filtered posts)
│   ├── api/
│   │   └── now-playing.json.ts — Jellyfin proxy: now playing / last watched + listened (server-rendered)
│   └── rss.xml.js           — /rss.xml (RSS feed endpoint)
│
├── content/
│   └── blog/                — Markdown and MDX files. One file = one post.
│       ├── *.md
│       └── *.mdx
│
├── scripts/
│   └── codex/
│       ├── models.ts        — Plate registry + home models (helmet / violin / F1 car); buildModel()
│       ├── scenes.ts        — Inner-page plates: stilus, sigillum, machina, liber, hora, circinus
│       ├── catalogue.ts     — Plate numbers + captions; subject (tag) → plate and Latin banner
│       ├── engraving.ts     — Copper-plate engraving renderer: hatch pass, normal/depth outlines, paper composite, name banderole
│       └── cover.ts         — Re-draws the Jellyfin album cover as a line engraving (2D shader)
│
├── styles/
│   ├── global.css           — Tailwind @theme tokens, base styles
│   └── codex.css            — Book design system + cross-document page-turn view transitions
│
├── assets/
│   ├── fonts/               — Old Atkinson fonts (no longer used, safe to delete)
│   └── blog-placeholder-*.jpg — Placeholder hero images
│
└── consts.ts                — SITE_TITLE, SITE_DESCRIPTION
```

---

## Services, Jobs, and Models

### Services (Astro Integrations)

| Service | Config location | What it does |
|---|---|---|
| `@astrojs/mdx` | `astro.config.mjs` | Enables `.mdx` blog posts with embedded components |
| `@astrojs/sitemap` | `astro.config.mjs` | Auto-generates `/sitemap-index.xml` from all routes at build time |
| `@astrojs/rss` | `src/pages/rss.xml.js` | Generates `/rss.xml` from all blog collection entries |
| `@tailwindcss/vite` | `astro.config.mjs` (vite.plugins) | Processes Tailwind v4 via Vite plugin (no config file) |
| Google Fonts CDN | `src/components/BaseHead.astro` | Loads Bebas Neue, Source Serif 4, JetBrains Mono |

### Jobs (npm Scripts)

| Script | Command | What it does |
|---|---|---|
| `dev` | `astro dev` | Dev server at `http://localhost:4321` with HMR |
| `build` | `astro build` | Full static build to `dist/`. Run before deploying. |
| `preview` | `astro preview` | Serves `dist/` locally to verify the production build |
| `astro` | `astro` | Direct Astro CLI access |

### Models (Content Schema)

**Blog Collection** — defined in `src/content.config.ts`

```typescript
{
  title: string,           // required — post title
  description: string,     // required — used in meta tags and listing cards
  pubDate: Date,           // required — sorts the post list, shown in UI
  updatedDate?: Date,      // optional — shown as "updated" in post header
  heroImage?: image(),     // optional — Astro-optimized image (webp at build)
  tags?: string[],         // optional — defaults to []. Drives /blog/tag/[tag] pages
}
```

**Adding a new post:** create a `.md` or `.mdx` file in `src/content/blog/`. The filename becomes the URL slug. Example: `my-post.md` → `/blog/my-post/`.

**Adding a new tag:** just add it to a post's `tags` array. The `/blog/tag/[tag]` page is auto-generated at build time via `getStaticPaths` in `src/pages/blog/tag/[tag].astro`.

---

## 12 Common Hurdles & Solutions

### 1. Tailwind v4 has no `tailwind.config.js` — config lives in CSS
**Problem:** Looking for `tailwind.config.mjs` to add custom colors or fonts.
**Solution:** All Tailwind customization is in `src/styles/global.css` inside the `@theme {}` block.
```css
@theme {
  --color-signal: #8FB339;  /* → bg-signal, text-signal, border-signal */
  --font-display: 'Bebas Neue', sans-serif;  /* → font-display */
}
```
New colors in `@theme` using `--color-*` automatically generate bg/text/border utilities.

### 2. Three.js vertex animation requires `needsUpdate = true`
**Problem:** Terrain vertices update in the animation loop but the mesh doesn't re-render.
**Solution:** After modifying `geometry.attributes.position.array`, set:
```typescript
geometry.attributes.position.needsUpdate = true;
```
Applies to any animated Three.js geometry. Never remove it.

### 3. `WireframeGeometry` must be rebuilt every frame — use `wireframe: true` instead
**Problem:** Using `WireframeGeometry` + `LineSegments` and updating vertices. The wireframe stays frozen because `WireframeGeometry` bakes positions.
**Solution:** Use `MeshBasicMaterial({ wireframe: true })` on the mesh directly. Updating the underlying geometry positions + `needsUpdate = true` is enough — no geometry rebuild needed.

### 4. Animated geometry causes frustum culling issues
**Problem:** Parts of the terrain disappear, especially near the edges, as the waves animate.
**Solution:** Set `terrain.frustumCulled = false`. The bounding sphere doesn't update with vertex animation, so Three.js incorrectly culls the mesh.
```typescript
terrain.frustumCulled = false;
```

### 5. Tailwind color name conflicts with built-in palette
**Problem:** Naming a custom color `--color-green` or `--color-lime` partially overrides Tailwind's built-in green/lime scale.
**Solution:** Use thematic names that don't exist in Tailwind's default palette: `--color-void`, `--color-signal`, `--color-field`, `--color-parchment`, `--color-brush`, `--color-trench`, `--color-surface`.

### 6. Active state on `HeaderLink` with Tailwind utilities
**Problem:** The `HeaderLink` component adds an `active` CSS class. Tailwind can't style it with a standard variant like `active:text-signal`.
**Solution:** Use the arbitrary variant `[&.active]:text-signal` in the parent's class string:
```astro
<HeaderLink class="text-brush [&.active]:text-signal">BLOG</HeaderLink>
```

### 7. Astro Content Collections — content store must be cleared after schema changes
**Problem:** After adding a new field to `content.config.ts`, old cached content doesn't reflect the new schema. Build errors or stale data.
**Solution:** Astro automatically clears the content store when config changes. If it doesn't, delete `.astro/` and re-run `npm run dev`.

### 8. Tag pages require `getStaticPaths` — they won't exist unless all tags are discovered at build time
**Problem:** A tag page at `/blog/tag/[tag]` returns 404 in production even though posts have that tag.
**Solution:** `getStaticPaths` in `src/pages/blog/tag/[tag].astro` must return every unique tag from all posts. The current implementation does this correctly via `new Set(allPosts.flatMap(...))`. If you add a tag to a post and it still 404s, run `npm run build` — the dev server may have stale static paths.

### 9. Three.js imports in Astro `<script>` tags are Vite-bundled
**Problem:** Wondering if Three.js needs to be loaded via a CDN `<script>` tag.
**Solution:** No. Astro processes `<script>` blocks without `is:inline` through Vite. `import * as THREE from 'three'` works exactly like any module import. The bundle is tree-shaken and hashed at build time.

### 10. Fixed canvas z-stacking: content below the hero reveals the canvas on scroll
**Problem:** After scrolling past the hero, the Three.js terrain is visible behind page content.
**Solution:** Every section below the hero must have an opaque background. Use `bg-void` (or another solid color) on any element that needs to cover the fixed canvas:
```astro
<section class="relative z-10 bg-void ...">
```
The canvas is `position: fixed; z-index: 0`. It never scrolls, so page content must paint over it.

### 11. `heroImage` in blog posts uses relative paths — must resolve from the post file location
**Problem:** `heroImage: '../../assets/blog-placeholder.jpg'` throws a build error.
**Solution:** Paths must be relative from the post file's location (`src/content/blog/`). The correct path to `src/assets/` is `../../assets/filename.jpg`. Absolute paths from project root do not work in frontmatter.

### 12. Google Fonts not loading locally in offline development
**Problem:** Fonts show as system fallbacks during development without internet access.
**Solution:** This is expected — fonts are loaded from Google's CDN. The design is functional with fallbacks (`sans-serif`, `serif`, `monospace`). For offline use, download fonts and configure via Astro's local font provider in `astro.config.mjs`.

---

## 14 Project Design Patterns

### 1. Fixed canvas + layered z-index stacking
The Three.js canvas is always `position: fixed; z-index: 0`. All page content uses `relative z-10` or higher. Content below the hero uses opaque `bg-void` to cover the canvas.

### 2. Tailwind v4 @theme for the design system
No `tailwind.config.js`. All tokens live in `src/styles/global.css` under `@theme {}`. Color tokens use the `--color-*` prefix to generate utilities automatically. Font tokens use `--font-*`.

### 3. Thematic token naming
Palette tokens are named for their role/feel in the Dead Reckoning theme, not their literal color: `void` (background), `surface` (cards), `field` (military green), `signal` (lime accent), `parchment` (text), `brush` (muted), `trench` (border). This prevents accidental clashes with Tailwind's built-in scale.

### 4. Astro Content Collections as the single content source of truth
All blog data lives in `src/content/blog/`. The schema in `content.config.ts` enforces types. Pages derive all data from `getCollection('blog')`. Never hardcode post data in pages.

### 5. Tag pages via `getStaticPaths` — zero JS filtering
Tags are implemented as real static pages (`/blog/tag/[tag]`), not client-side JavaScript filters. This keeps the site fully static, SEO-friendly, and functional without JS.

### 6. Responsive Three.js quality
Segment count adapts to screen width at instantiation:
```typescript
const SEGS = window.innerWidth < 768 ? 45 : 70;
```
Mobile gets fewer vertices (~2,116) than desktop (~5,041) for performance.

### 7. Dual terrain layer for visual depth
The hero canvas has two wireframe meshes: a fine primary grid (`70×70`, opacity 0.55, `#4A5C3F`) and a coarse accent grid (`14×14`, opacity 0.08, `#8FB339`). The coarse layer creates subtle warmth without overwhelming the primary mesh.

### 8. `[&.active]:` for component-driven active states
`HeaderLink` adds an `active` class based on pathname matching. The parent applies Tailwind active styling with arbitrary variant syntax: `[&.active]:text-signal`. No scoped styles needed in `HeaderLink.astro`.

### 9. Monospace metadata pattern
All non-content text (dates, labels, coordinates, tags, nav links in context) uses `font-mono text-xs tracking-widest uppercase`. This creates a consistent "field report" aesthetic across the site.

### 10. Tag component with optional `href` and `active` prop
`Tag.astro` renders either a `<span>` (decorative, no link) or `<a>` (navigable) based on whether `href` is passed. The `active` prop switches the border/text to `signal` color. One component, three use cases: listing, post, filter row.

### 11. Scroll-below-hero pattern
The homepage is a single no-scroll viewport (`100svh`, `overflow: hidden`): an open codex split 50/50. Left page: a WebGL copper-plate engraving of the current plate (I Galea, II Fides, III Currus) inside an armillary sphere, with the name lettered on an engraved banderole in the scene; the lamp follows the cursor over the plate and dragging turns the object. Right page: short bio with a rubricated initial, an index (field notes + latest posts, about, GitHub), and the Jellyfin cover re-drawn as an engraving with Latin marginalia (Nunc audit / Nuper spectavit). Fonts: IM Fell English (+ SC). Other pages still follow the opaque `bg-void` sections-over-canvas rule.

### 12. BlogPost layout separates metadata from content
`BlogPost.astro` handles the chrome (header, nav, tags, dates, back link). The `<slot />` receives only the Markdown content. The layout is used by `[...slug].astro` which passes `post.data` as props.

### 13. CSS custom properties mirror Tailwind tokens for non-Tailwind contexts
`@theme` emits its variables as CSS custom properties on `:root`. This means Three.js colors, custom CSS rules, and non-Tailwind contexts can reference `var(--color-signal)` instead of hardcoding `#8FB339`. Keep them in sync.

### 14. `frustumCulled = false` is required on any animated geometry
Any Three.js mesh whose vertices are animated in the render loop must have `frustumCulled = false`. Otherwise Three.js uses the initial bounding sphere, which becomes incorrect as vertices move, causing random culling artifacts.

---

## Weekly Pipeline

This is a static blog. The "pipeline" is a writing + deploy cycle.

### Writing a new post

```
1. Create file: src/content/blog/my-post-slug.md
2. Add required frontmatter (title, description, pubDate, tags)
3. Write content in Markdown or MDX
4. npm run dev → preview at localhost:4321/blog/my-post-slug/
5. Check: tag pages auto-generated? (localhost:4321/blog/tag/your-tag/)
6. npm run build → verify 0 errors
7. npm run preview → check production build at localhost:4321
8. Deploy
```

### Adding a new tag

No manual work. Add the tag to any post's frontmatter, run `npm run build`, and the tag page is auto-generated.

### Updating the design

```
1. Edit src/styles/global.css (@theme tokens) for palette/font changes
2. Edit src/components/ for structural/layout changes
3. npm run dev for live preview
4. npm run build to verify
```

### Recommended deploy target

Vercel (zero config for Astro). Set up via `vercel link`. Every push to `main` auto-deploys. Preview deployments on PRs.

```bash
# One-time setup
npm i -g vercel
vercel link
vercel env pull   # (no env vars currently needed)

# Deploy preview
vercel

# Deploy production
vercel --prod
```

### Weekly maintenance (minimal)

| Frequency | Task |
|---|---|
| When writing | Run `npm run build` before pushing. Never push without a clean build. |
| Monthly | `npm outdated` — check for Astro/Three.js/Tailwind updates |
| On Astro major upgrade | Check `astro.config.mjs` and `content.config.ts` for breaking changes |
| On Three.js upgrade | Check `src/scripts/codex/` geometry/material/shader API for deprecations |

---

## Post-Implementation Checklist

Run this after any feature addition or content change before shipping.

### Build
- [ ] `npm run build` exits with 0 errors and 0 warnings
- [ ] All expected pages appear in the build output (check the route list logged by Astro)
- [ ] `npm run preview` — spot-check the production build locally

### Content
- [ ] New post has all required frontmatter: `title`, `description`, `pubDate`
- [ ] `pubDate` is a valid date string (e.g., `'Jan 15 2025'` or ISO format)
- [ ] Tags are lowercase, single words or hyphenated (e.g., `"dev"`, `"field-notes"`)
- [ ] `heroImage` path (if used) is relative from `src/content/blog/`, e.g., `../../assets/image.jpg`

### Routing
- [ ] Post URL is what you expect: `src/content/blog/my-slug.md` → `/blog/my-slug/`
- [ ] Tag pages exist for every tag used: `/blog/tag/[tag]` responds with posts

### Design
- [ ] Three.js terrain renders and animates on the homepage
- [ ] Mouse parallax responds to cursor movement
- [ ] Header is transparent over the hero canvas (no white box)
- [ ] Content below the hero has opaque `bg-void` (no canvas bleed-through)
- [ ] Tag chips link correctly (`/blog/tag/[tag]`) from both listing and post pages
- [ ] Active nav link is highlighted in `text-signal` on all pages
- [ ] Bebas Neue loads (hero name + headings display in condensed all-caps)

### Responsive
- [ ] Homepage hero text is readable at 375px mobile
- [ ] Blog listing rows stack correctly on mobile (date above title)
- [ ] About page sidebar collapses to single column on mobile

### Performance
- [ ] No Three.js console errors (check browser devtools)
- [ ] `frustumCulled = false` is set on both terrain meshes (prevents culling artifacts)
- [ ] Google Fonts preconnect tags are in `<head>` (BaseHead.astro)

### SEO / Meta
- [ ] `SITE_TITLE` and `SITE_DESCRIPTION` in `src/consts.ts` are accurate
- [ ] `site` in `astro.config.mjs` matches the production URL
- [ ] `/rss.xml` is accessible and has correct post entries
- [ ] `/sitemap-index.xml` is accessible
