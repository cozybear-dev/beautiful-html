// BH.line: change over time, for one or many series.
import { BHError, textWidth, v } from '../core.js';
import { inferType } from '../data.js';
import { dodge } from '../labels.js';
import { D3, P, assignColors, fmtX, fmtY, kindOf, legend, microPx, multiples, need, plotStyle, present, requireData, svgEl, tickLabelWidth, timeAxisX, tip, uniq, valueAxisY, valueDomain } from './common.js';

const sameX = (a, b) => (a instanceof Date && b instanceof Date ? a.getTime() === b.getTime() : a === b);
// Annotation positions are written as text ("2026-05") and must match the data's type.
const coerce = (val, kind) => (typeof val === 'string' && kind !== 'category' ? inferType(val) : val);

// Annotations. An event is a vertical line with a note at the top; a point
// annotation is a ring on the data with a note beside it. With only x given, a
// single-series chart marks the point and a multi-series chart marks an event.
function resolveAnnotation(a, o, rows, kind) {
  if (!a || !a.text || a.x === undefined) throw new BHError('Each annotation needs x and text (plus y or series to mark a point).');
  const x = coerce(a.x, kind);
  if (a.event === true) return { x, event: true };
  if (a.y !== undefined) return { x, y: a.y };
  if (a.series !== undefined && o.series) {
    const hit = rows.find(d => sameX(d[o.x], x) && String(d[o.series]) === String(a.series));
    if (!hit) throw new BHError(`The annotation "${a.text}" points at ${a.series} on ${a.x}, but the data has no such row.`);
    return { x, y: hit[o.y] };
  }
  if (!o.series) {
    const hit = rows.find(d => sameX(d[o.x], x));
    if (hit && hit[o.y] !== null && hit[o.y] !== undefined) return { x, y: hit[o.y] };
  }
  return { x, event: true };
}

// `which` is 'event' or 'point', so events can sit under the data and points over it.
export function annotationMarks(o, rows, kind, frac, which, geom) {
  const marks = [];
  const levels = [];                                   // event notes already placed, by row, so two never collide
  for (const a of o.annotations || []) {
    const r = resolveAnnotation(a, o, rows, kind);
    if ((which === 'event') !== !!r.event) continue;
    const right = frac(r.x) > 0.62;
    const text = { text: [a.text], fill: v('ink'), stroke: v('ground'), strokeWidth: 5, lineWidth: a.width || 15, textAnchor: right ? 'end' : 'start' };
    if (r.event) {
      let level = 0;
      if (geom) {
        const size = geom.size, w = Math.min(textWidth(a.text, size), (a.width || 15) * size);
        const at = geom.left + frac(r.x) * geom.width, span = right ? [at + 3 - w, at + 3] : [at - 3, at - 3 + w];
        while ((levels[level] || []).some(s => s[0] < span[1] + 8 && span[0] < s[1] + 8)) level++;
        (levels[level] = levels[level] || []).push(span);
      }
      marks.push(P().ruleX([r.x], { stroke: v('ink-3'), strokeWidth: 1 }));
      marks.push(P().text([r.x], { ...text, x: d => d, frameAnchor: 'top', lineAnchor: 'bottom', dx: right ? 3 : -3, dy: -5 - level * Math.round((geom ? geom.size : 12) * 1.35) }));
    } else {
      marks.push(P().dot([r], { x: 'x', y: 'y', r: 5.5, fill: 'none', stroke: v('ink'), strokeWidth: 1.5 }));
      marks.push(P().text([r], { ...text, x: 'x', y: 'y', lineAnchor: a.below ? 'top' : 'bottom', dx: (a.dx || 0) + (right ? 2 : -2), dy: a.dy ?? (a.below ? 12 : -12) }));
    }
  }
  return marks;
}

