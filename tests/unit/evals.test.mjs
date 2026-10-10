import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

const briefsDir = fileURLToPath(new URL('../../evals/briefs/', import.meta.url));
const briefs = existsSync(briefsDir) ? readdirSync(briefsDir).filter(d => /^\d\d-/.test(d)).sort() : [];

// Split one CSV line, honouring double-quoted fields.
const cells = line => line.match(/("([^"]|"")*"|[^,]*)(,|$)/g).slice(0, -1);

test('there are six briefs', () => assert.equal(briefs.length, 6, briefs.join(', ')));

for (const b of briefs) {
  test(`${b}: brief names a reader and the deliverable, and has clean data`, () => {
    const brief = readFileSync(join(briefsDir, b, 'brief.md'), 'utf8');
    assert.match(brief, /report\.html/, 'the brief must ask for report.html');
    assert.match(brief, /\b(for|audience|readers?|send|share|present)\b/i, 'the brief must say who it is for');
    assert.ok(brief.length > 300 && brief.length < 2500, `brief length ${brief.length}`);
    const dataDir = join(briefsDir, b, 'data');
    const files = readdirSync(dataDir);
    assert.ok(files.length >= 1, 'at least one data file');
    for (const f of files) {
      const path = join(dataDir, f);
      assert.ok(statSync(path).size > 50, `${f} is empty`);
      if (f.endsWith('.csv')) {
        const lines = readFileSync(path, 'utf8').trim().split(/\r?\n/);
        const width = cells(lines[0]).length;
        assert.ok(lines.length >= 3, `${f} has too few rows`);
        lines.forEach((l, i) => assert.equal(cells(l).length, width, `${f} line ${i + 1} has the wrong number of columns`));
      } else if (f.endsWith('.json')) {
        assert.doesNotThrow(() => JSON.parse(readFileSync(path, 'utf8')), `${f} is not valid JSON`);
      }
    }
  });
}
