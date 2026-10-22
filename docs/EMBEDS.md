# Embeds: the Stage and its formats

Every experience sits on the black **Stage** (DESIGN.md 7.4). Before the visitor clicks "Erlebnis starten / Start experience", the Stage shows only a poster, the format and duration, the requirements and the start button. Nothing heavy loads before that click: no 3D library, no video file, no external service.

You choose the format with one field in your project's `index.mdx`: `format`. The settings for it go under `embed`. The full field list is in `docs/CONTENT.md`; file sizes are in `docs/MEDIA.md`.

## How it works

```
index.mdx  format: model3d          (your project)
   │
   ▼
Experience.astro ──► formats/Model3D.astro   writes the settings as JSON and a <template>
   │                                          (inert until Start)
   ▼
Stage.astro  poster · Start · Stop · fullscreen · loading bar · error message
   │  click "Start"
   ▼
stage.ts ──► import('formats/model3d.ts')    a separate file, loaded only now
              mount(root, ctx) → cleanup     builds the experience; cleanup runs on "Stop"
```

- `src/components/Experience.astro` picks the format component and works out the aspect ratio, the external-service notice and the download size shown under the start button.
- `src/components/formats/<Format>.astro` renders the settings and a `<template>`. Images inside a template don't load until the template is copied in.
- `src/scripts/formats/<format>.ts` exports `mount(root, ctx)`. `ctx` holds the settings, the page language, an abort signal, `reducedMotion`, and `progress()` for the loading bar. The contract is in `src/scripts/stage-types.ts`.
- `src/scripts/stage.ts` wires Start, Stop and fullscreen, shows the loading bar and the error message, and returns focus to the start button after Stop.

## The formats

| `format` | What it is | `embed` settings | Example |
|---|---|---|---|
| `video` | Self-hosted video, or YouTube/Vimeo after a click | `sources` (MP4/WebM in `public/`), `width`, `height`, `captions` (`.vtt`), `textAlternative`; or `provider: youtube \| vimeo` + `id` + `title` | `kaelte-als-zuhause` |
| `images` | Photo essay / gallery, one image at a time | `items`: `image`, `alt`, `caption`, `credit`, `scientific` | `sample-images` |
| `model3d` | 3D model (glTF/GLB) you can rotate and zoom | `src` (`.glb` in `public/`), `description`, `placeholder` | `leben-aus-nebel` |
| `splat` | Gaussian splat (a 3D scan made of soft points) | `src` (`.spz`, `.ply`, `.splat`, `.ksplat` in `public/`) or `procedural: fog-cloud`, `description`, `placeholder` | `sample-splat` |
| `canvas` | Your own JavaScript sketch in a canvas | `module` (default `sketch.js`, next to `index.mdx`), `aspect`, `description` | `sample-canvas` |
| `webxr` | VR in the browser, or a link to a standalone VR build | `mode: inline` + `scene` (`.glb`); or `mode: external` + `url` + `platform`; `description` | `im-dunkeln-wachsen` |
| `iframe` | A self-contained build (Unity WebGL, TouchDesigner export) or Unreal Pixel Streaming | `kind: build` + `src` (`.html` in `public/builds/…`); or `kind: pixelstreaming` + `url` + `service` + `offline`; `aspect`, `description` | `sample-build`, `sample-pixelstreaming` |

Notes per format:

- **video**: videos with speech need captions (`.vtt`). A video without speech still needs `textAlternative` when text appears in the picture. With reduced motion the video doesn't start by itself; the controls are there. YouTube uses youtube-nocookie.com, Vimeo `dnt=1`, and both load only after the click; the Stage names the service in its notice.
- **images**: scientific images (`scientific: true`) are shown whole (`object-fit: contain`) and never filtered, so scale bars stay visible (DESIGN.md 5.2). Arrow keys, Home/End and swiping move through the images; the position is announced.
- **model3d**: three.js loads after the click. Drag to rotate, scroll or pinch to zoom; arrow keys rotate, plus and minus zoom, Home or the button resets. Set `placeholder: true` for anything that isn't a real scan: the Stage then labels it.
- **splat**: uses Spark on three.js. The library is large (about 900 KB gzipped), but it loads only for splats and only after the click. Crop floaters and export `.spz` (docs/MEDIA.md).
- **canvas**: the sketch contract (what your `sketch.js` must export) is at the top of `src/scripts/formats/canvas.ts`, and `src/content/projects/sample-canvas/sketch.js` is a working example. The Stage labels the canvas as a speculative visualization (DESIGN.md 5.1).
- **webxr**: the Stage shows a motion notice before start. "Enter VR" appears only where the browser supports immersive VR; everyone else gets the desktop view. Test on a headset browser (for example Meta Quest) before you publish.
- **iframe (build)**: the frame is sandboxed without `allow-same-origin`, so a build can't read the hub's data. Its own file requests then count as cross-origin: the host must send `Access-Control-Allow-Origin: *` (GitHub Pages does). Builds must not capture the Tab key, so keyboard users can leave.
- **iframe (Pixel Streaming)**: the visitor's browser connects to your streaming server, so read the Pixel Streaming rules in `docs/PRIVACY.md` first. After the click the format sends one small check request to the stream URL to detect when the server is offline, then shows `offline` (a video walkthrough) instead.

## Adding a new format

1. **Schema**: add one option to the `z.discriminatedUnion('format', …)` in `src/content.config.ts` with its own `embed` object and readable error messages. Add the English text fields to the `projectsEn` schema if it has any.
2. **Component**: create `src/components/formats/<Name>.astro`. It writes `<script is:inline type="application/json" data-stage-config>` and, if needed, a `<template data-stage-template>`. Never put an external URL or an `<iframe>` in the HTML: the external-domain check fails on them. Create those in the module after the click.
3. **Module**: create `src/scripts/formats/<name>.ts` exporting `mount` (see `src/scripts/stage-types.ts`). Return a cleanup that stops everything and frees memory. Respect `ctx.signal` and `ctx.reducedMotion`, and call `ctx.progress()` while loading.
4. **Register it**: add it to the `formats` map in `src/components/Experience.astro` (plus aspect, service or size if they apply) and to `loaders` in `src/scripts/stage.ts`.
5. **Words**: add the UI strings in German and English to `src/i18n/ui.ts`, including `format.<name>` for cards and filters.
6. **Show and test it**: add an unlisted sample project (`listed: false`), add it to the styleguide list in `src/views/Styleguide.astro`, and add it to the format list in `tests/interactions.spec.ts`. Then run `npm run validate`, `npm run build`, `npm run check:external` and `npm test`.

Styles for elements your module creates must be global but scoped to your format: write `<style is:global>` with selectors that start `[data-stage][data-format="<name>"]`. Use tokens only.
