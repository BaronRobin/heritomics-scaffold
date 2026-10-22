// Sample sketch "Fog meets crust" for the canvas format. Copy it, change it, replace it.
// Speculative visualization: it illustrates an idea (fog settles as droplets on pebbles), it is not a
// simulation of real fog or crust.
//
// Contract (details in src/scripts/formats/canvas.ts):
// - export mount(canvas, { reducedMotion, lang }) and return a cleanup function;
// - the Stage sizes the canvas and fires a "resize" event on it when the size changes;
// - only canvas 2D here, no external requests, no storage.

// Colors from the HS KL palette. Inside the Stage, groups may style freely (DESIGN.md 7.4).
const BLACK = '#000000';
const WHITE = '#ffffff';
const GREY = '#555555';
const GREEN = '#d2f2e1';
const BLUE = '#38d5ff';

const STONES = [ // position across the width, width and height relative to the stone size
  { x: 0.22, w: 1.05, h: 0.85 },
  { x: 0.33, w: 0.75, h: 0.7 },
  { x: 0.45, w: 1.15, h: 1 },
  { x: 0.57, w: 0.85, h: 0.75 },
  { x: 0.68, w: 1, h: 0.9 },
  { x: 0.79, w: 0.7, h: 0.65 },
  { x: 0.89, w: 1.05, h: 0.85 },
];
const SLOTS = 9; // places for droplets along the top of each stone
const STEP = 1 / 30; // simulation step in seconds when there is no animation loop

const KEYS = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] };

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ reducedMotion: boolean; lang: 'de' | 'en' }} options
 * @returns {() => void} cleanup
 */
