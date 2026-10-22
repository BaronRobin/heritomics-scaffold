// Format "iframe": a self-contained build from public/ (Unity WebGL, TouchDesigner export) or an Unreal
// Pixel Streaming URL. The <iframe> exists only between Start and Stop: removing it ends the build or
// the stream. Config and markup come from src/components/formats/IFrame.astro.
import type { MountFn } from '../stage-types';

type Config =
  | { kind: 'build'; src: string; title: string; titleLang: 'de' | 'en' }
  | { kind: 'pixelstreaming'; url: string; title: string; titleLang: 'de' | 'en' };

/** How long a stream may take to answer before the offline message shows */
const STREAM_TIMEOUT = 15_000;

export const mount: MountFn<Config> = async (root, { config, lang, signal, progress }) => {
  const view = root.querySelector<HTMLElement>('[data-iframe-view]')!;
  const frame = document.createElement('iframe');
  frame.title = config.title;
  if (config.titleLang !== lang) frame.lang = config.titleLang;

  // Build: a file of our own, sandboxed (scripts and pointer lock only, no same-origin access)
  if (config.kind === 'build') {
    frame.setAttribute('sandbox', 'allow-scripts allow-pointer-lock');
    frame.allow = 'fullscreen';
    frame.src = config.src;
    progress(null);
    const loaded = waitForLoad(frame, signal);
    view.prepend(frame);
    if (await loaded) focusFrame(root, frame);
    return () => frame.remove();
  }

  // Pixel Streaming: an external server. We can't see inside a cross-origin frame, so the only signals
  // are "the server answers" (a probe request), the frame's load event, and a timeout.
  const help = root.querySelector<HTMLElement>('[data-iframe-help]');
  const offline = root.querySelector<HTMLElement>('[data-iframe-offline]')!;
  const offlineContent = root.querySelector<HTMLTemplateElement>('template[data-iframe-offline-content]');
  const deadline = new AbortController();
  const timer = window.setTimeout(() => deadline.abort(), STREAM_TIMEOUT);
  const stop = () => deadline.abort();
  signal.addEventListener('abort', stop, { once: true });
  const cleanup = () => {
    window.clearTimeout(timer);
    signal.removeEventListener('abort', stop);
    deadline.abort();
    frame.remove();
  };

  const showOffline = () => {
    const hadFocus = document.activeElement === frame;
    frame.remove();
    if (help) help.hidden = true;
    // Filled only now, so screen readers announce it (role="status")
    if (offlineContent) offline.replaceChildren(offlineContent.content.cloneNode(true));
    if (hadFocus) (offline.querySelector('a') ?? root.closest<HTMLElement>('[data-stage-running]'))?.focus();
  };

  progress(null);
  if (!navigator.onLine) {
    showOffline();
    return cleanup;
  }
  if (help) help.hidden = false;

  // 1. Is the server reachable at all? A failed frame still fires "load" (with the browser's error page),
  //    so DNS, connection and certificate errors are caught here. Opaque answer, no cookies, no referrer.
  let reachable = true;
  try {
    await fetch(config.url, { mode: 'no-cors', credentials: 'omit', cache: 'no-store', referrerPolicy: 'no-referrer', signal: deadline.signal });
  } catch {
    reachable = false;
  }
  if (signal.aborted) return cleanup;
  if (!reachable) {
    cleanup();
    showOffline();
    return cleanup;
  }

  // 2. Load the stream page in the time that is left
  frame.allow = 'fullscreen; autoplay; gamepad';
  frame.referrerPolicy = 'no-referrer';
  frame.src = config.url;
  const loaded = waitForLoad(frame, deadline.signal);
  view.prepend(frame);
  const ok = await loaded;
  window.clearTimeout(timer);
  if (signal.aborted) return cleanup;
  if (ok) focusFrame(root, frame);
  else showOffline();
  return cleanup;
};

/** Resolves true on the frame's load event, false if the signal aborts first. */
function waitForLoad(frame: HTMLIFrameElement, signal: AbortSignal): Promise<boolean> {
  return new Promise((resolve) => {
    if (signal.aborted) return resolve(false);
    const done = (ok: boolean) => {
      frame.removeEventListener('load', onLoad);
      signal.removeEventListener('abort', onAbort);
      resolve(ok);
    };
    const onLoad = () => done(true);
    const onAbort = () => done(false);
    frame.addEventListener('load', onLoad);
    signal.addEventListener('abort', onAbort);
  });
}

/** Keyboard input goes to the build once it has loaded, unless the visitor has moved focus elsewhere. */
function focusFrame(root: HTMLElement, frame: HTMLIFrameElement) {
  const running = root.closest<HTMLElement>('[data-stage-running]') ?? root;
  const active = document.activeElement;
  if (!active || active === document.body || active === running || root.contains(active)) frame.focus();
}
