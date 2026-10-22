// The Stage (DESIGN.md 7.4): poster first, nothing heavy loads until the visitor clicks "Start".
// Then the format's module is fetched as its own file, mounted into the Stage, and cleaned up on "Stop".
import type { MountFn } from './stage-types';

// One entry per format; each import() becomes a separate file that only loads on click.
const loaders: Record<string, () => Promise<{ mount: MountFn<any> }>> = {
  video: () => import('./formats/video'),
  images: () => import('./formats/images'),
  model3d: () => import('./formats/model3d'),
  splat: () => import('./formats/splat'),
  canvas: () => import('./formats/canvas'),
  webxr: () => import('./formats/webxr'),
  iframe: () => import('./formats/iframe'),
};

const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function setup(stage: HTMLElement) {
  const q = <T extends Element>(sel: string) => stage.querySelector<T>(sel)!;
  const format = stage.dataset.format ?? '';
  const lang = (document.documentElement.lang === 'en' ? 'en' : 'de') as 'de' | 'en';
  const poster = q<HTMLElement>('[data-stage-poster]');
  const running = q<HTMLElement>('[data-stage-running]');
  const mountEl = q<HTMLElement>('[data-stage-mount]');
  const startBox = q<HTMLElement>('[data-stage-startbox]');
  const startBtn = q<HTMLButtonElement>('[data-stage-start]');
  const stopBtn = q<HTMLButtonElement>('[data-stage-stop]');
  const fsBtn = q<HTMLButtonElement>('[data-stage-fs]');
  const bar = q<HTMLElement>('[data-stage-progress]');
  const error = q<HTMLElement>('[data-stage-error]');
  const template = stage.querySelector<HTMLTemplateElement>('template[data-stage-template]');
  const configEl = stage.querySelector('script[data-stage-config]');
  const config = configEl?.textContent ? JSON.parse(configEl.textContent) : {};

  let controller: AbortController | undefined;
  let cleanup: (() => void) | undefined;

  const progress = (fraction: number | null) => {
    bar.hidden = false;
    bar.toggleAttribute('data-indeterminate', fraction === null);
    if (fraction !== null) {
      const pct = Math.round(Math.min(1, Math.max(0, fraction)) * 100);
      bar.setAttribute('aria-valuenow', String(pct));
      bar.style.setProperty('--progress', `${pct}%`);
    } else {
      bar.removeAttribute('aria-valuenow');
    }
  };

  async function start() {
    controller = new AbortController();
    const { signal } = controller;
    poster.hidden = true;
    startBox.hidden = true;
    running.hidden = false;
    stopBtn.hidden = false;
    error.hidden = true;
    mountEl.replaceChildren();
    if (template) mountEl.append(template.content.cloneNode(true));
    running.focus();
    progress(null);
    try {
      const loader = loaders[format];
      if (!loader) throw new Error(`Unknown format "${format}"`);
      const mod = await loader();
      if (signal.aborted) return;
      const result = await mod.mount(mountEl, { config, lang, signal, reducedMotion, progress });
      if (signal.aborted) { if (typeof result === 'function') result(); return; }
      cleanup = typeof result === 'function' ? result : undefined;
    } catch (err) {
      if (!signal.aborted) {
        console.error(err);
        error.hidden = false;
      }
    } finally {
      if (!signal.aborted) bar.hidden = true;
    }
  }

  function stop() {
    controller?.abort();
    cleanup?.();
    cleanup = undefined;
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    mountEl.replaceChildren();
    bar.hidden = true;
    error.hidden = true;
    running.hidden = true;
    stopBtn.hidden = true;
    poster.hidden = false;
    startBox.hidden = false;
    startBtn.focus();
  }

  startBtn.addEventListener('click', start);
  stopBtn.addEventListener('click', stop);

  // Fullscreen is optional: hidden where the browser can't do it
  if (!document.fullscreenEnabled) fsBtn.hidden = true;
  fsBtn.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    else running.requestFullscreen().catch(() => { fsBtn.hidden = true; });
  });
  document.addEventListener('fullscreenchange', () => {
    const on = document.fullscreenElement === running;
    fsBtn.setAttribute('aria-label', on ? fsBtn.dataset.labelExit! : fsBtn.dataset.labelEnter!);
  });
}

document.querySelectorAll<HTMLElement>('[data-stage]').forEach(setup);
