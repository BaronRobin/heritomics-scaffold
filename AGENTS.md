# AGENTS.md

Context for AI coding agents in this repo. This is a copy of `CLAUDE.md`; change both together. Details live in the docs linked below; read the relevant one before you change anything.

## Purpose

The Creative Science hub: HS Kaiserslautern, Master Virtual Design, part of the multi-university project Heritomics. Student groups (designers, not developers) each add one "science experience" (video, 3D, splat, VR, image essay, canvas sketch, embedded build) to a shared static website. The hub keeps every project visually and structurally consistent. Brief: `creative-science-starter/CLAUDE_CODE_PROMPT.md`. Status of every feature: `PLAN.md`.

## Architecture

- **Astro 7, static output**, TypeScript (strict), plain CSS, npm. Runtime dependencies: `astro`, `@astrojs/mdx`, `three`, `@sparkjsdev/spark`. No Tailwind, no UI or utility libraries.
- **Content collection** (`src/content.config.ts`): `projects` reads `src/content/projects/<slug>/index.mdx` (German, every field; a discriminated union on `format` with one `embed` schema per format). `projectsEn` reads `en.mdx` (English text only). Error messages are written for designers.
- **Projects per language** (`src/lib/projects.ts`): `getProjects(lang)` merges the two field by field and falls back to German, tagging each text with its language. Drafts appear only in `npm run dev`.
- **i18n**: the language comes from the URL (`/de/…`, `/en/…`). `src/i18n/routes.ts` is the route map; build every link with `path()` and every `public/` URL with `asset()` (both respect `base`). `src/i18n/ui.ts` is the one dictionary for interface words; use `t(lang, key)`.
- **Pages**: `src/pages/de/…` and `src/pages/en/…` are thin wrappers around shared views in `src/views/`. `src/layouts/Base.astro` is the shell (font mode, `lang`, hreflang, skip link, Header, Footer).
- **Embed system**: `src/components/Experience.astro` picks `src/components/formats/<Format>.astro` and puts it on `Stage.astro` (poster, start button, notices, fullscreen). The format component writes a JSON config (`<script type="application/json" data-stage-config>`) and a `<template data-stage-template>`. After the click, `src/scripts/stage.ts` clones the template, loads `src/scripts/formats/<format>.ts` with a dynamic `import()` (its own chunk, nothing heavy before the click) and calls `mount(root, ctx)`; the returned function cleans up on Stop. Contract: `src/scripts/stage-types.ts`. A new format needs a schema option, a component, a loader entry and a module (docs/EMBEDS.md).
- **Scripts** (`scripts/`): `validate.mjs`, `check-external.mjs`, `check-budgets.mjs`, `make-placeholder-model.mjs`.

## Where things live

| What | Where |
|---|---|
| Project content | `src/content/projects/<slug>/` (copy from `templates/project/`) |
| Design tokens and global classes | `src/styles/tokens.css`, `src/styles/global.css` |
| Components, format components | `src/components/`, `src/components/formats/` |
| Browser code for the Stage and formats | `src/scripts/` |
| Large media and builds | `public/media/`, `public/builds/` |
| Self-hosted Poppins | `src/fonts/` |
| CI and deploy | `.github/workflows/ci.yml`, `.github/workflows/deploy.yml` |

## How to validate

```sh
npm run validate         # schema, image sizes, alt texts, public/ files, translations
npm run check            # TypeScript and Astro type check
npm run build            # static build into dist/
npm run check:external   # no external requests on page load (needs a build)
npm run check:budgets    # home/index pages: max. 100 KB JS gzipped, 500 KB total (needs a build)
```

CI runs the same steps on every pull request. Then `npm test` (Playwright + axe, needs a build first).

## Conventions

- Plain CSS with tokens and the classes in `global.css`. Every interface word goes through `ui.ts` in both languages. Text in the other language gets a `lang` attribute.
- Zero JavaScript by default. Client code only where a component needs it; heavy code loads with `import()` after a click.
- Code comments and docs in English, plain language, short sentences.
- Placeholder content goes in `[square brackets]`. Never invent scientific claims, quotes, names or captions.
- Branches: `scaffold/<number>-<short-name>` for PLAN.md jobs, `group/<slug>` for projects. Update the PLAN.md table in the same pull request. Commit style: `CONTRIBUTING.md`.
- Docs: `docs/DESIGN.md`, `docs/CONTENT.md`, `docs/MEDIA.md`, `docs/PRIVACY.md`, `CONTRIBUTING.md`.

## Design rules (from docs/DESIGN.md, section 0)

1. **Use tokens only.** Every color, font, size and spacing value comes from `src/styles/tokens.css`. Never hard-code a hex value, px font size or spacing value in a component.
2. **No new colors.** The palette is fixed. No tints, shades, gradients or "a slightly darker blue".
3. **No rounded corners, no drop shadows, no gradients, no glassmorphism.** The only exception is the duplex image filter (DESIGN.md 5.3).
4. **Text is black** (`--color-black`) on white or a surface color. Only exception: white text on the black Stage and Footer. Never set text in yellow, blue or green.
5. **Uppercase only for the display font** (Stratos). Never `text-transform: uppercase` on Matter. In fallback mode headlines are mixed case.
6. **Never redraw, recolor, animate, crop or rebuild the HS KL logo.** Only official files in `public/brand/`. If they are missing, leave a placeholder and say so. No SVG approximation.
7. **Never filter scientific images.** Microscopy, plots, maps and measurements stay unaltered: no duplex, no color grading, no cropping out scale bars.
8. **Max. two surface colors per screen**, plus white and black.
9. If a rule seems to block your task, **stop and ask** instead of working around it.

## Privacy rules (details: docs/PRIVACY.md)

The site must work without a consent banner. Never violate these:

- No cookies, analytics, tracking pixels or "privacy-friendly" counters. No consent banner as a workaround.
- No third-party requests on page load: no CDNs, Google Fonts, external icons, social widgets. Install with npm and bundle; decoders are served from the site.
- External embeds (YouTube via youtube-nocookie.com, Vimeo with `dnt=1`, Sketchfab, Pixel Streaming) load only after a click, with a notice naming the service.
- No `localStorage`, `sessionStorage`, IndexedDB, Cache API or service workers, also not through a library or build setting.
- No forms, logins, comments, API calls or server code. Contact is a `mailto:` link.
- Never write or edit text on the Impressum or Datenschutz pages.

## Never change without asking

- `src/styles/tokens.css`
- The layout shell: `src/layouts/Base.astro`, `src/components/Header.astro`, `src/components/Footer.astro`
- The content schema: `src/content.config.ts`
- `privacy.allowlist.json` (never add a domain to make a check pass)
- The budgets in `scripts/check-budgets.mjs`; never weaken `scripts/check-external.mjs` or skip a check in CI
- Never commit brand fonts (Stratos, Matter, anything from `hskl_Fonts/`, font files in `public/fonts/brand/`).
- Never add tracking, cookies, client-side storage or third-party requests.

When several agents work at once, change only the files your task names.
