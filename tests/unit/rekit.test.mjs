import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { splitReport, rekit } from '../../skills/beautiful-html/tools/rekit.mjs';
import { staticCheck } from '../../skills/beautiful-html/tools/check.mjs';
import { DIRECTIONS } from '../../scripts/build-kit.mjs';
import { tempDir } from '../helpers/tmp.mjs';

const skill = fileURLToPath(new URL('../../skills/beautiful-html/', import.meta.url));
const kit = d => readFileSync(join(skill, 'kit', `${d}.kit.html`), 'utf8');
const template = () => readFileSync(join(skill, 'kit', 'content-template.html'), 'utf8');
const fill = t => t.replace(/\{\{\s*[A-Z][A-Z0-9_ ]*\}\}/g, 'Filled in');
const CLI = join(skill, 'tools', 'rekit.mjs');

test('a kit begins on its own line, so the marker always starts a line', () => {
  for (const d of DIRECTIONS) assert.match(kit(d), /^\n<!-- BH-KIT v\d+\.\d+\.\d+ /);
  assert.ok(splitReport('<p>no newline at the end</p>' + kit('analytical')), 'content without a final newline still splits');
});
test('splitReport returns the two parts, and they add up to the file', () => {
  const html = fill(template()) + kit('analytical');
  const parts = splitReport(html);
  assert.equal(parts.content + parts.kit, html);
  assert.match(parts.kit, /^<!-- BH-KIT/);
  assert.ok(!parts.content.includes('bh-kit-js'));
});
test('a file with no kit cannot be split', () => assert.equal(splitReport('<html><body>plain</body></html>'), null));
test('rekit keeps the content byte for byte and swaps the kit', () => {
  const content = fill(template());
  const out = rekit(content + kit('analytical'), kit('narrative'));
  assert.equal(out, content + kit('narrative'));
});
test('rekit can record the new direction on <html>', () => {
  const out = rekit(fill(template()) + kit('analytical'), kit('presentation'), 'presentation');
  assert.match(out, /<html[^>]*data-bh-direction="presentation"/);
  assert.ok(!/<html[^>]*data-bh-direction="analytical"/.test(out));
});
test('the template is flagged until it is filled, then passes with every kit', () => {
  assert.ok(staticCheck(template() + kit('analytical')).some(f => f.code === 'template-text'));
  for (const d of DIRECTIONS) assert.deepEqual(staticCheck(fill(template()) + kit(d)).filter(f => f.level === 'error').map(f => f.code), []);
});
test('the editing guide is short and says where to edit and what not to open', () => {
  const guide = template().match(/<!--\s*EDITING GUIDE[\s\S]*?-->/)[0];
  assert.ok(guide.split('\n').length <= 45, `${guide.split('\n').length} lines`);
  for (const phrase of [/BH-KIT/, /never|do not/i, /targeted|search and replace/i, /BH\.line/, /BH\.flow/, /bh-overrides/, /data-scheme/]) assert.match(guide, phrase);
});
test('the CLI swaps the kit in place and reports a file with no kit plainly', () => {
  const dir = tempDir('bh-rekit-');
  const file = join(dir, 'report.html');
  writeFileSync(file, fill(template()) + kit('analytical'));
  const ok = spawnSync(process.execPath, [CLI, file, '--direction', 'narrative'], { encoding: 'utf8' });
  assert.equal(ok.status, 0, ok.stderr);
  const after = readFileSync(file, 'utf8');
  assert.match(after, /<!-- BH-KIT v[\d.]+ narrative:/);
  assert.match(after, /data-bh-direction="narrative"/);
  const plain = join(dir, 'plain.html');
  writeFileSync(plain, '<html><body>plain</body></html>');
  const bad = spawnSync(process.execPath, [CLI, plain, '--direction', 'narrative'], { encoding: 'utf8' });
  assert.equal(bad.status, 2);
  assert.match(bad.stderr + bad.stdout, /no .*kit|BH-KIT/i);
  assert.ok(!/\n\s+at /.test(bad.stderr), 'no stack trace');
  const unknown = spawnSync(process.execPath, [CLI, file, '--direction', 'brutalist'], { encoding: 'utf8' });
  assert.equal(unknown.status, 2);
  assert.match(unknown.stderr + unknown.stdout, /analytical, narrative, presentation/);
});
