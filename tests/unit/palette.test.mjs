import test from 'node:test';
import assert from 'node:assert/strict';
import { contrast, deltaE, simulate, validatePalette } from '../../skills/beautiful-html/tools/palette.mjs';

test('contrast matches WCAG reference values', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
  assert.ok(Math.abs(contrast('#767676', '#ffffff') - 4.54) < 0.02);
});
test('identical colours have zero difference', () => assert.equal(deltaE('#336699', '#336699'), 0));
test('black to white is 100 in OKLab', () => assert.ok(Math.abs(deltaE('#000000', '#ffffff') - 100) < 0.1));
test('greys are unchanged by colour-blindness simulation', () => {
  for (const type of ['protan', 'deutan', 'tritan']) assert.equal(simulate('#808080', type), '#808080');
});
test('a red and green of equal lightness fail colour-blind separation', () =>
  assert.equal(validatePalette(['#d32f2f', '#388e3c'], '#ffffff').ok, false));
test('a blue and an orange pass', () =>
  assert.equal(validatePalette(['#1f5fbf', '#d9730d'], '#ffffff').ok, true));
test('a colour too faint for the ground fails on contrast', () => {
  const r = validatePalette(['#1f5fbf', '#f2e58a'], '#ffffff');
  assert.equal(r.ok, false);
  assert.match(r.failures.join(' '), /contrast/i);
});

import { suggestPalette } from '../../skills/beautiful-html/tools/palette.mjs';

test('suggestPalette builds a passing six-colour palette around an accent, on light and dark grounds', () => {
  for (const [accent, surface] of [['#1f5fbf', '#ffffff'], ['#8fb4ff', '#101418'], ['#b3261e', '#fbfaf7']]) {
    const p = suggestPalette(accent, surface, 6);
    assert.equal(p.length, 6);
    assert.equal(p[0], accent);
    const v = validatePalette(p, surface);
    assert.ok(v.ok, `${accent} on ${surface}: ${v.failures.join('; ')}`);
  }
});
