// Generates public/media/placeholder-crust.glb: a PLACEHOLDER stand-in for the Atacama
// "grit crust" (granite pebbles with pale, black and greenish crust on a ground disc).
// It is NOT scientific data, just something for the 3D viewer and WebXR scene until a real scan exists.
// Run with `npm run make:model`. A fixed random seed means every run writes the exact same file.

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Document, NodeIO } from '@gltf-transform/core';

const OUTPUT_FILE = resolve(dirname(fileURLToPath(import.meta.url)), '../public/media/placeholder-crust.glb');

const PLACEHOLDER_INFO = {
  placeholder: true,
  label: 'Platzhalter-Modell (prozedural)',
  note: 'Not scientific data. Replace with a real scan.',
};

// Sizes are in metres. Y is up, the disc stands on y = 0.
const SEED = 2026;
const DISC_RADIUS = 0.15;
const DISC_THICKNESS = 0.006;
const DISC_SEGMENTS = 64;
const CLUSTER_RADIUS = 0.13;
const PEBBLE_DETAIL = 2; // icosphere subdivisions: 2 gives 162 vertices per pebble
const PEBBLE_SIZE_MIN = 0.009;
const PEBBLE_SIZE_MAX = 0.024;

// How many pebbles of each crust stage. Pale = early stage, black = later stage.
const CRUST_STAGES = { pale: 18, black: 11, green: 5 };

// Colours are written as sRGB hex (like in a design tool) and converted to linear for glTF.
const GRANITE_COLORS = ['#d9d1c1', '#cfc9bd', '#c8bea9', '#bfbab0', '#d3c7b0'];
const SPECKLE_DARK = '#3b3733';
const SPECKLE_LIGHT = '#f1ede4';
const GROUND_COLOR = '#9a8a71';

const CRUST_LOOK = {
  pale: { color: '#e6dfcf', strength: 0.55, startHeight: 0.45 },
  black: { color: '#22201d', strength: 0.95, startHeight: 0.22 },
  green: { color: '#76875a', strength: 0.75, startHeight: 0.32 },
};

const random = createRandom(SEED);

// ---------- Build the pebbles ----------

const pebbleShapes = shuffle(
  Object.entries(CRUST_STAGES).flatMap(([stage, count]) => Array.from({ length: count }, () => stage)),
).map((stage) => ({ stage, size: randomBetween(PEBBLE_SIZE_MIN, PEBBLE_SIZE_MAX) }));

// Place big pebbles first so the small ones can fill the gaps.
pebbleShapes.sort((a, b) => b.size - a.size);

const sphere = createIcosphere(PEBBLE_DETAIL);
const pebbles = { positions: [], normals: [], colors: [], indices: [] };
const placedFootprints = [];

for (const shape of pebbleShapes) {
  addToMesh(pebbles, makePebble(shape.size, shape.stage));
}

// ---------- Build the ground disc ----------

const ground = makeGroundDisc();

// ---------- Write the glTF document ----------

const document = new Document();
document.getRoot().getAsset().generator = 'heritomics-scaffold make-placeholder-model';
const buffer = document.createBuffer();

const pebbleMaterial = document
  .createMaterial('Pebble_granite_and_crust (vertex colors)')
  .setBaseColorFactor([1, 1, 1, 1])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.9);

const groundMaterial = document
  .createMaterial('Ground_desert_soil')
  .setBaseColorFactor([...hexToLinear(GROUND_COLOR), 1])
  .setMetallicFactor(0)
  .setRoughnessFactor(0.95);

const pebbleMesh = document.createMesh('Pebbles').addPrimitive(createPrimitive(document, buffer, pebbles, pebbleMaterial));
const groundMesh = document.createMesh('GroundDisc').addPrimitive(createPrimitive(document, buffer, ground, groundMaterial));

const rootNode = document
  .createNode('PLACEHOLDER_grit_crust')
  .setExtras(PLACEHOLDER_INFO)
  .addChild(document.createNode('Pebbles').setMesh(pebbleMesh))
  .addChild(document.createNode('GroundDisc').setMesh(groundMesh));

const scene = document.createScene('PLACEHOLDER_grit_crust_scene').setExtras(PLACEHOLDER_INFO).addChild(rootNode);
document.getRoot().setDefaultScene(scene);

const glb = await new NodeIO().writeBinary(document);
mkdirSync(dirname(OUTPUT_FILE), { recursive: true });
writeFileSync(OUTPUT_FILE, glb);

console.log(`Wrote ${OUTPUT_FILE} (${(glb.byteLength / 1024).toFixed(1)} KB, ${pebbleShapes.length} pebbles)`);

// ---------- Pebble shape ----------

