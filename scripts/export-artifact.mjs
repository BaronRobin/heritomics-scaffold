// Copies dist/ to artifact-export/ with every internal URL made relative, so the site works when it is
// served from any sub-folder (e.g. a shared claude.ai link) instead of a domain root.
// Folder links like /de/erlebnisse/ become .../de/erlebnisse/index.html, because plain file hosting
// has no directory index. Run `npm run build` first.
import { cpSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, relative, posix } from 'node:path';
import { NodeIO } from '@gltf-transform/core';

const SRC = 'dist';
const OUT = 'artifact-export';
rmSync(OUT, { recursive: true, force: true });
cpSync(SRC, OUT, { recursive: true });

const files = (dir) => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : [p];
});

// Some hosts (e.g. claude.ai links) don't serve .glb. Convert each one to the same model as glTF JSON
// with its data embedded (*.gltf.json); three.js reads both. References are rewritten below.
const io = new NodeIO();
const converted = [];
for (const file of files(OUT).filter((f) => f.endsWith('.glb'))) {
  const { json, resources } = await io.writeJSON(await io.read(file));
  for (const buffer of json.buffers ?? []) {
    buffer.uri = `data:application/octet-stream;base64,${Buffer.from(resources[buffer.uri]).toString('base64')}`;
  }
  writeFileSync(file.replace(/\.glb$/, '.gltf.json'), JSON.stringify(json));
  rmSync(file);
  converted.push(posix.basename(file));
}

/** Rewrite one root-absolute URL ("/de/", "/assets/x.js?y") relative to the file at `from`. */
function rel(url, from) {
  const [pathPart, rest = ''] = url.split(/(?=[?#])/);
  let target = pathPart.replace(/^\//, '');
  if (target === '' || target.endsWith('/')) target += 'index.html';
  const fromDir = dirname(relative(OUT, from)).split('\\').join('/');
  const r = posix.relative(fromDir === '.' ? '' : fromDir, target);
  return (r.startsWith('.') ? r : `./${r}`) + rest;
}

let changed = 0;
for (const file of files(OUT)) {
  const isHtml = file.endsWith('.html');
  const isCss = file.endsWith('.css');
  if (!isHtml && !isCss) continue;
  let text = readFileSync(file, 'utf8');
  const before = text;
  if (isHtml) {
    // Attributes that hold one URL
    text = text.replace(/\b(href|src|poster|action|data)="(\/(?!\/)[^"]*)"/g, (_, attr, url) => `${attr}="${rel(url, file)}"`);
    // srcset: comma-separated "url width" pairs
    text = text.replace(/\bsrcset="([^"]*)"/g, (_, set) => `srcset="${set.split(',').map((part) => {
      const [url, ...d] = part.trim().split(/\s+/);
      return [url.startsWith('/') && !url.startsWith('//') ? rel(url, file) : url, ...d].join(' ');
    }).join(', ')}"`);
    // meta refresh (the "/" → "/de/" redirect)
    text = text.replace(/content="(\d+;\s*url=)(\/(?!\/)[^"]*)"/gi, (_, pre, url) => `content="${pre}${rel(url, file)}"`);
    // JSON configs for the Stage: string values that are root-absolute paths
    text = text.replace(/(<script[^>]*type="application\/json"[^>]*>)([\s\S]*?)(<\/script>)/g,
      (_, open, json, close) => open + json.replace(/"(\/(?!\/)[^"]*)"/g, (__, url) => `"${rel(url, file)}"`) + close);
    for (const name of converted) text = text.split(name).join(name.replace(/\.glb$/, '.gltf.json'));
  } else {
    text = text.replace(/url\((["']?)(\/(?!\/)[^)"']*)\1\)/g, (_, q, url) => `url(${q}${rel(url, file)}${q})`);
  }
  if (text !== before) { writeFileSync(file, text); changed++; }
}

// The root page redirects to German; also via script, in case meta refresh is ignored where it is embedded.
writeFileSync(join(OUT, 'index.html'), `<!doctype html><meta charset="utf-8"><title>Creative Science</title>
<meta http-equiv="refresh" content="0;url=de/index.html">
<script>location.replace('de/index.html')</script>
<a href="de/index.html">Creative Science (Deutsch)</a> · <a href="en/index.html">Creative Science (English)</a>
`);

console.log(`Exported ${files(OUT).length} files to ${OUT}/ (${changed} rewritten).`);
