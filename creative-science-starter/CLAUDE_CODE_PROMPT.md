# Task: Scaffold the "Creative Science" hub, a shared website repository for multiple student groups

## Context
We are Master's students in Virtual Design at Hochschule Kaiserslautern, working on a university project called **Creative Science**. The tagline is "Forschung erfahrbar machen / Bringing research to life". The core idea is that designers are co-researchers, not decorators. We act as the bridge between scientists and non-specialist audiences: the public, policymakers, business, and education. Our assigned scientist is Dr. Patrick Jung (XCEL – Extreme Cryptogam Ecology Lab, HS Kaiserslautern).

We are building a **hub website** where several student groups each publish a "science experience". We do not yet know what form each group's work will take. It could be:
- a video or documentary piece
- a 3D web app (Three.js / React Three Fiber, glTF models, Gaussian splats)
- a WebXR / VR experience, or a link out to a standalone VR build (Quest, Unity, Unreal)
- an image series or photo essay
- a 2D interactive canvas (p5.js, custom canvas, data visualization)
- an embedded external build (Unity WebGL, TouchDesigner export, etc.)
- something else we haven't thought of yet

Your job right now is **not** to build any group's experience. Your job is to build the **scaffold repository** that every group clones and works in. It must keep all contributions visually and structurally coherent, so the hub feels like one curated thing and not a link dump.

## Files that already exist in this folder
- `docs/DESIGN.md`: **the design guide. Follow it exactly.** It is based on the Hochschule Kaiserslautern corporate design. Do not propose alternative design directions.
- `src/styles/tokens.css`: the design tokens. Use as-is; it is the source of truth for every color, font, size and spacing value.
- `mockup/index.html`, `mockup/experience.html`, `mockup/mockup.css`, `mockup/mockup.js`: an approved static mockup of the home page and an experience page. Use it as the visual reference for layout and components. It is **not** production code (it uses Google Fonts and a mockup toolbar); rebuild it properly as Astro components and delete nothing in `mockup/` without asking.

## Design (summary; DESIGN.md has the details)
- White as the main color, HS KL surface colors (yellow, blue, green) used sparingly, black text everywhere, square corners, no shadows or gradients.
- Overlapping rectangular surfaces (*Flächenprinzip*) on a 12-column grid, spacing based on the x unit.
- Every experience sits on a black **Stage** with a poster and a "Start experience" button.
- Three depth levels per experience: Überblick / Erleben / Vertiefen.
- **Fonts:** run in fallback mode (Poppins, self-hosted WOFF2, `<html data-fonts="fallback">`) until the Stratos/Matter web license is confirmed by HS KL. Never commit brand font files to the repo. Make the mode switchable via the env variable `PUBLIC_BRAND_FONTS`.
- **Logo:** never draw or approximate the HS KL logo. Use placeholders that read from `public/brand/` and add `public/brand/README.md` explaining which official files to put there.

## Tech requirements
- **Astro** (latest stable) with TypeScript, static output.
- **Content collections** with a strict Zod schema for projects. Each group adds one folder under `src/content/projects/<slug>/` containing `index.mdx` (frontmatter plus story text) and its assets.
- **Islands** for interactive formats, so heavy JavaScript only loads on the pages that need it and only when the visitor opts in.
- **i18n:** German and English, with German as the default. Language comes from the URL (`/de/`, `/en/`). UI strings live in one dictionary file. Projects can provide both languages or fall back gracefully.
- **Styling:** plain CSS using `src/styles/tokens.css`. No Tailwind, so the design system stays readable for non-developers. Components use the tokens only, never hard-coded colors or sizes.
- **Deploy:** a GitHub Actions workflow that builds and deploys to GitHub Pages. It must also run on PRs (build plus content validation).
- **Package manager:** pnpm or npm, whichever you recommend.

## Privacy & lean-ness (non-negotiable)
This site must work without any consent banner. Treat these as hard rules:

