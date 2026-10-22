#!/usr/bin/env node
/**
 * validate.mjs: checks every group project in src/content/projects/<slug>/ before it is built.
 *
 * Usage
 *   npm run validate                 errors fail (exit code 1), warnings are only shown
 *   npm run validate -- --strict     warnings fail too
 *   npm run validate -- <slug> ...   only these project folders (the schema check always covers all)
 *
 * What it checks
 *   1. Content schema: runs `astro sync`, which checks every index.mdx and en.mdx against
 *      src/content.config.ts. Astro stops at the FIRST schema error, so fix it and run again.
 *   2. Images (cover, poster, question.figure.image, embed.items[].image, images in the MDX text):
 *      file exists (with the exact upper/lower case, which matters on the Linux server),
 *      is a format the build can read, is not bigger than the limit below (ERROR),
 *      and has the sizes from docs/DESIGN.md 5.4 (WARNING only, because some example photos come
 *      from Instagram at 1440 px): cover at least 2400 × 1600 px and close to 3:2,
 *      poster and inline images at least 1600 px wide. The card crop (4:5) has no field in the
 *      schema yet, so it is not checked.
 *   3. Files in public/ named in the frontmatter (embed.src, embed.sources[].src,
 *      embed.captions[].src, embed.scene, the iframe build's src): must exist and stay under the
 *      limit for their type (ERROR). Self-hosted video without captions: WARNING.
 *      Canvas sketches (embed.module, in the project folder): must exist and stay under the limit.
 *   4. Alt texts: the schema enforces them in the frontmatter. Here the MDX text is scanned for
 *      markdown images with an empty alt, ![](...), and <img>/<Image>/<Picture> tags without a
 *      non-empty alt (ERROR). Code blocks and comments are ignored.
 *   5. Translations: no en.mdx (WARNING: the English page shows German text), or en.mdx without
 *      text fields that index.mdx has (WARNING listing them).
 *   6. The whole project folder stays under its total limit (ERROR).
 *
 * Size limits: they MUST match the table "Size limits" in docs/MEDIA.md (proposed defaults there,
 * adjust both together). 1 MB = 1024 × 1024 bytes, 1 KB = 1024 bytes.
 *
 * How the frontmatter is read: with the small YAML reader below (the usual YAML that people write
 * by hand: key: value, nested keys, lists, "quoted" and 'quoted' text, | and > blocks,
 * [a, b] and {a: b}). Not with Astro's generated data store, because
 *   - the store (node_modules/.astro/data-store.json) is an internal, devalue-encoded format whose
 *     place and shape change between Astro versions (Astro 7 already has an experimental
 *     "collectionStorage" option), and decoding it would need the devalue package;
 *   - when `astro sync` stops at a schema error, the store is not updated, so the file checks
 *     would run on old data or not at all. Reading the files directly checks every project in one
 *     run, even while one of them still has a schema error.
 * Real YAML syntax errors are reported by `astro sync`. If the small reader can't follow a file
 * that Astro accepts, the project gets a WARNING and its file checks are skipped (never a false
 * ERROR).
 *
 * Needs only Node built-ins and sharp (installed with Astro) for image dimensions.
 * Exit codes: 0 = no errors (warnings allowed unless --strict), 1 = errors (or warnings with --strict).
 */

import { spawnSync } from 'node:child_process';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { basename, dirname, extname, join, relative, resolve, sep } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

// ---------------------------------------------------------------------------------------------
// Limits. Keep in sync with docs/MEDIA.md ("Size limits") and docs/DESIGN.md 5.4 (pixel sizes).

const KB = 1024;
const MB = 1024 * 1024;
const LIMITS = {
  cover: 2 * MB, // cover image
  inlineImage: 2 * MB, // inline, essay and gallery images, question figure
  poster: 500 * KB, // video / stage poster
  video: 80 * MB, // per video file (MP4 or WebM)
  model: 10 * MB, // GLB (model3d, webxr scene)
  splat: 30 * MB, // .spz / .ply / .splat / .ksplat
  canvasGzip: 500 * KB, // canvas sketch module, gzipped
  iframeBuild: 50 * MB, // whole folder of a self-hosted build
  project: 100 * MB, // everything in one project folder
};
const PIXELS = {
  cover: { width: 2400, height: 1600, ratio: 3 / 2, ratioName: '3:2' },
  inlineWidth: 1600, // inline images and poster
};
const RATIO_TOLERANCE = 0.05; // a cover more than 5 % away from 3:2 gets a warning

// ---------------------------------------------------------------------------------------------
// Setup

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const PROJECTS = join(ROOT, 'src', 'content', 'projects');
const PUBLIC = join(ROOT, 'public');
const STRICT = process.argv.includes('--strict');
const ONLY = process.argv.slice(2).filter((a) => !a.startsWith('-')); // optional: only these project slugs

const IMAGE_EXTS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.avif', '.gif', '.tif', '.tiff', '.svg']);
const TEXT_FIELDS_EN = [
  'place', 'field', 'coverAlt', 'posterAlt',
  'question.title', 'question.text', 'question.figure.alt', 'question.figure.caption',
  'method', 'results', 'design', 'embed.description', 'embed.textAlternative',
];

