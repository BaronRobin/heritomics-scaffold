// Format "splat": Gaussian splat viewer (Spark on three.js). three.js and Spark load only after the click.
// A group's capture comes from `src` (.spz/.ply/.splat/.ksplat in public/); `procedural: 'fog-cloud'`
// builds a small placeholder cloud in code (labeled as a placeholder on the page).
import type { MountFn } from '../stage-types';

type Config = { src?: string; procedural?: 'fog-cloud'; label: string };

export const mount: MountFn<Config> = async (root, ctx) => {
  const [THREE, { OrbitControls }, { SparkRenderer, SplatMesh }] = await Promise.all([
    import('three'),
    import('three/addons/controls/OrbitControls.js'),
    import('@sparkjsdev/spark'),
  ]);
  if (ctx.signal.aborted) return;

  const host = root.querySelector<HTMLElement>('[data-splat-canvas]')!;
  const renderer = new THREE.WebGLRenderer({ antialias: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  const canvas = renderer.domElement;
  canvas.tabIndex = 0;
  canvas.setAttribute('role', 'img');
  canvas.setAttribute('aria-label', ctx.config.label);
  host.append(canvas);

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0x000000);
  const camera = new THREE.PerspectiveCamera(50, 1, 0.01, 100);
  const home = new THREE.Vector3(0, 0.6, 2.4);
  camera.position.copy(home);
  const spark = new SparkRenderer({ renderer });
  scene.add(spark);

  const mesh = ctx.config.src
    ? new SplatMesh({ url: ctx.config.src, onProgress: (e) => e.lengthComputable && ctx.progress(e.loaded / e.total) })
    : new SplatMesh({ constructSplats: (splats) => fogCloud(THREE, splats) });
  scene.add(mesh);

  const controls = new OrbitControls(camera, canvas);
  controls.target.set(0, 0.2, 0);
  controls.enableDamping = !ctx.reducedMotion;
  controls.update();

  const resize = () => {
    const { width, height } = host.getBoundingClientRect();
    if (!width || !height) return;
    renderer.setSize(width, height, false);
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
  };
  const observer = new ResizeObserver(resize);
  observer.observe(host);
  resize();

  // Keyboard: arrows orbit, + and - zoom, Home resets (same as the reset button)
  const orbit = (dTheta: number, dPhi: number, scale = 1) => {
    const offset = camera.position.clone().sub(controls.target);
    const s = new THREE.Spherical().setFromVector3(offset);
    s.theta += dTheta;
    s.phi = Math.min(Math.PI - 0.1, Math.max(0.1, s.phi + dPhi));
    s.radius = Math.min(8, Math.max(0.5, s.radius * scale));
    camera.position.copy(controls.target).add(offset.setFromSpherical(s));
    controls.update();
  };
  const reset = () => { camera.position.copy(home); controls.target.set(0, 0.2, 0); controls.update(); };
  const onKey = (e: KeyboardEvent) => {
    const step = 0.15;
    const actions: Record<string, () => void> = {
      ArrowLeft: () => orbit(-step, 0), ArrowRight: () => orbit(step, 0),
      ArrowUp: () => orbit(0, -step), ArrowDown: () => orbit(0, step),
      '+': () => orbit(0, 0, 0.85), '=': () => orbit(0, 0, 0.85), '-': () => orbit(0, 0, 1.15),
      Home: reset,
    };
    const action = actions[e.key];
    if (action) { e.preventDefault(); action(); }
  };
  canvas.addEventListener('keydown', onKey);
  const resetBtn = root.querySelector<HTMLButtonElement>('[data-splat-reset]');
  resetBtn?.addEventListener('click', reset);

  await mesh.initialized;
  if (ctx.signal.aborted) { dispose(); return; }
  ctx.progress(1);
  renderer.setAnimationLoop(() => { controls.update(); renderer.render(scene, camera); });
  canvas.focus();

  function dispose() {
    renderer.setAnimationLoop(null);
    observer.disconnect();
    canvas.removeEventListener('keydown', onKey);
    resetBtn?.removeEventListener('click', reset);
    controls.dispose();
    host.replaceChildren();
    // Spark sorts splats in a worker. Stopping mid-sort makes Spark reject its own pending promises
    // (reason undefined or "Worker terminate") without handling them. Those are harmless at teardown,
    // so for a few seconds only these two are marked as handled; every other error still surfaces.
    const teardownNoise = (e: PromiseRejectionEvent) => {
      const r = e.reason;
      if (r === undefined || (r instanceof Error && /worker terminate/i.test(r.message))) e.preventDefault();
    };
    window.addEventListener('unhandledrejection', teardownNoise);
    setTimeout(() => window.removeEventListener('unhandledrejection', teardownNoise), 3000);
    setTimeout(() => {
      mesh.dispose();
      spark.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
    }, 300);
  }
  return dispose;
};

/** Placeholder: fog drifting over a dark, crusted ground. Seeded, so it looks the same every time. */
function fogCloud(THREE: typeof import('three'), splats: import('@sparkjsdev/spark').PackedSplats) {
  let seed = 7;
  const rand = () => ((seed = (seed * 16807) % 2147483647) / 2147483647);
  const gauss = () => (rand() + rand() + rand() - 1.5) / 1.5;
  const center = new THREE.Vector3();
  const scales = new THREE.Vector3();
  const flat = new THREE.Quaternion();
  const color = new THREE.Color();

  // Ground: a flat disc of dark, partly greenish crust
  for (let i = 0; i < 9000; i++) {
    const r = Math.sqrt(rand()) * 1.1;
    const a = rand() * Math.PI * 2;
    center.set(Math.cos(a) * r, rand() * 0.02, Math.sin(a) * r);
    scales.set(0.012 + rand() * 0.012, 0.004, 0.012 + rand() * 0.012);
    const tone = rand();
    color.setRGB(tone < 0.7 ? 0.12 : 0.32, tone < 0.7 ? 0.12 : 0.42, tone < 0.7 ? 0.11 : 0.3);
    splats.pushSplat(center, scales, flat, 0.95, color);
  }
  // Fog: soft, light splats, densest near the ground and drifting in from one side
  for (let i = 0; i < 7000; i++) {
    const y = Math.abs(gauss()) * 0.5;
    center.set(gauss() * 1.5 - 0.3, 0.05 + y, gauss() * 1.0);
    const s = 0.03 + rand() * 0.06;
    scales.set(s, s * 0.6, s);
    const light = 0.8 + rand() * 0.2;
    color.setRGB(light, light, Math.min(1, light + 0.04));
    splats.pushSplat(center, scales, flat, 0.02 + rand() * 0.05, color);
  }
}
