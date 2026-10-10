import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { audit, closeBrowser, skip, withPage, DESKTOP } from '../helpers/browser.mjs';
import { assemble, fig, shell } from '../helpers/assemble.mjs';
import { graphs } from '../fixtures/graphs.mjs';

after(closeBrowser);
const LINE = `BH.line('#f', { data: [1,2,3,4,5,6].map(i => ({ m: new Date(Date.UTC(2026, i, 1)), v: i * i })), x: 'm', y: 'v' });`;
const FLOW = `window.__flow = BH.flow('#f', { ...${JSON.stringify(graphs.fanOutFanIn)}, flow: true });`;
const KEYS = '<div class="bh-keyfigures"><div class="bh-keyfigure"><p class="bh-keyfigure-label">Users</p><p class="bh-keyfigure-value">1,536<small>people</small></p></div></div>';
const page = (script, body = fig('f'), attrs) => assemble(shell(body, script, attrs ? { attrs } : undefined));
const codes = r => r.findings.map(f => f.code);
const running = `document.getAnimations().filter(a => a.playState === 'running').length`;
const frames = n => `new Promise(r => { let i = 0; const f = () => (++i >= ${n} ? r(true) : requestAnimationFrame(f)); requestAnimationFrame(f); })`;

test('a figure drawn in view animates once, and BH.settle() finishes it', { skip }, async () => {
  await withPage(page(''), DESKTOP, async p => {
    await p.evaluate(`(async () => { ${LINE} await ${frames(3)}; })()`);
    assert.ok(await p.evaluate(running) > 0, 'nothing is animating just after the figure was drawn');
    await p.evaluate(`BH.settle()`);
    assert.equal(await p.evaluate(running), 0);
    const before = await p.evaluate(`document.querySelector('#f svg').outerHTML.length`);
    await p.evaluate(`(async () => { window.dispatchEvent(new Event('resize')); document.querySelector('#f').style.maxWidth = '500px'; await new Promise(r => setTimeout(r, 400)); })()`);
    assert.equal(await p.evaluate(running), 0, 'a re-render must not replay the entrance');
    assert.notEqual(await p.evaluate(`document.querySelector('#f svg').outerHTML.length`), before, 'the figure did re-render');
  });
});

test('a figure below the fold waits in its starting state and plays when scrolled to', { skip }, async () => {
  const tall = '<div style="height:2400px"></div>' + fig('f');
  await withPage(assemble(shell(tall, '')), { ...DESKTOP, prepare: false }, async p => {
    await p.evaluate(`(async () => { scrollTo(0, 0); await ${frames(2)}; ${LINE} await ${frames(3)}; })()`);
    const waiting = await p.evaluate(`document.querySelector('#f').getAnimations({ subtree: true }).filter(a => a.playState === 'paused').length`);
    assert.ok(waiting > 0, 'the figure is not waiting for its entrance');
    await p.evaluate(`(async () => { document.querySelector('#f').scrollIntoView(); await ${frames(4)}; })()`);
    assert.ok(await p.evaluate(running) > 0, 'the entrance did not start on scroll');
  });
});

test('with reduced motion nothing animates and nothing is hidden', { skip }, async () => {
  const html = page(`${LINE}`, KEYS + fig('f'));
  const r = await audit(html, { ...DESKTOP, name: 'reduced-motion', reducedMotion: true });
  assert.ok(!codes(r).includes('motion-under-reduced') && !codes(r).includes('hidden-content'), codes(r).join(', '));
  await withPage(html, { ...DESKTOP, reducedMotion: true }, async p => {
    assert.equal(await p.evaluate(`document.getAnimations().length`), 0);
    assert.equal(await p.evaluate(`BH.motion.enabled()`), false);
  });
});

test('data-bh-motion="off" and print both give a static report', { skip }, async () => {
  await withPage(page(LINE, fig('f'), 'lang="en" data-scheme="light" data-bh-motion="off"'), DESKTOP, async p => assert.equal(await p.evaluate(`document.getAnimations().length`), 0));
  await withPage(page(LINE), { ...DESKTOP, media: 'print' }, async p => assert.equal(await p.evaluate(`document.getAnimations().length`), 0));
});

