# Creative Science hub (scaffold)

**Forschung erfahrbar machen / Bringing research to life.**

Creative Science is the HS Kaiserslautern module (Master Virtual Design) within the multi-university project Heritomics. Student groups turn real research into "science experiences": a video, a 3D model, a VR piece, an image essay, an interactive sketch. This repository is the shared website, the **hub**, that shows them all. Each group adds one project folder. The hub gives every project the same page, the same black Stage and the same design, so it looks like one place.

The site is static: plain files, no server, no cookies, no tracking, nothing loaded from other domains. It is built with [Astro](https://astro.build/).

> Work in progress. [PLAN.md](PLAN.md) shows what is done and what is coming. This repo is a working scaffold; the final website will live elsewhere.

## Quick start

You need [Git](https://git-scm.com/) and [Node.js](https://nodejs.org/) 24 (Astro needs at least 22.23). Then, in a terminal:

```sh
git clone <repo-url>
cd heritomics-scaffold
npm install          # downloads the tools, takes a minute
npm run dev          # starts the site on your computer
```

Open **http://localhost:4321/de/** in your browser. The page reloads when you save a file. Stop the server with `Ctrl+C`.

## Add your group's project

1. Agree on your project's **slug** (its short name, e.g. `kaelte-als-zuhause`) with the maintainer.
2. Copy the template: `cp -R templates/project src/content/projects/<slug>`
3. Edit `index.mdx` (German, all fields) and `en.mdx` (English text), and replace `cover.jpg`. Every field is explained in [docs/CONTENT.md](docs/CONTENT.md).
4. Check your work: `npm run validate`, then look at `http://localhost:4321/de/erlebnisse/<slug>/`.
5. Commit on your group's branch and open a pull request, as described in [CONTRIBUTING.md](CONTRIBUTING.md).

Prepare images, video and 3D files as described in [docs/MEDIA.md](docs/MEDIA.md).

## Documentation

| File | For | What it covers |
|---|---|---|
| [CONTRIBUTING.md](CONTRIBUTING.md) | groups | Git workflow, branches, pull requests, naming, commit messages |
| [docs/CONTENT.md](docs/CONTENT.md) | groups | Writing a project page: folder, every field, example, writing rules |
| [docs/MEDIA.md](docs/MEDIA.md) | groups | File sizes, formats, Git LFS, exporting from Blender, Unity, Unreal, TouchDesigner |
| [docs/PRIVACY.md](docs/PRIVACY.md) | everyone | Why the site needs no consent banner, and the rules that keep it that way |
| [docs/DESIGN.md](docs/DESIGN.md) | everyone | The design guide, based on the HS KL corporate design |
| [docs/EMBEDS.md](docs/EMBEDS.md) | groups, developers | How each format works and how to add one |
| [PLAN.md](PLAN.md) | team | Status of every feature, who can pick up what |
| [CLAUDE.md](CLAUDE.md), [AGENTS.md](AGENTS.md) | AI agents | Context and rules for AI coding agents |

## Folder structure

```
.github/                 CI and deploy workflows, pull request checklist
creative-science-starter/  original brief, design guide draft, tokens and mockup
demo/                    the first hand-built HTML demo (open demo/index.html)
docs/                    the guides listed above
media/selectedplants/    original photos and videos from @selectedplants
public/                  files served as they are
  media/                 video, captions, 3D models, splats
  builds/                self-contained builds for the iframe format
  fonts/brand/           brand fonts, on your own computer only (never committed)
scripts/                 validate, check:external, check:budgets, make:model
src/
  content.config.ts      the project schema: every field and its rules
  content/projects/      one folder per project (your work goes here)
  components/            Header, Footer, ProjectCard, Stage, Experience and one component per format
  i18n/                  routes.ts (URLs in German and English), ui.ts (every interface word)
  layouts/Base.astro     the page shell around every page
  lib/projects.ts        loads projects and fills missing English text with German
  pages/                 one file per address, under /de/ and /en/
  views/                 page layouts shared by both languages
  scripts/               code that runs in the browser: the Stage and each format
  styles/                tokens.css (design tokens), global.css, fonts.css
  fonts/                 Poppins, self-hosted
  assets/                images for the home and about pages
templates/project/       copy-ready project folder
privacy.allowlist.json   allowed external domains (empty)
```

## Commands

Run them in the repo folder.

| Command | What it does |
|---|---|
| `npm run dev` | Starts the site at http://localhost:4321/ and reloads on every save. Shows drafts. |
| `npm run build` | Builds the finished site into `dist/`. Drafts are left out. |
| `npm run preview` | Serves the built `dist/` on your computer, to check the real result. |
| `npm run validate` | Checks every project: fields, image sizes, alt texts, files in `public/`, missing English text. Add `-- --strict` to make warnings fail too. |
| `npm run check:external` | After a build: fails if any page would load something from another domain ([docs/PRIVACY.md](docs/PRIVACY.md)). |
| `npm run check:budgets` | After a build: checks that the home and index pages stay under 100 KB of JavaScript (gzipped) and 500 KB in total. |
| `npm run make:model` | Recreates the placeholder 3D model `public/media/placeholder-crust.glb`. |
| `npm test` | After a build: browser tests at phone and desktop width in both languages (accessibility with axe, filters, menu, language toggle, every Stage format). |

## Deployment

Two GitHub Actions workflows live in `.github/workflows/`:

- **`ci.yml`** runs on every pull request and every push to `main`. It installs, runs `validate`, builds, then runs `check:external` and `check:budgets`. A pull request with a failing check is not merged.
- **`deploy.yml`** runs on every push to `main` (or by hand with "Run workflow"). It runs the same checks and publishes `dist/` to GitHub Pages.

Before the deploy works, the maintainer must:

- Enable Pages: repository Settings > Pages > Source: "GitHub Actions".
- Use a paid GitHub plan (Pro, Team or Enterprise) if the repository is private. On the free plan, Pages needs a public repository.
- Set `site` and `base` in `astro.config.mjs`. For `https://<owner>.github.io/<repo>/` that is `site: 'https://<owner>.github.io'` and `base: '/<repo>'`. With a custom domain, set `site` only. Neither is set yet.

GitHub Pages is for previews and the shared demo. The final website will live elsewhere. Never deploy a build with brand fonts (`PUBLIC_BRAND_FONTS=true`) anywhere except HS KL's licensed domain.

## Fonts

- **Poppins** is self-hosted in `src/fonts/` under the SIL Open Font License (`src/fonts/OFL-Poppins.txt`). The site runs in this fallback mode by default.
- **Stratos and Matter**, the HS KL brand fonts, are **not included** and must never be committed. Their license covers only HS KL's registered domain. To preview them on your own computer, see [public/fonts/brand/README.md](public/fonts/brand/README.md).

## Credits

Research content, quotes, photos and video: Dr. Patrick Jung, XCEL – Extreme Cryptogam Ecology Lab, HS Kaiserslautern ([selectedplants.de](https://www.selectedplants.de/), [@selectedplants](https://www.instagram.com/selectedplants/)). They are used here for an internal demo. Ask him before reusing them anywhere else.

Font: Poppins, SIL Open Font License. Brand fonts are not included (see above).
