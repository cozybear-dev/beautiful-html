// The shipped examples are what agents copy from, so they must be clean.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, mkdtempSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReport, findBrowser } from '../../skills/beautiful-html/tools/check.mjs';

const skip = findBrowser() ? false : 'no Chromium-based browser found';
const skill = fileURLToPath(new URL('../../skills/beautiful-html/', import.meta.url));
const template = readFileSync(join(skill, 'kit', 'content-template.html'), 'utf8');
const guide = template.match(/<!--\s*EDITING GUIDE[\s\S]*?-->/)[0];

for (const direction of ['analytical', 'narrative', 'presentation']) {
  const dir = join(skill, 'examples', direction);
  test(`${direction} example: complete, clean and previewed`, { skip }, async () => {
    const content = readFileSync(join(dir, 'content.html'), 'utf8');
    assert.match(content, new RegExp(`data-bh-direction="${direction}"`));
    assert.ok(content.includes(guide), 'the example must carry the same editing guide as the template');
    assert.ok(!/\{\{[A-Z]/.test(content), 'placeholders left in');
    assert.ok(existsSync(join(dir, 'preview.png')) && statSync(join(dir, 'preview.png')).size > 20000, 'preview.png is missing');
    const work = mkdtempSync(join(tmpdir(), `bh-example-${direction}-`));
    const file = join(work, 'report.html');
    writeFileSync(file, content + readFileSync(join(skill, 'kit', `${direction}.kit.html`), 'utf8'));
    const report = await checkReport(file, { out: join(work, 'check') });
    assert.deepEqual(report.findings.filter(f => f.level === 'error').map(f => `${f.code}: ${f.message}`), []);
    assert.deepEqual(report.findings.filter(f => f.level === 'warning').map(f => `${f.code}: ${f.message}`), []);
    assert.ok(report.bytes < 1_500_000);
  });
}
test('the presentation example is built around a flow diagram with a walkthrough', () => {
  const content = readFileSync(join(skill, 'examples', 'presentation', 'content.html'), 'utf8');
  assert.match(content, /BH\.flow\(/);
  assert.match(content, /steps:\s*\[/);
  assert.match(content, /data-scheme="dark"/);
});
test('between them the examples use every figure function', () => {
  const all = ['analytical', 'narrative', 'presentation'].map(d => readFileSync(join(skill, 'examples', d, 'content.html'), 'utf8')).join('\n');
  for (const fn of ['line', 'bar', 'dot', 'scatter', 'spark', 'flow', 'sankey', 'data']) assert.match(all, new RegExp(`BH\\.${fn}\\(`), `no example uses BH.${fn}`);
});
