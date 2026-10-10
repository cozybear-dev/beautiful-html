// Every direction, in both schemes, must be legible and colour-blind safe, and stay inside the font budget.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { contrast, validatePalette, oklab } from '../../skills/beautiful-html/tools/palette.mjs';
import { DIRECTIONS, FONT_BUDGET, fontBytes } from '../../scripts/build-kit.mjs';
import { parseTokens, checkTokens, REQUIRED_TOKENS } from '../../skills/beautiful-html/tools/brand.mjs';

const css = name => readFileSync(fileURLToPath(new URL(`../../src/css/directions/${name}.css`, import.meta.url)), 'utf8');

for (const name of DIRECTIONS) {
  test(`${name}: fonts are within budget and at most two families`, () => {
    const text = css(name);
    assert.ok(fontBytes(text) <= FONT_BUDGET, `${fontBytes(text)} bytes of fonts`);
    const families = new Set([...text.matchAll(/@font-face\s*\{[^}]*font-family:\s*"([^"]+)"/g)].map(m => m[1]));
    assert.ok(families.size >= 1 && families.size <= 2, [...families].join(', '));
    assert.ok(/font-display:\s*block/.test(text), 'fonts must block rather than swap, so charts are measured in the real face');
  });
  for (const scheme of ['light', 'dark']) {
    test(`${name} ${scheme}: every colour token is present, legible and colour-blind safe`, () => {
      const t = parseTokens(css(name), scheme);
      for (const key of REQUIRED_TOKENS) assert.ok(/^#[0-9a-f]{6}$/i.test(t[key] || ''), `--bh-${key} is missing or not a hex colour`);
      assert.deepEqual(checkTokens(t), []);
    });
  }
}

test('checkTokens names what is wrong', () => {
  const t = parseTokens(css('analytical'), 'light');
  assert.match(checkTokens({ ...t, 'ink-3': '#b8bcc4' }).join('\n'), /ink-3.*4\.5/);
  assert.match(checkTokens({ ...t, 'cat-2': t['cat-1'] }).join('\n'), /cat/);
  assert.match(checkTokens({ ...t, 'cat-1': '#00aa55' }).join('\n'), /cat-1.*accent/);
});
test('the sequential ramp runs from light to dark in even steps', () => {
  for (const name of DIRECTIONS) {
    const t = parseTokens(css(name), 'light');
    const L = [1, 2, 3, 4, 5, 6, 7].map(i => oklab(t[`seq-${i}`])[0]);
    for (let i = 1; i < L.length; i++) assert.ok(L[i] < L[i - 1] - 0.03, `${name}: seq-${i + 1} is not clearly darker than seq-${i}`);
  }
});
