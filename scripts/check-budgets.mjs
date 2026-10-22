#!/usr/bin/env node
/**
 * check-budgets.mjs: checks that the home and index pages stay light.
 *
 * Usage
 *   npm run check:budgets                  checks the pages below in dist/ (run `npm run build` first)
 *   node scripts/check-budgets.mjs <dir>   checks another build folder
 *
 * Budgets (from the project brief), per page:
 *   - JavaScript: at most 100 KB gzipped. Counts same-site <script src>, inline <script> code,
 *     <link rel="modulepreload">, <link rel="preload" as="script">, Astro islands
 *     (<astro-island component-url/renderer-url>, counted as if they hydrate) and every module
 *     those files import statically. Dynamic import("...") is NOT counted: that is how heavy
 *     viewers (3D, splats) should load, on click or when visible.
 *   - Total transfer: at most 500 KB. Text files (HTML, CSS, JS, SVG) are measured gzipped, binary
 *     files (images, fonts) at their real size. Counts the HTML, stylesheets (and their @import),
 *     JavaScript as above, fonts, and images that load immediately.
 *     Fonts: the first url() of every @font-face in the page's stylesheets and <style> blocks.
 *     That is an UPPER BOUND: browsers only download fonts that visible text actually uses.
 *     Images: <img> and <picture> without loading="lazy", plus <video poster> and
 *     <link rel="preload" as="image">. For srcset the largest candidate file is counted; for a
 *     <picture> only its single largest option (the browser picks one, not all).
 *     Not counted: CSS background images, external URLs (check:external forbids them anyway).
 * 1 KB = 1024 bytes. Status: OK, WARN from 90 % of a limit, FAIL above the limit (exit code 1).
 *
 * Cover images are excluded from the total: the brief budgets the page "excluding the cover images
 * the visitor actually sees". Mark them in the markup with data-budget="cover", on the <img> or on
 * its <picture>:
 *     <Image src={cover} alt="..." data-budget="cover" />                    (Astro <Image>)
 *     <Picture src={cover} alt="..." pictureAttributes={{ 'data-budget': 'cover' }} />
 * Use it only for the cover visuals of experience cards and page heroes, not for decoration.
 *
 * Pages: edit PAGES below (paths inside the build folder). A missing page is a warning, not a
 * failure, so the check keeps working while routes are being built. If the site is built with an
 * Astro `base` (e.g. /repo-name/ for a GitHub project page), URLs like /repo-name/assets/x.js are
 * found automatically by dropping the first path segment when the file is not found otherwise.
 *
 * Exit codes: 0 = within budget (warnings allowed), 1 = a budget is exceeded, 2 = build folder missing.
 */

import { existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, posix, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// Pages to check, relative to the build folder.
const PAGES = ['de/index.html', 'en/index.html', 'de/erlebnisse/index.html', 'en/experiences/index.html'];
const LIMITS_KB = { js: 100, total: 500 };
const WARN_AT = 0.9;

const KB = 1024;
const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIST = resolve(process.argv[2] ?? join(ROOT, 'dist'));
const TEXT_TYPES = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.cjs', '.json', '.svg', '.xml', '.txt', '.webmanifest']);

if (!existsSync(DIST) || !statSync(DIST).isDirectory()) {
  console.error(`check:budgets: folder "${DIST}" not found. Run "npm run build" first.`);
  process.exit(2);
}

// ---------------------------------------------------------------------------------------------
// Helpers

const blank = (text) => text.replace(/[^\n]/g, ' ');
const kb = (bytes) => `${(bytes / KB).toFixed(1)} KB`;
const gzipBytes = (data) => gzipSync(data).length;

const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', colon: ':', sol: '/', nbsp: ' ' };
function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (all, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
    }
    return ENTITIES[code.toLowerCase()] ?? all;
  });
}

const sizeCache = new Map();
/** Bytes on the wire: gzipped for text files, raw for binaries. */
function transferSize(file) {
  if (!sizeCache.has(file)) {
    const data = readFileSync(file);
    sizeCache.set(file, TEXT_TYPES.has(extname(file).toLowerCase()) ? gzipBytes(data) : data.length);
  }
  return sizeCache.get(file);
}

