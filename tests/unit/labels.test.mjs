import test from 'node:test';
import assert from 'node:assert/strict';
import { dodge } from '../../src/js/labels.js';

test('labels that already fit do not move', () =>
  assert.deepEqual(dodge([{ y: 10, height: 12 }, { y: 60, height: 12 }], { min: 0, max: 100, gap: 2 }), [10, 60]));
test('overlapping labels separate by at least height plus gap, keeping order', () => {
  const out = dodge([{ y: 50, height: 12 }, { y: 52, height: 12 }, { y: 54, height: 12 }], { min: 0, max: 100, gap: 2 });
  assert.ok(out[1] - out[0] >= 14 && out[2] - out[1] >= 14);
  assert.ok(out[0] < out[1] && out[1] < out[2]);
});
test('labels stay inside the bounds', () => {
  const out = dodge([{ y: 98, height: 12 }, { y: 99, height: 12 }], { min: 0, max: 100, gap: 2 });
  assert.ok(out.every(y => y >= 6 && y <= 94));
});
test('input order is preserved in the result, whatever the y order', () => {
  const out = dodge([{ y: 80, height: 10 }, { y: 20, height: 10 }, { y: 82, height: 10 }], { min: 0, max: 100, gap: 2 });
  assert.equal(out[1], 20);
  assert.ok(Math.abs(out[0] - out[2]) >= 12);
  assert.ok(out[0] < out[2], 'the label that started higher stays higher');
});
test('when there is not enough room, labels share the space evenly instead of leaving the bounds', () => {
  const out = dodge([{ y: 5, height: 12 }, { y: 6, height: 12 }, { y: 7, height: 12 }], { min: 0, max: 30, gap: 2 });
  assert.ok(out.every(y => y >= 6 && y <= 24));
});
