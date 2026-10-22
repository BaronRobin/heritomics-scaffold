# Plan

What this repo still needs before it becomes the scaffold every group works in, and who can pick up what. Last updated: 22 Oct 2026.

The repo moved from a hand-built HTML demo to an Astro site at the repo root. The brief behind it is `creative-science-starter/CLAUDE_CODE_PROMPT.md`; the design rules are in `docs/DESIGN.md`.

**Status:** ✅ done · 🔄 in progress · ⬜ not started · 👥 needs people, not code

## Features

| # | Feature | Status | Depends on |
|---|---|---|---|
| 1 | Astro project: `npm run dev`, `npm run build`, `npm run preview`, static output, TypeScript, `/` redirects to `/de/` | ✅ | |
| 2 | Global styles from `tokens.css`, self-hosted Poppins, brand fonts only via `PUBLIC_BRAND_FONTS` | ✅ | 1 |
| 3 | Layout shell: header with menu and language toggle, footer with partner logos and legal links, skip link, focus ring | ✅ | 2 |
| 4 | i18n: `/de/` and `/en/`, one dictionary for UI words (`src/i18n/ui.ts`), route map (`src/i18n/routes.ts`), toggle keeps you on the same page | ✅ | 1 |
| 5 | Content collection with a strict schema and readable error messages (`src/content.config.ts`) | ✅ | 1 |
| 6 | Home page | ✅ | 3, 4, 5 |
| 7 | Experiences index, filterable by research field, format and group | ✅ | 3, 4, 5 |
| 8 | Experience detail page (depth nav, Stage, question, Vertiefen, scientist card, credits, prev/next) | ✅ | 3, 4, 5, 12 |
| 9 | About page | ✅ | 3, 4 |
| 10 | Impressum and Datenschutz (DE), Imprint and Privacy (EN), as placeholders for the official HS KL texts | ✅ | 3, 4 |
| 11 | 404 page | ✅ | 3, 4 |
| 12 | Embed system: one `<Experience>` component, shared Stage with poster, start button, loading bar, fullscreen; each format loads as its own file after the click (`src/scripts/stage-types.ts` = contract) | ✅ | 3 |
| 13 | Format: video (self-hosted, captions; YouTube/Vimeo only after a click) | ✅ | 12 |
| 14 | Format: image gallery / photo essay (sample: `sample-images`) | ✅ | 12 |
| 15 | Format: canvas (mounts a group's JS sketch; contract in `src/scripts/formats/canvas.ts`; sample: `sample-canvas`) | ✅ | 12 |
| 16 | Format: 3D model (three.js, loads after the click; shared viewer `src/scripts/three/viewer.ts`) | ✅ | 12, 20 |
| 17 | Format: WebXR (Enter VR where supported, desktop fallback, motion notice) | ✅ desktop view tested; Enter VR still needs a headset test | 16 |
| 17b | Format: Gaussian splat (Spark 2.3.1, ~900 KB gz, loads only after Start; sample: `sample-splat`) | ✅ | 16 |
| 17c | Format: iframe for Unity WebGL, TouchDesigner exports and Unreal Pixel Streaming (click to load, notice, offline fallback; samples: `sample-build`, `sample-pixelstreaming`) | ✅ | 12 |
| 18 | Example content: 3 projects in German and English (`src/content/projects/`) | ✅ | 5 |
| 19 | Web-ready media: AVIF/WebP in several sizes via Astro, compressed video | 🔄 video ✅, images come with the pages | 5 |
| 20 | Placeholder 3D model (procedural, labeled): `npm run make:model` → `public/media/placeholder-crust.glb` | ✅ | 1 |
| 21 | Styleguide page with every token, component and format (`/de/styleguide/`) | ✅ | 3, 12–17c |
| 22 | `npm run validate`: schema, image sizes, alt texts, missing translations | ✅ | 5 |
| 23 | Budget check and external-domain check on the built site: `npm run check:budgets`, `npm run check:external` | ✅ | 1 |
| 24 | Tests: Playwright + axe at phone and desktop width, both languages (`npm test`, after `npm run build`) | ✅ 59 passing | 6–17c |
| 25 | GitHub Actions: checks on every PR (`ci.yml`), deploy from `main` (`deploy.yml`; needs Pages enabled, a paid plan for a private repo, and `site`/`base` in `astro.config.mjs`) | ✅ | 23 |
| 26 | Docs: `docs/PRIVACY.md`, `docs/MEDIA.md`, `CONTRIBUTING.md`, PR template | ✅ | |
| 26b | Docs: README, CONTENT, EMBEDS, CLAUDE.md, AGENTS.md, `templates/project/` | ✅ | 5, 12 |
| 27 | Publish the built site to the shared demo link (`npm run export:artifact` makes all links relative) | ✅ published 22 Oct | everything above |

## Small follow-ups

- ✅ `<Headline>` (applies the umlaut rule itself) and `<Surface>` (`color`, `span`, `overlap`) from DESIGN.md, used on every page
- ✅ Type checking: `npm run check` (`astro check`, TypeScript 6), also in CI and deploy
- ✅ The iframe format's "stream not starting" text lives in `src/i18n/ui.ts`
- ✅ Thinner placeholder fog in the splat sample
- ✅ When a format fails to load, focus moves to the error message
- ✅ Deploy runs on push only once the repository variable `PAGES_ENABLED` is `true` (no red runs before Pages is on)
- ✅ Removed the old static `demo/` folder (everything in it now lives in the Astro site)

## Order

```
1 ──┬─> 2 ─> 3 ──┬─> pages (6–11) ──────────┐
    ├─> 4 ───────┤                          ├─> styleguide (21) ─> tests (24) ─> publish (27)
    ├─> 5 ───────┼─> content + media (18–19) ┤
    │            └─> embed system (12–17c) ──┘
    └─> independent now: 20, 23, 25, 26
```

Jobs 2–5 come first, because everything else imports their layout, styles, i18n helpers and schema. After that, pages, embeds and content can be built in parallel.

## Decisions already made

| Topic | Decision |
|---|---|
| Stack | Astro (latest stable), static output, npm, plain CSS with `tokens.css`, no Tailwind |
| Languages | German default, English complete; URLs `/de/…` and `/en/…` |
| Project folder | `src/content/projects/<slug>/index.mdx` (all fields, German) + optional `en.mdx` (English text only) + assets |
| Missing translation | The English page shows the German text with a short notice |
| Routes | `/de/erlebnisse/<slug>/` ↔ `/en/experiences/<slug>/`, `/de/ueber/` ↔ `/en/about/`, `/de/impressum/` ↔ `/en/imprint/`, `/de/datenschutz/` ↔ `/en/privacy/` |
| 3D, XR, splats | three.js for 3D and WebXR, Spark (built on three.js) for splats, all loaded only after the visitor clicks |
| iframe | Self-hosted builds sandboxed; Pixel Streaming only after a click, with a notice naming the server |
| Examples | 3 example projects (3D, video, VR); the other formats are shown on the styleguide |
| Brand fonts | Never committed; license covers only HS KL's registered domain |

## Needs people, not code 👥

- Patrick Jung: captions for the microscopy images, check of every scientific sentence, OK for using his photos
- Groups: names, "Gestaltung" texts, their actual experiences
- HS KL press office: official logo files (drop them into `public/brand/`, see its README)
- Course team: names and logos of the partner universities, font license confirmation
- Whoever runs a Pixel Streaming server: its name for the notice, and whether it uses a third-party STUN/TURN server (see `docs/PRIVACY.md`)
- Team decision: Git LFS for large media, as recommended in `docs/MEDIA.md` (needs a `.gitattributes` and `git lfs` on every laptop)

## Picking up a job

1. Check the table: take a ⬜ job whose dependencies are ✅.
2. Tell the maintainer which number you're taking, so nobody else does it.
3. Branch from `main` as `scaffold/<number>-<short-name>`, for example `scaffold/9-about-page`. Groups working on their own project use `group/<slug>` instead (see `CONTRIBUTING.md`).
4. Open a pull request and update this table in the same PR.
