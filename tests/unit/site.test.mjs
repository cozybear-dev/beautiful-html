// The example site: every example as a report, and a gallery that links to them.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildSite } from '../../scripts/build-site.mjs';
import { examples } from '../../scripts/build-examples.mjs';
import { GALLERY } from '../../site/examples.mjs';
import { staticCheck } from '../../skills/beautiful-html/tools/check.mjs';

const root = fileURLToPath(new URL('../../', import.meta.url));
const out = mkdtempSync(join(tmpdir(), 'bh-site-'));
const built = await buildSite({ out, render: false });
const index = readFileSync(join(out, 'index.html'), 'utf8');

test('the gallery lists every example once, and nothing else', () => {
  assert.deepEqual([...GALLERY.map(g => g.name)].sort(), examples().map(e => e.name).sort());
  assert.deepEqual(built.examples, GALLERY.map(g => g.name));
  for (const g of GALLERY) assert.equal(index.split(`<a class="ex-shot" href="${g.name}/"`).length - 1, 1, `${g.name} has one card`);
  for (const g of GALLERY) for (const field of ['kind', 'reader', 'look', 'ask']) assert.ok(g[field] && g[field].length > 10, `${g.name} has no ${field}`);
});
test('every example is published as the report an agent would hand over, with its source beside it', () => {
  for (const e of examples()) {
    const content = readFileSync(e.path, 'utf8');
    const kit = readFileSync(join(root, 'skills', 'beautiful-html', 'kit', `${e.direction}.kit.html`), 'utf8');
    assert.equal(readFileSync(join(out, e.name, 'index.html'), 'utf8'), content + kit, e.name);
    assert.equal(readFileSync(join(out, e.name, 'content.txt'), 'utf8'), content, e.name);
  }
});
test('every link and picture in the gallery leads to a file in the site, and nothing loads from elsewhere', () => {
  const page = index.slice(0, index.search(/^<!-- BH-KIT\b/m));
  const refs = [...page.matchAll(/\s(?:href|src)="([^"]+)"/g)].map(m => m[1]);
  assert.ok(refs.length > 40, `${refs.length} links`);
  for (const ref of refs) {
    assert.ok(!/^[a-z]+:|^\/\//i.test(ref), `${ref} leaves the site`);
    const path = ref.split('#')[0];
    const file = path.endsWith('/') ? join(out, path, 'index.html') : join(out, path);
    assert.ok(existsSync(file), `${ref} leads nowhere`);
  }
  // A link to a figure names an element that is in that example.
  for (const [, name, id] of page.matchAll(/href="([\w-]+)\/#([\w-]+)"/g)) assert.match(readFileSync(join(out, name, 'index.html'), 'utf8'), new RegExp(`id="${id}"`), `${name}/#${id}`);
});
test('the gallery is itself a report made with the kit: no placeholder left, no static finding', () => {
  assert.ok(!/\{\{[A-Z]+\}\}/.test(index));
  assert.match(index, /^<!-- BH-KIT v[\d.]+ analytical/m);
  assert.deepEqual(staticCheck(index).filter(f => f.level === 'error').map(f => `${f.code}: ${f.message}`), []);
  assert.ok(existsSync(join(out, '.nojekyll')));
});
test('the Pages workflow builds the site with the script and publishes only when asked to', () => {
  const yml = readFileSync(join(root, '.github', 'workflows', 'pages.yml'), 'utf8');
  assert.match(yml, /node scripts\/build-site\.mjs/);
  assert.match(yml, /path: dist\/site/);
  assert.match(yml, /if: vars\.PUBLISH_PAGES == 'true'/);
});