let sharp = null;
try {
  sharp = (await import('sharp')).default;
} catch {
  sharp = null;
}

const rel = (p) => relative(ROOT, p).split(sep).join('/');
const mb = (bytes) => (bytes >= MB ? `${(bytes / MB).toFixed(1)} MB` : `${Math.round(bytes / KB)} KB`);
const isRemote = (s) => /^[a-z][a-z0-9+.-]*:/i.test(s) || s.startsWith('//');
const get = (obj, path) => path.split('.').reduce((o, k) => (o && typeof o === 'object' ? o[k] : undefined), obj);
const hasText = (v) => (typeof v === 'string' ? v.trim() !== '' : v !== undefined && v !== null);

// Findings, grouped: "general" plus one group per project folder.
const groups = new Map();
let errors = 0;
let warnings = 0;
function report(group, level, file, message) {
  if (!groups.has(group)) groups.set(group, []);
  groups.get(group).push({ level, file, message });
  if (level === 'ERROR') errors++;
  else warnings++;
}
const GENERAL = '(general)';

// ---------------------------------------------------------------------------------------------
// 1. Schema: astro sync

function runAstroSync() {
  const bin = join(ROOT, 'node_modules', 'astro', 'bin', 'astro.mjs');
  const env = { ...process.env, FORCE_COLOR: '0', NO_COLOR: '1' };
  const result = existsSync(bin)
    ? spawnSync(process.execPath, [bin, 'sync'], { cwd: ROOT, env, encoding: 'utf8', timeout: 300_000 })
    : spawnSync('npx', ['astro', 'sync'], { cwd: ROOT, env, encoding: 'utf8', timeout: 300_000, shell: process.platform === 'win32' });

  if (result.error) {
    report(GENERAL, 'ERROR', 'astro sync', `could not run the schema check (${result.error.message}). Run "npm install" first.`);
    return;
  }
  if (result.status === 0) return;

  // Keep Astro's own message (it names the file and the field), drop timestamps and stack traces.
  const text = `${result.stdout ?? ''}\n${result.stderr ?? ''}`.replace(/\x1b\[[0-9;]*m/g, '');
  const kept = [];
  let skip = false;
  for (const line of text.split('\n')) {
    if (/^\d\d:\d\d:\d\d \[(content|types|build|vite)\]/.test(line)) continue;
    if (/^\d\d:\d\d:\d\d \[WARN\] \[glob-loader\] No files found/.test(line)) continue;
    // Drop Astro's generic hint, error link, stack trace and the location (shown as the file instead).
    if (/^\s*(Stack trace|Error reference|Hint|Location):/.test(line)) { skip = true; continue; }
    if (skip && (line.trim() === '' || /^\s{3,}/.test(line))) continue;
    skip = false;
    kept.push(line);
  }
  // Find the file named in "Location:" to put the error under its project.
  const location = text.match(/Location:\s*\n\s*(.+?)(?::(\d+):(\d+))?\s*$/m);
  let group = GENERAL;
  let file = 'content schema';
  if (location) {
    const abs = resolve(ROOT, location[1].trim());
    file = rel(abs) + (location[2] && location[2] !== '0' ? `:${location[2]}` : '');
    const inProjects = relative(PROJECTS, abs);
    if (!inProjects.startsWith('..') && inProjects.includes(sep)) group = inProjects.split(sep)[0];
  }
  const message = kept
    .map((l) => l.replace(/\s+$/, ''))
    .filter((l, i, all) => l !== '' || (i > 0 && all[i - 1] !== '')) // no double blank lines
    .join('\n')
    .replace(/^\n+|\n+$/g, '')
    .split('\n')
    .map((l) => (l === '' ? '' : `    ${l}`))
    .join('\n');
  report(group, 'ERROR', file,
    `the content check (astro sync) failed. Astro says:\n${message || `    (no message, exit code ${result.status})`}\n` +
    '    Astro stops at the first schema error: fix it and run the check again.');
}

// ---------------------------------------------------------------------------------------------
// Frontmatter: a small YAML reader (see the header for why)

class YamlError extends Error {
  constructor(message, line) {
    super(message);
    this.line = line;
  }
}

function parseYaml(source, firstLine = 1) {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  let i = 0;
  const skippable = (l) => /^\s*(#.*)?$/.test(l);
  const indentOf = (l) => l.match(/^ */)[0].length;
  const isSeqItem = (c) => c === '-' || c.startsWith('- ');
  const fail = (message, at = i) => { throw new YamlError(message, firstLine + Math.min(at, lines.length - 1)); };
  const next = () => {
    while (i < lines.length && skippable(lines[i])) i++;
    return i < lines.length;
  };
  // "key: rest" (key plain or quoted); null when the text is not a mapping entry.
  const keyMatch = (c) => {
    if (/^[\[{|>]/.test(c)) return null;
    const m = c.match(/^("(?:[^"\\]|\\.)*"|'(?:[^']|'')*'|[^\s#"'][^#]*?)[ \t]*:(?:[ \t]+(.*)|[ \t]*$)/);
    if (!m) return null;
    let key = m[1];
    if (key.startsWith('"')) key = JSON.parse(key);
    else if (key.startsWith("'")) key = key.slice(1, -1).replace(/''/g, "'");
    return { key, rest: m[2] ?? '' };
  };

  function plainScalar(s) {
    const t = s.trim();
    if (/^(true|True|TRUE)$/.test(t)) return true;
    if (/^(false|False|FALSE)$/.test(t)) return false;
    if (/^(null|Null|NULL|~)?$/.test(t)) return null;
    if (/^[-+]?\d+$/.test(t)) return Number(t);
    if (/^[-+]?(\d+\.\d*|\.\d+|\d+)([eE][-+]?\d+)?$/.test(t)) return Number(t);
    return t;
  }
  const stripComment = (s) => s.replace(/(^|\s)#.*$/, '').trimEnd();

  function doubleQuoted(body) {
    return body
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n(\n*)/g, (all, more) => (more ? more : ' '))
      .replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (all, e) => {
        if (e[0] === 'u' || e[0] === 'x') return String.fromCharCode(parseInt(e.slice(1), 16));
        return { n: '\n', t: '\t', r: '\r', '0': '\0', ' ': ' ', '/': '/', '"': '"', '\\': '\\' }[e] ?? e;
      });
  }
  function singleQuoted(body) {
    return body
      .replace(/[ \t]*\n[ \t]*/g, '\n')
      .replace(/\n(\n*)/g, (all, more) => (more ? more : ' '))
      .replace(/''/g, "'");
  }

  // Quoted scalar that may continue over several lines. Returns the value and checks what follows.
  function quoted(rest) {
    const q = rest[0];
    let text = rest;
    const closes = (t) => (q === '"' ? /^"(?:[^"\\]|\\.)*"/s : /^'(?:[^']|'')*'/s).exec(t);
    let m = closes(text);
    while (!m) {
      i++;
      if (i >= lines.length) fail(`a ${q}quoted${q} text is never closed`);
      text += '\n' + lines[i];
      m = closes(text);
    }
    i++;
    const after = text.slice(m[0].length).trim();
    if (after && !after.startsWith('#')) fail(`unexpected text after a quoted value: "${after}"`);
    const body = m[0].slice(1, -1);
    return q === '"' ? doubleQuoted(body) : singleQuoted(body);
  }

  // [a, b] and {a: b}, possibly over several lines.
  function flow(rest) {
    // Finds the closing bracket; returns its end and the text with # comments blanked out.
    const scan = (t) => {
      let depth = 0;
      let quote = null;
      let clean = '';
      for (let k = 0; k < t.length; k++) {
        const ch = t[k];
        if (quote) {
          if (ch === '\\' && quote === '"') { clean += ch + (t[k + 1] ?? ''); k++; continue; }
          if (ch === quote) quote = null;
        } else if (ch === '"' || ch === "'") quote = ch;
        else if (ch === '[' || ch === '{') depth++;
        else if (ch === ']' || ch === '}') { depth--; if (depth === 0) return { end: k + 1, clean: clean + ch }; }
        else if (ch === '#' && /\s/.test(t[k - 1] ?? ' ')) {
          const eol = t.indexOf('\n', k);
          k = eol < 0 ? t.length : eol - 1;
          continue;
        }
        clean += ch;
      }
      return null;
    };
    let text = rest;
    let found = scan(text);
    while (!found) {
      i++;
      if (i >= lines.length) fail('a [ or { list is never closed');
      text += '\n' + lines[i];
      found = scan(text);
    }
    i++;
    let pos = 0;
    const src = found.clean;
    const ws = () => { while (pos < src.length && /\s/.test(src[pos])) pos++; };
    function value() {
      ws();
      const ch = src[pos];
      if (ch === '[') {
        pos++;
        const arr = [];
        for (;;) {
          ws();
          if (src[pos] === ']') { pos++; return arr; }
          arr.push(value());
          ws();
          if (src[pos] === ',') pos++;
          else if (src[pos] !== ']') fail('a [ list is not written correctly');
        }
      }
      if (ch === '{') {
        pos++;
        const obj = {};
        for (;;) {
          ws();
          if (src[pos] === '}') { pos++; return obj; }
          const key = value();
          ws();
          let val = null;
          if (src[pos] === ':') { pos++; val = value(); }
          obj[String(key)] = val;
          ws();
          if (src[pos] === ',') pos++;
          else if (src[pos] !== '}') fail('a { } block is not written correctly');
        }
      }
      if (ch === '"' || ch === "'") {
        const m = (ch === '"' ? /^"(?:[^"\\]|\\.)*"/s : /^'(?:[^']|'')*'/s).exec(src.slice(pos));
        if (!m) fail('a quoted text is never closed');
        pos += m[0].length;
        const body = m[0].slice(1, -1);
        return ch === '"' ? doubleQuoted(body) : singleQuoted(body);
      }
      const m = /^(?:[^,\[\]{}:]|:(?!\s|[,\]}]))*/.exec(src.slice(pos));
      pos += m[0].length;
      return plainScalar(m[0].replace(/\s+/g, ' '));
    }
    return value();
  }

  // | and > blocks
  function blockScalar(header, parentIndent) {
    const style = header[0];
    const chomp = header.includes('-') ? 'strip' : header.includes('+') ? 'keep' : 'clip';
    i++;
    const collected = [];
    let contentIndent = null;
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === '') { collected.push(''); i++; continue; }
      const ind = indentOf(l);
      if (contentIndent === null) {
        if (ind <= parentIndent) break;
        contentIndent = ind;
      }
      if (ind < contentIndent) break;
      collected.push(l.slice(contentIndent));
      i++;
    }
    let trailing = 0;
    while (collected.length && collected[collected.length - 1] === '') { collected.pop(); trailing++; }
    let text = '';
    if (style === '|') text = collected.join('\n');
    else {
      // Folded: single line breaks become spaces, blank lines become line breaks.
      collected.forEach((l, k) => {
        const prev = collected[k - 1];
        if (k === 0) text = l;
        else if (l === '') text += '\n';
        else if (prev === '') text += l;
        else if (/^\s/.test(l) || /^\s/.test(prev)) text += '\n' + l;
        else text += ' ' + l;
      });
    }
    if (chomp === 'clip' && collected.length) text += '\n';
    if (chomp === 'keep') text += '\n'.repeat(trailing + (collected.length ? 1 : 0));
    return text;
  }

  // A value after "key:" or "- ". parentIndent = indent of the key or dash.
  function valueAfter(rest, parentIndent, allowCompactSeq) {
    const trimmed = rest.trim();
    if (/^[&!*]/.test(trimmed)) fail('anchors, aliases and tags (&, *, !) are not supported here');
    if (trimmed === '' || trimmed.startsWith('#')) {
      i++;
      if (!next()) return null;
      const ind = indentOf(lines[i]);
      const c = lines[i].slice(ind);
      if (ind > parentIndent) return block(ind);
      if (allowCompactSeq && ind === parentIndent && isSeqItem(c)) return sequence(ind);
      return null;
    }
    if (/^[|>][+-]?[1-9]?[+-]?(\s+#.*)?$/.test(trimmed)) return blockScalar(trimmed, parentIndent);
    if (trimmed[0] === '"' || trimmed[0] === "'") return quoted(trimmed);
    if (trimmed[0] === '[' || trimmed[0] === '{') return flow(trimmed);
    // Plain text, which may continue on more-indented lines.
    let text = stripComment(trimmed);
    const start = i;
    i++;
    while (i < lines.length) {
      const l = lines[i];
      if (l.trim() === '') {
        // A blank line inside a plain text block is a line break, if the text continues.
        let k = i;
        while (k < lines.length && lines[k].trim() === '') k++;
        if (k < lines.length && indentOf(lines[k]) > parentIndent && !lines[k].trim().startsWith('#')) {
          text += '\n'.repeat(k - i);
          i = k;
          continue;
        }
        break;
      }
      if (indentOf(l) <= parentIndent || l.trim().startsWith('#')) break;
      text += (text.endsWith('\n') ? '' : ' ') + stripComment(l.trim());
      i++;
    }
    if (/:\s/.test(text) && keyMatch(text)) fail(`"${text.slice(0, 40)}" contains ": " – put the text in "quotes"`, start);
    return plainScalar(text);
  }

  function block(indent) {
    if (!next()) return null;
    const c = lines[i].slice(indent);
    if (isSeqItem(c)) return sequence(indent);
    if (keyMatch(c)) return mapping(indent);
    return valueAfter(c, indent - 1, false);
  }

  function mapping(indent) {
    const obj = {};
    while (next()) {
      const ind = indentOf(lines[i]);
      if (ind < indent) break;
      if (ind > indent) fail('this line is indented more than the lines before it');
      const c = lines[i].slice(ind);
      if (isSeqItem(c)) break;
      const m = keyMatch(c);
      if (!m) fail(`expected "name: value", found "${c.trim().slice(0, 40)}"`);
      if (Object.prototype.hasOwnProperty.call(obj, m.key)) fail(`"${m.key}" appears twice`);
      obj[m.key] = valueAfter(m.rest, indent, true);
    }
    return obj;
  }

  function sequence(indent) {
    const arr = [];
    while (next()) {
      const ind = indentOf(lines[i]);
      if (ind < indent) break;
      if (ind > indent) fail('this line is indented more than the list items before it');
      const c = lines[i].slice(ind);
      if (!isSeqItem(c)) break;
      const after = c === '-' ? '' : c.slice(2);
      const itemIndent = ind + 2 + (after.length - after.trimStart().length);
      const item = after.trimStart();
      if (item === '' || item.startsWith('#')) {
        arr.push(valueAfter('', ind, false));
      } else if (isSeqItem(item) || keyMatch(item)) {
        lines[i] = ' '.repeat(itemIndent) + item; // "- key: v" → a mapping that starts at the item's column
        arr.push(block(itemIndent));
      } else {
        arr.push(valueAfter(item, ind, false));
      }
    }
    return arr;
  }

  if (!next()) return {};
  const top = indentOf(lines[i]);
  const result = block(top);
  if (next()) fail('this line does not fit the indentation of the lines before it');
  if (!result || typeof result !== 'object' || Array.isArray(result)) fail('the frontmatter must be a list of "name: value" lines');
  return result;
}

/** Splits an .mdx file into frontmatter data and body. */
function readMdx(file) {
  const lines = readFileSync(file, 'utf8').replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n').split('\n');
  const end = lines.findIndex((l, k) => k > 0 && /^(---|\.\.\.)[ \t]*$/.test(l));
  if (!/^---[ \t]*$/.test(lines[0]) || end < 0) {
    return { data: null, body: lines.join('\n'), bodyLine: 1, problem: 'the file must start with a frontmatter block between two "---" lines' };
  }
  const body = lines.slice(end + 1).join('\n');
  const bodyLine = end + 2;
  try {
    return { data: parseYaml(lines.slice(1, end).join('\n'), 2), body, bodyLine };
  } catch (error) {
    if (!(error instanceof YamlError)) throw error;
    return { data: null, body, bodyLine, unreadable: `line ${error.line}: ${error.message}` };
  }
}

// ---------------------------------------------------------------------------------------------
// Files

/** Exists with exactly this upper/lower case (macOS ignores case, the Linux build server doesn't). */
function existsExact(abs) {
  if (!existsSync(abs)) return { exists: false };
  const parts = relative(ROOT, abs).split(sep);
  if (parts[0] === '..') return { exists: true, caseOk: true };
  let dir = ROOT;
  for (const part of parts) {
    let names;
    try { names = readdirSync(dir); } catch { return { exists: true, caseOk: true }; }
    if (!names.includes(part)) {
      const actual = names.find((n) => n.toLowerCase() === part.toLowerCase());
      return { exists: true, caseOk: false, actual };
    }
    dir = join(dir, part);
  }
  return { exists: true, caseOk: true };
}

function isLfsPointer(abs, size) {
  if (size > 1024) return false;
  return readFileSync(abs, 'utf8').startsWith('version https://git-lfs');
}

function folderSize(dir) {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, entry.name);
    if (entry.isDirectory()) total += folderSize(p);
    else if (entry.isFile()) total += statSync(p).size;
  }
  return total;
}

