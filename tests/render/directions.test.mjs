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

test('a dark report prints with the light colours, margins included', { skip }, async () => {
  await withPage(specimen('presentation', 'dark'), { name: 'print', width: 794, height: 1123, media: 'print' }, async p => {
    const [bg, scheme] = await p.evaluate(`[getComputedStyle(document.body).backgroundColor, getComputedStyle(document.documentElement).colorScheme]`);
    assert.equal(bg, 'rgb(255, 255, 255)');
    assert.equal(scheme, 'light', 'a dark colour scheme on paper paints the page margins dark');
  });
});
// Browsers break a grid across pages badly, so paper is laid out as blocks.
test('on paper the page grid is set aside: header and sections are plain blocks', { skip }, async () => {
  for (const direction of ['analytical', 'narrative']) {
    await withPage(specimen(direction, 'light'), { name: 'print', width: 794, height: 1123, media: 'print' }, async p => {
      const shown = await p.evaluate(`['main.bh-report', '.bh-report > .bh-header', '.bh-report > .bh-section', '.bh-report > .bh-footer'].map(s => { const e = document.querySelector(s); return e ? getComputedStyle(e).display : 'block'; })`);
      assert.deepEqual(shown, ['block', 'block', 'block', 'block'], direction);
    });
  }
});
test('presentation shows where you are and moves with the arrow keys', { skip }, async () => {
  await withPage(specimen('presentation', 'dark'), { ...DESKTOP, reducedMotion: true }, async p => {
    assert.equal(await p.evaluate(`document.querySelector('.bh-progress').textContent`), '1 / 3');
    const y = await p.evaluate(`(async () => { document.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true })); await new Promise(r => setTimeout(r, 250)); return [scrollY > 300, document.querySelector('.bh-progress').textContent]; })()`);
    assert.deepEqual(y, [true, '2 / 3']);
    assert.equal(await p.evaluate(`!!document.querySelector('.bh-nav')`), false);
  });
});
test('the navigator marks the section being read, and none above the first', { skip }, async () => {
  const more = ['Third', 'Fourth'].map(n => `<section class="bh-section" data-nav="${n}"><h2>One more section, so the navigator appears</h2><p>Text.</p></section>`).join('\n');
  const four = fixture('specimen.content.html').replace('</main>', `${more}\n</main>`);
  await withPage(assemble(four), { ...DESKTOP, reducedMotion: true }, async p => {
    const current = `(async () => { await new Promise(r => setTimeout(r, 200)); return [...document.querySelectorAll('.bh-nav a[aria-current]')].map(a => a.textContent); })()`;
    assert.equal(await p.evaluate(`document.querySelectorAll('.bh-nav a').length`), 4);
    assert.deepEqual(await p.evaluate(current), [], 'at the top, in the header');
    await p.evaluate(`document.querySelectorAll('.bh-section')[1].scrollIntoView()`);
    assert.equal((await p.evaluate(current)).length, 1);
    await p.evaluate(`scrollTo(0, document.documentElement.scrollHeight)`);
    assert.deepEqual(await p.evaluate(current), ['Fourth']);
    await p.evaluate(`scrollTo(0, 0)`);
    assert.deepEqual(await p.evaluate(current), [], 'back at the top');
  });
});
test('narrative numbers its figures', { skip }, async () => {
  await withPage(specimen('narrative', 'light'), DESKTOP, async p => {
    const labels = await p.evaluate(`[...document.querySelectorAll('.bh-figure-title')].map(t => getComputedStyle(t, '::before').content)`);
    assert.equal(labels.length, 2);
    assert.match(labels[0], /Figure/);
  });
});
test('the masthead shows the logo, labelled with the name, in the ink of the scheme', { skip }, async () => {
  for (const scheme of ['light', 'dark']) {
    await withPage(specimen('analytical', scheme), DESKTOP, async p => {
      const [label, text, height, wordmark, ink] = await p.evaluate(`(() => { const s = document.querySelector('.bh-logo > svg'); return [s.getAttribute('aria-label'), s.parentNode.textContent.trim(), Math.round(s.getBoundingClientRect().height), getComputedStyle(s.querySelector('path')).fill, getComputedStyle(document.body).color]; })()`);
      assert.equal(label, 'Hunt & Hackett');
      assert.equal(text, '', 'the name is replaced by the logo, not shown beside it');
      assert.equal(height, 48);
      assert.equal(wordmark, ink, `${scheme}: the wordmark follows the scheme`);
    });
  }
});
