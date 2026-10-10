// The checker in awkward conditions: it must name the problem and never print a stack trace.
import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { findBrowser } from '../../skills/beautiful-html/tools/check.mjs';
import { tempDir } from '../helpers/tmp.mjs';

const CLI = fileURLToPath(new URL('../../skills/beautiful-html/tools/check.mjs', import.meta.url));
const dir = tempDir('bh cli ');
const emptyHome = tempDir('bh-home-');
const good = `<!doctype html>
<!-- EDITING GUIDE: test -->
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>T</title></head>
<body><main><h1>T</h1><p>Text.</p></main>
<!-- BH-KIT v0.1.0 analytical: embedded -->
<style id="bh-kit-css">a{}</style><script id="bh-kit-js">1</script></body></html>`;

const run = (args, env = {}) => {
  const r = spawnSync(process.execPath, [CLI, ...args], { encoding: 'utf8', env: { PATH: process.env.PATH, HOME: emptyHome, ...env } });
  return { code: r.status, text: r.stdout + r.stderr };
};
const noTrace = text => assert.ok(!/\n\s+at .+\(.+:\d+:\d+\)|node:internal/.test(text), `stack trace in output:\n${text}`);

test('a path with spaces works', () => {
  mkdirSync(join(dir, 'my reports'), { recursive: true });
  const file = join(dir, 'my reports', 'report one.html');
  writeFileSync(file, good);
  const r = run([file, '--no-render']);
  assert.equal(r.code, 0, r.text);
  assert.ok(existsSync(join(dir, 'my reports', 'report one.check', 'check.json')));
  noTrace(r.text);
});
test('a missing file exits 2 with a plain message', () => {
  const r = run([join(dir, 'nope.html')]);
  assert.equal(r.code, 2);
  assert.match(r.text, /no such file/i);
  noTrace(r.text);
});
test('an unknown option exits 2 and shows usage', () => {
  const r = run(['x.html', '--wat']);
  assert.equal(r.code, 2);
  assert.match(r.text, /Unknown option --wat[\s\S]*Usage:/);
  noTrace(r.text);
});
test('a report whose kit was deleted is an error, not a crash', () => {
  const file = join(dir, 'nokit.html');
  writeFileSync(file, good.replace(/<!-- BH-KIT[^]*$/, '</body></html>'));
  const r = run([file, '--no-render']);
  assert.equal(r.code, 1);
  assert.match(r.text, /missing-kit/);
  noTrace(r.text);
});
test('no browser: exit 2 with the manual fallback', { skip: findBrowser({ HOME: emptyHome }) ? 'a system browser is installed' : false }, () => {
  const file = join(dir, 'nobrowser.html');
  writeFileSync(file, good);
  const r = run([file]);
  assert.equal(r.code, 2, r.text);
  assert.match(r.text, /BH_BROWSER/);
  assert.match(r.text, /--screenshot/);
  noTrace(r.text);
});
test('a browser path that is not a browser: exit 2, static findings still shown', () => {
  const file = join(dir, 'badbrowser.html');
  writeFileSync(file, good.replace('<title>T</title>', ''));
  const r = run([file], { BH_BROWSER: process.execPath });
  assert.equal(r.code, 2, r.text);
  assert.match(r.text, /could not run/i);
  assert.match(r.text, /missing-title/);
  noTrace(r.text);
});
