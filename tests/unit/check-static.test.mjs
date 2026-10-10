import test from 'node:test';
import assert from 'node:assert/strict';
import { staticCheck, findBrowser, sliceHeights } from '../../skills/beautiful-html/tools/check.mjs';

const ok = `<!doctype html>
<!-- EDITING GUIDE: … -->
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>T</title></head>
<body><main class="bh-report"></main>
<!-- BH-KIT v0.1.0 analytical: embedded -->
<style id="bh-kit-css">a{}</style><script id="bh-kit-js">1</script></body></html>`;
const codes = (html, bytes = html.length) => staticCheck(html, bytes).map(f => f.code);

test('a well-formed report has no static findings', () => assert.deepEqual(codes(ok), []));
test('network references are errors', () => {
  assert.ok(codes(ok.replace('<title>', '<link rel="stylesheet" href="https://x.test/a.css"><title>')).includes('network-reference'));
  assert.ok(codes(ok.replace('a{}', 'a{background:url(https://x.test/i.png)}')).includes('network-reference'));
  assert.ok(codes(ok.replace('<main', '<img src="//x.test/i.png"><main')).includes('network-reference'));
});
test('ordinary links are allowed', () =>
  assert.deepEqual(codes(ok.replace('</main>', '<a href="https://example.com">x</a></main>')), []));
test('missing parts are named', () => {
  assert.ok(codes(ok.replace('<title>T</title>', '')).includes('missing-title'));
  assert.ok(codes(ok.replace(' lang="en"', '')).includes('missing-lang'));
  assert.ok(codes(ok.replace(/<meta name="viewport"[^>]*>/, '')).includes('missing-viewport'));
  assert.ok(codes(ok.replace(/<!-- BH-KIT[^]*$/, '</body></html>')).includes('missing-kit'));
  assert.ok(codes(ok.replace(/<!-- EDITING GUIDE[^]*?-->/, '')).includes('missing-guide'));
});
test('leftover template text is an error', () =>
  assert.ok(codes(ok.replace('<title>T', '<title>{{TITLE}}')).includes('template-text')));
test('size budgets', () => {
  assert.ok(codes(ok, 1_600_000).includes('size-warning'));
  assert.ok(codes(ok, 5_100_000).includes('size-error'));
});
test('findBrowser prefers the environment variable, then known paths', () => {
  const exists = p => p === '/opt/x/chrome' || p === '/usr/bin/chromium';
  assert.equal(findBrowser({ BH_BROWSER: '/opt/x/chrome' }, 'linux', exists), '/opt/x/chrome');
  assert.equal(findBrowser({}, 'linux', exists), '/usr/bin/chromium');
  assert.equal(findBrowser({}, 'linux', () => false), null);
});
test('sliceHeights cuts a tall page into capped screen slices', () => {
  assert.deepEqual(sliceHeights(2000, 900, 8), [{ y: 0, height: 900 }, { y: 900, height: 900 }, { y: 1800, height: 200 }]);
  assert.equal(sliceHeights(90000, 900, 8).length, 8);
});
