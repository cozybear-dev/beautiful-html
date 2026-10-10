import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { audit, closeBrowser, skip, withPage, DESKTOP, PHONE } from '../helpers/browser.mjs';
import { assemble, fig, shell } from '../helpers/assemble.mjs';

after(closeBrowser);
const page = (body, script) => assemble(shell(body, script));
const errors = r => r.findings.filter(f => f.level === 'error').map(f => `${f.code}: ${f.message}`);

const SERIES = `const months = ['2026-01','2026-02','2026-03','2026-04','2026-05','2026-06'];
const seg = { Enterprise: [2.1,2.0,1.9,1.2,1.0,0.9], 'Mid-market': [2.8,2.9,2.7,2.6,2.7,2.5], Small: [4.1,4.3,4.0,4.2,4.4,4.1] };
const rows = Object.entries(seg).flatMap(([segment, v]) => v.map((churn, i) => ({ month: new Date(months[i] + '-01T00:00:00Z'), segment, churn })));`;
const TEAMS = `const teams = [{team:'Dispatch',users:127},{team:'Fleet Planning',users:81},{team:'Customer Service',users:95},{team:'Warehouse Ops',users:62},{team:'Finance',users:24}];`;

const CASES = {
  line: [`${SERIES} BH.line('#f', { data: rows, x: 'month', y: 'churn', series: 'segment', highlight: 'Enterprise', unit: '%', annotations: [{ x: '2026-04', series: 'Enterprise', text: 'Pricing change' }] });`, 18],
  bar: [`${TEAMS} BH.bar('#f', { data: teams, x: 'team', y: 'users' });`, 5],
  dot: [`const d = [{team:'Dispatch',before:61,after:78},{team:'Finance',before:9,after:11},{team:'Procurement',before:30,after:44}]; BH.dot('#f', { data: d, x: 'team', y: 'before', y2: 'after', unit: '%' });`, 3],
  scatter: [`const d = Array.from({length: 12}, (_, i) => ({ name: 'Rep ' + (i+1), cycle: 30 + i * 4, win: 40 - i * 2 + (i % 3) * 3 })); BH.scatter('#f', { data: d, x: 'cycle', y: 'win', label: 'name', trend: true, unit: '%' });`, 12],
  plot: [`BH.plot('#f', { height: 200, marks: [Plot.rectY([1,2,2,3,3,3,4,4,5], Plot.binX({ y: 'count' }, { x: d => d }))] });`, null],
};

for (const [kind, [script, rowCount]] of Object.entries(CASES)) {
  test(`BH.${kind} draws an accessible figure with no errors`, { skip }, async () => {
    const html = page(fig('f'), script);
    assert.deepEqual(errors(await audit(html, DESKTOP)), []);
    await withPage(html, DESKTOP, async p => {
      const r = await p.evaluate(`(() => { const el = document.querySelector('#f'); const fig = el.closest('figure');
        return { svg: !!el.querySelector('svg'), error: !!document.querySelector('.bh-error'), role: el.getAttribute('role'), label: el.getAttribute('aria-label'),
          rows: fig.querySelectorAll('details.bh-data tbody tr').length }; })()`);
      assert.equal(r.svg, true);
      assert.equal(r.error, false);
      assert.equal(r.role, 'img');
      assert.match(r.label, /A finding about the data/);
      if (rowCount !== null) assert.equal(r.rows, rowCount, 'the data table has one row per data row');
    });
  });
}

test('BH.spark and BH.waffle draw inline', { skip }, async () => {
  const html = page('<p>Trend <span id="s"></span> and share <span id="w"></span></p>', `BH.spark('#s', { values: [3,4,4,6,5,8] }); BH.waffle('#w', { value: 38 });`);
  assert.deepEqual(errors(await audit(html)), []);
  await withPage(html, DESKTOP, async p => {
    assert.equal(await p.evaluate(`document.querySelectorAll('#s svg path').length`), 1);
    assert.equal(await p.evaluate(`document.querySelectorAll('#w i[data-on]').length`), 38);
  });
});

test('a bar chart always includes zero, whatever the data', { skip }, async () => {
  const html = page(fig('f'), `BH.bar('#f', { data: [{q:'Q1',v:980},{q:'Q2',v:1010},{q:'Q3',v:1040}], x: 'q', y: 'v', layout: 'vertical' });`);
  await withPage(html, DESKTOP, async p => {
    const ticks = await p.evaluate(`[...document.querySelectorAll('#f svg [aria-label="y-axis tick label"] text')].map(t => t.textContent)`);
    assert.ok(ticks.includes('0'), `value axis ticks were ${ticks.join(', ')}`);
  });
});

test('more than six coloured series is refused with advice', { skip }, async () => {
  const html = page(fig('f'), `const rows = []; for (let s = 1; s <= 7; s++) for (let x = 1; x <= 4; x++) rows.push({ x, y: s * x, s: 'Series ' + s }); BH.line('#f', { data: rows, x: 'x', y: 'y', series: 's' });`);
  await withPage(html, DESKTOP, async p => {
    assert.match(await p.evaluate(`document.querySelector('#f .bh-error').textContent`), /highlight[\s\S]*facet/);
  });
  assert.ok((await audit(html)).findings.some(f => f.code === 'figure-failed'));
});

