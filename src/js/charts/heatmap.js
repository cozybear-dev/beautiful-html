// BH.heatmap: a value for every pair of two categories. x names the columns,
// y the rows, and value the number that colours each cell. Colour is the
// seven-step sequential ramp; the value is written in the cell when it fits.
import { BHError, locale, textWidth, v, wrap } from '../core.js';
import { formatDate } from '../format.js';
import { DAY, fit, fmtY, microPx, need, present, requireData, smallPx, svgEl, uniq } from './common.js';

const STEPS = 7;
const lum = rgb => {
  const [r, g, b] = rgb.match(/[\d.]+/g).slice(0, 3).map(x => { const c = x / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
};
const ratio = (a, b) => (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);

// Which of ink and ground reads better on each step of the ramp, where the figure is.
// A cover or a band gives the tokens other values, so they are resolved in place.
function inkOnSteps(el) {
  const probe = document.createElement('i');
  probe.style.cssText = 'position:absolute;visibility:hidden';
  el.appendChild(probe);
  const colour = name => { probe.style.color = v(name); return lum(getComputedStyle(probe).color); };
  const ink = colour('ink'), ground = colour('ground');
  const out = Array.from({ length: STEPS }, (_, i) => { const c = colour(`seq-${i + 1}`); return ratio(c, ink) >= ratio(c, ground) ? 'ink' : 'ground'; });
  probe.remove();
  return out;
}

export function drawHeatmap(el, o, width) {
  need(o, 'x', 'heatmap'); need(o, 'y', 'heatmap'); need(o, 'value', 'heatmap');
  requireData('heatmap', o, ['x', 'y', 'value']);
  const rows = o.data.filter(d => present(d[o.x]) && present(d[o.y]));
  const cols = uniq(rows, o.x);
  let lines = uniq(rows, o.y);
  if (cols.length > 31 || lines.length > 40) throw new BHError(`A heatmap of ${lines.length} rows by ${cols.length} columns is too fine to read. Group the data to at most 40 rows and 31 columns.`);
  const vals = rows.map(d => d[o.value]).filter(x => typeof x === 'number' && Number.isFinite(x));
  if (!vals.length) throw new BHError('The value column has no numbers in it.');
  const keyOf = c => (c instanceof Date ? c.getTime() : c);
  const at = new Map(rows.map(d => [`${keyOf(d[o.y])}|${keyOf(d[o.x])}`, d[o.value]]));
  const cell = (r, c) => at.get(`${keyOf(r)}|${keyOf(c)}`);
  if (o.sort === 'value') {
    const total = r => cols.reduce((s, c) => s + (Number(cell(r, c)) || 0), 0);
    lines = [...lines].sort((a, b) => total(b) - total(a));
  }

  // The scale starts at zero when the data is near it, as a value axis does.
  let [lo, hi] = o.domain || [Math.min(...vals), Math.max(...vals)];
  if (!o.domain && lo > 0 && lo < hi * 0.6) lo = 0;
  if (!(hi > lo)) hi = lo + 1;
  const step = x => Math.max(1, Math.min(STEPS, 1 + Math.floor((x - lo) / (hi - lo) * STEPS)));

  const size = microPx(), labelSize = smallPx(), gap = 2;
  const dates = cols.filter(c => c instanceof Date);
  const span = dates.length > 1 ? Math.max(...dates) - Math.min(...dates) : 365 * DAY;
  const name = c => (c instanceof Date ? formatDate(c, { locale: locale(), span }) : String(c));
  const text = val => fmtY(val, o.unit);

  // Row labels take what they need, up to a third of the width.
  const labelW = Math.min(Math.round(width * 0.34), Math.ceil(Math.max(...lines.map(r => textWidth(name(r), labelSize)))) + 10);
  const cellW = Math.min(104, (width - labelW - (cols.length - 1) * gap) / cols.length);
  const cellH = Math.round(Math.max(22, Math.min(44, cellW * 0.6)));
  const plotW = cols.length * cellW + (cols.length - 1) * gap;

  // Column labels: on one line, else wrapped inside the column, else every nth one.
  const lineH = Math.round(size * 1.25);
  const widest = Math.max(...cols.map(c => textWidth(name(c), size)));
  let heads, every = 1;
  if (widest + 6 <= cellW) heads = cols.map(c => [name(c)]);
  else {
    const wrapped = cols.map(c => wrap(name(c), cellW - 2, size, 400));
    if (wrapped.every(l => l.length <= 3 && l.every(t => textWidth(t, size) <= cellW))) heads = wrapped;
    else { every = Math.ceil((widest + 8) / (cellW + gap)); heads = cols.map(c => [name(c)]); }
  }
  const top = Math.max(...heads.map(h => h.length)) * lineH + 6;
  const showValues = o.labels !== false && cellH >= 18 && Math.max(...vals.map(x => textWidth(text(x), size))) + 6 <= cellW;
  const inks = showValues ? inkOnSteps(el) : [];

  const height = top + lines.length * cellH + (lines.length - 1) * gap;
  const svg = svgEl('svg', { class: 'bh-heat', width, height, viewBox: `0 0 ${width} ${height}`, focusable: 'false' });
  const label = (str, attrs) => { const t = svgEl('text', { 'font-size': size, fill: v('ink-2'), ...attrs }); t.textContent = str; return t; };
  cols.forEach((c, j) => {
    if (j % every) return;
    const x = labelW + j * (cellW + gap) + cellW / 2;
    const t = label('', { class: 'bh-heat-col', 'text-anchor': every > 1 && j === 0 ? 'start' : 'middle', x: every > 1 && j === 0 ? labelW : x });
    heads[j].forEach((str, k) => { const s = svgEl('tspan', { x: t.getAttribute('x'), y: top - 8 - (heads[j].length - 1 - k) * lineH }); s.textContent = str; t.appendChild(s); });
    svg.appendChild(t);
  });
  lines.forEach((r, i) => {
    const y = top + i * (cellH + gap);
    const cut = fit(name(r), labelW - 10, labelSize, 400);
    const t = label(cut.text, { class: 'bh-heat-row', 'font-size': labelSize, fill: v('ink'), x: labelW - 10, y: y + cellH / 2, 'text-anchor': 'end', 'dominant-baseline': 'central' });
    if (cut.cut) { const full = svgEl('title'); full.textContent = name(r); t.appendChild(full); }
    svg.appendChild(t);
    cols.forEach((c, j) => {
      const val = cell(r, c), x = labelW + j * (cellW + gap);
      const g = svgEl('g', { 'data-col': j, 'data-row': i });
      if (typeof val !== 'number' || !Number.isFinite(val)) { g.appendChild(svgEl('rect', { class: 'bh-heat-empty', x, y, width: cellW, height: cellH, fill: 'none', stroke: v('rule') })); svg.appendChild(g); return; }
      const k = step(val);
      const rect = svgEl('rect', { class: 'bh-heat-cell', x, y, width: cellW, height: cellH, fill: v(`seq-${k}`) });
      const tip = svgEl('title'); tip.textContent = `${name(r)}, ${name(c)}: ${text(val)}`;
      rect.appendChild(tip);
      g.appendChild(rect);
      if (showValues) g.appendChild(label(text(val), { class: 'bh-heat-value', x: x + cellW / 2, y: y + cellH / 2, 'text-anchor': 'middle', 'dominant-baseline': 'central', fill: v(inks[k - 1]), 'pointer-events': 'none' }));
      svg.appendChild(g);
    });
  });

  // The key: the ramp between the two ends of the scale.
  const key = document.createElement('div');
  key.className = 'bh-legend bh-heat-key';
  const end = str => { const s = document.createElement('span'); s.textContent = str; return s; };
  const ramp = document.createElement('span');
  ramp.className = 'bh-heat-ramp';
  for (let k = 1; k <= STEPS; k++) { const sw = document.createElement('i'); sw.style.setProperty('--c', v(`seq-${k}`)); ramp.appendChild(sw); }
  key.append(end(text(lo)), ramp, end(text(hi)));
  key.style.paddingLeft = `${labelW}px`;
  void plotW;
  return [key, svg];
}

export function heatmapTable(o) {
  const col = (k, extra = {}) => ({ key: o[k], label: (o.names && o.names[k]) || String(o[k]).replace(/_/g, ' '), ...extra });
  return { columns: [col('y'), col('x'), col('value', { unit: o.unit, numeric: true })], rows: o.data || [] };
}
