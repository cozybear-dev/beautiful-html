import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { audit, closeBrowser, skip, withPage, DESKTOP, PHONE } from '../helpers/browser.mjs';
import { assemble, fig, shell } from '../helpers/assemble.mjs';
import { graphs, invalid } from '../fixtures/graphs.mjs';

after(closeBrowser);
const page = (graph, extra = '') => assemble(shell(fig('f', 'Requests pass through the edge before they reach the application'),
  `window.__flow = BH.flow('#f', { ...${JSON.stringify(graph)}, ${extra} });`));
const errors = r => r.findings.filter(f => f.level === 'error').map(f => `${f.code}: ${f.message}`);
const STEPS = `steps: [{ title: 'Request arrives', text: 'The CDN filters it.', nodes: ['cdn', 'lb'], edges: ['cdn>lb'] }, { title: 'Routed to the API', nodes: ['lb', 'api'], edges: ['lb>api'] }, { title: 'Stored', nodes: ['api', 'db'], edges: ['api>db'] }]`;

for (const name of ['threeTier', 'dense', 'crossZone', 'cycle', 'longLabels']) {
  test(`${name} draws every node and edge, with no audit errors on desktop or phone`, { skip }, async () => {
    const html = page(graphs[name]);
    for (const mode of [DESKTOP, PHONE]) {
      const r = await audit(html, mode);
      assert.deepEqual(errors(r), [], `${mode.name}`);
      assert.ok(!r.findings.some(f => ['label-overlap', 'clipped-text', 'small-text'].includes(f.code)), `${mode.name}: ${r.findings.map(f => `${f.code} ${f.message}`).join(' | ')}`);
    }
    await withPage(html, DESKTOP, async p => {
      const r = await p.evaluate(`(() => { const el = document.querySelector('#f'); return { nodes: el.querySelectorAll('g.bh-node').length, edges: el.querySelectorAll('path.bh-edge').length,
        flow: el.__bhFlow && { n: el.__bhFlow.nodes.filter(n => !n.virtual).length, e: el.__bhFlow.edges.length, c: el.__bhFlow.crossings }, role: el.getAttribute('role'), zones: el.querySelectorAll('g.bh-zone').length }; })()`);
      assert.equal(r.nodes, graphs[name].nodes.length);
      assert.equal(r.edges, graphs[name].edges.length);
      assert.deepEqual([r.flow.n, r.flow.e], [graphs[name].nodes.length, graphs[name].edges.length]);
      assert.equal(r.zones, (graphs[name].zones || []).length);
      assert.equal(r.role, 'img');
    });
  });
}

test('a 60-character label wraps and its node stays inside the drawing', { skip }, async () => {            // Review Focus 2
  await withPage(page(graphs.longLabels), DESKTOP, async p => {
    const r = await p.evaluate(`(() => { const el = document.querySelector('#f'); const svg = el.querySelector('svg'); const vb = svg.viewBox.baseVal;
      const n = el.__bhFlow.nodes.find(n => n.id === 'a'); const lines = el.querySelectorAll('g.bh-node[data-id="a"] text.bh-node-label tspan').length;
      return { lines, inside: n.x >= 0 && n.y >= 0 && n.x + n.w <= vb.width && n.y + n.h <= vb.height, w: n.w }; })()`);
    assert.ok(r.lines >= 2, 'the label is on one line');
    assert.ok(r.inside);
    assert.ok(r.w < 260, `the node is ${r.w}px wide`);
  });
});

test('the diagram runs left to right when it fits and top to bottom on a phone', { skip }, async () => {
  const html = page(graphs.threeTier);
  await withPage(html, DESKTOP, async p => assert.equal(await p.evaluate(`document.querySelector('#f .bh-flow-svg').dataset.direction`), 'right'));
  await withPage(html, PHONE, async p => {
    assert.equal(await p.evaluate(`document.querySelector('#f .bh-flow-svg').dataset.direction`), 'down');
    assert.ok(await p.evaluate(`document.documentElement.scrollWidth <= innerWidth`), 'the page scrolls sideways');
  });
});

test('highlight marks the named path and leaves the rest as context', { skip }, async () => {
  await withPage(page(graphs.threeTier, `highlight: ['cdn', 'lb', 'api', 'db']`), DESKTOP, async p => {
    const r = await p.evaluate(`(() => { const q = s => [...document.querySelectorAll(s)].map(e => e.dataset.id).sort(); return { nodes: q('#f g.bh-node.is-key'), edges: q('#f g.bh-edge-group.is-key') }; })()`);
    assert.deepEqual(r.nodes, ['api', 'cdn', 'db', 'lb']);
    assert.deepEqual(r.edges, ['api>db', 'cdn>lb', 'lb>api']);
  });
});