/**
 * Checks that a referenced file exists (exact case) and is a real file, not a Git LFS pointer.
 * Returns its size, or null after reporting the problem.
 */
function checkFile(group, where, abs, label, hint) {
  const found = existsExact(abs);
  if (!found.exists) {
    report(group, 'ERROR', where, `${label}: file not found: ${rel(abs)}. ${hint}`);
    return null;
  }
  if (!found.caseOk) {
    report(group, 'ERROR', where, `${label}: ${rel(abs)} differs in upper/lower case from the file on disk` +
      `${found.actual ? ` ("${found.actual}")` : ''}. It works on a Mac but breaks on the server. Use the exact name.`);
    return null;
  }
  const stat = statSync(abs);
  if (!stat.isFile()) {
    report(group, 'ERROR', where, `${label}: ${rel(abs)} is a folder, not a file.`);
    return null;
  }
  if (isLfsPointer(abs, stat.size)) {
    report(group, 'ERROR', where, `${label}: ${rel(abs)} is only a Git LFS pointer, not the real file. Run "git lfs pull" (docs/MEDIA.md).`);
    return null;
  }
  return stat.size;
}

async function imageSize(abs) {
  if (!sharp) return null;
  const meta = await sharp(abs).metadata();
  const swap = meta.orientation >= 5 && meta.orientation <= 8; // rotated by EXIF
  return { width: swap ? meta.height : meta.width, height: swap ? meta.width : meta.height };
}

