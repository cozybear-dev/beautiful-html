// The specimen report must be clean in every direction, scheme and medium.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { audit, closeBrowser, skip, withPage, DESKTOP, PHONE } from '../helpers/browser.mjs';
import { assemble, fixture } from '../helpers/assemble.mjs';

after(closeBrowser);
const specimen = (direction, scheme) => assemble(fixture('specimen.content.html').replace('data-bh-direction="analytical" data-scheme="light"', `data-bh-direction="${direction}" data-scheme="${scheme}"`), direction);
const MODES = [DESKTOP, PHONE, { name: 'print', width: 794, height: 1123, media: 'print' }, { ...DESKTOP, name: 'reduced-motion', reducedMotion: true }];

for (const direction of ['analytical', 'narrative', 'presentation']) for (const scheme of ['light', 'dark']) {
  test(`${direction} ${scheme}: the specimen has no findings on desktop, phone, in print or with reduced motion`, { skip }, async () => {
    const html = specimen(direction, scheme);
    for (const mode of MODES) {
      const { findings } = await audit(html, mode);
      assert.deepEqual(findings.map(f => `${f.level} ${f.code}: ${f.message}`), [], `${mode.name}`);
    }
  });
}

test('a dark report prints with the light colours', { skip }, async () => {
  await withPage(specimen('presentation', 'dark'), { name: 'print', width: 794, height: 1123, media: 'print' }, async p => {
    const bg = await p.evaluate(`getComputedStyle(document.body).backgroundColor`);
    assert.equal(bg, 'rgb(255, 255, 255)');
  });
});
test('presentation shows where you are and moves with the arrow keys', { skip }, async () => {
  await withPage(specimen('presentation', 'dark'), { ...DESKTOP, reducedMotion: true }, async p => {
    assert.equal(await p.evaluate(`document.querySelector('.bh-progress').textContent`), '1 / 3');
    const y = await p.evaluate(`(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await new Promise(r => setTimeout(r, 250)); return [scrollY > 300, document.querySelector('.bh-progress').textContent]; })()`);
    assert.deepEqual(y, [true, '2 / 3']);
    assert.equal(await p.evaluate(`!!document.querySelector('.bh-nav')`), false);
  });
});
test('narrative numbers its figures', { skip }, async () => {
  await withPage(specimen('narrative', 'light'), DESKTOP, async p => {
    const labels = await p.evaluate(`[...document.querySelectorAll('.bh-figure-title')].map(t => getComputedStyle(t, '::before').content)`);
    assert.equal(labels.length, 2);
    assert.match(labels[0], /Figure/);
  });
});
