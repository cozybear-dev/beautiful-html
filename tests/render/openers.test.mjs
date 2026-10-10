// The front page is a choice: a cover, a byline, findings in words, a figure in
// the header. With a band, a statement, code and terms, they must be clean in
// every direction, scheme and medium, like the rest of the kit.
import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { audit, closeBrowser, skip, withPage, DESKTOP, PHONE } from '../helpers/browser.mjs';
import { assemble, fixture } from '../helpers/assemble.mjs';

after(closeBrowser);
const PRINT = { name: 'print', width: 794, height: 1123, media: 'print' };
const MODES = [DESKTOP, PHONE, PRINT, { ...DESKTOP, name: 'reduced-motion', reducedMotion: true }];
const page = (direction = 'analytical', scheme = 'light') => assemble(fixture('openers.content.html').replace('data-bh-direction="analytical" data-scheme="light"', `data-bh-direction="${direction}" data-scheme="${scheme}"`), direction);
const still = { ...DESKTOP, reducedMotion: true };

for (const direction of ['analytical', 'narrative', 'presentation']) for (const scheme of ['light', 'dark']) {
  test(`${direction} ${scheme}: the front-page parts have no findings on desktop, phone, in print or with reduced motion`, { skip }, async () => {
    const html = page(direction, scheme);
    for (const mode of MODES) {
      const { findings } = await audit(html, mode);
      assert.deepEqual(findings.map(f => `${f.level} ${f.code}: ${f.message}`), [], `${mode.name}`);
    }
  });
}