let warnedNoSharp = false;
const checkedImages = new Set();

/**
 * kind: 'cover' | 'poster' | 'inline'
 * where: the .mdx file (+ field) that names the image; value: the path as written.
 */
async function checkImage(group, mdxFile, field, value, kind, extra = {}) {
  const where = rel(mdxFile);
  if (typeof value !== 'string' || value.trim() === '') return;
  if (isRemote(value)) {
    report(group, 'ERROR', where, `${field}: "${value}" is a web address. Put the image in your project folder and write its file name, e.g. "./cover.jpg".`);
    return;
  }
  if (/^[~@]\//.test(value)) return; // import alias, resolved by Astro; not checked here
  const abs = value.startsWith('/') ? (extra.publicRoot ? join(PUBLIC, value) : join(ROOT, value)) : resolve(dirname(mdxFile), value);
  if (checkedImages.has(abs)) return; // same image used twice (e.g. cover and in the text): report once
  checkedImages.add(abs);
  const ext = extname(abs).toLowerCase();
  if (!IMAGE_EXTS.has(ext)) {
    report(group, 'ERROR', where, `${field}: "${value}" is not an image format the build can read.` +
      `${ext === '.heic' || ext === '.heif' ? ' iPhone photos (HEIC) must be converted.' : ''} Use JPEG for photos, PNG for graphics (docs/MEDIA.md).`);
    return;
  }
  const size = checkFile(group, where, abs, field, 'Check the path: it is relative to the .mdx file, e.g. "./cover.jpg".');
  if (size === null) return;
  const limit = kind === 'cover' ? LIMITS.cover : kind === 'poster' ? LIMITS.poster : LIMITS.inlineImage;
  if (size > limit) {
    report(group, 'ERROR', rel(abs), `${field}: the file is ${mb(size)}, the limit is ${mb(limit)} (docs/MEDIA.md). ` +
      'Export it at the size in docs/DESIGN.md 5.4 as JPEG, quality 85–90.');
  }
  if (ext === '.svg') return;
  if (!sharp) {
    if (!warnedNoSharp) report(GENERAL, 'WARNING', 'sharp', 'image dimensions were not checked because sharp is missing. Run "npm install".');
    warnedNoSharp = true;
    return;
  }
  let dim;
  try {
    dim = await imageSize(abs);
  } catch (error) {
    report(group, 'ERROR', rel(abs), `${field}: this file can't be read as an image (${error.message}). Export it again as JPEG or PNG.`);
    return;
  }
  if (!dim?.width || !dim?.height) return;
  const { width, height } = dim;
  const px = `${width} × ${height} px`;
  if (kind === 'cover') {
    const need = PIXELS.cover;
    if (width < need.width || height < need.height) {
      report(group, 'WARNING', rel(abs), `${field}: the cover is ${px}; docs/DESIGN.md 5.4 asks for at least ${need.width} × ${need.height} px. It may look soft on large screens.`);
    }
    const ratio = width / height;
    if (Math.abs(ratio / need.ratio - 1) > RATIO_TOLERANCE) {
      report(group, 'WARNING', rel(abs), `${field}: the cover is ${px} (ratio ${ratio.toFixed(2)}:1), far from ${need.ratioName} (1.50:1). ` +
        'It will be cropped around coverFocus. Crop it to 3:2 yourself to choose what stays visible.');
    }
  } else if (width < PIXELS.inlineWidth) {
    report(group, 'WARNING', rel(abs), `${field}: the image is ${px}; docs/DESIGN.md 5.4 asks for at least ${PIXELS.inlineWidth} px width. It may look soft on large screens.`);
  }
  if (kind === 'poster' && extra.videoRatio) {
    const ratio = width / height;
    if (Math.abs(ratio / extra.videoRatio - 1) > RATIO_TOLERANCE) {
      report(group, 'WARNING', rel(abs), `${field}: the poster (${px}) has a different shape than the video (embed.width × embed.height). ` +
        'Use a still from the video, same ratio (docs/MEDIA.md).');
    }
  }
}

// ---------------------------------------------------------------------------------------------
// Files in public/ named by the frontmatter

function publicKind(path) {
  const ext = extname(path).toLowerCase();
  if (['.mp4', '.webm', '.mov', '.m4v'].includes(ext)) return 'video';
  if (['.glb', '.gltf'].includes(ext)) return 'model';
  if (['.spz', '.ply', '.splat', '.ksplat'].includes(ext)) return 'splat';
  if (['.html', '.htm'].includes(ext)) return 'build';
  return 'other';
}

function checkPublicFile(group, mdxFile, field, value) {
  const where = rel(mdxFile);
  if (typeof value !== 'string' || value.trim() === '' || isRemote(value)) return;
  const abs = join(PUBLIC, value.replace(/^\/+/, ''));
  const size = checkFile(group, where, abs, field,
    'Files for this field live in public/ and are written without "public/" and without a leading slash, e.g. "media/clip.mp4".');
  if (size === null) return;
  const kind = publicKind(abs);
  const limits = {
    video: [LIMITS.video, 'per video file. Shorten it, use 720p, or a video platform (docs/MEDIA.md, Video).'],
    model: [LIMITS.model, 'for a GLB. Compress it with gltf-transform (docs/MEDIA.md, 3D models).'],
    splat: [LIMITS.splat, 'for a splat. Crop floaters and export .spz (docs/MEDIA.md, Gaussian splats).'],
  };
  if (limits[kind] && size > limits[kind][0]) {
    report(group, 'ERROR', rel(abs), `${field}: the file is ${mb(size)}, the limit is ${mb(limits[kind][0])} ${limits[kind][1]}`);
  }
  if (kind === 'build') {
    const dir = dirname(abs);
    if (dir === PUBLIC || dir === join(PUBLIC, 'media')) return; // shared folder: can't tell what belongs to the build
    const total = folderSize(dir);
    if (total > LIMITS.iframeBuild) {
      report(group, 'ERROR', rel(dir), `${field}: the build folder is ${mb(total)} in total, the limit is ${mb(LIMITS.iframeBuild)} (docs/MEDIA.md). ` +
        'Use Brotli compression and Strip Engine Code, and keep textures at max. 2048 px.');
    }
  }
}

// ---------------------------------------------------------------------------------------------
// MDX text: images and alt texts

/** Blanks out code blocks, inline code and comments (keeping line breaks for line numbers). */
function blankNonContent(body) {
  const blank = (s) => s.replace(/[^\n]/g, ' ');
  let fence = null;
  const lines = body.split('\n').map((line) => {
    const m = line.match(/^\s*(`{3,}|~{3,})/);
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length && line.trim() === m[1]) fence = null;
      return blank(line);
    }
    if (m) { fence = m[1]; return blank(line); }
    return line;
  });
  return lines.join('\n')
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, blank)
    .replace(/<!--[\s\S]*?-->/g, blank)
    .replace(/(`+)(?!`)[^\n]*?[^`\n]\1(?!`)/g, blank);
}

async function checkBody(group, mdxFile, body, bodyLine) {
  const where = (index) => `${rel(mdxFile)}:${bodyLine + body.slice(0, index).split('\n').length - 1}`;
  const text = blankNonContent(body);

  // Markdown images: ![alt](src "title")
  const md = /!\[((?:[^\[\]]|\[[^\]]*\])*)\]\(\s*<?([^)\s>]*)>?(?:\s+(?:"[^"]*"|'[^']*'|\([^)]*\)))?\s*\)/g;
  for (const m of text.matchAll(md)) {
    const alt = m[1].trim();
    const src = m[2];
    if (!alt) {
      report(group, 'ERROR', where(m.index), `image "${src}" has no alt text. Write it between the brackets: ![What the image shows and why it matters](${src})`);
    }
    if (src && !isRemote(src)) await checkImage(group, mdxFile, `image in the text (${src})`, src, 'inline', { publicRoot: true });
  }

  // HTML / JSX images: <img>, <Image>, <Picture>
  const tag = /<(img|Image|Picture)\b((?:[^>"'{]|"[^"]*"|'[^']*'|\{[^}]*\})*)\/?>/g;
  for (const m of text.matchAll(tag)) {
    const attrs = m[2];
    const alt = attrs.match(/(?:^|\s)alt\s*=\s*(?:"([^"]*)"|'([^']*)'|\{\s*(?:"([^"]*)"|'([^']*)'|`([^`]*)`|([^}]*))\s*\})/);
    const value = alt ? [alt[1], alt[2], alt[3], alt[4], alt[5], alt[6]].find((v) => v !== undefined) ?? '' : null;
    const src = attrs.match(/(?:^|\s)src\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/);
    const name = src ? (src[1] ?? src[2] ?? src[3] ?? '').trim() : '';
    if (value === null) {
      report(group, 'ERROR', where(m.index), `<${m[1]}${name ? ` src="${name}"` : ''}> has no alt text. Add alt="What the image shows and why it matters".`);
    } else if (value.trim() === '') {
      report(group, 'ERROR', where(m.index), `<${m[1]}${name ? ` src="${name}"` : ''}> has an empty alt text. Describe what the image shows and why it matters.`);
    }
  }
}

// ---------------------------------------------------------------------------------------------
// One project

async function checkProject(slug) {
  const dir = join(PROJECTS, slug);
  const indexFile = join(dir, 'index.mdx');
  const enFile = join(dir, 'en.mdx');
  const indexRel = rel(indexFile);

  if (!existsSync(indexFile)) {
    const hasEn = existsSync(enFile);
    report(slug, 'WARNING', rel(dir) + '/',
      hasEn
        ? 'there is an en.mdx but no index.mdx. Every project needs index.mdx (German, all fields); en.mdx alone is ignored.'
        : 'this folder has no index.mdx, so it is not a project and is ignored. Remove it or add index.mdx.');
    return false;
  }

  const de = readMdx(indexFile);
  const en = existsSync(enFile) ? readMdx(enFile) : null;

  // Total folder size
  const total = folderSize(dir);
  if (total > LIMITS.project) {
    report(slug, 'ERROR', rel(dir) + '/', `the project folder is ${mb(total)}, the limit is ${mb(LIMITS.project)} (docs/MEDIA.md). Ask the maintainer if you need more.`);
  }

  const d = de.data;
  const e = d?.embed && typeof d.embed === 'object' ? d.embed : {};

  // Images in the frontmatter (before the text, so an image used twice gets the stricter rule)
  if (d) {
    await checkImage(slug, indexFile, 'cover', d.cover, 'cover');
    const videoRatio = d.format === 'video' && e.width > 0 && e.height > 0 ? e.width / e.height : null;
    await checkImage(slug, indexFile, 'poster', d.poster, 'poster', { videoRatio });
    await checkImage(slug, indexFile, 'question.figure.image', get(d, 'question.figure.image'), 'inline');
    if (Array.isArray(e.items)) {
      for (const [n, item] of e.items.entries()) {
        await checkImage(slug, indexFile, `embed.items[${n + 1}].image`, item?.image, 'inline');
      }
    }
  }

  // Images and alt texts in the text of both languages
  await checkBody(slug, indexFile, de.body, de.bodyLine);
  if (en) await checkBody(slug, enFile, en.body, en.bodyLine);

  if (de.problem) {
    report(slug, 'ERROR', indexRel, de.problem + '.');
    return true;
  }
  if (de.unreadable) {
    report(slug, 'WARNING', indexRel, `the frontmatter could not be read by this check (${de.unreadable}). ` +
      'Image and file checks for this project were skipped. Fix the astro sync error above if there is one; otherwise write that part more simply or tell the maintainer.');
    return true;
  }

  // Files in public/
  if (typeof e.src === 'string' && !(d.format === 'iframe' && e.kind === 'pixelstreaming')) checkPublicFile(slug, indexFile, 'embed.src', e.src);
  if (typeof e.scene === 'string') checkPublicFile(slug, indexFile, 'embed.scene', e.scene);
  const sources = Array.isArray(e.sources) ? e.sources : [];
  sources.forEach((s, n) => checkPublicFile(slug, indexFile, `embed.sources[${n + 1}].src`, s?.src));
  const captions = Array.isArray(e.captions) ? e.captions : [];
  captions.forEach((c, n) => checkPublicFile(slug, indexFile, `embed.captions[${n + 1}].src`, c?.src));
  if (sources.length && !captions.length) {
    report(slug, 'WARNING', indexRel, 'embed: the self-hosted video has no captions. Videos with speech need captions as a .vtt file ' +
      '(embed.captions, docs/DESIGN.md 10). Ignore this if nobody speaks in the video.');
  }

  // Canvas sketch in the project folder
  if (d.format === 'canvas') {
    const module = typeof e.module === 'string' ? e.module : 'sketch.js';
    const abs = join(dir, module);
    const size = checkFile(slug, indexRel, abs, 'embed.module', 'Put your sketch next to index.mdx and write its file name, e.g. "sketch.js".');
    if (size !== null) {
      const gz = gzipSync(readFileSync(abs)).length;
      if (gz > LIMITS.canvasGzip) {
        report(slug, 'ERROR', rel(abs), `embed.module: the sketch is ${mb(gz)} gzipped, the limit is ${mb(LIMITS.canvasGzip)} (docs/MEDIA.md).`);
      }
    }
  }

  // Translation
  if (!en) {
    report(slug, 'WARNING', indexRel, 'no en.mdx: the English page will show the German text. Add en.mdx with the English texts.');
  } else if (en.problem) {
    report(slug, 'ERROR', rel(enFile), en.problem + '.');
  } else if (en.unreadable) {
    report(slug, 'WARNING', rel(enFile), `the frontmatter could not be read by this check (${en.unreadable}); missing translations were not checked.`);
  } else {
    const t = en.data;
    const missing = TEXT_FIELDS_EN.filter((f) => hasText(get(d, f)) && !hasText(get(t, f)));
    if (Array.isArray(d.requirements) && d.requirements.length && !(Array.isArray(t.requirements) && t.requirements.length)) missing.push('requirements');
    if (Array.isArray(e.items)) {
      const items = Array.isArray(get(t, 'embed.items')) ? t.embed.items : [];
      e.items.forEach((item, n) => {
        for (const f of ['alt', 'caption']) {
          if (hasText(item?.[f]) && !hasText(items[n]?.[f])) missing.push(`embed.items[${n + 1}].${f}`);
        }
      });
    }
    if (de.body.trim() && !en.body.trim()) missing.push('the text below the frontmatter');
    if (missing.length) {
      report(slug, 'WARNING', rel(enFile), `English is missing for: ${missing.join(', ')}. The English page shows the German text there.`);
    }
  }
  return true;
}

// ---------------------------------------------------------------------------------------------
// Run

console.log('Checking content (npm run validate)…\n');
runAstroSync();

const allSlugs = existsSync(PROJECTS)
  ? readdirSync(PROJECTS, { withFileTypes: true }).filter((d) => d.isDirectory() && !d.name.startsWith('.')).map((d) => d.name).sort()
  : [];
for (const slug of ONLY.filter((s) => !allSlugs.includes(s))) {
  report(GENERAL, 'ERROR', `src/content/projects/${slug}/`, 'there is no project folder with this name. Check the spelling of the slug.');
}
const slugs = ONLY.length ? allSlugs.filter((s) => ONLY.includes(s)) : allSlugs;
let projectCount = 0;
for (const slug of slugs) {
  if (!groups.has(slug)) groups.set(slug, []);
  if (await checkProject(slug)) projectCount++;
}
const strayFiles = existsSync(PROJECTS)
  ? readdirSync(PROJECTS, { withFileTypes: true }).filter((d) => d.isFile() && /\.mdx?$/.test(d.name))
  : [];
for (const f of strayFiles) {
  report(GENERAL, 'WARNING', rel(join(PROJECTS, f.name)), 'this file is not inside a project folder and is ignored. Use src/content/projects/<slug>/index.mdx.');
}

// Output: general findings first, then one block per project.
const order = [...groups.keys()].sort((a, b) => (a === GENERAL ? -1 : b === GENERAL ? 1 : a.localeCompare(b)));
for (const group of order) {
  const findings = groups.get(group);
  if (group === GENERAL && !findings.length) continue;
  console.log(group === GENERAL ? 'General' : `Project ${group} (src/content/projects/${group}/)`);
  if (!findings.length) console.log('  OK, nothing to fix.');
  findings.sort((a, b) => (a.level === b.level ? 0 : a.level === 'ERROR' ? -1 : 1));
  for (const f of findings) console.log(`${f.level.padEnd(7)}  ${f.file}: ${f.message}`);
  console.log('');
}

if (!allSlugs.length) console.log('No projects yet in src/content/projects/.\n');
const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
console.log(`Summary: ${plural(projectCount, 'project')} checked, ${plural(errors, 'error')}, ${plural(warnings, 'warning')}.`);
// exitCode instead of process.exit(), so the output is fully written when it goes to a pipe.
if (errors) {
  console.log('Fix every ERROR before the pull request can be merged.');
  process.exitCode = 1;
} else if (warnings && STRICT) {
  console.log('--strict: warnings count as failures.');
  process.exitCode = 1;
} else {
  process.exitCode = 0;
}
