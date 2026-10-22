// Reusable three.js viewer for one glTF/GLB model: used by the model3d format and reused by webxr.
// Builds renderer, scene, camera (framed to the model), soft lights, OrbitControls and a resize
// observer. Renders on demand only: a frame is drawn when the view changes, never in an idle loop.
// Import it only from a format module (formats/*.ts), so three.js stays out of the page's first script.
import {
  Box3,
  Color,
  DirectionalLight,
  HemisphereLight,
  LoaderUtils,
  NeutralToneMapping,
  PerspectiveCamera,
  Scene,
  SRGBColorSpace,
  Vector3,
  WebGLRenderer,
} from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

export type ViewerOptions = {
  /** URL of the .glb file (already resolved with asset()) */
  src: string;
  /** Aborts the download; createViewer then rejects and frees everything it built */
  signal?: AbortSignal;
  /** Download progress from 0 to 1, or null when the size is unknown */
  progress?: (fraction: number | null) => void;
  /** No damping (no gliding after a drag or key press) */
  reducedMotion?: boolean;
  /** Scene background (CSS color). Default: the container's --stage-bg token, else black */
  background?: string;
  /** Initial view direction in degrees: azimuth around the up axis (from +Z towards +X) and elevation */
  azimuth?: number;
  elevation?: number;
};

export type Viewer = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  controls: OrbitControls;
  /** gltf.scene; its userData holds the glTF scene extras (e.g. placeholder: true) */
  model: any;
  /** The full GLTFLoader result (animations, cameras, asset info) */
  gltf: any;
  /** Centre and radius of the model's bounding sphere, in world units */
  bounds: { center: Vector3; radius: number };
  /** Ask for one frame; frames repeat only while the controls are still moving (damping) */
  requestRender: () => void;
  /** Draw one frame now, e.g. from renderer.setAnimationLoop() during a WebXR session */
  render: () => void;
  /** Back to the initial framing (recomputed for the current aspect ratio) */
  resetView: () => void;
  /** Orbit by angles in radians; positive = like dragging right / up */
  rotate: (right: number, up: number) => void;
  /** factor > 1 moves closer, < 1 moves away */
  zoom: (factor: number) => void;
  /** Keyboard: arrows rotate, + / - zoom, Home resets. Returns true (and prevents default) if handled */
  handleKey: (event: KeyboardEvent) => boolean;
  /** Frees geometries, materials, textures, controls, observers and the WebGL context; removes the canvas */
  dispose: () => void;
};

const KEY_ROTATE = Math.PI / 12; // 15° per key press
const KEY_ZOOM = 1.25;
const FOV = 35;
const MARGIN = 1.12; // empty space around the model when framed
const MAX_POINTS = 20000; // vertices sampled for framing
const GLB_MAGIC = 0x46546c67; // "glTF"

