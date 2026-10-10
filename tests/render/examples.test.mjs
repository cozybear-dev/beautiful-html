// The shipped examples are what agents copy from, so they must be clean.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReport, findBrowser } from '../../skills/beautiful-html/tools/check.mjs';
import { examples } from '../../scripts/build-examples.mjs';

const skip = findBrowser() ? false : 'no Chromium-based browser found';
const skill = fileURLToPath(new URL('../../skills/beautiful-html/', import.meta.url));
const template = readFileSync(join(skill, 'kit', 'content-template.html'), 'utf8');
const guide = template.match(/<!--\s*EDITING GUIDE[\s\S]*?-->/)[0];
const headLines = template.slice(template.indexOf('<style>html{visibility:hidden}</style>'), template.indexOf('<style id="bh-overrides">', template.indexOf('<title>')));

const all = examples();
const read = e => readFileSync(e.path, 'utf8');
// The header of an example: what its front page holds.
const header = e => read(e).match(/\n<header class="bh-header[\s\S]*?<\/header>/)[0];

for (const example of all) {
  const { name, dir, direction } = example;
  test(`${name} example: complete, clean and previewed`, { skip }, async () => {
    const content = read(example);
    assert.ok(content.includes(guide), 'the example must carry the same editing guide as the template');
    assert.ok(content.includes(headLines), 'the example must carry the template\'s head lines: the guard, the BH stub and the note for a file opened without a kit');
    assert.ok(!/\{\{[A-Z]/.test(content), 'placeholders left in');
    assert.match(content, /<style id="bh-overrides">\s*(\/\*[^*]*\*\/)?\s*<\/style>/, 'an example styles nothing itself');
    assert.ok(existsSync(join(dir, 'preview.png')) && statSync(join(dir, 'preview.png')).size > 20000, 'preview.png is missing');
    const work = mkdtempSync(join(tmpdir(), `bh-example-${name}-`));
    const file = join(work, 'report.html');
    writeFileSync(file, content + readFileSync(join(skill, 'kit', `${direction}.kit.html`), 'utf8'));
    const report = await checkReport(file, { out: join(work, 'check') });
    assert.deepEqual(report.findings.filter(f => f.level === 'error').map(f => `${f.code}: ${f.message}`), []);
    assert.deepEqual(report.findings.filter(f => f.level === 'warning').map(f => `${f.code}: ${f.message}`), []);
    assert.ok(report.bytes < 1_500_000);
  });
}
test('there is an example in every direction, and the examples README lists each one', () => {
  for (const direction of ['analytical', 'narrative', 'presentation']) assert.ok(all.some(e => e.direction === direction), `no ${direction} example`);
  const readme = readFileSync(join(skill, 'examples', 'README.md'), 'utf8');
  for (const { name, direction } of all) assert.match(readme, new RegExp(`\`${name}/content\\.html\`[^\\n]*\`${direction}\``), `README.md does not list ${name} as ${direction}`);
});
// Agents copy what the examples do. When every example opened the same way,
// every report did too, with numbers made up to fill the strip.
test('between them the examples open in every way, and each says why', () => {
  const ways = {
    'a cover': h => /class="bh-header bh-cover"/.test(h),
    'a byline': h => /class="bh-byline"/.test(h),
    'a list of facts': h => /class="bh-meta"/.test(h),
    'findings in words': h => /class="bh-findings"/.test(h),
    'a figure': h => /class="bh-figure"/.test(h),
    'key figures': h => /class="bh-keyfigures"/.test(h),
  };
  for (const [way, has] of Object.entries(ways)) assert.ok(all.some(e => has(header(e))), `no example opens with ${way}`);
  const numbers = all.filter(e => ways['key figures'](header(e))).map(e => e.name);
  assert.ok(numbers.length <= all.length / 3, `${numbers.join(', ')} open with key figures; that should be the exception`);
  for (const e of all) assert.match(read(e), /<!-- Front page: [^\n]{20,} -->\n<header class="bh-header/, `${e.name} does not say why it opens the way it does`);
});
test('the incident is told twice: as a report whose diagram follows the text, and as a deck with a walkthrough', () => {
  const report = readFileSync(join(skill, 'examples', 'incident-report', 'content.html'), 'utf8');
  const deck = readFileSync(join(skill, 'examples', 'incident-debrief', 'content.html'), 'utf8');
  for (const content of [report, deck]) { assert.match(content, /BH\.flow\(/); assert.match(content, /steps:\s*\[/); }
  assert.match(report, /class="bh-step" data-bh-step="1"/);
  assert.match(deck, /data-bh-direction="presentation" data-scheme="dark"/);
});
test('between them the examples use both schemes in more than one direction', () => {
  const pairs = new Set(all.map(e => `${e.direction} ${read(e).match(/<html[^>]*data-scheme="(\w+)"/)[1]}`));
  for (const pair of ['analytical light', 'analytical dark', 'narrative light', 'presentation light', 'presentation dark']) assert.ok(pairs.has(pair), `no example is ${pair}`);
});
test('between them the examples use every figure function', () => {
  const text = all.map(read).join('\n');
  for (const fn of ['line', 'bar', 'dot', 'scatter', 'heatmap', 'spark', 'waffle', 'plot', 'flow', 'sankey', 'data']) assert.match(text, new RegExp(`BH\\.${fn}\\(`), `no example uses BH.${fn}`);
});