export function mount(canvas, { reducedMotion }) {
  const ctx = canvas.getContext('2d');
  let width = 0; // CSS pixels
  let height = 0;
  let scale = 1; // device pixels per CSS pixel
  let ground = 0; // y of the ground line
  let stones = [];
  const fog = [];
  const water = STONES.map(() => new Array(SLOTS).fill(0)); // 0 = dry, 1 = full droplet
  const wind = { x: 0, y: 0 }; // extra push from the arrow keys, fades out
  let pointer = null; // last pointer position, for pointer speed
  let time = 0;
  let frame = 0;
  let last = 0;
  let pendingSteps = 0;

  // Size everything from the canvas. Called at the start and whenever the Stage resizes the canvas.
  function layout() {
    const oldWidth = width;
    const oldHeight = height;
    width = canvas.clientWidth;
    height = canvas.clientHeight;
    scale = width > 0 ? canvas.width / width : 1;
    ground = height * 0.86;
    const size = Math.min(width / 18, height * 0.14);
    stones = STONES.map((s) => {
      const rx = size * s.w * 1.15;
      const ry = size * s.h * 1.05;
      return { cx: width * s.x, cy: ground + ry * 0.2, rx, ry };
    });
    if (oldWidth > 0 && oldHeight > 0) {
      for (const p of fog) { p.x *= width / oldWidth; p.y *= height / oldHeight; }
    }
    // More fog on a bigger canvas
    const count = Math.round(Math.min(180, Math.max(50, (width * height) / 3200)));
    while (fog.length < count) fog.push(spawn({}, Math.random() * width * (oldWidth ? 1 : 0.45)));
    fog.length = count;
  }

  // A fog particle enters at the left edge (or at x)
  function spawn(p, x) {
    const size = Math.min(1.5, Math.max(0.5, width / 800));
    p.r = (12 + Math.random() * 26) * size;
    p.x = x ?? -p.r;
    p.y = height * (0.1 + Math.random() * 0.7);
    p.vx = width * 0.05;
    p.vy = 0;
    p.alpha = 0.025 + Math.random() * 0.04;
    p.phase = Math.random() * Math.PI * 2;
    return p;
  }

  function step(dt) {
    time += dt;
    const fade = Math.exp(-dt * 0.7);
    wind.x *= fade;
    wind.y *= fade;
    const drift = width * 0.05; // fog drifts to the right…
    const sink = height * 0.03; // …and slowly sinks
    const ease = Math.min(1, dt * 1.2);
    for (const p of fog) {
      p.vx += (drift + wind.x - p.vx) * ease;
      p.vy += (sink + wind.y - p.vy) * ease;
      p.x += p.vx * dt;
      p.y += p.vy * dt + Math.sin(time * 0.8 + p.phase) * height * 0.01 * dt;

      // Touching a stone from above: the fog particle becomes water on it
      for (let i = 0; i < stones.length; i++) {
        const s = stones[i];
        const dx = (p.x - s.cx) / (s.rx + p.r * 0.3);
        const dy = (p.y - s.cy) / (s.ry + p.r * 0.3);
        if (dy < 0 && dx * dx + dy * dy < 1) {
          const angle = Math.atan2(dy, dx); // -π (left) … 0 (right)
          const slot = Math.round(Math.min(1, Math.max(0, (angle + Math.PI * 0.85) / (Math.PI * 0.7))) * (SLOTS - 1));
          water[i][slot] = Math.min(1, water[i][slot] + 0.12);
          spawn(p);
          break;
        }
      }

      if (p.y > ground - p.r * 0.3) { p.y = ground - p.r * 0.3; p.vy = -Math.abs(p.vy) * 0.3; }
      if (p.x > width + p.r || p.y < -p.r * 2) spawn(p);
      else if (p.x < -p.r * 2) p.x = width + p.r; // pushed out to the left: comes back on the right
    }
    // Droplets dry out slowly
    for (const row of water) for (let j = 0; j < SLOTS; j++) row[j] = Math.max(0, row[j] - dt * 0.01);
  }

  function draw() {
    if (width <= 0 || height <= 0) return;
    ctx.setTransform(scale, 0, 0, scale, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, 0, width, height);

    // Stones: grey with a green crust on top
    stones.forEach((s, i) => {
      ctx.fillStyle = GREEN;
      ctx.beginPath();
      ctx.ellipse(s.cx, s.cy, s.rx, s.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = GREY;
      ctx.beginPath();
      ctx.ellipse(s.cx, s.cy + s.ry * 0.16, s.rx, s.ry, 0, 0, Math.PI * 2);
      ctx.fill();
      // Droplets along the top
      for (let j = 0; j < SLOTS; j++) {
        const amount = water[i][j];
        if (amount < 0.03) continue;
        const angle = -Math.PI * 0.85 + (Math.PI * 0.7 * j) / (SLOTS - 1);
        const r = s.ry * 0.2 * Math.sqrt(amount);
        const x = s.cx + s.rx * Math.cos(angle);
        const y = s.cy + s.ry * Math.sin(angle) - r * 0.6;
        ctx.fillStyle = BLUE;
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = WHITE;
        ctx.beginPath();
        ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    // Ground: everything below the line is soil
    ctx.fillStyle = BLACK;
    ctx.fillRect(0, ground, width, height - ground);
    ctx.fillStyle = GREY;
    ctx.fillRect(0, ground, width, 1);

    // Fog: many faint white dots
    ctx.fillStyle = WHITE;
    for (const p of fog) {
      ctx.globalAlpha = p.alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  // Animation loop (only without reduced motion)
  function tick(now) {
    const dt = last ? Math.min((now - last) / 1000, 0.05) : STEP;
    last = now;
    step(dt);
    draw();
    frame = requestAnimationFrame(tick);
  }

  // With reduced motion: no loop, one redraw after input, a few steps further
  function update(steps) {
    if (!reducedMotion) return;
    pendingSteps = Math.min(30, pendingSteps + steps);
    if (frame) return;
    frame = requestAnimationFrame(() => {
      frame = 0;
      for (let i = 0; i < pendingSteps; i++) step(STEP);
      pendingSteps = 0;
      draw();
    });
  }

  function onPointerMove(event) {
    const box = canvas.getBoundingClientRect();
    const x = event.clientX - box.left;
    const y = event.clientY - box.top;
    if (pointer) {
      const dx = x - pointer.x;
      const dy = y - pointer.y;
      const reach = Math.max(60, width * 0.12);
      for (const p of fog) {
        const d = Math.hypot(p.x - x, p.y - y);
        if (d < reach) {
          const push = (1 - d / reach) * 6;
          p.vx += dx * push;
          p.vy += dy * push;
        }
      }
    }
    pointer = { x, y };
    update(3);
  }

  function onPointerLeave() { pointer = null; }

  function onKeyDown(event) {
    const dir = KEYS[event.key];
    if (!dir) return;
    event.preventDefault();
    const limit = 0.25;
    wind.x = Math.max(-width * limit, Math.min(width * limit, wind.x + dir[0] * width * 0.06));
    wind.y = Math.max(-height * limit, Math.min(height * limit, wind.y + dir[1] * height * 0.08));
    update(15);
  }

  function onResize() {
    layout();
    draw();
  }

  layout();
  canvas.style.touchAction = 'pan-y pinch-zoom'; // sideways swipes push the fog, the page still scrolls
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerleave', onPointerLeave);
  canvas.addEventListener('pointercancel', onPointerLeave);
  canvas.addEventListener('keydown', onKeyDown);
  canvas.addEventListener('resize', onResize);

  if (reducedMotion) {
    // A still picture: let the fog settle for a while, then draw once
    for (let i = 0; i < 900; i++) step(STEP);
    draw();
  } else {
    draw();
    frame = requestAnimationFrame(tick);
  }

  return function cleanup() {
    cancelAnimationFrame(frame);
    frame = 0;
    canvas.removeEventListener('pointermove', onPointerMove);
    canvas.removeEventListener('pointerleave', onPointerLeave);
    canvas.removeEventListener('pointercancel', onPointerLeave);
    canvas.removeEventListener('keydown', onKeyDown);
    canvas.removeEventListener('resize', onResize);
  };
}
