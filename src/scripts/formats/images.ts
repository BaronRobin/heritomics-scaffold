// Format "images": wires the gallery that the Stage copied from the <template> in Images.astro.
// One image at a time in a scroll-snap track: swiping is native scrolling; the buttons, the arrow keys and
// Home/End scroll to a slide; the live status ("Bild n von N") follows the scroll position.
// The loading bar runs until the first image has loaded. Contract: src/scripts/stage-types.ts.
import type { MountFn } from '../stage-types';

type Config = { position: string };

export const mount: MountFn<Config> = async (root, ctx) => {
  const region = root.querySelector<HTMLElement>('[data-ig]');
  const track = root.querySelector<HTMLElement>('[data-ig-track]');
  const prev = root.querySelector<HTMLButtonElement>('[data-ig-prev]');
  const next = root.querySelector<HTMLButtonElement>('[data-ig-next]');
  const status = root.querySelector<HTMLElement>('[data-ig-status]');
  if (!region || !track || !prev || !next || !status) throw new Error('Gallery markup is missing');

  const slides = Array.from(track.children) as HTMLElement[];
  const total = slides.length;
  const listeners = new AbortController();
  const on = { signal: listeners.signal };
  let current = 0;
  let settle: number | undefined;

  const render = () => {
    const text = ctx.config.position.replace('{n}', String(current + 1)).replace('{total}', String(total));
    if (status.textContent !== text) status.textContent = text; // only real changes reach the live region
    prev.setAttribute('aria-disabled', String(current === 0));
    next.setAttribute('aria-disabled', String(current >= total - 1));
  };

  const go = (index: number, instant = false) => {
    current = Math.max(0, Math.min(total - 1, index));
    const left = slides[current]?.offsetLeft ?? 0;
    track.scrollTo({ left, behavior: instant || ctx.reducedMotion ? 'auto' : 'smooth' });
    render();
  };

  prev.addEventListener('click', () => go(current - 1), on);
  next.addEventListener('click', () => go(current + 1), on);

  // Arrow keys while the gallery or one of its buttons has focus
  region.addEventListener('keydown', (e) => {
    if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;
    const keys: Record<string, number> = { ArrowLeft: current - 1, ArrowRight: current + 1, Home: 0, End: total - 1 };
    const target = keys[e.key];
    if (target === undefined) return;
    e.preventDefault();
    go(target);
  }, on);

  // Swipe / trackpad: when the scroll settles, the snapped slide becomes the current one
  track.addEventListener('scroll', () => {
    window.clearTimeout(settle);
    settle = window.setTimeout(() => {
      const width = track.clientWidth;
      if (!width) return;
      const index = Math.round(track.scrollLeft / width);
      if (index !== current) { current = Math.max(0, Math.min(total - 1, index)); render(); }
    }, 120);
  }, on);

  // Fullscreen or a resized window: stay on the same image
  let lastWidth = track.clientWidth;
  const resize = new ResizeObserver(() => {
    if (track.clientWidth === lastWidth) return;
    lastWidth = track.clientWidth;
    go(current, true);
  });
  resize.observe(track);

  render();
  region.focus();

  // Loading bar (already running, indeterminate) until the first image is there or has failed
  const first = slides[0]?.querySelector('img');
  if (first && !first.complete) {
    await new Promise<void>((resolve) => {
      first.addEventListener('load', () => resolve(), { once: true });
      first.addEventListener('error', () => resolve(), { once: true });
      ctx.signal.addEventListener('abort', () => resolve(), { once: true });
    });
  }

  return () => {
    listeners.abort();
    resize.disconnect();
    window.clearTimeout(settle);
  };
};
