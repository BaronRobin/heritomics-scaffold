#!/usr/bin/env node
/**
 * check-external.mjs: fails if the built site would contact another server when a page opens.
 *
 * Usage
 *   npm run check:external                  scans dist/ (run `npm run build` first)
 *   node scripts/check-external.mjs <dir>   scans another folder
 *
 * Why
 *   The site must work without a consent banner, so a visitor's browser may only talk to our own
 *   server on page load: no Google Fonts, CDNs, external icons, social widgets or trackers.
 *   External embeds (YouTube, Vimeo, Sketchfab, Unreal Pixel Streaming) load only after a click,
 *   so their URLs may appear in the built files only in data-* attributes or plain <a href> links.
 *
 * What is scanned
 *   Every .html, .htm, .css, .js, .mjs, .svg and .webmanifest file in the folder, recursively.
 *   A finding is an absolute external URL (http://, https://, ws://, wss:// or protocol-relative
 *   //host) in a place where the browser would load it:
 *   - HTML/SVG: src, srcset, imagesrcset, poster, background, manifest, <object data>,
 *     <link href> (any rel except canonical and alternate), <base href>, href/xlink:href on SVG
 *     <image>, <use>, <feImage>, <script>, <meta http-equiv="refresh"> targets, url() in style
 *     attributes and <style> blocks, inline <script> code, <script type="importmap">.
 *     <iframe src> pointing elsewhere is always a finding: embeds must be click-to-load.
 *     Markup inside <template> and <noscript> is checked too.
 *   - CSS: url(...), @import, image-set("...").
 *   - JS: only literal URLs passed to import(...), import/export ... from "...", fetch(...),
 *     new URL(...), new Worker(...)/SharedWorker, importScripts(...), new WebSocket(...),
 *     new EventSource(...), sendBeacon(...), XMLHttpRequest .open(method, ...),
 *     setAttribute("src", ...), or assigned with `.src = "..."`. Other strings and comments are
 *     ignored on purpose: bundles such as three.js contain many harmless URLs.
 *   - Web app manifests: "src" entries (icons, screenshots).
 *
 * Always allowed
 *   <a href> and <area href> links, data-* attributes, xmlns* attributes, XML namespace URIs
 *   (http://www.w3.org/2000/svg, .../1999/xhtml, .../1999/xlink, ...), data: and blob: URLs,
 *   relative and same-site URLs, and hosts listed in the allowlist.
 *
 * Allowlist: privacy.allowlist.json in the repository root (optional; missing = empty)
 *   { "allowedHosts": ["media.example.org", "www.example.org"] }
 *   Exact hostnames only: no https://, no port, no path, no wildcards. "example.org" does NOT cover
 *   "www.example.org"; list each host separately. Every host added here is a third party that sees
 *   our visitors' IP addresses, so additions need approval (see docs/PRIVACY.md). If absolute links
 *   to the site's own domain ever show up in loading attributes, add that hostname here.
 *
 * Exit codes: 0 = nothing found, 1 = external requests found, 2 = setup problem (missing folder,
 * broken allowlist).
 *
 * Limits: this is a fast pattern scan with Node built-ins, not a browser. It does not see URLs that
 * code builds at runtime (e.g. "https://" + host). Review such code by hand.
 */

import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, extname, join, relative, resolve } from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const ALLOWLIST_FILE = join(ROOT, 'privacy.allowlist.json');
const SCAN_DIR = resolve(process.argv[2] ?? join(ROOT, 'dist'));
const EXTENSIONS = new Set(['.html', '.htm', '.css', '.js', '.mjs', '.svg', '.webmanifest']);

// XML namespace identifiers look like URLs but are never fetched.
const NAMESPACE_URIS = new Set([
  'http://www.w3.org/2000/svg',
  'http://www.w3.org/1999/xhtml',
  'http://www.w3.org/1999/xlink',
  'http://www.w3.org/1998/math/mathml',
  'http://www.w3.org/xml/1998/namespace',
  'http://www.w3.org/2000/xmlns',
]);

// ---------------------------------------------------------------------------------------------
// Setup

function stop(message) {
  console.error(`check:external: ${message}`);
  process.exit(2);
}

function loadAllowlist() {
  if (!existsSync(ALLOWLIST_FILE)) return new Set();
  let data;
  try {
    data = JSON.parse(readFileSync(ALLOWLIST_FILE, 'utf8'));
  } catch (error) {
    stop(`${relative(process.cwd(), ALLOWLIST_FILE)} is not valid JSON (${error.message}).`);
  }
  const hosts = data?.allowedHosts;
  if (!Array.isArray(hosts)) {
    stop(`${relative(process.cwd(), ALLOWLIST_FILE)} must look like { "allowedHosts": [] }.`);
  }
  for (const host of hosts) {
    if (typeof host !== 'string' || !/^[a-z0-9-]+(\.[a-z0-9-]+)*$/i.test(host)) {
      stop(
        `allowlist entry ${JSON.stringify(host)} is not a plain hostname. ` +
          'Write it like "media.example.org" (no https://, no path, no port, no wildcards).',
      );
    }
  }
  return new Set(hosts.map((host) => host.toLowerCase()));
}

