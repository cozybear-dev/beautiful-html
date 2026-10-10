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

test('a time axis over several years labels each year once', { skip }, async () => {
  const html = page(fig('f'), `const rows = []; for (let i = 0; i < 15; i++) rows.push({ q: new Date(Date.UTC(2023, i * 3, 1)), v: 21 - i }); BH.line('#f', { data: rows, x: 'q', y: 'v' });`);
  await withPage(html, DESKTOP, async p => {
    const ticks = await p.evaluate(`[...document.querySelectorAll('#f svg [aria-label="x-axis tick label"] text')].map(t => t.textContent)`);
    assert.deepEqual(ticks, ['2023', '2024', '2025', '2026']);
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

test('printing from a browser redraws charts at the paper width, then restores them', { skip }, async () => {
  const html = page(fig('f'), `BH.line('#f', { data: [1,2,3,4].map(i => ({ m: new Date(Date.UTC(2026, i, 1)), v: i })), x: 'm', y: 'v' });`);
  await withPage(html, DESKTOP, async p => {
    const w = () => p.evaluate(`Number(document.querySelector('#f svg').getAttribute('width'))`);
    const screen = await w();
    assert.ok(screen > 800, `on screen the chart is ${screen}px wide`);
    await p.evaluate(`window.dispatchEvent(new Event('beforeprint'))`);
    const paper = await w();
    assert.ok(paper > 600 && paper < 720, `for paper the chart is ${paper}px wide; an A4 page holds about 673px`);
    await p.evaluate(`window.dispatchEvent(new Event('afterprint'))`);
    assert.equal(await w(), screen);
  });
});

// ------------------------------------------------------------------ heatmap
const MATRIX = `const sectors = ['Manufacturing', 'Healthcare', 'Logistics', 'Finance'], tactics = ['Initial access', 'Credential access', 'Lateral movement', 'Exfiltration', 'Impact'];
const cells = sectors.flatMap((sector, i) => tactics.map((tactic, j) => ({ sector, tactic, share: (i * 7 + j * 11) % 43 + 2 })));`;
test('BH.heatmap draws one cell for every pair, with a key, readable values and a data table', { skip }, async () => {
  const html = page(fig('f'), `${MATRIX} BH.heatmap('#f', { data: cells, x: 'tactic', y: 'sector', value: 'share', unit: '%' });`);
  for (const mode of [DESKTOP, PHONE]) assert.deepEqual((await audit(html, mode)).findings.map(f => `${f.code}: ${f.message}`), [], mode.name);
  await withPage(html, { ...DESKTOP, reducedMotion: true }, async p => {
    const r = await p.evaluate(`(() => { const el = document.querySelector('#f'), fig = el.closest('figure');
      const lum = c => { const [r, g, b] = c.match(/[\\d.]+/g).slice(0, 3).map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
      const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
      const cells = [...el.querySelectorAll('.bh-heat-cell')];
      const worst = Math.min(...cells.map(c => { const t = c.parentNode.querySelector('.bh-heat-value'); return ratio(getComputedStyle(c).fill, getComputedStyle(t).fill); }));
      return { cells: cells.length, fills: new Set(cells.map(c => getComputedStyle(c).fill)).size, values: el.querySelectorAll('.bh-heat-value').length, worst,
        rows: [...el.querySelectorAll('.bh-heat-row')].map(t => t.textContent), cols: [...el.querySelectorAll('.bh-heat-col')].map(t => t.textContent.replace(/\\s+/g, ' ').trim()).length,
        key: el.querySelector('.bh-heat-key').textContent.replace(/\\s+/g, ' ').trim(), role: el.getAttribute('role'), title: cells[0].querySelector('title').textContent,
        table: fig.querySelectorAll('details.bh-data tbody tr').length, error: !!el.querySelector('.bh-error') }; })()`);
    assert.equal(r.error, false);
    assert.equal(r.cells, 20);
    assert.ok(r.fills >= 4, `only ${r.fills} different fills`);
    assert.equal(r.values, 20);
    assert.ok(r.worst >= 4.5, `a value has ${r.worst.toFixed(2)}:1 on its cell`);
    assert.deepEqual(r.rows, ['Manufacturing', 'Healthcare', 'Logistics', 'Finance'], 'rows keep the order of the data');
    assert.equal(r.cols, 5);
    assert.match(r.key, /^0%.*42%$/);
    assert.equal(r.role, 'img');
    assert.equal(r.title, 'Manufacturing, Initial access: 2%');
    assert.equal(r.table, 20);
  });
});
test('a wide heatmap on a phone drops the values it cannot fit and thins the column labels', { skip }, async () => {
  const html = page(fig('f'), `const days = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun']; const d = days.flatMap((day, i) => Array.from({ length: 24 }, (_, hour) => ({ day, hour, alerts: Math.round(40 + 30 * Math.sin((hour - 3) / 3.8) + (i > 4 ? -25 : 0) + (hour * 7 + i * 3) % 9) })));
    BH.heatmap('#f', { data: d, x: 'hour', y: 'day', value: 'alerts' });`);
  assert.deepEqual((await audit(html, PHONE)).findings.map(f => `${f.code}: ${f.message}`), []);
  await withPage(html, { ...PHONE, reducedMotion: true }, async p => {
    const r = await p.evaluate(`(() => { const el = document.querySelector('#f'); return { cells: el.querySelectorAll('.bh-heat-cell').length, values: el.querySelectorAll('.bh-heat-value').length, cols: el.querySelectorAll('.bh-heat-col').length, wide: el.scrollWidth > el.clientWidth + 1 }; })()`);
    assert.equal(r.cells, 168);
    assert.equal(r.values, 0);
    assert.ok(r.cols < 24 && r.cols >= 4, `${r.cols} column labels`);
    assert.equal(r.wide, false);
  });
});
test('a heatmap with a missing value or column says so, or leaves the cell empty', { skip }, async () => {
  const html = page(fig('a') + fig('b'), `BH.heatmap('#a', { data: [{ r: 'A', c: 'X', n: 1 }, { r: 'A', c: 'Y', n: 5 }, { r: 'B', c: 'X', n: 3 }], x: 'c', y: 'r', value: 'n' }); BH.heatmap('#b', { data: [{ r: 'A', c: 'X', n: 1 }], x: 'c', y: 'r' });`);
  await withPage(html, { ...DESKTOP, reducedMotion: true }, async p => {
    const r = await p.evaluate(`[document.querySelectorAll('#a .bh-heat-cell').length, document.querySelectorAll('#a .bh-heat-empty').length, document.querySelector('#b .bh-error').textContent]`);
    assert.deepEqual(r.slice(0, 2), [3, 1]);
    assert.match(r[2], /needs the value option/);
  });
});

test('a dumbbell that ends at zero keeps its value label clear of the category names', { skip }, async () => {
  const html = page(fig('f'), `BH.dot('#f', { data: [{ b: 'Office to operations', t: 41, p: 6 }, { b: 'Edge to office', t: 12, p: 9 }, { b: 'Edge to operations', t: 7, p: 0 }, { b: 'Operations to office', t: 0, p: 4 }], x: 'b', y: 't', y2: 'p', sort: 'none', zero: true });`);
  for (const mode of [DESKTOP, PHONE]) assert.deepEqual((await audit(html, mode)).findings.map(f => `${f.code}: ${f.message}`), [], mode.name);
});

test('a hairline that runs under a label is not taken for its background', { skip }, async () => {
  const html = page('<svg width="300" height="40" role="img" aria-label="A label on a grid line" style="font-family: var(--bh-font-data)"><line x1="150" y1="0" x2="150" y2="40" stroke="var(--bh-rule)"></line><text x="150" y="24" text-anchor="middle" fill="var(--bh-ink)" font-size="14">Workstations</text></svg>', '');
  assert.deepEqual((await audit(html)).findings.filter(f => f.code === 'low-contrast').map(f => f.message), []);
});

// ----------------------------------------------------------------- timeline
const INCIDENT = `const at = s => new Date(s + 'Z');
const ev = [
  { t: at('2026-09-14T08:12'), what: 'A session is stolen', who: 'Intruder' },
  { t: at('2026-09-14T10:15'), what: 'A colleague opens the document', who: 'Intruder' },
  { t: at('2026-09-15T16:20'), what: 'An administrator signs in', who: 'Intruder' },
  { t: at('2026-09-15T22:10'), what: 'A password is read from a script', who: 'Intruder' },
  { t: at('2026-09-16T01:20'), what: 'The directory is replicated', who: 'Intruder' },
  { t: at('2026-09-16T01:50'), what: 'First alert', who: 'Response', note: 'Read by an analyst four minutes later.' },
  { t: at('2026-09-16T03:05'), what: 'Workstation isolated', who: 'Response' },
  { t: at('2026-09-16T07:20'), what: 'Accounts disabled', who: 'Response' },
].map(e => ({ note: null, ...e }));          // as from CSV: every row has every column, and an empty cell is null
const phases = [{ from: '2026-09-14 08:12', to: '2026-09-16 01:50', label: 'Undetected', tone: 'bad' }, { from: '2026-09-16 01:50', to: '2026-09-16 07:20', label: 'Response', tone: 'good' }];`;
const TIMELINE = `${INCIDENT} BH.timeline('#f', { data: ev, x: 't', label: 'what', text: 'note', series: 'who', highlight: ['First alert'], phases });`;
test('BH.timeline draws an incident from start to end, to scale, with nothing on top of anything', { skip }, async () => {
  const html = page(fig('f', 'The intruder was inside for 41 hours and out within six'), TIMELINE);
  for (const mode of [DESKTOP, PHONE, { name: 'print', width: 794, height: 1123, media: 'print' }, { ...DESKTOP, name: 'reduced-motion', reducedMotion: true }]) {
    assert.deepEqual((await audit(html, mode)).findings.map(f => `${f.code}: ${f.message}`), [], mode.name);
  }
  await withPage(html, { ...DESKTOP, reducedMotion: true }, async p => {
    const r = await p.evaluate(`(() => { const el = document.querySelector('#f'), svg = el.querySelector('svg.bh-tl'), fig = el.closest('figure');
      const axis = svg.querySelector('.bh-tl-track').getBoundingClientRect(), axisY = axis.top + axis.height / 2;
      const events = [...svg.querySelectorAll('.bh-tl-event')].map(g => { const m = g.querySelector('.bh-tl-mark').getBoundingClientRect(), l = g.querySelector('.bh-tl-label').getBoundingClientRect(), s = g.querySelector('.bh-tl-stem').getBoundingClientRect();
        return { x: m.left + m.width / 2, label: [l.left, l.top, l.right, l.bottom], stem: [s.left + s.width / 2, s.top, s.bottom], above: l.bottom < axisY, key: g.classList.contains('is-key'), text: g.querySelector('.bh-tl-what').textContent }; });
      let crossed = 0;
      for (const a of events) for (const b of events) if (a !== b && a.stem[0] > b.label[0] + 1 && a.stem[0] < b.label[2] - 1 && a.stem[1] < b.label[3] - 1 && a.stem[2] > b.label[1] + 1) crossed++;
      return { events, crossed, phases: [...svg.querySelectorAll('.bh-tl-phase-label')].map(t => t.textContent), legend: (el.querySelector('.bh-legend') || {}).textContent || '',
        ticks: svg.querySelectorAll('.bh-tl-tick').length, role: el.getAttribute('role'), table: fig.querySelectorAll('details.bh-data tbody tr').length, error: !!el.querySelector('.bh-error') }; })()`);
    assert.equal(r.error, false);
    assert.equal(r.events.length, 8);
    assert.deepEqual(r.events.map(e => e.above), [true, true, true, true, true, false, false, false], 'the first group is above the line, the second below');
    const xs = r.events.map(e => e.x), span = xs[7] - xs[0];
    assert.ok(xs.every((x, i) => i === 0 || x >= xs[i - 1]), 'events run from left to right in time');
    assert.ok(Math.abs((xs[2] - xs[0]) / span - (32 + 8 / 60) / (47 + 8 / 60)) < 0.01, 'the line is to scale: the long wait is long');
    assert.equal(r.crossed, 0, 'no stem runs through the label of another event');
    assert.deepEqual(r.events.filter(e => e.key).map(e => e.text), ['First alert']);
    assert.equal(r.phases.length, 2);
    assert.match(r.phases[0], /Undetected.*41 h 38 min/);
    assert.match(r.phases[1], /Response.*5 h 30 min/);
    assert.match(r.legend, /Intruder[\\s\\S]*Response/);
    assert.ok(r.ticks >= 3);
    assert.equal(r.role, 'img');
    assert.equal(r.table, 8);
  });
});
test('on a phone a timeline becomes a list in order, which says where the long gaps are', { skip }, async () => {
  const html = page(fig('f'), TIMELINE);
  await withPage(html, { ...PHONE, reducedMotion: true }, async p => {
    const r = await p.evaluate(`(() => { const el = document.querySelector('#f'); return { svg: !!el.querySelector('svg.bh-tl'), items: [...el.querySelectorAll('.bh-tl-item')].map(li => li.querySelector('.bh-tl-what').textContent),
      when: el.querySelector('.bh-tl-item .bh-tl-when').textContent, gaps: [...el.querySelectorAll('.bh-tl-gap')].map(li => li.textContent.trim()), phases: [...el.querySelectorAll('.bh-tl-phase')].map(li => li.textContent.replace(/\\s+/g, ' ').trim()),
      note: (el.querySelector('.bh-tl-text') || {}).textContent, wide: el.scrollWidth > el.clientWidth + 1 }; })()`);
    assert.equal(r.svg, false);
    assert.equal(r.items.length, 8);
    assert.equal(r.items[0], 'A session is stolen');
    assert.match(r.when, /(14 Sep|Sep 14).*08:12/);
    assert.ok(r.gaps.some(g => /30 h 5 min/.test(g)), `gaps: ${r.gaps.join(' | ')}`);
    assert.deepEqual(r.phases, ['Undetected 41 h 38 min', 'Response 5 h 30 min']);
    assert.equal(r.note, 'Read by an analyst four minutes later.');
    assert.equal(r.wide, false);
  });
});
test('a timeline too crowded to label along a line is drawn as the list instead', { skip }, async () => {
  const html = page(fig('f'), `const ev = Array.from({ length: 9 }, (_, i) => ({ t: new Date(Date.UTC(2026, 8, 16, 1, 20 + i * 2)), what: 'Event number ' + (i + 1) + ' in a burst' })).concat([{ t: new Date(Date.UTC(2026, 8, 14, 8, 0)), what: 'Start' }]);
    BH.timeline('#f', { data: ev, x: 't', label: 'what' });`);
  assert.deepEqual((await audit(html)).findings.map(f => `${f.code}: ${f.message}`), []);
  await withPage(html, { ...DESKTOP, reducedMotion: true }, async p => {
    assert.deepEqual(await p.evaluate(`[!!document.querySelector('#f svg.bh-tl'), document.querySelectorAll('#f .bh-tl-item').length]`), [false, 10]);
  });
});
test('a timeline counts in numbers as well as dates, and says what is wrong with a bad description', { skip }, async () => {
  const html = page(fig('a') + fig('b') + fig('c') + fig('d'), `const steps = [{ h: 0, what: 'Start' }, { h: 2, what: 'Document opened' }, { h: 32, what: 'Administrator signs in' }, { h: 41, what: 'Directory replicated' }];
    BH.timeline('#a', { data: steps, x: 'h', label: 'what', unit: 'h' });
    BH.timeline('#b', { data: steps, x: 'h' });
    BH.timeline('#c', { data: steps.map((s, i) => ({ ...s, who: 'Team ' + i })), x: 'h', label: 'what', series: 'who' });
    BH.timeline('#d', { data: steps, x: 'h', label: 'what', phases: [{ from: 10, to: 4, label: 'Backwards' }] });`);
  await withPage(html, { ...DESKTOP, reducedMotion: true }, async p => {
    const r = await p.evaluate(`[document.querySelectorAll('#a .bh-tl-event').length, document.querySelector('#a .bh-tl-event .bh-tl-when').textContent, ...['#b', '#c', '#d'].map(s => document.querySelector(s + ' .bh-error').textContent)]`);
    assert.equal(r[0], 4);
    assert.match(r[1], /^0.h$/);
    assert.match(r[2], /needs the label option/);
    assert.match(r[3], /one or two groups/);
    assert.match(r[4], /ends before it starts/);
  });
});
