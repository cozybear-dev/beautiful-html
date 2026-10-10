// Packs the skill as dist/beautiful-html.zip, for upload to claude.ai
// (Organization settings > Plugins & skills > Add > Upload a skill).
// The zip holds one folder, beautiful-html/, with SKILL.md inside it.
// No dependencies: a minimal zip writer on top of node:zlib.
import { deflateRawSync } from 'node:zlib';
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = join(root, 'skills', 'beautiful-html');

const TABLE = Array.from({ length: 256 }, (_, n) => { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; return c >>> 0; });
const crc32 = buf => { let c = 0xffffffff; for (const b of buf) c = TABLE[(c ^ b) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
const walk = (dir, base = '') => readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name)).flatMap(e =>
  (e.isDirectory() ? walk(join(dir, e.name), `${base}${e.name}/`) : e.name === '.DS_Store' ? [] : [`${base}${e.name}`]));

export function buildZip() {
  const locals = [], central = [];
  let offset = 0;
  for (const rel of walk(skill)) {
    const data = readFileSync(join(skill, rel));
    const packed = deflateRawSync(data, { level: 9 });
    const name = Buffer.from(`beautiful-html/${rel}`, 'utf8');
    const head = Buffer.alloc(30);
    head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(0x0800, 6); head.writeUInt16LE(8, 8);
    head.writeUInt16LE(0, 10); head.writeUInt16LE(0x0021, 12);                 // a fixed date, so the zip is reproducible
    head.writeUInt32LE(crc32(data), 14); head.writeUInt32LE(packed.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(name.length, 26);
    const entry = Buffer.alloc(46);
    entry.writeUInt32LE(0x02014b50, 0); entry.writeUInt16LE(20, 4); entry.writeUInt16LE(20, 6); entry.writeUInt16LE(0x0800, 8); entry.writeUInt16LE(8, 10);
    entry.writeUInt16LE(0, 12); entry.writeUInt16LE(0x0021, 14);
    entry.writeUInt32LE(crc32(data), 16); entry.writeUInt32LE(packed.length, 20); entry.writeUInt32LE(data.length, 24); entry.writeUInt16LE(name.length, 28);
    entry.writeUInt32LE(offset, 42);
    locals.push(head, name, packed);
    central.push(entry, name);
    offset += 30 + name.length + packed.length;
  }
  const dir = Buffer.concat(central);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(dir.length, 12); end.writeUInt32LE(offset, 16);
  return Buffer.concat([...locals, dir, end]);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const zip = buildZip();
  mkdirSync(join(root, 'dist'), { recursive: true });
  writeFileSync(join(root, 'dist', 'beautiful-html.zip'), zip);
  console.log(`dist/beautiful-html.zip  ${(zip.length / 1024).toFixed(0)} KB`);
}
