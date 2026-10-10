// Assembles each shipped example, runs the checker on it, and saves the first
// screen as examples/<direction>/preview.png. Dev-only. Fails if an example is
// not clean.
import { copyFileSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReport } from '../skills/beautiful-html/tools/check.mjs';
import { DIRECTIONS } from './build-kit.mjs';

const skill = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'beautiful-html');
// Every example carries the template's editing guide, word for word.
const guide = readFileSync(join(skill, 'kit', 'content-template.html'), 'utf8').match(/<!--\s*EDITING GUIDE[\s\S]*?-->/)[0];
let failed = false;
for (const d of DIRECTIONS) {
  const source = join(skill, 'examples', d, 'content.html');
  const text = readFileSync(source, 'utf8'), synced = text.replace(/<!--\s*EDITING GUIDE[\s\S]*?-->/, () => guide);
  if (synced !== text) writeFileSync(source, synced);
  const work = mkdtempSync(join(tmpdir(), `bh-example-${d}-`));
  const file = join(work, 'report.html');
  writeFileSync(file, readFileSync(join(skill, 'examples', d, 'content.html'), 'utf8') + readFileSync(join(skill, 'kit', `${d}.kit.html`), 'utf8'));
  const report = await checkReport(file, { out: join(work, 'check') });
  const first = report.screenshots.find(s => s.endsWith('desktop-01.png'));
  if (first) copyFileSync(first, join(skill, 'examples', d, 'preview.png'));
  console.log(`${d.padEnd(13)} ${(report.bytes / 1024).toFixed(0)} KB, ${report.findings.length} finding(s)${first ? '' : ', no screenshot (no browser?)'}`);
  for (const f of report.findings) { failed = true; console.log(`  ${f.level} ${f.code}: ${f.message}`); }
}
process.exit(failed ? 1 : 0);
