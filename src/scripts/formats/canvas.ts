// Format "canvas": runs a group's own JavaScript sketch in a <canvas> on the Stage.
// Loaded only after the visitor clicks Start (see src/scripts/stage.ts); the sketch is its own file too.
//
// ── Sketch contract (for groups) ─────────────────────────────────────────────────────────────────
// Put your sketch next to index.mdx (default name sketch.js, set another with embed.module) and export:
//
//   export function mount(canvas, options) { ...; return () => { /* stop and clean up */ }; }
//
//   mount(canvas: HTMLCanvasElement, options: { reducedMotion: boolean; lang: 'de' | 'en' }): () => void
//
// - canvas is already sized: canvas.width/height are device pixels, canvas.clientWidth/clientHeight are
//   CSS pixels (scale your drawing by canvas.width / canvas.clientWidth). When the Stage changes size
//   (window resize, fullscreen), the Stage resizes the canvas, which clears it, and then fires a "resize"
//   event on the canvas: listen for it and redraw.
// - The canvas is focusable and described for screen readers by the Stage (embed.description). Handle
//   keyboard input on the canvas itself (keydown) and call preventDefault() only for keys you use.
// - reducedMotion: true when the visitor asked for less motion. Then draw a still picture and only redraw
//   in response to input; no animation loop.
// - lang: page language, for any text you draw.
// - Return a cleanup function: stop every requestAnimationFrame/timer and remove every listener you
//   added outside the canvas. The Stage removes the canvas afterwards.
// - No external requests (no fetch to other servers, no CDN imports, no fonts from elsewhere) and no
//   storage (no cookies, localStorage, IndexedDB). Import other files from your project folder only.
// - Everything inside the canvas is yours to design (DESIGN.md 7.4). The Stage labels it as a
//   speculative visualization (DESIGN.md 5.1). Example: src/content/projects/sample-canvas/sketch.js
// ─────────────────────────────────────────────────────────────────────────────────────────────────
import type { MountFn } from '../stage-types';

export type SketchOptions = { reducedMotion: boolean; lang: 'de' | 'en' };
export type SketchModule = { mount?: (canvas: HTMLCanvasElement, options: SketchOptions) => unknown };
type Config = { slug: string; module: string };

// Every sketch in a project folder becomes its own file that only loads when it is needed.
const sketches = import.meta.glob<SketchModule>('/src/content/projects/*/*.{js,ts}');
// "/src/content/projects/<slug>/<module>" → "<slug>/<module>"
const bySlug = new Map(Object.entries(sketches).map(([path, load]) => [path.split('/').slice(-2).join('/'), load]));

/** Sharper than 2× costs a lot of pixels and is hardly visible */
const MAX_PIXEL_RATIO = 2;

export const mount: MountFn<Config> = async (root, { config, lang, signal, reducedMotion }) => {
  const canvas = root.querySelector('canvas');
  if (!canvas) throw new Error('canvas: the template has no <canvas>');
  const key = `${config.slug}/${config.module}`;
  const load = bySlug.get(key);
  if (!load) throw new Error(`canvas: no sketch at src/content/projects/${key}`);
  const sketch = await load();
  if (signal.aborted) return;
  if (typeof sketch.mount !== 'function') throw new Error(`canvas: src/content/projects/${key} must export a function "mount"`);

  // Size the drawing buffer to the box on screen, in device pixels
  let pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
  let cssWidth = 0;
  let cssHeight = 0;
  const resize = (width: number, height: number, notify: boolean) => {
    cssWidth = width;
    cssHeight = height;
    const w = Math.max(1, Math.round(width * pixelRatio));
    const h = Math.max(1, Math.round(height * pixelRatio));
    if (canvas.width === w && canvas.height === h) return;
    canvas.width = w;
    canvas.height = h;
    if (notify) canvas.dispatchEvent(new Event('resize'));
  };
  const box = canvas.getBoundingClientRect();
  resize(box.width, box.height, false);

  const observer = new ResizeObserver((entries) => {
    const size = entries[0]?.contentBoxSize?.[0];
    if (size) resize(size.inlineSize, size.blockSize, true);
  });
  observer.observe(canvas);

  // Moving the window to a screen with another pixel ratio does not change the CSS size: watch it too
  let ratioQuery: MediaQueryList | undefined;
  const onRatioChange = () => {
    ratioQuery?.removeEventListener('change', onRatioChange);
    pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);
    resize(cssWidth, cssHeight, true);
    ratioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
    ratioQuery.addEventListener('change', onRatioChange);
  };
  ratioQuery = window.matchMedia(`(resolution: ${window.devicePixelRatio || 1}dppx)`);
  ratioQuery.addEventListener('change', onRatioChange);

  const stopWatching = () => {
    observer.disconnect();
    ratioQuery?.removeEventListener('change', onRatioChange);
  };

  let sketchCleanup: unknown;
  try {
    sketchCleanup = await sketch.mount(canvas, { reducedMotion, lang });
  } catch (err) {
    stopWatching();
    throw err;
  }

  // The Stage focused its frame on Start; hand focus to the canvas so the arrow keys work right away
  const running = root.closest<HTMLElement>('[data-stage-running]');
  if (!signal.aborted && running && document.activeElement === running) canvas.focus({ preventScroll: true });

  return () => {
    stopWatching();
    if (typeof sketchCleanup === 'function') {
      try { sketchCleanup(); } catch (err) { console.error(err); }
    }
  };
};