test('highlight colours exactly one series and leaves the rest neutral', { skip }, async () => {
  const html = page(fig('f'), CASES.line[0]);
  await withPage(html, DESKTOP, async p => {
    const r = await p.evaluate(`(() => { const cs = el => getComputedStyle(el).stroke; const root = getComputedStyle(document.documentElement);
      const probe = n => { const s = document.createElement('span'); s.style.color = 'var(--bh-' + n + ')'; document.body.appendChild(s); const c = getComputedStyle(s).color; s.remove(); return c; };
      return { signal: [...document.querySelectorAll('#f .bh-line-signal path')].map(cs), context: [...document.querySelectorAll('#f .bh-line-context path')].map(cs), accent: probe('accent'), neutral: probe('neutral') }; })()`);
    assert.deepEqual(r.signal, [r.accent]);
    assert.equal(r.context.length, 2);
    assert.ok(r.context.every(c => c === r.neutral));
  });
});

// Review Focus 3: degenerate data never throws.
for (const [name, data] of [['empty data', '[]'], ['a single row', `[{ m: new Date('2026-01-01'), v: 4 }]`], ['all-equal values', `[1,2,3,4].map(i => ({ m: new Date(Date.UTC(2026, i, 1)), v: 5 }))`]]) {
  test(`${name} gives a message or a valid chart, never a script error`, { skip }, async () => {
    const html = page(fig('a') + fig('b'), `const d = ${data}; BH.line('#a', { data: d, x: 'm', y: 'v' }); BH.bar('#b', { data: d, x: 'm', y: 'v' });`);
    const r = await audit(html);
    assert.ok(!r.findings.some(f => f.code === 'console-error'), errors(r).join('\n'));
    await withPage(html, DESKTOP, async p => {
      const state = await p.evaluate(`['#a', '#b'].map(s => { const el = document.querySelector(s); return el.querySelector('.bh-error') ? 'message' : el.querySelector('svg') ? 'chart' : 'nothing'; })`);
      assert.ok(state.every(s => s !== 'nothing'), state.join(', '));
      if (name === 'empty data') assert.deepEqual(state, ['message', 'message']);
    });
  });
}

// Review Focus 2: long labels never push the page wider than a phone.
test('a 40-character category label fits a phone without overflow', { skip }, async () => {
  const html = page(fig('f'), `BH.bar('#f', { data: [{ c: 'Customer Service and Support Operations', v: 12 }, { c: 'Warehouse and Distribution Centre Teams', v: 30 }, { c: 'Ops', v: 21 }], x: 'c', y: 'v' });`);
  const r = await audit(html, PHONE);
  assert.ok(!r.findings.some(f => ['horizontal-overflow', 'clipped-text', 'label-overlap'].includes(f.code)), r.findings.map(f => f.code).join(', '));
});

test('a wrong column name is explained in the figure', { skip }, async () => {
  const html = page(fig('f'), `BH.bar('#f', { data: [{ team: 'A', users: 1 }], x: 'team', y: 'usres' });`);
  await withPage(html, DESKTOP, async p => {
    assert.match(await p.evaluate(`document.querySelector('#f .bh-error').textContent`), /no "usres" column[\s\S]*team, users/);
  });
});

test('BH.data reads CSV embedded in the page', { skip }, async () => {
  const html = page('<script type="text/csv" id="d">\nmonth,value\n2026-01,3\n2026-02,\n2026-03,5\n</script>' + fig('f'), `const rows = BH.data('#d'); window.__rows = rows; BH.line('#f', { data: rows, x: 'month', y: 'value' });`);
  await withPage(html, DESKTOP, async p => {
    assert.deepEqual(await p.evaluate(`[window.__rows.length, window.__rows[1].value, window.__rows[0].month instanceof Date]`), [3, null, true]);
  });
});

test('small multiples share one scale', { skip }, async () => {
  const html = page(fig('f'), `${SERIES} BH.line('#f', { data: rows, x: 'month', y: 'churn', facet: 'segment', unit: '%' });`);
  await withPage(html, DESKTOP, async p => {
    const tops = await p.evaluate(`[...document.querySelectorAll('#f .bh-multiple')].map(m => [...m.querySelectorAll('[aria-label="y-axis tick label"] text')].map(t => t.textContent).join('|'))`);
    assert.equal(tops.length, 3);
    assert.equal(new Set(tops).size, 1, tops.join(' / '));
  });
});

test('two event notes close together on a narrow chart do not collide', { skip }, async () => {
  const html = page(fig('f'), `const d = Array.from({ length: 60 }, (_, i) => ({ t: new Date(Date.UTC(1970, 0, 1, 13, 30 + i)), v: i < 20 ? 1 : i < 45 ? 90 : 2 }));
    BH.line('#f', { data: d, x: 't', y: 'v', unit: '%', annotations: [{ x: '13:52', text: 'Cache memory lowered', event: true }, { x: '14:16', text: 'Change rolled back', event: true }] });`);
  for (const mode of [DESKTOP, PHONE]) assert.ok(!(await audit(html, mode)).findings.some(f => f.code === 'label-overlap'), mode.name);
});
