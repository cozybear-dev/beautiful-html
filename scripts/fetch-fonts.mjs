// Downloads Latin-subset woff2 files and licence texts for the kit's fonts.
// Run once (`npm run fetch`); the files are committed so builds work offline.
// Every family here is under the SIL Open Font License, which permits embedding.
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const out = join(root, 'src', 'fonts');
const UA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36';

// dir: folder name here and in google/fonts (ofl/<dir>). query: Google Fonts css2 family spec.
export const FAMILIES = [
  { family: 'Source Sans 3', dir: 'sourcesans3', query: 'Source+Sans+3:ital,wght@0,200..900;1,200..900' },
  { family: 'STIX Two Text', dir: 'stixtwotext', query: 'STIX+Two+Text:ital,wght@0,400..700;1,400..700' },
  { family: 'Atkinson Hyperlegible Next', dir: 'atkinsonhyperlegiblenext', query: 'Atkinson+Hyperlegible+Next:ital,wght@0,200..800;1,200..800' },
];

async function get(url, headers = {}) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`${url} -> ${res.status}`);
  return res;
}

// Parse the css2 response into faces, keeping only the block labelled "latin".
function latinFaces(css) {
  const faces = [];
  const re = /\/\*\s*([\w-]+)\s*\*\/\s*@font-face\s*\{([^}]*)\}/g;
  for (const m of css.matchAll(re)) {
    if (m[1] !== 'latin') continue;
    const prop = name => (m[2].match(new RegExp(`${name}:\\s*([^;]+);`)) || [])[1]?.trim();
    faces.push({
      style: prop('font-style') || 'normal',
      weight: prop('font-weight') || '400',
      stretch: prop('font-stretch') || null,
      url: (m[2].match(/url\(([^)]+)\)/) || [])[1],
      unicodeRange: prop('unicode-range'),
    });
  }
  return faces;
}

const only = process.argv.slice(2);
for (const f of FAMILIES) {
  if (only.length && !only.includes(f.dir)) continue;
  const dir = join(out, f.dir);
  mkdirSync(dir, { recursive: true });
  const css = await (await get(`https://fonts.googleapis.com/css2?family=${f.query}&display=swap`, { 'User-Agent': UA })).text();
  const faces = latinFaces(css);
  if (!faces.length) throw new Error(`no latin faces for ${f.family}`);
  const meta = [];
  let total = 0;
  for (const face of faces) {
    const variable = face.weight.includes(' ');
    const base = face.style === 'italic' ? 'italic' : 'roman';
    const file = variable ? `${base}.woff2` : `${base}-${face.weight}.woff2`;
    const body = Buffer.from(await (await get(face.url)).arrayBuffer());
    writeFileSync(join(dir, file), body);
    total += body.length;
    meta.push({ file, style: face.style, weight: face.weight, stretch: face.stretch, unicodeRange: face.unicodeRange, bytes: body.length });
  }
  writeFileSync(join(dir, 'faces.json'), JSON.stringify({ family: f.family, license: 'OFL-1.1', faces: meta }, null, 2) + '\n');
  const ofl = await get(`https://raw.githubusercontent.com/google/fonts/main/ofl/${f.dir}/OFL.txt`);
  writeFileSync(join(dir, 'OFL.txt'), await ofl.text());
  console.log(`${f.family.padEnd(28)} ${String(total).padStart(7)} bytes in ${meta.length} file(s)`);
}
