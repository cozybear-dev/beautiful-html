// Assembles each shipped example, runs the checker on it, saves the first
// screen as examples/<name>/preview.png, and writes the assembled report to
// dist/examples/<name>.html so a person can open it. Dev-only. Fails if an
// example is not clean.
import { copyFileSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { checkReport } from '../skills/beautiful-html/tools/check.mjs';
import { DIRECTIONS } from './build-kit.mjs';

const skill = join(dirname(fileURLToPath(import.meta.url)), '..', 'skills', 'beautiful-html');

// An example is a folder with a content.html. It is named for the kind of
// report it is; the direction it is assembled with is the one its <html> names.
export function examples() {
  const dir = join(skill, 'examples');
  return readdirSync(dir).filter(name => existsSync(join(dir, name, 'content.html'))).sort().map(name => {
    const path = join(dir, name, 'content.html');
    const direction = (readFileSync(path, 'utf8').match(/data-bh-direction="([\w-]+)"/) || [])[1];
    if (!DIRECTIONS.includes(direction)) throw new Error(`examples/${name}: data-bh-direction is "${direction}", which is not a direction`);
    return { name, dir: join(dir, name), path, direction };
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  // Every example carries the template's editing guide, word for word.
  const guide = readFileSync(join(skill, 'kit', 'content-template.html'), 'utf8').match(/<!--\s*EDITING GUIDE[\s\S]*?-->/)[0];
  // A content file is half a report; these are the whole ones, to look at. Not committed.
  const open = join(skill, '..', '..', 'dist', 'examples');
  mkdirSync(open, { recursive: true });
  let failed = false;
  for (const { name, dir, path, direction } of examples()) {
    const text = readFileSync(path, 'utf8'), synced = text.replace(/<!--\s*EDITING GUIDE[\s\S]*?-->/, () => guide);
    if (synced !== text) writeFileSync(path, synced);
    const work = mkdtempSync(join(tmpdir(), `bh-example-${name}-`));
    const file = join(work, 'report.html');
    writeFileSync(file, synced + readFileSync(join(skill, 'kit', `${direction}.kit.html`), 'utf8'));
    const report = await checkReport(file, { out: join(work, 'check') });
    const first = report.screenshots.find(s => s.endsWith('desktop-01.png'));
    if (first) copyFileSync(first, join(dir, 'preview.png'));
    copyFileSync(file, join(open, `${name}.html`));
    console.log(`${name.padEnd(17)} ${direction.padEnd(13)} ${(report.bytes / 1024).toFixed(0)} KB, ${report.findings.length} finding(s)${first ? '' : ', no screenshot (no browser?)'}`);
    for (const f of report.findings) { failed = true; console.log(`  ${f.level} ${f.code}: ${f.message}`); }
  }
  console.log(`Open them from ${open}`);
  process.exit(failed ? 1 : 0);
}