if (!existsSync(SCAN_DIR) || !statSync(SCAN_DIR).isDirectory()) {
  stop(`folder "${displayPath(SCAN_DIR)}" not found. Run "npm run build" first.`);
}
const allowedHosts = loadAllowlist();

// ---------------------------------------------------------------------------------------------
// Helpers

function* walk(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) yield* walk(full);
    else if (entry.isFile() && EXTENSIONS.has(extname(entry.name).toLowerCase())) yield full;
  }
}

/** Path relative to the current folder when inside it, absolute otherwise. */
function displayPath(file) {
  const rel = relative(process.cwd(), file);
  return rel.startsWith('..') ? file : rel;
}

/** Returns a function mapping a character offset to a 1-based line number. */
function lineIndexer(text) {
  const starts = [0];
  for (let i = 0; i < text.length; i++) if (text.charCodeAt(i) === 10) starts.push(i + 1);
  return (offset) => {
    let lo = 0;
    let hi = starts.length - 1;
    while (lo < hi) {
      const mid = (lo + hi + 1) >> 1;
      if (starts[mid] <= offset) lo = mid;
      else hi = mid - 1;
    }
    return lo + 1;
  };
}

/** Replaces everything except line breaks with spaces, so offsets and line numbers stay valid. */
const blank = (text) => text.replace(/[^\n]/g, ' ');

const ENTITIES = { amp: '&', quot: '"', apos: "'", lt: '<', gt: '>', colon: ':', sol: '/', period: '.', nbsp: ' ' };
function decodeEntities(value) {
  return value.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);?/gi, (all, code) => {
    if (code[0] === '#') {
      const n = code[1] === 'x' || code[1] === 'X' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10);
      return Number.isFinite(n) && n > 0 && n < 0x110000 ? String.fromCodePoint(n) : all;
    }
    return ENTITIES[code.toLowerCase()] ?? all;
  });
}