- **No cookies.** None, not even "functional" ones.
- **No tracking or analytics.** No Google Analytics, Meta Pixel, Hotjar, or similar, and no "anonymous" analytics script either, unless I explicitly approve one later.
- **No third-party requests on page load.** No Google Fonts, no CDNs, no external icon sets, no embedded social widgets. Everything is self-hosted and bundled at build time.
- **External embeds (YouTube, Vimeo, Sketchfab, external builds)** load only after an explicit click. Show a short notice saying which service will be contacted. Use privacy-enhanced modes (e.g. youtube-nocookie.com). Prefer self-hosted video.
- **No client-side storage** (localStorage, sessionStorage, IndexedDB) by default. Language comes from the URL, not from a stored preference. If a feature truly needs storage, ask me first and document why.
- **No forms, no accounts, no backend.** Purely static. A contact is a plain mailto link.
- **No service workers** unless I ask for offline support.
- Create placeholder pages for **Impressum** and **Datenschutz**. Do not write legal text; leave clearly marked placeholders for the official HS KL texts.

### Anti-bloat
- **Zero JavaScript by default.** Pages ship no JS unless a component genuinely needs it. Interactive islands load only on the pages that use them and only on interaction or when visible.
- **Budgets:** home and index pages under ~100 KB of JS (gzipped) and under ~500 KB total transfer excluding the cover images the visitor actually sees. Fail or warn in CI when budgets are exceeded.
- **Dependencies:** keep them minimal. Justify every runtime dependency in the plan. No UI component libraries, animation frameworks, or utility libraries for things CSS or a few lines of code can do.
- **Images:** use Astro's image pipeline with responsive sizes, AVIF/WebP, lazy loading below the fold, and explicit dimensions.
- **Fonts:** at most 2 families, subset to the needed character ranges, `font-display: swap`, WOFF2 only.
- Add a `docs/PRIVACY.md` (for groups and agents) explaining these rules, and include them in CLAUDE.md/AGENTS.md as things agents must never violate. Add a CI check that fails if built HTML references external domains outside an allowlist (empty by default).

## Information architecture
1. **Home:** intro to Creative Science, "how it works" in three steps, the experiences grid, and a teaser for the research partner (see `mockup/index.html`).
2. **Experiences index:** a grid of all projects, filterable by research field, format, and group. Each card shows a cover visual, title, one-line hook, format, duration, and the project's key color.
3. **Experience detail page:** a consistent template for every project (see `mockup/experience.html`):
   - Depth navigation: Überblick · Erleben · Vertiefen.
   - **Überblick:** title, hook, cover, format, duration, group.
   - **Erleben:** the Stage with the embed slot (see below), requirement chips, start button.
   - **The question:** what scientific question this explores, in plain language, with an optional scientific figure.
   - **Vertiefen:** method, design process, sources, scientist card.
   - Team credits, plus previous/next navigation.
4. **About:** the Creative Science approach, principles, partners, and the courses involved.
5. **Styleguide page** (`/styleguide`): a live display of every token, typographic style, component, and embed type. This is the visual reference for all groups.

## Embed system (the most important part)
Build a single `<Experience>` component that renders based on a `format` field in frontmatter. Each format is its own small component inside the shared Stage frame: same aspect handling, same loading state, same caption and credit area, same fullscreen button where it makes sense.

Implement these formats initially:
- `video`: self-hosted MP4/WebM with poster, or YouTube/Vimeo using privacy-friendly click-to-load.
- `images`: a gallery or scrolling photo essay with captions.
- `model3d`: glTF/GLB via `<model-viewer>` or a minimal Three.js viewer.
- `splat`: a Gaussian splat viewer (pick a maintained web library and justify the choice).
- `canvas`: mounts a group-provided JS module into a sized canvas container (e.g. a p5.js sketch).
- `webxr` / `external`: a poster plus launch button, opening a full-page experience or external build. Include clear requirement notes (headset, browser).
- `iframe`: a sandboxed embed for Unity WebGL or other self-contained builds.