export async function createViewer(container: HTMLElement, options: ViewerOptions): Promise<Viewer> {
  const { src, signal, progress, reducedMotion = false } = options;
  signal?.throwIfAborted();

  const disposers: Array<() => void> = [];
  let disposed = false;
  let frameId = 0;

  const scene = new Scene();
  let renderer: WebGLRenderer | undefined;

  const dispose = () => {
    if (disposed) return;
    disposed = true;
    if (frameId) cancelAnimationFrame(frameId);
    frameId = 0;
    while (disposers.length) {
      try { disposers.pop()!(); } catch (err) { console.warn(err); }
    }
    disposeObject(scene);
    scene.clear();
    if (renderer) {
      renderer.setAnimationLoop(null);
      renderer.dispose();
      renderer.forceContextLoss(); // after dispose(), so three.js no longer logs "Context Lost"
      renderer.domElement.remove();
    }
  };

  try {
    // Renderer first: if WebGL is missing, fail before downloading the model
    renderer = new WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
    renderer.outputColorSpace = SRGBColorSpace;
    renderer.toneMapping = NeutralToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
    const canvas = renderer.domElement;
    canvas.style.position = 'absolute';
    canvas.style.inset = '0';
    canvas.style.display = 'block';
    canvas.style.width = '100%';
    canvas.style.height = '100%';

    scene.background = readColor(options.background ?? cssToken(container, '--stage-bg'));

    const camera = new PerspectiveCamera(FOV, 16 / 9, 0.01, 100);
    scene.add(camera);

    // Soft light: sky/ground fill everywhere, plus a key light that travels with the camera,
    // so whichever side the visitor looks at is lit
    scene.add(new HemisphereLight(0xffffff, 0x3a3530, 1.6));
    const key = new DirectionalLight(0xffffff, 2.2);
    key.position.set(-1, 1.5, 1); // up and to the left of the camera
    camera.add(key);
    camera.add(key.target); // target at the camera origin, so the light shines along the view

    // Load
    const buffer = await download(src, signal, progress);
    signal?.throwIfAborted();
    progress?.(null);
    const loader = new GLTFLoader();
    if (glbExtensions(buffer).includes('EXT_meshopt_compression')) {
      const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js');
      await MeshoptDecoder.ready;
      loader.setMeshoptDecoder(MeshoptDecoder);
    }
    const gltf = await loader.parseAsync(buffer, LoaderUtils.extractUrlBase(new URL(src, location.href).href));
    signal?.throwIfAborted();
    const model = gltf.scene;
    scene.add(model);

    // Framing
    model.updateMatrixWorld(true);
    const box = new Box3().setFromObject(model, true);
    if (box.isEmpty()) throw new Error(`${src}: the model has no visible geometry`);
    const center = box.getCenter(new Vector3());
    const radius = Math.max(box.getSize(new Vector3()).length() / 2, 1e-6);
    const points = framingPoints(model, box, center);
    const az = ((options.azimuth ?? 30) * Math.PI) / 180;
    const el = ((options.elevation ?? 35) * Math.PI) / 180;
    const viewDir = new Vector3(Math.sin(az) * Math.cos(el), Math.sin(el), Math.cos(az) * Math.cos(el));

    const controls = new OrbitControls(camera, canvas);
    controls.enableDamping = !reducedMotion;
    controls.dampingFactor = 0.12;
    controls.screenSpacePanning = true;
    controls.minDistance = radius * 0.2;
    disposers.push(() => controls.dispose());

    // Fit the model's (sampled) vertices into the frustum for the current aspect ratio, looking along viewDir
    const frame = () => {
      const tanV = Math.tan((camera.fov * Math.PI) / 360);
      const tanH = tanV * camera.aspect;
      const z = viewDir.clone().normalize();
      const x = new Vector3(0, 1, 0).cross(z).normalize();
      if (x.lengthSq() < 1e-8) x.set(1, 0, 0);
      const y = z.clone().cross(x);
      let distance = 0;
      for (const c of points) {
        const need = Math.max(Math.abs(c.dot(x)) / tanH, Math.abs(c.dot(y)) / tanV) + c.dot(z);
        distance = Math.max(distance, need);
      }
      distance = Math.max(distance * MARGIN, radius * 0.5);
      camera.near = radius / 200;
      camera.far = distance * 4 + radius * 4;
      camera.updateProjectionMatrix();
      controls.maxDistance = distance * 3;
      controls.target.copy(center);
      camera.position.copy(center).addScaledVector(z, distance);
      camera.lookAt(center);
      controls.update();
    };

    const render = () => {
      if (!disposed) renderer!.render(scene, camera);
    };
    const tick = () => {
      frameId = 0;
      controls.update(); // with damping this fires "change" again until the motion has settled
      render();
    };
    const requestRender = () => {
      if (!frameId && !disposed && !renderer!.xr.isPresenting) frameId = requestAnimationFrame(tick);
    };
    controls.addEventListener('change', requestRender);
    disposers.push(() => controls.removeEventListener('change', requestRender));

    // Size: the canvas fills the container; the container decides the size
    if (getComputedStyle(container).position === 'static') container.style.position = 'relative';
    let ready = false;
    const resize = () => {
      const w = container.clientWidth;
      const h = container.clientHeight;
      if (!w || !h || renderer!.xr.isPresenting) return;
      renderer!.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer!.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      if (ready) render(); // right away: setSize clears the canvas, waiting a frame would flash
    };
    resize();
    frame();
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    disposers.push(() => observer.disconnect());

    const resetView = () => {
      if (disposed) return;
      const damping = controls.enableDamping;
      controls.enableDamping = false;
      controls.update(); // use up any remaining glide, so it doesn't continue after the reset
      controls.enableDamping = damping;
      frame();
      requestRender();
    };
    const rotate = (right: number, up: number) => {
      if (disposed) return;
      // Same directions as OrbitControls' pointer handling: dragging right turns the model right
      controls.rotateLeft(right);
      controls.rotateUp(up);
      requestRender();
    };
    const zoom = (factor: number) => {
      if (disposed || factor <= 0) return;
      if (factor > 1) controls.dollyIn(1 / factor);
      else controls.dollyOut(factor);
      requestRender();
    };
    const handleKey = (event: KeyboardEvent) => {
      if (event.altKey || event.ctrlKey || event.metaKey) return false; // leave browser shortcuts alone
      switch (event.key) {
        case 'ArrowLeft': rotate(-KEY_ROTATE, 0); break;
        case 'ArrowRight': rotate(KEY_ROTATE, 0); break;
        case 'ArrowUp': rotate(0, -KEY_ROTATE); break;
        case 'ArrowDown': rotate(0, KEY_ROTATE); break;
        case '+': case '=': zoom(KEY_ZOOM); break;
        case '-': case '_': zoom(1 / KEY_ZOOM); break;
        case 'Home': resetView(); break;
        default: return false;
      }
      event.preventDefault();
      return true;
    };

    ready = true;
    render();
    container.append(canvas);

    return {
      renderer, scene, camera, controls, model, gltf,
      bounds: { center, radius },
      requestRender, render, resetView, rotate, zoom, handleKey, dispose,
    };
  } catch (err) {
    dispose();
    throw err;
  }
}