test('without the kit script every part of the page is still visible', { skip }, async () => {
  const html = page(LINE, KEYS + fig('f') + '<p>Closing paragraph.</p>').replace(/<script id="bh-kit-js">[\s\S]*?<\/script>/, '');
  const r = await audit(html);
  assert.ok(!codes(r).includes('hidden-content'), codes(r).join(', '));
  await withPage(html, DESKTOP, async p => assert.equal(await p.evaluate(`getComputedStyle(document.documentElement).visibility`), 'visible'));
});

test('key figures count up to exactly the number that was written', { skip }, async () => {
  await withPage(page('', KEYS), DESKTOP, async p => {
    await p.evaluate(`BH.settle()`);
    assert.equal(await p.evaluate(`document.querySelector('.bh-keyfigure-value').textContent`), '1,536people');
  });
  await withPage(assemble(shell('<div style="height:2400px"></div>' + KEYS, '')), { ...DESKTOP, prepare: false }, async p => {
    await p.evaluate(`(async () => { document.querySelector('.bh-keyfigures').scrollIntoView(); await new Promise(r => setTimeout(r, 180)); })()`);
    const mid = await p.evaluate(`document.querySelector('.bh-keyfigure-value').firstChild.textContent`);
    assert.match(mid, /^[\d,]+$/);
    assert.notEqual(mid, '1,536', 'the number should be part-way when the figure has just entered');
  });
});

test('flow dots move, have a pause control, and stop when paused', { skip }, async () => {
  const html = page(FLOW);
  const r = await audit(html);
  assert.ok(!codes(r).includes('loop-without-pause'), codes(r).join(', '));
  assert.ok(!codes(await audit(html, { ...DESKTOP, name: 'reduced-motion', reducedMotion: true })).includes('motion-under-reduced'));
  await withPage(html, { ...DESKTOP, prepare: false }, async p => {
    const pos = `[...document.querySelectorAll('#f .bh-flow-dot')].map(c => c.getAttribute('cx') + ',' + c.getAttribute('cy')).join(' ')`;
    await p.evaluate(`(async () => { scrollTo(0, 0); await ${frames(8)}; })()`);
    assert.equal(await p.evaluate(`document.querySelector('#f').dataset.bhLoop`), 'running');
    const a = await p.evaluate(pos);
    await p.evaluate(frames(10));
    const b = await p.evaluate(pos);
    assert.ok(a && a !== b, 'the dots are not moving');
    const label = await p.evaluate(`(() => { const btn = document.querySelector('#f').closest('figure').querySelector('[data-bh-pause]'); btn.click(); return btn.textContent; })()`);
    assert.match(label, /play|resume/i);
    assert.equal(await p.evaluate(`document.querySelector('#f').dataset.bhLoop`), 'paused');
    const c = await p.evaluate(pos);
    await p.evaluate(frames(10));
    assert.equal(await p.evaluate(pos), c, 'the dots kept moving after Pause');
  });
});

test('the audit passes a report that uses every kind of motion', { skip }, async () => {
  const html = assemble(shell(KEYS + fig('a') + fig('b', 'A flow') + fig('c', 'Bars'), `${LINE.replace('#f', '#a')} BH.flow('#b', { ...${JSON.stringify(graphs.threeTier)}, flow: true, steps: [{ title: 'One', nodes: ['cdn'] }] });
    BH.bar('#c', { data: [{ k: 'A', v: 3 }, { k: 'B', v: 5 }], x: 'k', y: 'v' });`));
  for (const mode of [DESKTOP, { ...DESKTOP, name: 'reduced-motion', reducedMotion: true }, { name: 'print', width: 794, height: 1123, media: 'print' }]) {
    const errors = (await audit(html, mode)).findings.filter(f => f.level === 'error');
    assert.deepEqual(errors.map(f => `${f.code}: ${f.message}`), [], mode.name);
  }
});
