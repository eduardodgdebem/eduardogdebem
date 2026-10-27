# Codex Eduardi

The personal site of Eduardo de Bem, full stack developer in Florianópolis: [eduardogdebem.com](https://eduardogdebem.com).

The whole site is an open book. Every page is a two-page spread, and going from one page to another turns the leaf. The left page of most spreads holds an engraved 3D plate, drawn in real time to look like a copper-plate engraving, where a small citizen walks a Roman city:

| Page | Address | The plate |
| :--- | :--- | :--- |
| Index | `/` | The Via Sacra: a street to walk, with a building for each section |
| Of the author | `/about/` | A plaza with the author's statue and a monument for each interest |
| Field notes | `/blog/` | The library: every post is a scroll on the shelves |
| Workshop | `/projects/` | The forge: finished projects on a shelf, one still on the anvil |
| Ludus | `/ludus/` | A battle game in the Colosseum, Romans against Gauls |

Each page is also in Portuguese, under `/pt/`. Field notes posts are in English only. On a phone held upright the book becomes a scroll.

## Stack

- [Astro](https://astro.build) 6, static pages, on Cloudflare Workers
- [Three.js](https://threejs.org) for the plates, with a custom engraving shader
- [GSAP](https://gsap.com) for the animation
- Tailwind CSS 4, plus a hand-written book stylesheet (`src/styles/codex.css`)
- Markdown and MDX for the field notes

## Getting started

Requires Node.js 22.12 or later.

```sh
npm install
npm run dev
```

The dev server runs at [localhost:4321](http://localhost:4321).

## Commands

| Command | What it does |
| :--- | :--- |
| `npm run dev` | Starts the dev server |
| `npm run build` | Builds the site to `dist/` |
| `npm run preview` | Builds, then serves the build with Wrangler |
| `npm run deploy` | Builds, then deploys to Cloudflare |
| `npm run previews` | Retakes the screenshots of the projects' sites, in `public/projects/` |
| `npm run cv` | Exports the CV to `public/eduardo-de-bem-cv.pdf` from the sibling `cv` project |

Page turns only show their real behaviour on a production build. Check them with `npm run build`, then `npx serve dist/client`, not only in the dev server.

## Writing a field note

Add a `.md` or `.mdx` file to `src/content/blog/`. Its file name becomes its address: `my-note.md` is served at `/blog/my-note/`.

```yaml
---
title: My note
description: One line about it, for the listing and search results.
pubDate: 2026-10-27
tags: [dev]
---
```

Optional fields: `updatedDate`, `heroImage`, and `noindex: true` to keep a draft out of search results. A new tag gets its own subject page at `/blog/tag/<tag>/` automatically. The new note appears as a scroll in the library and as a chapter of the book.

## Adding a project

Add it to `PROJECTS` in `src/data/projects.ts`, with its link, its type, its summary in both languages and the object that stands for it in the workshop. Once its site is live, add it to `scripts/previews.mjs` and run `npm run previews` to take its screenshot.

## Text and languages

Every piece of text on the pages lives in `src/i18n/strings.ts`, under the same key in English and Portuguese. Page addresses in both languages are in `src/i18n/paths.ts`.

## Deploying

The site deploys to Cloudflare Workers. A merge into `main` deploys it, and every pull request gets a preview build. `main` is protected: it can't be force-pushed or deleted, so changes go through a branch and a pull request.

The only server route, `/api/now-playing.json`, reads what the author is listening to from Jellyfin. It is switched off on the page for now (`SHOW_NOW_PLAYING` in `src/consts.ts`). It needs three secrets: `JELLYFIN_URL`, `JELLYFIN_API_KEY` and `JELLYFIN_USER_ID`. Locally they go in `.dev.vars` (see `.dev.vars.example`); in production, run `npx wrangler secret put <NAME>`.

## More

`CLAUDE.md` describes how each part of the site is built, in detail, with the pitfalls found along the way.
