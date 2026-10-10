// A report can be made from the template, edited in place, moved to another
// look, and still pass the whole check.
import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReport, findBrowser } from '../../skills/beautiful-html/tools/check.mjs';
import { rekit, splitReport } from '../../skills/beautiful-html/tools/rekit.mjs';

const skip = findBrowser() ? false : 'no Chromium-based browser found';
const skill = fileURLToPath(new URL('../../skills/beautiful-html/', import.meta.url));
const kit = d => readFileSync(join(skill, 'kit', `${d}.kit.html`), 'utf8');
const FILL = {
  'DIRECTION': 'analytical', 'THE FINDING OF THE REPORT IN ONE SENTENCE': 'Weekly orders passed 4,000 for the first time in June',
  'WHO THIS IS FROM': 'Operations', 'KIND OF DOCUMENT AND PERIOD': 'Monthly review, June 2026',
  'TWO SENTENCES: THE EVIDENCE FOR THE FINDING AND WHAT FOLLOWS FROM IT': 'Orders rose in every week of the month. The second warehouse shift is now needed on Mondays.',
  'WHO IT IS FROM, WHO IT IS FOR, AND THE DATE OR PERIOD, IN ONE LINE': 'By Operations analytics, for the leadership team. June 2026.', 'SHORT NAME': 'Orders',
  'A FINDING, NOT A TOPIC': 'Orders grew every week in June', 'WHAT THE READER NEEDS TO KNOW TO READ THE FIGURE': 'Each point is one week of confirmed orders, counted on the day the order was placed.',
  'WHAT THE FIGURE SHOWS, AS A FINDING': 'Weekly orders rose from 3,410 to 4,120', 'WHAT IS MEASURED AND ITS UNIT': 'Confirmed orders per week',
  'SOURCE AND DATE': 'order system, extracted 1 July 2026', 'WHO PREPARED THIS, FROM WHAT DATA, AND WHEN': 'Prepared by Operations analytics from the order system on 1 July 2026.',
  'CSV ROWS WITH A HEADER LINE': 'week,orders\n2026-06-01,3410\n2026-06-08,3620\n2026-06-15,3890\n2026-06-22,4120', 'DATE COLUMN': 'week', 'VALUE COLUMN': 'orders',
};
const fill = t => t.replace(/\{\{\s*([A-Z][A-Z0-9_ ,:]*?)\s*\}\}/g, (m, key) => { assert.ok(key in FILL, `the template has an unknown placeholder ${m}`); return FILL[key]; });

test('template → report → edit in place → another look, clean at every stage', { skip }, async () => {
  const dir = mkdtempSync(join(tmpdir(), 'bh-round-'));
  const file = join(dir, 'report.html');
  const content = fill(readFileSync(join(skill, 'kit', 'content-template.html'), 'utf8'));
  writeFileSync(file, content + kit('analytical'));
  let report = await checkReport(file, { out: join(dir, 'check-1') });
  assert.deepEqual(report.findings.map(f => `${f.level} ${f.code}: ${f.message}`), []);
  assert.ok(report.screenshots.length >= 3);
  assert.ok(report.bytes < 1_500_000, `${report.bytes} bytes`);

  // A later editor changes one sentence with a targeted edit, without touching the kit.
  const before = readFileSync(file, 'utf8');
  const edited = before.replace('Orders grew every week in June', 'Orders grew every week in June, fastest in the last');
  assert.notEqual(edited, before);
  assert.equal(splitReport(edited).kit, splitReport(before).kit);
  writeFileSync(file, rekit(edited, kit('narrative'), 'narrative'));
  report = await checkReport(file, { out: join(dir, 'check-2') });
  assert.deepEqual(report.findings.map(f => `${f.level} ${f.code}: ${f.message}`), []);
  const final = readFileSync(file, 'utf8');
  assert.match(final, /fastest in the last/);
  assert.match(final, /<!-- BH-KIT v[\d.]+ narrative:/);

  // And onto the presentation kit in the dark scheme.
  writeFileSync(file, rekit(final, kit('presentation'), 'presentation', 'dark'));
  report = await checkReport(file, { out: join(dir, 'check-3'), pdf: true });
  assert.deepEqual(report.findings.filter(f => f.level === 'error').map(f => `${f.code}: ${f.message}`), []);
  assert.ok(report.pdf && readFileSync(report.pdf).subarray(0, 5).toString() === '%PDF-');
});

test('the part of a report an editor reads is small', () => {
  const html = fill(readFileSync(join(skill, 'kit', 'content-template.html'), 'utf8')) + kit('narrative');
  const { content } = splitReport(html);
  assert.ok(content.length < 8000, `content is ${content.length} characters`);
  assert.ok(content.split('\n').every(l => l.length < 400), 'content lines are ordinary length');
});
