// Downloads the pinned third-party libraries that are inlined into every kit.
// Run once (`npm run fetch`); the files are committed so builds work offline.
import { createHash } from 'node:crypto';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src', 'vendor');

const LIBS = [
  { name: 'd3', version: '7.9.0', file: 'd3.min.js', path: 'dist/d3.min.js', license: 'ISC' },
  { name: '@observablehq/plot', version: '0.6.17', file: 'plot.umd.min.js', path: 'dist/plot.umd.min.js', license: 'ISC' },
  { name: 'd3-sankey', version: '0.12.3', file: 'd3-sankey.min.js', path: 'dist/d3-sankey.min.js', license: 'BSD-3-Clause' },
];

mkdirSync(out, { recursive: true });
const manifest = [];
for (const lib of LIBS) {
  const url = `https://cdn.jsdelivr.net/npm/${lib.name}@${lib.version}/${lib.path}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  const body = Buffer.from(await res.arrayBuffer());
  writeFileSync(join(out, lib.file), body);
  const sha256 = createHash('sha256').update(body).digest('hex');
  manifest.push({ name: lib.name, version: lib.version, file: lib.file, license: lib.license, bytes: body.length, sha256, source: url });
  console.log(`${lib.file.padEnd(22)} ${String(body.length).padStart(8)} bytes  ${lib.name}@${lib.version}`);
}
writeFileSync(join(out, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