/** Fetch with progress and abort. Rejects on HTTP errors (e.g. a missing file). */
async function download(url: string, signal?: AbortSignal, progress?: (fraction: number | null) => void): Promise<ArrayBuffer> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`${url}: HTTP ${response.status}`);
  const total = Number(response.headers.get('content-length')) || 0;
  if (!response.body || !total) {
    progress?.(null);
    return response.arrayBuffer();
  }
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let loaded = 0;
  progress?.(0);
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
    loaded += value.byteLength;
    progress?.(Math.min(loaded / total, 1));
  }
  const bytes = new Uint8Array(loaded);
  let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes.buffer;
}

/** extensionsUsed of a binary glTF, so optional decoders are only fetched when the file needs them */
function glbExtensions(buffer: ArrayBuffer): string[] {
  try {
    const view = new DataView(buffer);
    if (view.byteLength < 20 || view.getUint32(0, true) !== GLB_MAGIC) return [];
    const length = view.getUint32(12, true);
    const json = JSON.parse(new TextDecoder().decode(new Uint8Array(buffer, 20, length)));
    return Array.isArray(json.extensionsUsed) ? json.extensionsUsed : [];
  } catch {
    return [];
  }
}

/** Up to ~MAX_POINTS world-space vertex positions relative to center (box corners if there are none) */
function framingPoints(model: any, box: Box3, center: Vector3): Vector3[] {
  const meshes: any[] = [];
  let total = 0;
  model.traverse((obj: any) => {
    const position = obj.isMesh && obj.visible ? obj.geometry?.attributes?.position : undefined;
    if (position) { meshes.push(obj); total += position.count; }
  });
  const out: Vector3[] = [];
  const stride = Math.max(1, Math.ceil(total / MAX_POINTS));
  for (const mesh of meshes) {
    const position = mesh.geometry.attributes.position;
    for (let i = 0; i < position.count; i += stride) {
      out.push(new Vector3().fromBufferAttribute(position, i).applyMatrix4(mesh.matrixWorld).sub(center));
    }
  }
  if (!out.length) {
    for (const x of [box.min.x, box.max.x])
      for (const y of [box.min.y, box.max.y])
        for (const z of [box.min.z, box.max.z]) out.push(new Vector3(x, y, z).sub(center));
  }
  return out;
}

function cssToken(el: Element, name: string): string {
  return getComputedStyle(el).getPropertyValue(name).trim();
}

/** A CSS color token as a three.js color (hex or rgb(), which is what the design tokens use); else black */
function readColor(value: string): Color {
  const color = new Color(0, 0, 0);
  if (/^(#[\da-f]{3,8}|rgba?\()/i.test(value)) color.setStyle(value);
  return color;
}

/** Free GPU resources of everything below root: geometries, materials and their textures */
function disposeObject(root: any) {
  const materials = new Set<any>();
  root.traverse((obj: any) => {
    obj.geometry?.dispose?.();
    const m = obj.material;
    if (Array.isArray(m)) m.forEach((x) => materials.add(x));
    else if (m) materials.add(m);
    obj.skeleton?.dispose?.();
  });
  for (const material of materials) {
    for (const value of Object.values(material)) {
      if (value && (value as any).isTexture) {
        const texture = value as any;
        if (typeof ImageBitmap !== 'undefined' && texture.image instanceof ImageBitmap) texture.image.close();
        texture.dispose();
      }
    }
    material.dispose?.();
  }
}