const ABSOLUTE_URL = /^(?:(?:https?|wss?):)?\/\/([^/?#\s\\]+)/i;

/** Returns the external hostname a URL points to, or null if it is local, inline or allowed. */
function externalHost(url) {
  const trimmed = url.trim();
  if (NAMESPACE_URIS.has(trimmed.toLowerCase().replace(/\/+$/, ''))) return null;
  const match = ABSOLUTE_URL.exec(trimmed);
  if (!match) return null; // relative, root-relative, data:, blob:, mailto:, #fragment ...
  let host = match[1].toLowerCase().replace(/^.*@/, '');
  host = host.startsWith('[') ? host.slice(0, host.indexOf(']') + 1) : host.replace(/:\d*$/, '');
  host = host.replace(/\.$/, '');
  if (!host || allowedHosts.has(host)) return null;
  return host;
}

/** Splits a srcset value into its URLs (URLs may contain commas, e.g. data: URLs). */
function srcsetUrls(value) {
  const urls = [];
  let i = 0;
  while (i < value.length) {
    while (i < value.length && /[\s,]/.test(value[i])) i++;
    let start = i;
    while (i < value.length && !/\s/.test(value[i])) i++;
    let url = value.slice(start, i);
    if (url.endsWith(',')) url = url.replace(/,+$/, '');
    else while (i < value.length && value[i] !== ',') i++; // skip descriptor, e.g. "640w"
    if (url) urls.push(url);
  }
  return urls;
}

// ---------------------------------------------------------------------------------------------
// Scanners. Each calls report(offset, context, url) for every candidate URL; report() decides.

const URL_LITERAL = String.raw`\s*(["'\x60])((?:(?:https?|wss?):)?\/\/[^"'\x60\s]*)`;
const JS_PATTERNS = [
  ['JS import()', String.raw`\bimport\s*\(`],
  ['JS fetch()', String.raw`\bfetch\s*\(`],
  ['JS new URL()', String.raw`\bnew\s+URL\s*\(`],
  ['JS new Worker()', String.raw`\bnew\s+(?:Shared)?Worker\s*\(`],
  ['JS importScripts()', String.raw`\bimportScripts\s*\(`],
  ['JS new WebSocket()', String.raw`\bnew\s+WebSocket\s*\(`],
  ['JS new EventSource()', String.raw`\bnew\s+EventSource\s*\(`],
  ['JS sendBeacon()', String.raw`\bsendBeacon\s*\(`],
  ['JS XMLHttpRequest.open()', String.raw`\.open\s*\(\s*["'][A-Za-z]+["']\s*,`],
  ['JS setAttribute("src")', String.raw`\.setAttribute\s*\(\s*["']src["']\s*,`],
  ['JS .src =', String.raw`\.src\s*=(?!=)`],
].map(([context, source]) => [context, new RegExp(source + URL_LITERAL, 'g')]);
const JS_STATIC_IMPORT =
  /\b(?:import|export)\s*(?:[\w$\s{},*]*?\bfrom\s*)?(["'])((?:(?:https?|wss?):)?\/\/[^"'\s]*)\1/g;

function scanJs(code, base, report) {
  for (const match of code.matchAll(JS_STATIC_IMPORT)) {
    report(base + match.index, 'JS import ... from', match[2]);
  }
  for (const [context, pattern] of JS_PATTERNS) {
    for (const match of code.matchAll(pattern)) report(base + match.index, context, match[2]);
  }
}

function scanCss(css, base, report, where = 'CSS') {
  const clean = css.replace(/\/\*[\s\S]*?\*\//g, blank);
  for (const match of clean.matchAll(/@import\s+(["'])([^"']*)\1/gi)) {
    report(base + match.index, `${where} @import`, match[2]);
  }
  for (const match of clean.matchAll(/\burl\(\s*(["']?)([^"')]*?)\1\s*\)/gi)) {
    const isImport = /@import\s*$/i.test(clean.slice(Math.max(0, match.index - 20), match.index));
    report(base + match.index, `${where} ${isImport ? '@import' : 'url()'}`, match[2]);
  }
  for (const match of clean.matchAll(/image-set\(((?:[^()]|\([^()]*\))*)\)/gi)) {
    const withoutUrls = match[1].replace(/\burl\([^)]*\)/gi, blank);
    for (const str of withoutUrls.matchAll(/(["'])([^"']*)\1/g)) {
      report(base + match.index, `${where} image-set()`, str[2]);
    }
  }
}

const RAW_TEXT =
  /<!--[\s\S]*?-->|(<(script|style|textarea|title)\b((?:[^>"']|"[^"]*"|'[^']*')*)(?<!\/)>)([\s\S]*?)<\/\2\s*>/gi;
const TAG = /<([a-zA-Z][\w:.-]*)((?:[^>"']|"[^"]*"|'[^']*')*)>/g;
const ATTRIBUTE = /([^\s"'>/=]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
const SVG_LOADING_HREF = new Set(['image', 'use', 'feimage', 'script']);
const JS_TYPES = /^(|module|(text|application)\/(x-)?(java|ecma)script)$/i;
const TAG_LABEL = { img: 'image', script: 'script', iframe: 'embedded frame', video: 'video', audio: 'audio', source: 'media source', track: 'media track', embed: 'plugin content', object: 'plugin content', input: 'image button', link: 'link' };

function parseAttributes(text, base) {
  const attrs = [];
  for (const match of text.matchAll(ATTRIBUTE)) {
    const value = match[2] ?? match[3] ?? match[4];
    attrs.push({ name: match[1].toLowerCase(), value: value == null ? null : decodeEntities(value), offset: base + match.index });
  }
  return attrs;
}

function scanMarkup(markup, report) {
  // 1. Blank out comments; pull out <script>/<style> bodies and scan them as JS/CSS.
  const masked = markup.replace(RAW_TEXT, (all, open, tag, attrText, body, offset) => {
    if (open === undefined) return blank(all); // comment
    const bodyStart = offset + open.length;
    const lower = tag.toLowerCase();
    if (lower === 'style') scanCss(body, bodyStart, report, '<style>');
    if (lower === 'script') {
      const type = (parseAttributes(attrText, 0).find((a) => a.name === 'type')?.value ?? '').trim();
      if (JS_TYPES.test(type)) scanJs(body, bodyStart, report);
      else if (type.toLowerCase() === 'importmap') {
        for (const m of body.matchAll(/(["'])((?:(?:https?|wss?):)?\/\/[^"'\s]*)\1/g)) {
          report(bodyStart + m.index, '<script type="importmap">', m[2]);
        }
      }
      // JSON-LD and other data blocks are not loaded by the browser: ignored.
    }
    return open + blank(body) + all.slice(open.length + body.length);
  });

  // 2. Check attributes of every remaining tag.
  for (const tagMatch of masked.matchAll(TAG)) {
    const tag = tagMatch[1].toLowerCase();
    const attrs = parseAttributes(tagMatch[2], tagMatch.index + 1 + tagMatch[1].length);
    const get = (name) => attrs.find((a) => a.name === name)?.value;
    const label = (attr) => `${TAG_LABEL[tag] ? `${TAG_LABEL[tag]} ` : ''}<${tag} ${attr}>`;

    for (const { name, value, offset } of attrs) {
      if (value == null || name.startsWith('data-') || name.startsWith('xmlns')) continue;
      switch (name) {
        case 'src':
          report(offset, tag === 'iframe' ? '<iframe src> (embeds must be click-to-load)' : label('src'), value);
          break;
        case 'srcset':
        case 'imagesrcset':
          for (const url of srcsetUrls(value)) report(offset, label(name), url);
          break;
        case 'poster':
        case 'background':
        case 'manifest':
          report(offset, label(name), value);
          break;
        case 'data':
          if (tag === 'object') report(offset, label('data'), value);
          break;
        case 'href':
        case 'xlink:href':
          if (tag === 'link') {
            const rel = (get('rel') ?? '').toLowerCase().split(/\s+/).filter(Boolean);
            const navigational = rel.includes('canonical') || (rel.includes('alternate') && !rel.includes('stylesheet'));
            if (!navigational) report(offset, `<link rel="${rel.join(' ')}">`, value);
          } else if (tag === 'base') {
            report(offset, '<base href> (makes relative URLs external)', value);
          } else if (SVG_LOADING_HREF.has(tag)) {
            report(offset, `SVG <${tag} ${name}>`, value);
          }
          break;
        case 'content':
          if (tag === 'meta' && (get('http-equiv') ?? '').toLowerCase() === 'refresh') {
            const target = value.replace(/^[^;,]*[;,]?\s*/, '').replace(/^url\s*=\s*/i, '').replace(/^["']|["']$/g, '');
            report(offset, '<meta http-equiv="refresh"> redirect', target);
          }
          break;
        case 'style':
          scanCss(value, offset, report, 'inline style');
          break;
        default:
          break;
      }
    }
  }
}

function scanManifest(text, report) {
  for (const match of text.matchAll(/"src"\s*:\s*"([^"]*)"/g)) {
    report(match.index, 'web app manifest "src"', match[1]);
  }
}

// ---------------------------------------------------------------------------------------------
// Run

const findings = [];
const seen = new Set();
let fileCount = 0;

for (const file of walk(SCAN_DIR)) {
  fileCount++;
  const text = readFileSync(file, 'utf8');
  const lineOf = lineIndexer(text);
  const shown = displayPath(file);
  const report = (offset, context, url) => {
    if (!url || !externalHost(url)) return;
    const line = lineOf(offset);
    const key = `${shown}:${line}\0${context}\0${url}`;
    if (seen.has(key)) return;
    seen.add(key);
    findings.push({ file: shown, line, where: `${shown}:${line}`, context, url, host: externalHost(url) });
  };

  const ext = extname(file).toLowerCase();
  if (ext === '.css') scanCss(text, 0, report);
  else if (ext === '.js' || ext === '.mjs') scanJs(text, 0, report);
  else if (ext === '.webmanifest') scanManifest(text, report);
  else scanMarkup(text, report);
}

const scanned = displayPath(SCAN_DIR) || '.';
const allowNote = allowedHosts.size ? `allowed hosts: ${[...allowedHosts].join(', ')}` : 'allowlist is empty';
console.log(`Checking ${fileCount} files in ${scanned}/ for requests to other servers on page load (${allowNote}).`);

if (findings.length === 0) {
  console.log('OK: no external requests found.');
  process.exit(0);
}

findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
const whereWidth = Math.min(60, Math.max(...findings.map((f) => f.where.length)));
const contextWidth = Math.min(50, Math.max(...findings.map((f) => f.context.length)));
console.log('');
for (const f of findings) {
  const url = f.url.length > 160 ? `${f.url.slice(0, 157)}...` : f.url;
  console.log(`${f.where.padEnd(whereWidth)}  ${f.context.padEnd(contextWidth)}  ${url}`);
}

const files = new Set(findings.map((f) => f.file)).size;
const hosts = [...new Set(findings.map((f) => f.host))].sort();
console.log(`
FAILED: ${findings.length} external request${findings.length === 1 ? '' : 's'} in ${files} file${files === 1 ? '' : 's'} (hosts: ${hosts.join(', ')}).

Each line above is something a visitor's browser would fetch from another server as soon as the
page opens. That leaks visitors' IP addresses and would require a consent banner. To fix:
  - Fonts, icons, scripts, styles, images: download them into the project and serve them from here.
  - YouTube, Vimeo, Sketchfab and other embeds: put the URL in a data-* attribute and load it only
    after the visitor clicks (click-to-load), or link to it with a plain <a href>.
  - Only if a host is truly needed and approved: add its exact hostname to privacy.allowlist.json.`);
process.exit(1);
