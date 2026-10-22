// Format "webxr": the scene as an orbitable 3D view on every device, plus "Enter VR" where the
// browser supports immersive VR (e.g. Meta Quest Browser). Reuses the model3d viewer (../three/viewer).
// mode "external" only shows a link to a standalone build; nothing is loaded.
import type { MountFn } from '../stage-types';

type Config = { mode: 'inline' | 'external'; src?: string; labelEnter: string; labelExit: string };

export const mount: MountFn<Config> = async (root, ctx) => {
  if (ctx.config.mode !== 'inline' || !ctx.config.src) return; // external: the template is the whole UI

  const { createViewer } = await import('../three/viewer');
  const view = root.querySelector<HTMLElement>('[data-xr-view]')!;
  const enterBtn = root.querySelector<HTMLButtonElement>('[data-xr-enter]')!;
  const unsupported = root.querySelector<HTMLElement>('[data-xr-unsupported]')!;
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-xr-reset]')!;

  const viewer = await createViewer(view, {
    src: ctx.config.src, signal: ctx.signal, progress: ctx.progress, reducedMotion: ctx.reducedMotion,
  });
  const { renderer, model } = viewer;
  renderer.xr.enabled = true;

  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', view.dataset.label ?? '');
  canvas.setAttribute('aria-describedby', view.dataset.describedby ?? '');
  const onKey = (e: KeyboardEvent) => { viewer.handleKey(e); };
  const onReset = () => viewer.resetView();
  canvas.addEventListener('keydown', onKey);
  resetBtn.addEventListener('click', onReset);

  // In VR the small diorama stands at table height, a step in front of the visitor, three times larger
  const desktop = { position: model.position.clone(), scale: model.scale.clone() };
  let session: XRSession | null = null;

  const onSessionEnd = () => {
    session = null;
    renderer.setAnimationLoop(null);
    model.position.copy(desktop.position);
    model.scale.copy(desktop.scale);
    enterBtn.textContent = ctx.config.labelEnter;
    viewer.resetView();
    viewer.requestRender();
  };

  const toggleVR = async () => {
    if (session) { await session.end().catch(() => {}); return; }
    try {
      session = await navigator.xr!.requestSession('immersive-vr', { optionalFeatures: ['local-floor', 'bounded-floor'] });
      renderer.xr.setReferenceSpaceType('local-floor');
      await renderer.xr.setSession(session);
      model.position.set(0, 0.9, -0.8);
      model.scale.multiplyScalar(3);
      session.addEventListener('end', onSessionEnd, { once: true });
      enterBtn.textContent = ctx.config.labelExit;
      renderer.setAnimationLoop(viewer.render);
    } catch (err) {
      console.error(err);
      session = null;
      enterBtn.hidden = true;
      unsupported.hidden = false;
    }
  };

  const vrSupported = await navigator.xr?.isSessionSupported('immersive-vr').catch(() => false);
  if (vrSupported) {
    enterBtn.hidden = false;
    enterBtn.addEventListener('click', toggleVR);
  } else {
    unsupported.hidden = false;
  }

  const running = root.closest<HTMLElement>('[data-stage-running]');
  if (running && document.activeElement === running) canvas.focus({ preventScroll: true });

  return () => {
    canvas.removeEventListener('keydown', onKey);
    resetBtn.removeEventListener('click', onReset);
    enterBtn.removeEventListener('click', toggleVR);
    if (session) session.end().catch(() => {});
    renderer.setAnimationLoop(null);
    viewer.dispose();
  };
};