function makePebble(size, stage) {
  const stretch = [randomBetween(0.95, 1.3), randomBetween(0.55, 0.85), randomBetween(0.75, 1.1)];
  const bumps = Array.from({ length: 5 }, () => ({
    direction: randomDirection(),
    height: randomBetween(-0.12, 0.18),
    sharpness: randomBetween(2, 6),
  }));
  const cuts = Array.from({ length: 3 }, () => ({ normal: randomDirection(), offset: randomBetween(0.72, 0.92) }));
  cuts.push({ normal: [0, -1, 0], offset: randomBetween(0.5, 0.7) }); // flat-ish underside

  const yaw = randomBetween(0, Math.PI * 2);
  const tilt = randomBetween(-0.2, 0.2);

  let positions = sphere.positions.map((direction) => {
    let radius = 1 + randomBetween(-0.025, 0.025); // grainy surface
    for (const bump of bumps) {
      radius += bump.height * Math.exp((dot(direction, bump.direction) - 1) * bump.sharpness);
    }
    let point = scale(direction, radius);
    for (const cut of cuts) {
      const outside = dot(point, cut.normal) - cut.offset;
      if (outside > 0) point = subtract(point, scale(cut.normal, outside));
    }
    point = [point[0] * stretch[0] * size, point[1] * stretch[1] * size, point[2] * stretch[2] * size];
    return rotateY(rotateX(point, tilt), yaw);
  });

  const footprint = Math.max(...positions.map(([x, , z]) => Math.hypot(x, z)));
  const [centerX, centerZ] = findFreeSpot(footprint);

  const lowest = Math.min(...positions.map((p) => p[1]));
  const highest = Math.max(...positions.map((p) => p[1]));
  const sinkIntoGround = randomBetween(0, 0.2) * (highest - lowest);
  const lift = DISC_THICKNESS - lowest - sinkIntoGround;
  positions = positions.map(([x, y, z]) => [x + centerX, y + lift, z + centerZ]);

  const granite = hexToRgb(GRANITE_COLORS[Math.floor(random() * GRANITE_COLORS.length)]);
  const colors = positions.map(([, y]) => {
    const heightOnPebble = (y - lift - lowest) / (highest - lowest);
    return rgbToLinear(pebbleSurfaceColor(granite, stage, heightOnPebble));
  });

  return { positions, normals: smoothNormals(positions, sphere.faces), colors, indices: sphere.faces.flat() };
}

// Granite with dark and light mineral speckles, covered by crust on the upper part.
function pebbleSurfaceColor(granite, stage, heightOnPebble) {
  const grain = random();
  let color = granite;
  if (grain < 0.07) color = hexToRgb(SPECKLE_DARK);
  else if (grain < 0.12) color = hexToRgb(SPECKLE_LIGHT);
  color = scale(color, randomBetween(0.92, 1.05));

  const crust = CRUST_LOOK[stage];
  const coverage = smoothstep(crust.startHeight, crust.startHeight + 0.25, heightOnPebble + randomBetween(-0.08, 0.08));
  const patchiness = randomBetween(0.8, 1);
  return mix(color, hexToRgb(crust.color), coverage * crust.strength * patchiness);
}

// Try random spots inside the cluster until the pebble only slightly touches its neighbours.
function findFreeSpot(footprint) {
  let allowedOverlap = 0.85;
  for (let attempt = 0; attempt < 4000; attempt++) {
    if (attempt > 0 && attempt % 500 === 0) allowedOverlap -= 0.1;
    const angle = randomBetween(0, Math.PI * 2);
    const distance = Math.sqrt(random()) * (CLUSTER_RADIUS - footprint);
    const spot = [Math.cos(angle) * distance, Math.sin(angle) * distance];
    const fits = placedFootprints.every(
      (other) => Math.hypot(spot[0] - other.x, spot[1] - other.z) > (footprint + other.radius) * allowedOverlap,
    );
    if (fits) {
      placedFootprints.push({ x: spot[0], z: spot[1], radius: footprint });
      return spot;
    }
  }
  throw new Error('Could not place all pebbles. Lower the pebble count or size.');
}

// ---------- Ground disc ----------

function makeGroundDisc() {
  const disc = { positions: [], normals: [], colors: null, indices: [] };
  const top = DISC_THICKNESS;

  const ring = Array.from({ length: DISC_SEGMENTS }, (_, i) => {
    const angle = (i / DISC_SEGMENTS) * Math.PI * 2;
    return [Math.cos(angle), Math.sin(angle)];
  });

  // Top and bottom caps: a centre vertex plus a ring.
  for (const [y, normalY] of [[top, 1], [0, -1]]) {
    const center = disc.positions.length;
    disc.positions.push([0, y, 0], ...ring.map(([c, s]) => [c * DISC_RADIUS, y, s * DISC_RADIUS]));
    disc.normals.push(...Array.from({ length: DISC_SEGMENTS + 1 }, () => [0, normalY, 0]));
    for (let i = 0; i < DISC_SEGMENTS; i++) {
      const a = center + 1 + i;
      const b = center + 1 + ((i + 1) % DISC_SEGMENTS);
      disc.indices.push(...(normalY > 0 ? [center, b, a] : [center, a, b]));
    }
  }

  // Side wall: two rings with normals pointing outwards.
  const side = disc.positions.length;
  for (const [c, s] of ring) {
    disc.positions.push([c * DISC_RADIUS, top, s * DISC_RADIUS], [c * DISC_RADIUS, 0, s * DISC_RADIUS]);
    disc.normals.push([c, 0, s], [c, 0, s]);
  }
  for (let i = 0; i < DISC_SEGMENTS; i++) {
    const upper = side + i * 2;
    const lower = upper + 1;
    const nextUpper = side + ((i + 1) % DISC_SEGMENTS) * 2;
    const nextLower = nextUpper + 1;
    disc.indices.push(upper, nextUpper, lower, lower, nextUpper, nextLower);
  }
  return disc;
}

