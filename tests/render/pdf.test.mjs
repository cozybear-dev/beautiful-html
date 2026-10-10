// A report printed to PDF is read page by page, so it is checked page by page:
// no text drawn over other text, nothing running off the paper. The screen
// checks cannot see this; a figure pushed to the next page once landed on top
// of the section after it, in a layout that looked right in every other view.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReport, findBrowser } from '../../skills/beautiful-html/tools/check.mjs';
import { examples } from '../../scripts/build-examples.mjs';
import { assemble, fixture } from '../helpers/assemble.mjs';
import { pdfAvailable, pdfPages, textOffPage, textOverlaps } from '../helpers/pdf.mjs';
import { tempDir } from '../helpers/tmp.mjs';

const skip = !findBrowser() ? 'no Chromium-based browser found' : !(await pdfAvailable()) ? 'pdfjs-dist is not installed (npm install)' : false;
const skill = fileURLToPath(new URL('../../skills/beautiful-html/', import.meta.url));
const work = tempDir('bh-pdf-');

async function printed(html, name) {
  const file = join(work, `${name}.html`);
  writeFileSync(file, html);
  const report = await checkReport(file, { pdf: true, out: join(work, `${name}.check`) });
  assert.ok(report.pdf, 'no PDF was made');
  return pdfPages(readFileSync(report.pdf));
}
const faults = pages => pages.flatMap((p, n) => [
  ...textOverlaps(p).map(([a, b]) => `page ${n + 1}: "${a.slice(0, 28)}" is drawn over "${b.slice(0, 28)}"`),
  ...textOffPage(p).map(t => `page ${n + 1}: "${t.slice(0, 28)}" runs off the paper`),
]);

test('the detector tells text on top of text from text that only touches', () => {
  const page = items => ({ width: 595, height: 842, items });
  const run = (text, x, y, w = 100, h = 10) => ({ text, x, y, w, h });
  assert.equal(textOverlaps(page([run('one', 40, 100), run('two', 60, 104)])).length, 1, 'two lines on top of each other');
  assert.equal(textOverlaps(page([run('left part', 40, 100), run('right part', 139, 100)])).length, 0, 'two runs of one line, end to end');
  assert.equal(textOverlaps(page([run('same', 40, 100), run('same', 40, 100)])).length, 0, 'one run drawn twice');
  assert.equal(textOverlaps(page([run('above', 40, 100), run('below', 40, 112)])).length, 0, 'consecutive lines');
  assert.deepEqual(textOffPage(page([run('inside', 40, 100), run('too far right', 540, 100)])), ['too far right']);
});

for (const e of examples()) {
  test(`${e.name}: its PDF has no text on top of other text and nothing off the paper`, { skip }, async () => {
    const pages = await printed(readFileSync(e.path, 'utf8') + readFileSync(join(skill, 'kit', `${e.direction}.kit.html`), 'utf8'), e.name);
    assert.deepEqual(faults(pages), []);
    assert.ok(pages.length >= 1 && pages.length <= 12, `${pages.length} pages`);
  });
}
for (const [name, direction, scheme] of [['openers', 'analytical', 'light'], ['openers', 'narrative', 'dark'], ['steps', 'narrative', 'light'], ['specimen', 'presentation', 'dark'], ['steps', 'presentation', 'dark']]) {
  test(`${name} fixture, ${direction} ${scheme}: its PDF has no text on top of other text and nothing off the paper`, { skip }, async () => {
    const content = fixture(`${name}.content.html`).replace(/(<html[^>]*data-bh-direction=")\w+(" data-scheme=")\w+"/, `$1${direction}$2${scheme}"`);
    assert.deepEqual(faults(await printed(assemble(content, direction), `${name}-${direction}-${scheme}`)), []);
  });
}
test('a presentation prints as a deck: one landscape page for each screen', { skip }, async () => {
  const e = examples().find(x => x.name === 'incident-debrief'), content = readFileSync(e.path, 'utf8');
  const pages = await printed(content + readFileSync(join(skill, 'kit', 'presentation.kit.html'), 'utf8'), 'deck');
  const screens = 1 + content.slice(content.indexOf('<body>')).split('<section class="bh-section').length - 1;      // the header, then each section
  assert.equal(pages.length, screens);
  for (const p of pages) assert.ok(p.width > p.height, `a page is ${Math.round(p.width)} by ${Math.round(p.height)} points`);
});
test('other reports print on upright pages', { skip }, async () => {
  const e = examples().find(x => x.name === 'board-brief');
  const pages = await printed(readFileSync(e.path, 'utf8') + readFileSync(join(skill, 'kit', 'analytical.kit.html'), 'utf8'), 'upright');
  for (const p of pages) assert.ok(p.height > p.width);
});
