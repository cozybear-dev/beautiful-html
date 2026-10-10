import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { buildKit, logo } from '../../scripts/build-kit.mjs';
import { tempDir } from '../helpers/tmp.mjs';

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

test('the logo is one plain drawing with a viewBox, and anything else is refused', () => {
  assert.match(logo(), /^<svg\s[^>]*viewBox=/);
  assert.ok(!/<style|\sclass=/.test(logo()), 'its rules would apply to the whole report');
  const file = join(tempDir('bh-logo-'), 'logo.svg');
  for (const bad of ['<p>not a drawing</p>', '<svg width="10" height="10"><path d="M0 0h1"/></svg>',
    '<svg viewBox="0 0 1 1"><style>.a{fill:red}</style><path class="a" d="M0 0h1"/></svg>', '<svg viewBox="0 0 1 1"><path class="a" d="M0 0h1"/></svg>']) {
    writeFileSync(file, bad);
    assert.throws(() => logo(file), /logo\.svg/, bad);
  }
  assert.equal(logo(join(tmpdir(), 'bh-no-such-logo.svg')), '', 'a kit without a logo file carries none');
});