test('a cover is a band in the dark colours from the top of the page, edge to edge', { skip }, async () => {
  for (const direction of ['analytical', 'presentation']) {
    await withPage(page(direction), still, async p => {
      const r = await p.evaluate(`(() => { const c = document.querySelector('.bh-cover'), b = c.getBoundingClientRect(), cs = getComputedStyle(c);
        return { top: Math.round(b.top + scrollY), left: Math.round(b.left), width: Math.round(b.width), page: document.documentElement.clientWidth,
          bg: cs.backgroundColor, h1: getComputedStyle(c.querySelector('h1')).color, logo: getComputedStyle(c.querySelector('.bh-logo path')).fill,
          body: getComputedStyle(document.body).backgroundColor }; })()`);
      assert.deepEqual([r.top, r.left, r.width], [0, 0, r.page], direction);
      assert.equal(r.bg, 'rgb(8, 6, 48)', direction);
      assert.equal(r.body, 'rgb(255, 255, 255)', direction);
      assert.equal(r.h1, r.logo, 'the headline and the wordmark share the cover\'s ink');
      assert.notEqual(r.h1, 'rgb(8, 6, 48)');
    });
  }
});
test('a cover prints light, and on a dark page it is the page', { skip }, async () => {
  await withPage(page(), PRINT, async p => {
    assert.deepEqual(await p.evaluate(`[getComputedStyle(document.querySelector('.bh-cover')).backgroundColor, getComputedStyle(document.querySelector('.bh-cover h1')).color]`), ['rgb(255, 255, 255)', 'rgb(8, 6, 48)']);
  });
  await withPage(page('analytical', 'dark'), still, async p => {
    assert.equal(await p.evaluate(`getComputedStyle(document.querySelector('.bh-cover')).backgroundColor === getComputedStyle(document.body).backgroundColor`), true);
  });
});
test('a figure in a cover is drawn in the cover\'s colours', { skip }, async () => {
  await withPage(page(), still, async p => {
    const [line, halo, accent] = await p.evaluate(`(() => { const c = document.querySelector('.bh-cover'); const by = t => getComputedStyle([...c.querySelectorAll('#fig-cover svg path')].find(e => (e.getAttribute('stroke') || e.parentNode.getAttribute('stroke')) === 'var(--bh-' + t + ')')).stroke;
      return [by('cat-1'), by('ground'), getComputedStyle(c).getPropertyValue('--bh-accent').trim()]; })()`);
    assert.equal(accent, '#fcaf15');
    assert.equal(line, 'rgb(252, 175, 21)', 'the line is the dark scheme\'s accent');
    assert.equal(halo, 'rgb(8, 6, 48)', 'and its halo is the cover, not the page');
  });
});
test('the section after a cover has no rule; later sections keep theirs', { skip }, async () => {
  await withPage(page(), still, async p => {
    const widths = await p.evaluate(`[...document.querySelectorAll('.bh-section > h2')].map(h => getComputedStyle(h).borderTopWidth)`);
    assert.deepEqual(widths, ['0px', '0px'], 'the first follows the cover, the second is in a band');
  });
  await withPage(assemble(fixture('specimen.content.html')), still, async p => {
    assert.equal(await p.evaluate(`getComputedStyle(document.querySelector('.bh-section > h2')).borderTopWidth`), '1px');
  });
});
test('headings inside the header are set as what they are, not by their level', { skip }, async () => {
  await withPage(page(), still, async p => {
    const r = await p.evaluate(`(() => { const size = s => getComputedStyle(document.querySelector(s)).fontSize;
      const f = document.querySelector('.bh-header > .bh-figure').getBoundingClientRect(), m = document.querySelector('.bh-masthead').getBoundingClientRect();
      return { title: size('.bh-header .bh-figure-title'), inSection: size('.bh-section .bh-figure-title'), finding: size('.bh-header .bh-findings h2'), plain: size('.bh-section > h2'),
        figure: [Math.round(f.left), Math.round(f.width)], masthead: [Math.round(m.left), Math.round(m.width)] }; })()`);
    assert.equal(r.title, r.inSection);
    assert.equal(r.finding, r.inSection);
    assert.notEqual(r.finding, r.plain);
    assert.deepEqual(r.figure, r.masthead, 'a figure in the header is as wide as the masthead');
  });
});
test('an ordered list of findings is numbered; an unordered one is not', { skip }, async () => {
  await withPage(page(), still, async p => {
    const r = await p.evaluate(`['ol.bh-findings > li', 'ul.bh-findings > li'].map(s => getComputedStyle(document.querySelector(s), '::before').content)`);
    assert.match(r[0], /counter\(bh-finding\)|"1"/);
    assert.equal(r[1], 'none');
  });
});
test('in a band, ground and surface swap, so marks and labels sit on the band\'s colour', { skip }, async () => {
  for (const scheme of ['light', 'dark']) {
    await withPage(page('analytical', scheme), still, async p => {
      const r = await p.evaluate(`(() => { const root = getComputedStyle(document.documentElement), band = document.querySelector('.bh-band'), cs = getComputedStyle(band);
        const probe = document.createElement('i'); probe.style.color = 'var(--bh-ground)'; band.append(probe); const ground = getComputedStyle(probe).color; probe.remove();
        const zone = getComputedStyle(band.querySelector('.bh-zone rect')).fill;
        const page = document.createElement('i'); page.style.color = 'var(--bh-ground)'; document.body.append(page); const pageGround = getComputedStyle(page).color; page.remove();
        const b = band.getBoundingClientRect();
        return { bg: cs.backgroundColor, ground, zone, pageGround, surface: root.getPropertyValue('--bh-surface').trim(), left: Math.round(b.left), width: Math.round(b.width), page: document.documentElement.clientWidth }; })()`);
      assert.equal(r.bg, r.ground, `${scheme}: the band is its own ground`);
      assert.notEqual(r.bg, r.pageGround, `${scheme}: and not the page's`);
      assert.equal(r.zone, r.pageGround, `${scheme}: a zone in a band takes the page's colour`);
      assert.deepEqual([r.left, r.width], [0, r.page], `${scheme}: edge to edge`);
    });
  }
});
test('code scrolls on a screen and wraps on paper, so nothing is cut off', { skip }, async () => {
  const narrow = page().replace('# added for two suppliers in July', '# added for two suppliers in July, and never reviewed since: nobody owns the appliance or its accounts');
  await withPage(narrow, PRINT, async p => {
    const r = await p.evaluate(`(() => { const c = document.querySelector('.bh-code'); return [c.scrollWidth <= c.clientWidth + 1, getComputedStyle(c).whiteSpace]; })()`);
    assert.deepEqual(r, [true, 'pre-wrap']);
  });
});
