// BH.scatter: the relationship between two measures.
import { textWidth, v } from '../core.js';
import { boxesOverlap } from '../labels.js';
import { annotationMarks } from './line.js';
import { D3, P, assignColors, fmtY, legend, microPx, multiples, need, plotStyle, present, requireData, svgEl, uniq } from './common.js';
import { formatNumber } from '../format.js';
import { locale } from '../core.js';

const pretty = name => name.replace(/_/g, ' ');

export function drawScatter(el, o, width) {
  need(o, 'x', 'scatter'); need(o, 'y', 'scatter');
  requireData('scatter', o, ['x', 'y', 'series', 'size', 'label', 'facet']);
  const nice = vals => { const s = D3().scaleLinear().domain(D3().extent(vals.filter(x => typeof x === 'number'))).nice(5); return s.domain(); };
  if (o.facet) return multiples(o, width, drawScatter, { xDomain: o.xDomain || nice(o.data.map(d => d[o.x])), yDomain: o.yDomain || nice(o.data.map(d => d[o.y])) });

  const size = microPx(), compact = !!o.compact;
  const rows = o.data.filter(d => present(d[o.x]) && present(d[o.y]));
  const names = uniq(rows, o.series);
  const colors = names.length ? assignColors(names, o.highlight) : null;
  // Without series, highlight names points by their label.
  const set = !names.length && o.highlight !== undefined && typeof o.highlight !== 'function' ? new Set([].concat(o.highlight).map(String)) : null;
  const on = d => (colors ? colors.get(d[o.series]).on : set ? set.has(String(d[o.label])) : typeof o.highlight === 'function' ? !!o.highlight(d) : true);
  const fill = d => (colors ? colors.get(d[o.series]).color : on(d) ? v('accent') : v('neutral'));
  const xd = o.xDomain || nice(rows.map(d => d[o.x])), yd = o.yDomain || nice(rows.map(d => d[o.y]));
  const height = o.height || Math.round(Math.min(compact ? 220 : 460, Math.max(compact ? 150 : 260, width * (compact ? 0.8 : 0.56))));
  const big = t => Math.max(...t.map(Math.abs)) >= 10000;
  const tickFmt = (ticks, unit) => (d, i) => formatNumber(d, { locale: locale(), compact: big(ticks), unit: i === ticks.length - 1 ? unit : '' });
  const xt = D3().ticks(xd[0], xd[1], Math.max(2, Math.floor(width / 110))), yt = D3().ticks(yd[0], yd[1], 5);
  const r = o.size ? { r: o.size } : { r: compact ? 3 : 4.5 };
  const title = d => `${o.label ? `${d[o.label]}\n` : ''}${pretty(o.xLabel || o.x)}: ${fmtY(d[o.x], o.xUnit)}\n${pretty(o.yLabel || o.y)}: ${fmtY(d[o.y], o.unit)}`;
  const frac = x => (x - xd[0]) / Math.max(1e-9, xd[1] - xd[0]);

  const svg = P().plot({
    width, height, marginTop: 38, marginBottom: 42, marginLeft: 1, marginRight: 14,
    style: plotStyle(),
    x: { domain: xd, insetLeft: 34 }, y: { domain: yd }, r: o.size ? { range: [3, compact ? 9 : 16] } : undefined,
    marks: [
      P().gridY(yt, { stroke: v('rule'), strokeOpacity: 1 }),
      P().gridX(xt, { stroke: v('rule'), strokeOpacity: 1 }),
      P().axisY(yt, { anchor: 'left', tickSize: 0, tickPadding: 0, dy: -6, textAnchor: 'start', lineAnchor: 'bottom', tickFormat: tickFmt(yt, o.unit), fill: v('ink-2'), textStroke: v('ground'), textStrokeWidth: 4, label: null }),
      P().axisX(xt, { tickSize: 0, tickPadding: 7, tickFormat: tickFmt(xt, o.xUnit), fill: v('ink-2'), label: null }),
      P().text([`↑ ${pretty(o.yLabel || o.y)}`], { frameAnchor: 'top-left', lineAnchor: 'bottom', textAnchor: 'start', dy: -24, fill: v('ink'), fontWeight: 600 }),
      P().text([`${pretty(o.xLabel || o.x)} →`], { frameAnchor: 'bottom-right', lineAnchor: 'top', textAnchor: 'end', dy: 26, fill: v('ink'), fontWeight: 600 }),
      o.trend ? P().linearRegressionY(rows, { x: o.x, y: o.y, stroke: v('ink-3'), strokeWidth: 1.25, ci: 0 }) : null,
      P().dot(rows.filter(d => !on(d)), { x: o.x, y: o.y, ...r, fill: v('neutral'), fillOpacity: 0.75, stroke: v('ground'), strokeWidth: 1 }),
      P().dot(rows.filter(on), { x: o.x, y: o.y, ...r, fill, fillOpacity: o.size ? 0.85 : 1, stroke: v('ground'), strokeWidth: 1 }),
      ...annotationMarks({ ...o, series: undefined }, rows, 'number', frac, 'point'),
      compact ? null : P().tip(rows, P().pointer({ x: o.x, y: o.y, title, fill: v('ground'), stroke: v('rule-strong'), textPadding: 8, fontSize: size })),
    ].filter(Boolean),
  });

  // Label the points that matter, skipping any label that would cover another.
  if (o.label && !compact) {
    const xs = svg.scale('x'), ys = svg.scale('y');
    const wanted = rows.filter(d => (set || colors || typeof o.highlight === 'function' ? on(d) : rows.length <= 14) && present(d[o.label]));
    const taken = rows.map(d => ({ x: xs.apply(d[o.x]) - 5, y: ys.apply(d[o.y]) - 5, w: 10, h: 10 }));
    const g = svgEl('g', { class: 'bh-point-labels' });
    for (const d of wanted) {
      const w = textWidth(d[o.label], size, 600), h = size * 1.25, px = xs.apply(d[o.x]), py = ys.apply(d[o.y]);
      const spots = [{ x: px + 8, y: py - h / 2, a: 'start', tx: px + 8 }, { x: px - 8 - w, y: py - h / 2, a: 'end', tx: px - 8 },
        { x: px - w / 2, y: py - 8 - h, a: 'middle', tx: px }, { x: px - w / 2, y: py + 8, a: 'middle', tx: px }];
      const spot = spots.find(s => s.x >= 0 && s.x + w <= width && s.y >= 0 && !taken.some(t => boxesOverlap({ ...s, w, h }, t)));
      if (!spot) continue;
      taken.push({ x: spot.x, y: spot.y, w, h });
      const t = svgEl('text', { x: spot.tx, y: spot.y + h / 2, 'text-anchor': spot.a, 'dominant-baseline': 'central', fill: v('ink'), 'font-weight': 600, stroke: v('ground'), 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
      t.textContent = d[o.label];
      g.appendChild(t);
    }
    svg.appendChild(g);
  }
  const key = colors ? [...colors.values()].filter(c => c.on).map(c => ({ name: c.name, color: c.color, shape: 'dot' })).concat([...colors.values()].some(c => !c.on) ? [{ name: o.contextLabel || 'Others', color: v('neutral'), shape: 'dot' }] : []) : [];
  return key.length ? [legend(key), svg] : svg;
}
