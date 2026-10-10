// Reading steps: in a split section, blocks marked data-bh-step drive the
// section's diagram as they are read, and the diagram stays in view.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { audit, closeBrowser, skip, withPage, DESKTOP, PHONE } from '../helpers/browser.mjs';
import { assemble, fixture } from '../helpers/assemble.mjs';

after(closeBrowser);
const PRINT = { name: 'print', width: 794, height: 1123, media: 'print' };
const page = (direction = 'narrative', scheme = 'light') => assemble(fixture('steps.content.html').replace('data-bh-direction="narrative" data-scheme="light"', `data-bh-direction="${direction}" data-scheme="${scheme}"`), direction);
const still = { ...DESKTOP, reducedMotion: true };
// Bring a step block to the line where reading happens, then report what the page shows.
const readAt = n => `(async () => {
  const blocks = [...document.querySelectorAll('.bh-step')], fig = document.querySelector('.bh-split > .bh-figure');
  if (${n} === 0) scrollTo(0, 0); else scrollTo(0, blocks[${n} - 1].getBoundingClientRect().top + scrollY - innerHeight * 0.3);
  await new Promise(r => setTimeout(r, 250));
  const b = fig.getBoundingClientRect();
  return { count: document.querySelector('.bh-controls-count').textContent, current: blocks.map(x => x.classList.contains('is-current')), lit: [...document.querySelectorAll('.bh-node.is-step')].map(g => g.dataset.id),
    position: getComputedStyle(fig).position, inView: b.top >= 0 && b.bottom <= innerHeight + 1, top: Math.round(b.top), bottom: Math.round(b.bottom), controls: getComputedStyle(document.querySelector('[data-bh-play]')).display, pause: (b => (b ? getComputedStyle(b).display : 'absent'))(document.querySelector('[data-bh-pause]')),
    dots: [document.querySelectorAll('.bh-flow-dot').length, document.querySelectorAll('.bh-flow-dot.is-dim').length] }; })()`;

for (const [direction, scheme] of [['narrative', 'light'], ['analytical', 'dark'], ['presentation', 'dark']]) {
  test(`${direction} ${scheme}: reading steps have no findings on desktop, phone, in print or with reduced motion`, { skip }, async () => {
    for (const mode of [DESKTOP, PHONE, direction === 'presentation' ? { ...PRINT, width: 1123, height: 794 } : PRINT, { ...still, name: 'reduced-motion' }]) {
      const { findings } = await audit(page(direction, scheme), mode);
      assert.deepEqual(findings.map(f => `${f.level} ${f.code}: ${f.message}`), [], mode.name);
    }
  });
}
test('the diagram stays in view and follows the step being read', { skip }, async () => {
  for (const mode of [still, { ...still, name: 'laptop', width: 1366, height: 700 }]) {
    await withPage(page(), mode, async p => {
      const top = await p.evaluate(readAt(0));
      assert.equal(top.count, '0 / 5', `${mode.name}: the whole path before the first step`);
      assert.deepEqual(top.current, [false, false, false, false, false]);
      const second = await p.evaluate(readAt(2));
      assert.equal(second.position, 'sticky', mode.name);
      assert.equal(second.count, '2 / 5', mode.name);
      assert.deepEqual(second.current, [false, true, false, false, false], mode.name);
      assert.deepEqual(second.lit.sort(), ['box', 'ws'], mode.name);
      assert.equal(second.inView, true, `${mode.name}: the figure is cut off: ${second.top} to ${second.bottom} in a window of ${mode.height}`);
      assert.equal(second.controls, 'none', 'scrolling is the control');
      const seen = await p.evaluate(`(() => { const s = document.querySelector('.bh-flow-stage').getBoundingClientRect(); return ['box', 'ws'].every(id => { const b = document.querySelector('.bh-node[data-id="' + id + '"]').getBoundingClientRect(); return b.top >= s.top - 1 && b.bottom <= s.bottom + 1; }); })()`);
      assert.equal(seen, true, `${mode.name}: the nodes of the step being read are inside the frame`);
      const size = await p.evaluate(`parseFloat(getComputedStyle(document.querySelector('.bh-edge-label')).fontSize) * (document.querySelector('.bh-flow-svg').getBoundingClientRect().width / document.querySelector('.bh-flow-svg').viewBox.baseVal.width)`);
      assert.ok(size >= 11.5, `${mode.name}: labels are drawn at ${size.toFixed(1)}px`);
      const last = await p.evaluate(readAt(5));
      assert.equal(last.count, '5 / 5', mode.name);
      assert.equal(last.inView, true, mode.name);
      const back = await p.evaluate(readAt(0));
      assert.equal(back.count, '0 / 5', `${mode.name}: back at the top`);
    });
  }
});
test('on a phone and in a presentation the steps are plain text and the diagram keeps its controls', { skip }, async () => {
  for (const [html, mode] of [[page(), { ...PHONE, reducedMotion: true }], [page('presentation', 'dark'), still]]) {
    await withPage(html, mode, async p => {
      const r = await p.evaluate(readAt(3));
      assert.notEqual(r.position, 'sticky');
      assert.equal(r.count, '0 / 5');
      assert.deepEqual(r.current, [false, false, false, false, false]);
      assert.notEqual(r.controls, 'none');
    });
  }
});
test('a step block is as tall as its text when nothing is pinned, and on paper', { skip }, async () => {
  await withPage(page(), PRINT, async p => {
    const r = await p.evaluate(`[...document.querySelectorAll('.bh-step')].map(b => Math.round(b.getBoundingClientRect().height))`);
    assert.ok(r.every(h => h < 160), `step heights on paper: ${r.join(', ')}`);
  });
});
test('while a step is read, dots on the other edges are dimmed and the pause button stays', { skip }, async () => {
  await withPage(page(), DESKTOP, async p => {
    const r = await p.evaluate(readAt(2));
    assert.ok(r.dots[0] >= 5, `${r.dots[0]} dots`);
    assert.ok(r.dots[1] >= r.dots[0] - 3 && r.dots[1] < r.dots[0], `${r.dots[1]} of ${r.dots[0]} dots dimmed`);
    assert.equal(r.controls, 'none');
    assert.notEqual(r.pause, 'none', 'what loops keeps its pause button');
  });
});