Rules:
- Heavy formats (3D, splat, canvas, iframe, XR) must show a **poster with a "Start experience" button** first. Nothing heavy loads before the visitor clicks.
- Every format must work on mobile or degrade gracefully with a clear message.
- Adding a new format later should mean adding one component and one schema option. Document how to do that.

## Content schema (frontmatter)
Define and validate fields like: `title`, `hook`, `lang`, `group`, `team[]`, `scientists[]` (name, institution, field), `field`, `format`, `duration`, `requirements[]`, `surface` (`yellow | blue | green`, the project's key color), `cover`, `coverAlt` (required), `coverFocus`, `embed` (format-specific config), `sources[]`, `status` (draft/published), `featured`. Drafts are not shown in production builds. Validation errors must be human-readable.

## Documentation (required, and as important as the code)
Write documentation for two audiences: **students who are designers, not necessarily developers**, and **AI coding agents** working in the repo.

- `README.md`: what this is, a quick start (clone, install, run dev in under 5 minutes), how to add your group's project, the folder structure, and deployment.
- `CONTRIBUTING.md`: Git workflow for groups (branch per group, PRs, review), naming conventions, and a commit message style.
- `docs/DESIGN.md`: already exists. Only update it if the implementation forces a change, and tell me when you do.
- `docs/EMBEDS.md`: how each format works, its config options, file size budgets, and how to add a new format.
- `docs/CONTENT.md`: how to write a project page, with the frontmatter reference and a fully annotated example. Include the writing rules from DESIGN.md section 9.
- `docs/MEDIA.md`: asset rules, including max file sizes, preferred formats (AVIF/WebP, H.264/AV1, Draco/Meshopt-compressed GLB), where large files go (Git LFS vs. external hosting; recommend one), and how to export from Blender, Unity, Unreal, and TouchDesigner for the web.
- `docs/PRIVACY.md`: see above.
- `CLAUDE.md` and `AGENTS.md`: concise context files for AI agents. They describe the project purpose, architecture, conventions, where things live, and how to validate. They must repeat the agent rules from DESIGN.md section 0 and the privacy rules, and list what agents must never change without asking (tokens, layout shell, schema). Keep them short and point to the docs above.
- `templates/project/`: a copy-ready project folder with a placeholder `index.mdx` and cover image.
- `.github/pull_request_template.md`: a checklist covering design guide compliance, alt texts, file sizes, both languages, and a mobile check.

## Example content
Create **3 example projects** with clearly fake placeholder content, using different formats (e.g. a video, a 3D model, a canvas sketch), so every group can see the full pipeline working. Mark them clearly as examples so they're easy to delete. Use the three examples from the mockup (Leben aus Nebel, Kälte als Zuhause, Im Dunkeln wachsen) with placeholder text in [brackets]; do not invent scientific claims or quotes.

## Quality bar
- WCAG 2.2 AA: contrast, keyboard navigation, focus states, alt text enforced by the schema, captions supported for video.
- Responsive from 360 px phones to wide desktops, using the 4 / 8 / 12-column breakpoints in tokens.css. Touch targets at least 44 px.
- Lighthouse performance 90 or higher on home and index pages.
- No layout shift when embeds load.
- A `validate` script (content schema, image sizes, missing alt texts) that runs locally and in CI.

## How to work
1. **Start in plan mode.** Before writing code, give me:
   - the proposed folder structure
   - your choice of libraries for 3D and splats, with reasons
   - any questions you have
2. Wait for my approval.
3. Build the `/styleguide` page first (tokens, typography, surfaces, buttons, chips, Stage, cards) and stop so I can check it against DESIGN.md and the mockup.
4. Then build in this order: base layout, content schema, pages, embed system, example projects, docs, and finally CI/deploy.
5. After each stage, run the dev server and visually check your work at phone and desktop widths. Fix issues before moving on.
6. At the end, give me a short summary and a list of open decisions.
