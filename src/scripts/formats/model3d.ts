// Format "model3d": an orbitable GLB model on the Stage (see src/components/formats/Model3D.astro).
// Loaded as its own file after "Start"; three.js comes with it via ../three/viewer.
import type { MountFn } from '../stage-types';
import { createViewer } from '../three/viewer';

type Config = { src: string };

export const mount: MountFn<Config> = async (root, ctx) => {
  const ui = root.querySelector<HTMLElement>('[data-m3d]');
  const view = root.querySelector<HTMLElement>('[data-m3d-view]');
  const reset = root.querySelector<HTMLButtonElement>('[data-m3d-reset]');
  const badge = root.querySelector<HTMLElement>('[data-m3d-placeholder]');
  const description = root.querySelector<HTMLElement>('[data-m3d-desc]');
  const help = root.querySelector<HTMLElement>('[data-m3d-help]');
  if (!ui || !view || !reset) throw new Error('model3d: the <template> in Model3D.astro is incomplete');

  let viewer: Awaited<ReturnType<typeof createViewer>>;
  try {
    viewer = await createViewer(view, {
      src: ctx.config.src,
      signal: ctx.signal,
      progress: ctx.progress,
      reducedMotion: ctx.reducedMotion,
    });
  } catch (err) {
    ui.hidden = true; // leave the Stage's error message alone on the black
    throw err;
  }

  // The file itself can say it's a placeholder (glTF scene extras), even if the project forgot to
  if (badge && viewer.model?.userData?.placeholder === true) badge.hidden = false;

  const canvas = viewer.renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', view.dataset.label ?? '');
  const describedBy = [badge && !badge.hidden ? badge : null, description, help]
    .filter((el): el is HTMLElement => Boolean(el?.id))
    .map((el) => el.id)
    .join(' ');
  if (describedBy) canvas.setAttribute('aria-describedby', describedBy);

  const onKey = (event: KeyboardEvent) => { viewer.handleKey(event); };
  const onReset = () => viewer.resetView();
  canvas.addEventListener('keydown', onKey);
  reset.addEventListener('click', onReset);
  reset.hidden = false;

  // Keyboard users who started the Stage land on the model, ready for the arrow keys
  const running = root.closest<HTMLElement>('[data-stage-running]');
  if (running && document.activeElement === running) canvas.focus({ preventScroll: true });

  return () => {
    canvas.removeEventListener('keydown', onKey);
    reset.removeEventListener('click', onReset);
    viewer.dispose();
  };
};
