import test from 'node:test';
import assert from 'node:assert/strict';
import { inflateRawSync } from 'node:zlib';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { buildZip } from '../../scripts/package-zip.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const json = p => JSON.parse(readFileSync(root + p, 'utf8'));

// Read a zip's central directory: names, sizes, and the stored bytes of each entry.
function readZip(buf) {
  const eocd = buf.lastIndexOf(Buffer.from([0x50, 0x4b, 0x05, 0x06]));
  assert.ok(eocd >= 0, 'no end-of-central-directory record');
  const count = buf.readUInt16LE(eocd + 10);
  let at = buf.readUInt32LE(eocd + 16);
  const entries = [];
  for (let i = 0; i < count; i++) {
    assert.equal(buf.readUInt32LE(at), 0x02014b50);
    const method = buf.readUInt16LE(at + 10), csize = buf.readUInt32LE(at + 20), size = buf.readUInt32LE(at + 24);
    const nameLen = buf.readUInt16LE(at + 28), extraLen = buf.readUInt16LE(at + 30), commentLen = buf.readUInt16LE(at + 32), local = buf.readUInt32LE(at + 42);
    const name = buf.subarray(at + 46, at + 46 + nameLen).toString('utf8');
    const dataAt = local + 30 + buf.readUInt16LE(local + 26) + buf.readUInt16LE(local + 28);
    const raw = buf.subarray(dataAt, dataAt + csize);
    entries.push({ name, size, data: () => (method === 8 ? inflateRawSync(raw) : raw) });
    at += 46 + nameLen + extraLen + commentLen;
  }
  return entries;
}

test('the plugin and marketplace manifests name the plugin', () => {
  const plugin = json('.claude-plugin/plugin.json'), market = json('.claude-plugin/marketplace.json'), pkg = json('package.json');
  assert.equal(plugin.name, 'beautiful-html');
  assert.equal(plugin.version, pkg.version);
  assert.ok(plugin.description.length > 20);
  assert.equal(market.plugins.length, 1);
  assert.equal(market.plugins[0].name, 'beautiful-html');
  assert.equal(market.plugins[0].source, './');
  assert.ok(market.name && market.owner && market.owner.name);
});
test('the zip holds the skill, and only the skill, under one folder', () => {
  const entries = readZip(buildZip());
  const names = entries.map(e => e.name);
  assert.ok(names.every(n => n.startsWith('beautiful-html/')), names.filter(n => !n.startsWith('beautiful-html/')).join(', '));
  for (const needed of ['SKILL.md', 'kit/analytical.kit.html', 'kit/narrative.kit.html', 'kit/presentation.kit.html', 'kit/content-template.html', 'tools/check.mjs', 'tools/audit.js', 'tools/rekit.mjs', 'tools/brand.mjs', 'tools/palette.mjs', 'references/charts.md', 'brand/DESIGN.md', 'examples/incident-review/content.html', 'examples/research-note/content.html', 'licenses/README.md'])
    assert.ok(names.includes(`beautiful-html/${needed}`), `${needed} is not in the zip`);
  assert.ok(!names.some(n => /(^|\/)(src|tests|evals|node_modules|\.git)\//.test(n.replace(/^beautiful-html\//, ''))));
  assert.ok(!names.some(n => n.endsWith('/')), 'no directory entries');
  const skill = entries.find(e => e.name === 'beautiful-html/SKILL.md');
  assert.equal(skill.data().toString('utf8'), readFileSync(root + 'skills/beautiful-html/SKILL.md', 'utf8'));
  const kit = entries.find(e => e.name === 'beautiful-html/kit/narrative.kit.html');
  assert.equal(kit.data().length, kit.size);
});
