import test from 'node:test';
import assert from 'node:assert/strict';
import { duration, fitScale, placeFlags } from '../../src/js/timeline-layout.js';

const boxes = (items, tiers, offset = 5) => items.map((it, i) => ({ x: it.x, x0: it.x + offset, x1: it.x + offset + it.w, tier: tiers[i] }));
// No two labels in a tier touch, and no stem runs through the label of another event.
function sound(items, tiers) {
  const b = boxes(items, tiers);
  for (let i = 0; i < b.length; i++) for (let j = 0; j < b.length; j++) {
    if (i === j) continue;
    if (b[i].tier === b[j].tier) assert.ok(b[i].x1 <= b[j].x0 || b[j].x1 <= b[i].x0, `labels ${i} and ${j} overlap in tier ${b[i].tier}`);
    if (b[j].tier > b[i].tier) assert.ok(b[j].x < b[i].x0 - 2 || b[j].x > b[i].x1 + 2, `the stem of ${j} runs through the label of ${i}`);
  }
}

test('events that are far apart all sit in the tier nearest the line', () => {
  const items = [{ x: 0, w: 100 }, { x: 300, w: 100 }, { x: 600, w: 100 }];
  assert.deepEqual(placeFlags(items), [1, 1, 1]);
});
test('a cluster becomes a staircase that falls towards the later events', () => {
  const items = [{ x: 500, w: 120 }, { x: 530, w: 120 }, { x: 560, w: 120 }, { x: 600, w: 120 }];
  const tiers = placeFlags(items);
  assert.deepEqual(tiers, [4, 3, 2, 1]);
  sound(items, tiers);
});
test('a label is never placed where a taller stem would cross it', () => {
  const items = [{ x: 0, w: 130 }, { x: 100, w: 130 }, { x: 140, w: 130 }];        // the first would fit beside the third, but the second's stem is in the way
  const tiers = placeFlags(items);
  sound(items, tiers);
  assert.deepEqual(tiers, [3, 2, 1]);
});
test('two events at the same moment share a stem and stack their labels', () => {
  const items = [{ x: 200, w: 90 }, { x: 200, w: 90 }];
  const tiers = placeFlags(items);
  assert.deepEqual([...tiers].sort(), [1, 2]);
});
test('more tiers than allowed is reported, not drawn', () => {
  const items = Array.from({ length: 7 }, (_, i) => ({ x: 400 + i * 8, w: 120 }));
  assert.equal(placeFlags(items, { maxTiers: 5 }), null);
  assert.equal(placeFlags(items, { maxTiers: 7 }).length, 7);
});
test('200 random timelines: every placement is sound', () => {
  let seed = 7;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  for (let t = 0; t < 200; t++) {
    const n = 2 + Math.floor(rnd() * 9);
    const items = Array.from({ length: n }, () => ({ x: Math.round(rnd() * 800), w: 60 + Math.round(rnd() * 100) }));
    const tiers = placeFlags(items, { maxTiers: 12 });
    assert.ok(tiers, `timeline ${t} was not placed`);
    sound(items, tiers);
  }
});

test('the scale leaves room on the right for the label of the last event', () => {
  const s = fitScale([0, 0.5, 1], [100, 100, 120], 800);
  assert.ok(s.x[2] + 5 + 120 <= 800.5, `the last label ends at ${s.x[2] + 125}`);
  assert.equal(s.x[0], s.left);
  assert.ok(s.x[1] > s.x[0] && s.x[2] > s.x[1]);
});
test('a scale that would be squeezed to under half the width is refused', () => {
  assert.equal(fitScale([0, 0.2, 0.25], [100, 100, 520], 600), null);
});

test('a length of time is written the way people say it', () => {
  const H = 3600e3, M = 60e3;
  assert.equal(duration(41 * H + 38 * M), '41 h 38 min');
  assert.equal(duration(5 * H + 30 * M), '5 h 30 min');
  assert.equal(duration(2 * H), '2 hours');
  assert.equal(duration(1 * H), '1 hour');
  assert.equal(duration(40 * M), '40 minutes');
  assert.equal(duration(45e3), '45 seconds');
  assert.equal(duration(3 * 24 * H), '3 days');
  assert.equal(duration(30.4 * H), '30 h 24 min');
  assert.equal(duration(9.5 * 24 * H), '9.5 days');
  assert.equal(duration(90 * 24 * H), '3 months');
});