// ---------- Geometry helpers ----------

function createIcosphere(subdivisions) {
  const t = (1 + Math.sqrt(5)) / 2;
  const positions = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
    [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
    [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map(normalize);
  let faces = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11],
    [1, 5, 9], [5, 11, 4], [11, 10, 2], [10, 7, 6], [7, 1, 8],
    [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8], [3, 8, 9],
    [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  for (let level = 0; level < subdivisions; level++) {
    const middles = new Map();
    const middle = (a, b) => {
      const key = a < b ? `${a}-${b}` : `${b}-${a}`;
      if (!middles.has(key)) {
        positions.push(normalize(scale(add(positions[a], positions[b]), 0.5)));
        middles.set(key, positions.length - 1);
      }
      return middles.get(key);
    };
    faces = faces.flatMap(([a, b, c]) => {
      const ab = middle(a, b);
      const bc = middle(b, c);
      const ca = middle(c, a);
      return [[a, ab, ca], [b, bc, ab], [c, ca, bc], [ab, bc, ca]];
    });
  }
  return { positions, faces };
}

function smoothNormals(positions, faces) {
  const normals = positions.map(() => [0, 0, 0]);
  for (const [a, b, c] of faces) {
    const faceNormal = cross(subtract(positions[b], positions[a]), subtract(positions[c], positions[a]));
    for (const index of [a, b, c]) normals[index] = add(normals[index], faceNormal);
  }
  return normals.map(normalize);
}

function addToMesh(mesh, part) {
  const offset = mesh.positions.length;
  mesh.positions.push(...part.positions);
  mesh.normals.push(...part.normals);
  mesh.colors.push(...part.colors);
  mesh.indices.push(...part.indices.map((index) => index + offset));
}

function createPrimitive(document, buffer, mesh, material) {
  const accessor = (type, array) => document.createAccessor().setType(type).setArray(array).setBuffer(buffer);
  const primitive = document
    .createPrimitive()
    .setMaterial(material)
    .setAttribute('POSITION', accessor('VEC3', new Float32Array(mesh.positions.flat())))
    .setAttribute('NORMAL', accessor('VEC3', new Float32Array(mesh.normals.flat())))
    .setIndices(accessor('SCALAR', new Uint16Array(mesh.indices)));
  if (mesh.colors) primitive.setAttribute('COLOR_0', accessor('VEC3', new Float32Array(mesh.colors.flat())));
  return primitive;
}

// ---------- Small math and colour helpers ----------

// Seeded random numbers (mulberry32), so the model is the same on every run.
function createRandom(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randomBetween(min, max) {
  return min + random() * (max - min);
}

function randomDirection() {
  const y = randomBetween(-1, 1);
  const angle = randomBetween(0, Math.PI * 2);
  const ring = Math.sqrt(1 - y * y);
  return [Math.cos(angle) * ring, y, Math.sin(angle) * ring];
}

function shuffle(list) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [list[i], list[j]] = [list[j], list[i]];
  }
  return list;
}

function add(a, b) {
  return [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
}
function subtract(a, b) {
  return [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
}
function scale(a, s) {
  return [a[0] * s, a[1] * s, a[2] * s];
}
function dot(a, b) {
  return a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
}
function cross(a, b) {
  return [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
}
function normalize(a) {
  return scale(a, 1 / Math.hypot(...a));
}
function mix(a, b, amount) {
  return add(scale(a, 1 - amount), scale(b, amount));
}
function smoothstep(edge0, edge1, x) {
  const t = Math.min(1, Math.max(0, (x - edge0) / (edge1 - edge0)));
  return t * t * (3 - 2 * t);
}
function rotateX([x, y, z], angle) {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return [x, y * c - z * s, y * s + z * c];
}
function rotateY([x, y, z], angle) {
  const [c, s] = [Math.cos(angle), Math.sin(angle)];
  return [x * c + z * s, y, -x * s + z * c];
}

function hexToRgb(hex) {
  const value = parseInt(hex.slice(1), 16);
  return [(value >> 16) & 255, (value >> 8) & 255, value & 255].map((channel) => channel / 255);
}
// glTF stores colours in linear space, design tools show sRGB.
function rgbToLinear(rgb) {
  return rgb.map((c) => Math.min(1, Math.max(0, c)))
    .map((c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
}
function hexToLinear(hex) {
  return rgbToLinear(hexToRgb(hex));
}
