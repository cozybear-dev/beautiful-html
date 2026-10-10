import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { audit, closeBrowser, skip, DESKTOP } from '../helpers/browser.mjs';
import { clean, faults, loopWithPause, networkRequest, shortCaption, tinyLabel } from '../fixtures/faults.mjs';

after(closeBrowser);
const codes = r => r.findings.map(f => f.code);

test('a clean page has no findings', { skip }, async () => {
  assert.deepEqual(codes(await audit(clean)), []);
});

for (const [code, html] of Object.entries(faults)) {
  test(`reports ${code}`, { skip }, async () => {
    const mode = code === 'motion-under-reduced' ? { ...DESKTOP, name: 'reduced-motion', reducedMotion: true } : DESKTOP;
    const found = codes(await audit(html, mode));
    assert.ok(found.includes(code), `expected ${code}, got [${found.join(', ')}]`);
  });
}

test('every finding names a fix', { skip }, async () => {
  const { findings } = await audit(faults['low-contrast']);
  for (const f of findings) assert.ok(f.fix && f.message && f.level, JSON.stringify(f));
});
test('any text under 11px is flagged, but a short caption at 13px is not body text', { skip }, async () => {
  assert.ok(codes(await audit(tinyLabel)).includes('small-text'));
  assert.ok(!codes(await audit(shortCaption)).includes('small-text'));
});
test('a loop with a pause control is accepted', { skip }, async () => {
  assert.ok(!codes(await audit(loopWithPause)).includes('loop-without-pause'));
});
test('network requests are reported and blocked', { skip }, async () => {
  assert.ok(codes(await audit(networkRequest)).includes('network-request'));
});
test('the phone viewport is really 390 wide', { skip }, async () => {
  const { metrics } = await audit(clean, { name: 'phone', width: 390, height: 844 });
  assert.equal(metrics.width, 390);
});
