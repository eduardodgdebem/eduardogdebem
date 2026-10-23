# CLAUDE.md — Eduardo de Bem Portfolio

Personal blog-first portfolio. The goal is "knows what he's saying, but is chill." Design direction: **Dead Reckoning** — dark tactical field notebook aesthetic, military green palette, Three.js terrain hero.

---

## Codex design (current)

The whole site is an open book. `src/layouts/Codex.astro` renders every page as a spread: `slot="verso"` (left) and `slot="recto"` (right), 50/50, inside a fixed viewport (long pages scroll inside the page; on portrait screens the spread stacks and scrolls). Navigating between pages turns the leaf: cross-document View Transitions (`@view-transition { navigation: auto }` in `codex.css`), with `.verso`/`.recto` as named transition groups. An inline `pagereveal` script in the layout tags each transition `forward` or `back` (history traversal, or going "up" in URL depth), and `html:active-view-transition-type(back)` reverses the turn.

Home: the Via Sacra (`forum.ts`, geometry in `forum-models.ts`), a 2.5D orthographic street on a slab among the stars, with the name banderole at the head of the plate. The reader's citizen walks with ←/→/↑/↓ or WASD, or to a clicked spot. Three buildings are pages: the library → /blog, the statue → /about, the forge → GitHub (positions in `AT`). Hovering one in the scene or in the index inks it red and the camera pans to it. Standing at its door and pressing Enter, or clicking it, walks the citizen in (walking into a door doesn't), then the page turns; `sessionStorage['forum-at']` brings him back out at that door. The three page buildings stand 12% larger, with red standards and braziers at their doors. Focusing one (pointer, door or index) pins a label over it (`onTag` → `.place-tag` in index.astro). The other buildings are scenery: two arches, a tholos, a basilica, the Curia, insulae in two rows, a temple, and a garden with an exedra behind the statue. Keep the back row low so the sky and the planet still show. Townspeople (passers-by, a marching squad, an orator's crowd, merchants) and birds are animated in `drawPeople`/`drawBirds`. Within earshot of the orator (`ORATOR`, `EARSHOT`) the label shows his speeches from `orator.ts`, rotating every 8s. The lamp is fixed on the home plate; the pointer over the plate tilts the view a few degrees instead (`tilt` in `follow()`). The sky parallaxes: the planet follows the view at 0.82 and the composite's star field shifts by `uStarShift`. Red ink travels in the ink pass's red channel (`uGlow`, red in the lettering texture) to the paper pass.

/blog: inside the Bibliotheca (`library.ts`, geometry in `library-models.ts`, page wiring in `Library.astro`), walked like the street. Scroll cabinets line the back wall, and the number of cabinets grows with the posts. Each post is a red-tagged roll in a hole picked by a hash of its id, so it keeps its place as posts are added; the other holes hold plain rolls. Near a roll (or hovering it, or its line in the list) it is drawn out with a label; Enter or a click opens it. `sessionStorage['library-at']` brings the citizen back to that roll. The EXITVS door returns to the street outside the library. Also in the room: reading tables with readers, a librarian, browsers, a porter, and the Thinker (COGITATOR). Walking is shared with the forum through `walker.ts`; passes, ink, banner and helpers are shared through `passes.ts`.

Plates per page: home's old plates I–III (galea, fides, currus) and IV stilus are no longer shown; /about → V sigillum (the logo in wax); subject pages and posts pick by tag via `plateForTags()` (dev → machina, notes → liber, thoughts → hora, tools → circinus; others → liber). To illustrate a new tag, add it to `SUBJECTS` in `catalogue.ts`.

Page corners (`Corner.astro`, `corners.ts`, styles in `codex.css`): the top-left corner goes back and the top-right forward through browser history, shown only when there's history that way (Navigation API `canGoBack`/`canGoForward`). Each page stores its title in `sessionStorage['codex-titles']` so a corner can name where it leads. Folios run in reading order (index 1, about 3, blog 5, subjects 7, chapters 10 + 2n). On a link the turn direction compares folios (`pageswap` stores the folio being left), and on a history traversal it compares entry indexes.

Opening: the first page of a visit arrives as a closed book. An inline script in `Codex.astro` sets `html.opening` before first paint (once per tab via `sessionStorage['codex-opened']`, never under reduced motion); `Binding.astro` is the board, whose gilt sigil tools in while the page loads; `opening.ts` swings it open. Plate intros wait on `bookOpened()`. To replay it, open the site in a new tab. Fade the board's faces, never `.board` itself: opacity flattens `preserve-3d` and the mirrored front shows through.

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
site: 'https://eduardogoulart.dev'
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
│   ├── index.astro          — / (no-scroll homepage: open codex — engraved plate + name banderole on the left, bio/index/engraved album cover on the right)
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