export function drawLine(el, o, width) {
  need(o, 'x', 'line'); need(o, 'y', 'line');
  requireData('line', o, ['x', 'y', 'series', 'facet']);
  if (o.facet) {
    const all = o.data.filter(d => present(d[o.x]));
    const xs = all.map(d => d[o.x]);
    const shared = { yDomain: o.yDomain || valueDomain(all.map(d => d[o.y]), { zero: o.zero }).domain };
    if (kindOf(xs) !== 'category') shared.xDomain = [new (xs[0] instanceof Date ? Date : Number)(Math.min(...xs)), new (xs[0] instanceof Date ? Date : Number)(Math.max(...xs))];
    return multiples(o, width, drawLine, shared);
  }

  const rows = o.data.filter(d => present(d[o.x]));
  const kind = kindOf(rows.map(d => d[o.x]));
  if (kind !== 'category') rows.sort((a, b) => a[o.x] - b[o.x]);
  const names = uniq(rows, o.series);
  const colors = assignColors(names, o.highlight);
  const of = d => colors.get(o.series ? d[o.series] : undefined) || { on: false, color: v('neutral') };
  const compact = !!o.compact;
  const size = microPx();
  const { domain, ticks } = valueDomain(rows.map(d => d[o.y]), { zero: o.zero, domain: o.yDomain, compact });

  // The last point of each series carries its label.
  const ends = [...colors.values()].map(c => {
    const pts = rows.filter(d => (o.series ? d[o.series] === c.name : true) && present(d[o.y]));
    return pts.length ? { ...c, row: pts[pts.length - 1] } : null;
  }).filter(Boolean);
  const lit = ends.filter(e => e.on);
  const context = ends.filter(e => !e.on);
  const valueText = e => fmtY(e.row[o.y], o.unit);
  const wantLabels = o.labels !== false;
  const named = names.length > 0 && !compact;                      // small multiples label the value only
  const labelWidth = e => (named ? textWidth(`${e.name} `, size, 600) : 0) + textWidth(valueText(e), size, named ? 400 : 600);
  const widest = wantLabels && lit.length ? Math.max(...lit.map(labelWidth)) : 0;
  const useLegend = wantLabels && named && (widest + 22 > width * 0.34 || o.labels === 'legend');
  const endLabels = wantLabels && !useLegend;

  const baseHeight = o.height || Math.round(Math.min(compact ? 190 : 420, Math.max(compact ? 132 : 232, width * (compact ? 0.6 : 0.44))));
  const xValues = rows.map(d => d[o.x]);
  let xAxis, span;
  if (kind === 'time') ({ mark: xAxis, span } = timeAxisX(o.xDomain || xValues, width));
  else if (kind === 'category') {
    const cats = [...new Set(xValues)];
    const step = Math.max(1, Math.ceil(cats.length * (Math.max(...cats.map(c => textWidth(c, size))) + 14) / Math.max(1, width - 40)));
    xAxis = P().axisX(cats.filter((_, i) => i % step === 0), { tickSize: 4, tickPadding: 5, stroke: v('rule-strong'), fill: v('ink-2'), label: null });
  } else xAxis = P().axisX({ ticks: Math.max(2, Math.floor(width / 96)), tickSize: 4, tickPadding: 5, stroke: v('rule-strong'), fill: v('ink-2'), label: null, tickFormat: kind === 'year' ? d => String(d) : undefined });

  const lo = Math.min(...xValues), hi = Math.max(...xValues);
  const frac = x => (kind === 'category' ? [...new Set(xValues)].indexOf(x) / Math.max(1, new Set(xValues).size - 1) : (x - lo) / Math.max(1e-9, hi - lo));
  const title = d => `${o.series ? `${d[o.series]}\n` : ''}${fmtX(d[o.x], kind, span)}: ${fmtY(d[o.y], o.unit)}`;
  const hasValue = d => present(d[o.y]);
  // Event notes get rows of their own above the plot, so they never sit on the data.
  const events = (o.annotations || []).filter(a => a && (a.event === true || (a.y === undefined && a.series === undefined && !!o.series))).length;
  const eventRows = Math.min(events, 3);
  const inset = tickLabelWidth(ticks, o.unit) + 8;       // data starts clear of the value-axis labels

  const height = baseHeight + eventRows * Math.round(size * 1.35);
  const svg = P().plot({
    width, height,
    marginTop: 18 + eventRows * Math.round(size * 1.35), marginBottom: 34, marginLeft: 1, marginRight: endLabels ? Math.ceil(widest) + 22 : 12,
    style: plotStyle(),
    x: { type: kind === 'time' ? 'utc' : kind === 'category' ? 'point' : 'linear', domain: kind === 'category' ? undefined : o.xDomain, insetLeft: inset, insetRight: kind === 'category' ? 8 : 0 },
    y: { domain },
    marks: [
      ...valueAxisY({ ticks, unit: o.unit, width }),
      xAxis,
      P().ruleY([domain[0]], { stroke: domain[0] === 0 ? v('ink') : v('rule-strong') }),
      ...annotationMarks(o, rows, kind, frac, 'event', { left: inset, width: width - inset - (endLabels ? Math.ceil(widest) + 22 : 12), size }),
      context.length ? P().line(rows.filter(d => !of(d).on), { x: o.x, y: o.y, z: o.series, stroke: v('neutral'), strokeWidth: 1.25, strokeLinejoin: 'round', className: 'bh-line bh-line-context' }) : null,
      ...lit.flatMap(e => {
        const own = rows.filter(d => (o.series ? d[o.series] === e.name : true));
        return [
          P().line(own, { x: o.x, y: o.y, stroke: v('ground'), strokeWidth: 5, strokeLinejoin: 'round' }),
          P().line(own, { x: o.x, y: o.y, stroke: e.color, strokeWidth: 2, strokeLinejoin: 'round', strokeLinecap: 'round', className: 'bh-line bh-line-signal' }),
        ];
      }),
      P().dot(lit.map(e => e.row), { x: o.x, y: o.y, r: 3.5, fill: d => of(d).color, stroke: v('ground'), strokeWidth: 1.5, className: 'bh-end-dot' }),
      ...annotationMarks(o, rows, kind, frac, 'point'),
      compact ? null : P().dot(rows.filter(hasValue), P().pointer({ x: o.x, y: o.y, r: 4.5, fill: v('ink'), stroke: v('ground'), strokeWidth: 1.5 })),
      compact ? null : tip(rows.filter(hasValue), { x: o.x, y: o.y, title }),
    ].filter(Boolean),
  });

  if (endLabels && lit.length) {
    const ys = svg.scale('y'), xs = svg.scale('x');
    const items = lit.map(e => ({ e, y: ys.apply(e.row[o.y]), height: size * 1.3 }));
    const placed = dodge(items, { min: 8, max: height - 30, gap: 1 });
    const g = svgEl('g', { class: 'bh-end-labels' });
    items.forEach((it, i) => {
      const x0 = xs.apply(it.e.row[o.x]) + 9;
      if (Math.abs(placed[i] - it.y) > 5) g.appendChild(svgEl('line', { x1: x0 - 5, y1: it.y, x2: x0 - 1, y2: placed[i], stroke: v('rule-strong'), 'stroke-width': 1 }));
      const t = svgEl('text', { x: x0, y: placed[i], 'text-anchor': 'start', 'dominant-baseline': 'central', stroke: v('ground'), 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' });
      if (named) {
        const name = svgEl('tspan', { fill: v('ink'), 'font-weight': 600 });
        name.textContent = `${it.e.name} `;
        t.appendChild(name);
      }
      const val = svgEl('tspan', { fill: named ? v('ink-2') : v('ink'), 'font-weight': named ? 400 : 600 });
      val.textContent = valueText(it.e);
      t.appendChild(val);
      g.appendChild(t);
    });
    svg.appendChild(g);
  }

  const key = [];
  if (useLegend) key.push(...lit.map(e => ({ name: e.name, color: e.color, shape: 'line' })));
  if (context.length && !compact) key.push({ name: o.contextLabel || (useLegend || lit.length ? 'Others' : 'All'), color: v('neutral'), shape: 'line' });
  return key.length ? [legend(key), svg] : svg;
}
