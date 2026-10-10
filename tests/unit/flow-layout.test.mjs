import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutFlow, validateGraph, countCrossings } from '../../src/js/flow/layout.js';
import { routeEdges, segmentHitsBox } from '../../src/js/flow/route.js';
import { graphs, invalid } from '../fixtures/graphs.mjs';

const measure = n => ({ w: 40 + 7 * Math.max(n.label.length, (n.sub || '').length), h: n.sub ? 52 : 40 });
const overlap = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;

for (const [name, g] of Object.entries(graphs)) {
  for (const direction of ['right', 'down']) {
    test(`${name} (${direction}): nodes keep apart, edges avoid nodes, zones hold only their members`, () => {
      const L = layoutFlow(g, { direction, measure });
      const real = L.nodes.filter(n => !n.virtual);
      assert.equal(real.length, g.nodes.length);
      for (const a of real) assert.ok(a.x >= 0 && a.y >= 0 && a.x + a.w <= L.width && a.y + a.h <= L.height, `${a.id} is outside the canvas`);
      for (let i = 0; i < real.length; i++) for (let j = i + 1; j < real.length; j++)
        assert.ok(!overlap(real[i], real[j], 8), `${real[i].id} is closer than 8px to ${real[j].id}`);
      const routed = routeEdges(L, { direction });
      assert.equal(routed.length, g.edges.length);
      for (const e of routed) {
        const ends = new Set(e.id.replace(/#\d+$/, '').split('>'));
        for (const n of real) if (!ends.has(n.id))
          for (let k = 1; k < e.points.length; k++)
            assert.ok(!segmentHitsBox(e.points[k - 1], e.points[k], n, 2), `${e.id} crosses ${n.id}`);
      }
      const zoneOf = id => g.nodes.find(m => m.id === id).zone || null;
      for (const z of L.zones) {
        assert.ok(z.x >= 0 && z.y >= 0 && z.x + z.w <= L.width && z.y + z.h <= L.height, `zone ${z.id} is outside the canvas`);
        for (const n of real) {
          const inside = n.x >= z.x && n.x + n.w <= z.x + z.w && n.y >= z.y && n.y + n.h <= z.y + z.h;
          if (zoneOf(n.id) === z.id) assert.ok(inside, `${n.id} is outside its zone ${z.id}`);
          else assert.ok(!overlap(n, z), `${n.id} overlaps zone ${z.id}, which it does not belong to`);
        }
      }
      for (let i = 0; i < L.zones.length; i++) for (let j = i + 1; j < L.zones.length; j++)
        assert.ok(!overlap(L.zones[i], L.zones[j]), `zones ${L.zones[i].id} and ${L.zones[j].id} overlap`);
    });
  }
}

test('edges run with the rank order', () => {
  const L = layoutFlow(graphs.threeTier, { direction: 'right', measure });
  const rank = Object.fromEntries(L.nodes.map(n => [n.id, n.rank]));
  for (const e of L.edges) if (!e.reversed) assert.ok(rank[e.from] < rank[e.to], `${e.id} runs against the flow`);
});
test('in a rightward layout, a later rank is further right; downward, further down', () => {
  for (const [direction, axis] of [['right', 'x'], ['down', 'y']]) {
    const L = layoutFlow(graphs.threeTier, { direction, measure });
    const at = id => L.nodes.find(n => n.id === id);
    assert.ok(at('cdn')[axis] < at('lb')[axis] && at('lb')[axis] < at('api')[axis] && at('api')[axis] < at('db')[axis]);
  }
});
test('planar graphs are drawn without crossings', () => {
  for (const name of ['fanOutFanIn', 'threeTier', 'twoIslands', 'hinted'])
    assert.equal(countCrossings(layoutFlow(graphs[name], { direction: 'right', measure })), 0, name);
});
test('the dense graph stays readable', () => {
  const L = layoutFlow(graphs.dense, { direction: 'right', measure });
  assert.equal(L.crossings, countCrossings(L));
  assert.ok(L.crossings <= 6, `dense graph has ${L.crossings} crossings`);
});
test('rank hints are honoured', () => {
  const L = layoutFlow(graphs.hinted, { direction: 'right', measure });
  assert.equal(L.nodes.find(n => n.id === 'audit').rank, 3);
});
test('order hints fix the order inside a rank', () => {
  const g = { nodes: [{ id: 'a', label: 'A' }, { id: 'p', label: 'P', order: 2 }, { id: 'q', label: 'Q', order: 1 }], edges: [{ from: 'a', to: 'p' }, { from: 'a', to: 'q' }] };
  const L = layoutFlow(g, { direction: 'right', measure });
  const at = id => L.nodes.find(n => n.id === id);
  assert.ok(at('q').y < at('p').y);
});
test('a cycle is laid out, and the edge that closes it is marked reversed', () => {    // Review Focus 4
  const L = layoutFlow(graphs.cycle, { direction: 'right', measure });
  assert.equal(L.edges.filter(e => e.reversed).length, 1);
  assert.equal(L.edges.find(e => e.reversed).id, 'c>a');
});
test('layout is deterministic', () => {
  const a = layoutFlow(graphs.dense, { direction: 'right', measure }), b = layoutFlow(graphs.dense, { direction: 'right', measure });
  assert.deepEqual(a.nodes.map(n => [n.id, n.x, n.y]), b.nodes.map(n => [n.id, n.x, n.y]));
});
test('invalid graphs are named, not drawn', () => {                                       // Review Focus 4
  assert.deepEqual(validateGraph(graphs.threeTier), []);
  assert.match(validateGraph(invalid.duplicateId)[0], /duplicate/i);
  assert.match(validateGraph(invalid.danglingEdge)[0], /unknown node/i);
  assert.match(validateGraph(invalid.selfLoop)[0], /itself/i);
  assert.match(validateGraph(invalid.twentyOne)[0], /20/);
  assert.match(validateGraph(invalid.unknownZone)[0], /zone/i);
  assert.match(validateGraph(invalid.unknownKind)[0], /kind/i);
  assert.match(validateGraph(invalid.empty)[0], /no nodes/i);
  assert.throws(() => layoutFlow(invalid.danglingEdge, { direction: 'right', measure }), /unknown node/i);
});
test('edge labels do not overlap each other or any node', () => {
  for (const name of ['threeTier', 'dense', 'longLabels', 'crossZone']) for (const direction of ['right', 'down']) {
    const L = layoutFlow(graphs[name], { direction, measure });
    const labels = routeEdges(L, { direction }).filter(e => e.label).map(e => ({ id: e.id, x: e.label.x - e.label.w / 2, y: e.label.y - e.label.h / 2, w: e.label.w, h: e.label.h }));
    for (let i = 0; i < labels.length; i++) {
      for (let j = i + 1; j < labels.length; j++) assert.ok(!overlap(labels[i], labels[j]), `${name} ${direction}: labels of ${labels[i].id} and ${labels[j].id} overlap`);
      for (const n of L.nodes.filter(m => !m.virtual)) assert.ok(!overlap(labels[i], n), `${name} ${direction}: label of ${labels[i].id} covers ${n.id}`);
    }
  }
});
test('every routed edge has a path, sampled points and an arrow at its real target', () => {
  const L = layoutFlow(graphs.cycle, { direction: 'right', measure });
  const at = id => L.nodes.find(n => n.id === id);
  for (const e of routeEdges(L, { direction: 'right' })) {
    assert.match(e.d, /^M[-\d.]/);
    assert.ok(e.points.length >= 2);
    const target = at(e.id.split('>')[1]);
    const near = (p, b) => p.x >= b.x - 3 && p.x <= b.x + b.w + 3 && p.y >= b.y - 3 && p.y <= b.y + b.h + 3;
    assert.ok(near(e.arrow, target), `${e.id}: the arrow is not at ${target.id}`);
  }
});
