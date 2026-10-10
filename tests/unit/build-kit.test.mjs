import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildKit } from '../../scripts/build-kit.mjs';

test('analytical kit builds within budget and is self-contained', async () => {
  const { path, bytes } = await buildKit('analytical');
  const kit = readFileSync(path, 'utf8');
  assert.ok(bytes < 1_100_000, `kit is ${bytes} bytes`);
  assert.equal(kit.split('\n')[0], '');
  assert.match(kit.split('\n')[1], /^<!-- BH-KIT v\d+\.\d+\.\d+ analytical:/);
  assert.match(kit, /<style id="bh-kit-css">/);
  assert.match(kit, /<script id="bh-kit-js">/);
  assert.ok(kit.trimEnd().endsWith('</html>'));
  assert.ok(kit.split('\n').length <= 40, 'kit must sit on few long lines');
  const urls = kit.match(/(?:src|href)=["']https?:|url\(\s*["']?https?:|@import/g) || [];
  assert.deepEqual(urls, []);
});
