// Format "video" (DESIGN.md 7.4, PRIVACY.md). Loaded only after the visitor clicks "Start".
// - Self-hosted: the <video> from the template is already in root. Start it (with reduced motion, or
//   if the browser refuses to play, only load enough to show the controls), report readiness to the
//   Stage, and stop every download on cleanup.
// - YouTube/Vimeo: build the privacy-enhanced iframe now, so the HTML never contains an external URL.
import type { MountFn, StageContext } from '../stage-types';

export type VideoConfig =
  | { kind: 'file' }
  | { kind: 'external'; provider: 'youtube' | 'vimeo'; id: string; title: string };

type External = Extract<VideoConfig, { kind: 'external' }>;

// youtube-nocookie.com only; Vimeo with dnt=1 (PRIVACY.md). No autoplay with reduced motion.
const players: Record<External['provider'], (id: string, autoplay: boolean) => string> = {
  youtube: (id, autoplay) => `https://www.youtube-nocookie.com/embed/${encodeURIComponent(id)}?autoplay=${Number(autoplay)}&rel=0`,
  vimeo: (id, autoplay) => `https://player.vimeo.com/video/${encodeURIComponent(id)}?autoplay=${Number(autoplay)}&dnt=1`,
};

export const mount: MountFn<VideoConfig> = async (root, ctx) =>
  ctx.config.kind === 'external' ? mountExternal(root, ctx.config, ctx) : mountFile(root, ctx);

async function mountFile(root: HTMLElement, ctx: StageContext<VideoConfig>) {
  const video = root.querySelector('video');
  if (!video) throw new Error('video: the <video> template is missing');
  const sources = [...video.querySelectorAll('source')];
  const listeners = new AbortController();
  const opts = { signal: listeners.signal };

  // true = don't play, only load metadata and show the controls
  let controlsOnly = ctx.reducedMotion;

  const ready = new Promise<void>((resolve, reject) => {
    video.addEventListener('loadeddata', () => resolve(), opts);
    video.addEventListener('canplay', () => resolve(), opts);
    // Without playback the browser may stop after the metadata ("suspend"), e.g. iOS
    for (const type of ['loadedmetadata', 'suspend']) {
      video.addEventListener(type, () => { if (controlsOnly) resolve(); }, opts);
    }
    // A failing <source> fires "error" on itself, not on the <video>: listen in the capture phase.
    // Only the last one counts, earlier ones just make the browser try the next.
    video.addEventListener('error', (e) => {
      if (e.target === video || e.target === sources.at(-1)) reject(new Error(`video: could not load ${video.currentSrc || sources.at(-1)?.src}`));
    }, { ...opts, capture: true });
    ctx.signal.addEventListener('abort', () => resolve(), { once: true });
  });

  const showControlsOnly = () => {
    controlsOnly = true;
    // load() first: it restarts source selection, which runs later and then reads the new preload.
    // The other order makes Chrome start a download on the preload change and then abort it.
    video.load();
    video.preload = 'metadata';
  };

  const cleanup = () => {
    listeners.abort();
    video.pause();
    if (document.pictureInPictureElement === video) document.exitPictureInPicture().catch(() => {});
    // Without a source, load() resets the element and ends any download still running
    for (const s of video.querySelectorAll('source, track')) s.remove();
    video.removeAttribute('src');
    video.load();
  };

  video.focus();
  if (controlsOnly) showControlsOnly();
  else {
    video.preload = 'auto';
    video.play().catch((err: unknown) => {
      // Autoplay refused: fall back to the controls. NotSupportedError is reported by the
      // "error" listener; AbortError means the visitor stopped.
      if (err instanceof DOMException && err.name === 'NotAllowedError' && !ctx.signal.aborted) showControlsOnly();
    });
  }

  try {
    await ready;
  } catch (err) {
    cleanup();
    // The Stage's error message then stands alone instead of on broken controls; focus stays in the
    // running region (which the Stage focused on start) instead of falling back to <body>.
    if (document.activeElement === video) root.closest<HTMLElement>('[data-stage-running]')?.focus();
    video.remove();
    throw err;
  }
  return cleanup;
}

async function mountExternal(root: HTMLElement, config: External, ctx: StageContext<VideoConfig>) {
  const player = players[config.provider];
  if (!player || !config.id) throw new Error(`video: unknown provider "${config.provider}" or missing id`);

  const iframe = document.createElement('iframe');
  iframe.title = config.title;
  iframe.setAttribute('allow', 'autoplay; fullscreen; picture-in-picture');
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';
  const loaded = new Promise<void>((resolve) => {
    iframe.addEventListener('load', () => resolve(), { once: true });
    ctx.signal.addEventListener('abort', () => resolve(), { once: true });
  });
  const url = player(config.id, !ctx.reducedMotion);
  iframe.src = url;
  root.replaceChildren(iframe);

  await loaded;
  if (!ctx.signal.aborted) iframe.focus();
  // Removing the iframe unloads the player and ends playback
  return () => iframe.remove();
}
