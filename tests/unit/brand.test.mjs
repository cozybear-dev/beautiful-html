import test from 'node:test';
import assert from 'node:assert/strict';
import { brandTokens, checkTokens, tokensToCss, REQUIRED_TOKENS } from '../../skills/beautiful-html/tools/brand.mjs';

for (const accent of ['#2347d9', '#0b6e75', '#6b2d73', '#e4572e', '#111111', '#ffd400', '#7ac943']) {
  test(`brandTokens(${accent}) gives complete, passing light and dark sets`, () => {
    const { light, dark, notes } = brandTokens({ accent });
    for (const set of [light, dark]) {
      for (const key of REQUIRED_TOKENS) assert.ok(/^#[0-9a-f]{6}$/.test(set[key] || ''), `${key} missing`);
      assert.deepEqual(checkTokens(set), []);
    }
    assert.ok(Array.isArray(notes));
  });
}
test('an accent that is too faint to draw with is adjusted, and the note says so', () => {
  const { light, notes } = brandTokens({ accent: '#ffd400' });
  assert.notEqual(light.accent, '#ffd400');
  assert.match(notes.join(' '), /#ffd400[\s\S]*(dark|adjust)/i);
});
test('the brand accent is kept exactly when it already works', () => {
  assert.equal(brandTokens({ accent: '#2347d9' }).light.accent, '#2347d9');
});
test('tokensToCss writes both schemes as overrides', () => {
  const css = tokensToCss(brandTokens({ accent: '#0b6e75' }));
  assert.match(css, /:root,\s*:root\[data-scheme="light"\]\s*\{[\s\S]*--bh-accent:\s*#0b6e75/);
  assert.match(css, /:root\[data-scheme="dark"\]\s*\{[\s\S]*--bh-ground:/);
});
test('a dark base colour becomes the light ink and the dark ground, and both sets still pass', () => {
  const { light, dark } = brandTokens({ accent: '#fcaf15', base: '#080630' });
  assert.equal(light.ink, '#080630');
  assert.equal(dark.ground, '#080630');
  assert.equal(dark.accent, '#fcaf15');
  for (const set of [light, dark]) assert.deepEqual(checkTokens(set), []);
});
test('a base too light to be ink is not used as ink, and the note says so', () => {
  const { light, notes } = brandTokens({ accent: '#2347d9', base: '#9ab0d0' });
  assert.notEqual(light.ink, '#9ab0d0');
  assert.match(notes.join(' '), /#9ab0d0[\s\S]*too light/);
});