/** Maps a site URL path such as /assets/x.js to a file in the build folder, or null. */
function toFile(urlPath) {
  const parts = urlPath.split('/').filter(Boolean);
  const candidates = [parts.join('/')];
  if (parts.length > 1) candidates.push(parts.slice(1).join('/')); // site built with an Astro `base`
  for (const candidate of candidates) {
    const file = join(DIST, candidate);
    if ((file === DIST || file.startsWith(DIST + sep)) && existsSync(file) && statSync(file).isFile()) return file;
  }
  return null;
}

/** Resolves a reference found in a file served at fromUrl. */
function resolveRef(ref, fromUrl) {
  const value = decodeEntities(ref).trim();
  if (!value || value.startsWith('#')) return { kind: 'none' };
  if (/^(data|blob):/i.test(value)) return { kind: 'inline' };
  if (/^(?:[a-z][a-z0-9+.-]*:)?\/\//i.test(value)) return { kind: 'external' };
  if (/^[a-z][a-z0-9+.-]*:/i.test(value)) return { kind: 'none' }; // mailto:, tel:, javascript: ...
  let path = value.replace(/[?#].*$/, '');
  try {
    path = decodeURIComponent(path);
  } catch {
    /* keep as is */
  }
  return { kind: 'local', urlPath: posix.resolve(posix.dirname(fromUrl), path) };
}

/** Splits a srcset value into its URLs (URLs may contain commas, e.g. data: URLs). */
function srcsetUrls(value) {
  const urls = [];
  let i = 0;
  while (i < value.length) {
    while (i < value.length && /[\s,]/.test(value[i])) i++;
    const start = i;
    while (i < value.length && !/\s/.test(value[i])) i++;
    let url = value.slice(start, i);
    if (url.endsWith(',')) url = url.replace(/,+$/, '');
    else while (i < value.length && value[i] !== ',') i++;
    if (url) urls.push(url);
  }
  return urls;
}

const RAW_TEXT =
  /<!--[\s\S]*?-->|(<(script|style|textarea|title)\b((?:[^>"']|"[^"]*"|'[^']*')*)(?<!\/)>)([\s\S]*?)<\/\2\s*>/gi;
const TAG = /<(\/?)([a-zA-Z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const JS_TYPES = /^(|module|(text|application)\/(x-)?(java|ecma)script)$/i;
const STATIC_IMPORT = /(?:^|[^\w$.])(?:import|export)\s*(?:[\w$\s{},*]*?\bfrom\s*)?(["'])([^"'\n]+)\1/g;

function parseAttributes(text) {
  const attrs = new Map();
  for (const match of text.matchAll(ATTRIBUTE)) {
    const value = match[2] ?? match[3] ?? match[4];
    const name = match[1].toLowerCase();
    if (!attrs.has(name)) attrs.set(name, value == null ? '' : decodeEntities(value));
  }
  return attrs;
}

// ---------------------------------------------------------------------------------------------
// Measuring one page

function measurePage(pagePath) {
  const pageFile = join(DIST, pagePath);
  const pageUrl = `/${pagePath}`;
  const html = readFileSync(pageFile, 'utf8');

  const items = new Map(); // file -> { kind, bytes }
  const notes = { inlineJs: 0, external: 0, missing: new Set(), lazy: 0, covers: 0, eager: 0 };
  const add = (kind, file) => {
    if (items.has(file)) return false;
    items.set(file, { kind, bytes: transferSize(file) });
    return true;
  };
  const local = (ref, fromUrl) => {
    const resolved = resolveRef(ref, fromUrl);
    if (resolved.kind === 'external') notes.external++;
    if (resolved.kind !== 'local') return null;
    const file = toFile(resolved.urlPath);
    if (!file) notes.missing.add(resolved.urlPath);
    return file ? { file, urlPath: resolved.urlPath } : null;
  };

  /** Adds a JS file and, recursively, every local module it imports statically. */
  function addJsTree(ref, fromUrl) {
    const target = local(ref, fromUrl);
    if (!target || !add('js', target.file)) return;
    const code = readFileSync(target.file, 'utf8');
    for (const match of code.matchAll(STATIC_IMPORT)) {
      const spec = match[2];
      if (!/^(\.{1,2})?\//.test(spec)) continue; // bare package names are already bundled
      const resolved = resolveRef(spec, target.urlPath);
      if (resolved.kind === 'local' && toFile(resolved.urlPath)) addJsTree(spec, target.urlPath);
    }
  }

  function scanCss(css, fromUrl) {
    const clean = css.replace(/\/\*[\s\S]*?\*\//g, blank);
    for (const match of clean.matchAll(/@import\s+(?:url\(\s*)?(["']?)([^"')\s;]+)\1/gi)) addCss(match[2], fromUrl);
    for (const face of clean.matchAll(/@font-face\s*\{([^}]*)\}/gi)) {
      const src = /(?:^|[;\s])src\s*:([^;]*)/i.exec(face[1]);
      const first = src && /url\(\s*(["']?)([^"')]+)\1\s*\)/i.exec(src[1]);
      if (!first) continue;
      const target = local(first[2], fromUrl);
      if (target) add('font', target.file);
    }
  }
  function addCss(ref, fromUrl) {
    const target = local(ref, fromUrl);
    if (!target || !add('css', target.file)) return;
    scanCss(readFileSync(target.file, 'utf8'), target.urlPath);
  }

  /** Adds the largest existing file among the given image URLs (one image slot = one download). */
  function addLargestImage(refs) {
    let best = null;
    for (const ref of refs) {
      const target = local(ref, pageUrl);
      if (target && (!best || transferSize(target.file) > transferSize(best))) best = target.file;
    }
    if (best) {
      add('image', best);
      notes.eager++;
    }
  }
  const imageRefs = (attrs) => [...srcsetUrls(attrs.get('srcset') ?? ''), ...(attrs.get('src') ? [attrs.get('src')] : [])];

  // 1. Inline <script> and <style>; blank out comments and raw-text bodies.
  const masked = html.replace(RAW_TEXT, (all, open, tag, attrText, body) => {
    if (open === undefined) return blank(all);
    if (tag.toLowerCase() === 'style') scanCss(body, pageUrl);
    if (tag.toLowerCase() === 'script') {
      const attrs = parseAttributes(attrText);
      if (JS_TYPES.test((attrs.get('type') ?? '').trim()) && !attrs.has('nomodule')) {
        if (attrs.has('src')) addJsTree(attrs.get('src'), pageUrl);
        else if (body.trim()) notes.inlineJs += gzipBytes(body);
      }
    }
    return open + blank(body) + all.slice(open.length + body.length);
  });

  // 2. Everything else, tag by tag. <picture> needs its children, so it is collected until </picture>.
  let picture = null;
  for (const match of masked.matchAll(TAG)) {
    const closing = match[1] === '/';
    const tag = match[2].toLowerCase();
    if (closing) {
      if (tag === 'picture' && picture) {
        if (picture.lazy) notes.lazy++;
        else if (picture.cover) notes.covers++;
        else addLargestImage(picture.refs);
        picture = null;
      }
      continue;
    }
    const attrs = parseAttributes(match[3]);
    const rel = (attrs.get('rel') ?? '').toLowerCase().split(/\s+/);
    const isCover = attrs.get('data-budget') === 'cover';

    if (tag === 'picture') picture = { refs: [], cover: isCover, lazy: false };
    else if (tag === 'source' && picture) picture.refs.push(...srcsetUrls(attrs.get('srcset') ?? ''));
    else if (tag === 'img' && picture) {
      picture.refs.push(...imageRefs(attrs));
      picture.cover ||= isCover;
      picture.lazy = (attrs.get('loading') ?? '').toLowerCase() === 'lazy';
    } else if (tag === 'img') {
      if ((attrs.get('loading') ?? '').toLowerCase() === 'lazy') notes.lazy++;
      else if (isCover) notes.covers++;
      else addLargestImage(imageRefs(attrs));
    } else if (tag === 'video' && attrs.get('poster')) {
      if (isCover) notes.covers++;
      else addLargestImage([attrs.get('poster')]);
    } else if (tag === 'link' && attrs.get('href') != null) {
      const href = attrs.get('href');
      const as = (attrs.get('as') ?? '').toLowerCase();
      if (rel.includes('stylesheet') && !rel.includes('alternate')) addCss(href, pageUrl);
      else if (rel.includes('modulepreload')) addJsTree(href, pageUrl);
      else if (rel.includes('preload') && as === 'script') addJsTree(href, pageUrl);
      else if (rel.includes('preload') && as === 'style') addCss(href, pageUrl);
      else if (rel.includes('preload') && as === 'font') {
        const target = local(href, pageUrl);
        if (target) add('font', target.file);
      } else if (rel.includes('preload') && as === 'image') {
        if (isCover) notes.covers++;
        else addLargestImage([...srcsetUrls(attrs.get('imagesrcset') ?? ''), href]);
      }
    } else if (tag === 'astro-island') {
      for (const name of ['component-url', 'renderer-url']) if (attrs.get(name)) addJsTree(attrs.get(name), pageUrl);
    }
  }

  const sum = (kind) => [...items.values()].filter((i) => i.kind === kind).reduce((a, i) => a + i.bytes, 0);
  const htmlBytes = gzipBytes(html);
  const parts = { html: htmlBytes, css: sum('css'), js: sum('js'), font: sum('font'), image: sum('image') };
  return {
    js: parts.js + notes.inlineJs,
    total: parts.html + parts.css + parts.js + parts.font + parts.image, // inline JS is inside the HTML
    parts,
    notes,
    largest: [...items.entries()].sort((a, b) => b[1].bytes - a[1].bytes).slice(0, 5),
  };
}

// ---------------------------------------------------------------------------------------------
// Report

function status(bytes, limitKb) {
  const ratio = bytes / (limitKb * KB);
  return { ratio, label: ratio > 1 ? 'FAIL' : ratio >= WARN_AT ? 'WARN' : 'OK' };
}

const relDist = relative(process.cwd(), DIST);
const shownDist = relDist.startsWith('..') ? DIST : relDist || '.';
console.log(`Checking page budgets in ${shownDist}/ (JS <= ${LIMITS_KB.js} KB gzipped, total <= ${LIMITS_KB.total} KB without cover images).`);

let failures = 0;
let warnings = 0;
let checked = 0;

for (const page of PAGES) {
  console.log('');
  if (!existsSync(join(DIST, page))) {
    warnings++;
    console.log(`WARN  ${page}: page not found, skipped. (If the route moved, update PAGES in scripts/check-budgets.mjs.)`);
    continue;
  }
  checked++;
  const result = measurePage(page);
  const rows = [
    ['JavaScript (gzipped)', result.js, LIMITS_KB.js],
    ['Total transfer', result.total, LIMITS_KB.total],
  ];
  console.log(page);
  console.log(`  ${'Budget'.padEnd(22)}${'Size'.padStart(11)}${'Limit'.padStart(11)}${'Used'.padStart(7)}  Status`);
  for (const [name, bytes, limit] of rows) {
    const s = status(bytes, limit);
    if (s.label === 'FAIL') failures++;
    if (s.label === 'WARN') warnings++;
    const used = `${Math.round(s.ratio * 100)}%`;
    console.log(`  ${name.padEnd(22)}${kb(bytes).padStart(11)}${kb(limit * KB).padStart(11)}${used.padStart(7)}  ${s.label}`);
  }
  const { parts, notes } = result;
  const imageNote = `${notes.eager} eager; not counted: ${notes.covers} cover, ${notes.lazy} lazy`;
  console.log(
    `  Made of: HTML ${kb(parts.html)}, CSS ${kb(parts.css)}, JS files ${kb(parts.js)} + inline JS ${kb(notes.inlineJs)}, ` +
      `fonts ${kb(parts.font)} (upper bound), images ${kb(parts.image)} (${imageNote})`,
  );
  if (result.largest.length) {
    const list = result.largest.map(([file, item]) => `${relative(DIST, file).split(sep).join('/')} ${kb(item.bytes)}`);
    console.log(`  Largest files: ${list.join(', ')}`);
  }
  if (notes.external) console.log(`  Note: ${notes.external} external URL(s) not counted; "npm run check:external" reports them.`);
  if (notes.missing.size) {
    warnings++;
    console.log(`  WARN  referenced but not in the build (not counted): ${[...notes.missing].slice(0, 5).join(', ')}`);
  }
}

console.log('');
const summary = `${checked} of ${PAGES.length} pages checked, ${failures} over budget, ${warnings} warning(s).`;
if (failures) {
  console.log(`FAILED: ${summary}`);
  console.log('Make the page lighter: load heavy scripts only on click (dynamic import), lazy-load images below');
  console.log('the fold (loading="lazy"), use smaller/compressed images and fewer font files.');
  process.exit(1);
}
console.log(`${warnings ? 'OK with warnings' : 'OK'}: ${summary}`);