test('pointing at a node dims everything that neither feeds it nor is fed by it', { skip }, async () => {
  await withPage(page(graphs.threeTier), DESKTOP, async p => {
    const r = await p.evaluate(`(() => { const node = id => document.querySelector('#f g.bh-node[data-id="' + id + '"]');
      node('web').dispatchEvent(new PointerEvent('pointerenter', { bubbles: false }));
      const dim = [...document.querySelectorAll('#f g.bh-node.is-dim')].map(e => e.dataset.id).sort();
      node('web').dispatchEvent(new PointerEvent('pointerleave', { bubbles: false }));
      return { dim, after: document.querySelectorAll('#f .is-dim').length }; })()`);
    assert.deepEqual(r.dim, [], 'web reaches api, db and cache, and is reached from cdn and lb');
    assert.equal(r.after, 0);
  });
  await withPage(page(graphs.threeTier), DESKTOP, async p => {
    const dim = await p.evaluate(`(() => { document.querySelector('#f g.bh-node[data-id="db"]').dispatchEvent(new PointerEvent('pointerenter')); return [...document.querySelectorAll('#f g.bh-node.is-dim')].map(e => e.dataset.id).sort(); })()`);
    assert.deepEqual(dim, ['cache'], 'only the cache is unrelated to the database');
  });
});

test('a walkthrough opens on the whole picture, steps on request and plays to the end', { skip }, async () => {
  await withPage(page(graphs.threeTier, STEPS), DESKTOP, async p => {
    const read = `(() => ({ count: document.querySelector('#f').closest('figure').querySelector('.bh-controls-count').textContent.trim(), caption: document.querySelector('#f').closest('figure').querySelector('.bh-caption-live').textContent.trim(),
      lit: [...document.querySelectorAll('#f g.bh-node.is-step')].map(e => e.dataset.id).sort(), dim: document.querySelectorAll('#f g.bh-node.is-dim').length }))()`;
    let s = await p.evaluate(read);
    assert.equal(s.dim, 0, 'the first view shows everything');
    assert.match(s.count, /0\s*\/\s*3|Overview/i);
    await p.evaluate(`window.__flow.step(1)`);
    s = await p.evaluate(read);
    assert.match(s.count, /1\s*\/\s*3/);
    assert.match(s.caption, /Request arrives[\s\S]*The CDN filters it/);
    assert.deepEqual(s.lit, ['cdn', 'lb']);
    assert.equal(s.dim, 4);
    await p.evaluate(`document.querySelector('#f').closest('figure').querySelector('[data-bh-next]').click()`);
    assert.match((await p.evaluate(read)).count, /2\s*\/\s*3/);
    await p.evaluate(`window.__flow.play({ interval: 60 }); new Promise(r => setTimeout(r, 400))`);
    s = await p.evaluate(read);
    assert.match(s.count, /3\s*\/\s*3/, 'play stops on the last step');
    const keys = await p.evaluate(`(() => { const stage = document.querySelector('#f .bh-flow-stage'); stage.focus(); stage.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true })); return document.querySelector('#f').closest('figure').querySelector('.bh-controls-count').textContent.trim(); })()`);
    assert.match(keys, /2\s*\/\s*3/);
  });
});

test('an invalid graph is explained in the figure', { skip }, async () => {                                  // Review Focus 4
  await withPage(page(invalid.danglingEdge), DESKTOP, async p => assert.match(await p.evaluate(`document.querySelector('#f .bh-error').textContent`), /unknown node "zz"/));
  await withPage(page(invalid.twentyOne), DESKTOP, async p => assert.match(await p.evaluate(`document.querySelector('#f .bh-error').textContent`), /at most 20[\s\S]*overview/i));
  await withPage(page(graphs.threeTier, `steps: [{ title: 'Bad', nodes: ['nope'] }]`), DESKTOP, async p => assert.match(await p.evaluate(`document.querySelector('#f .bh-error').textContent`), /step 1[\s\S]*"nope"/i));
});

test('BH.sankey draws one ribbon per link and labels every node', { skip }, async () => {
  const links = [['Lead', 'Qualified', 412], ['Lead', 'Disqualified', 596], ['Qualified', 'Proposal', 268], ['Qualified', 'Lost', 144], ['Proposal', 'Won', 71], ['Proposal', 'Lost', 197]].map(([source, target, value]) => ({ source, target, value }));
  const html = assemble(shell(fig('f', 'Most leads leave before a proposal'), `BH.sankey('#f', { links: ${JSON.stringify(links)}, unit: 'deals', highlight: ['Proposal>Won'] });`));
  for (const mode of [DESKTOP, PHONE]) assert.deepEqual(errors(await audit(html, mode)), [], mode.name);
  await withPage(html, DESKTOP, async p => {
    const r = await p.evaluate(`(() => { const el = document.querySelector('#f'); return { links: el.querySelectorAll('path.bh-sankey-link').length, nodes: el.querySelectorAll('rect.bh-sankey-node').length, key: el.querySelectorAll('path.bh-sankey-link.is-key').length, rows: el.closest('figure').querySelectorAll('details.bh-data tbody tr').length }; })()`);
    assert.deepEqual(r, { links: 6, nodes: 6, key: 1, rows: 6 });
  });
  const loop = assemble(shell(fig('f'), `BH.sankey('#f', { links: [{ source: 'A', target: 'B', value: 1 }, { source: 'B', target: 'A', value: 1 }] });`));
  await withPage(loop, DESKTOP, async p => assert.match(await p.evaluate(`document.querySelector('#f .bh-error').textContent`), /loop|cycle|forward/i));
});
