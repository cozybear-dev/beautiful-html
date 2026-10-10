// BH.bar: magnitude and ranking. x is the category (or period), y is the value.
// Horizontal for categories, vertical for periods; grouped or stacked by series.
// Bars always start at zero.
import { BHError, textWidth, v } from '../core.js';
import { D3, P, assignColors, fit, fmtX, fmtY, kindOf, legend, microPx, multiples, need, plotStyle, present, requireData, smallPx, tip, uniq, valueAxisX, valueAxisY, valueDomain } from './common.js';

const sum = list => list.reduce((s, x) => s + (Number(x) || 0), 0);
const keyOf = c => (c instanceof Date ? c.getTime() : c);
const zeroDomain = d => d && [Math.min(0, d[0]), Math.max(0, d[1])];

export function drawBar(el, o, width) {
  need(o, 'x', 'bar'); need(o, 'y', 'bar');
  requireData('bar', o, ['x', 'y', 'series', 'facet']);
  if (o.mode !== undefined && !['grouped', 'stacked'].includes(o.mode)) throw new BHError('mode must be "grouped" or "stacked".');
  if (o.layout !== undefined && !['horizontal', 'vertical'].includes(o.layout)) throw new BHError('layout must be "horizontal" or "vertical".');
  if (o.facet) {
    const stacked = o.series && o.mode === 'stacked';
    const values = stacked
      ? uniq(o.data, o.facet).flatMap(f => uniq(o.data, o.x).map(c => sum(o.data.filter(d => d[o.facet] === f && keyOf(d[o.x]) === keyOf(c)).map(d => d[o.y]))))
      : o.data.map(d => d[o.y]);
    return multiples(o, width, drawBar, { yDomain: valueDomain(values, { zero: true }).domain, order: uniq(o.data, o.x) });
  }
  const rows = o.data.filter(d => present(d[o.x]));
  const kind = kindOf(rows.map(d => d[o.x]));
  const names = uniq(rows, o.series);
  const mode = names.length ? (o.mode || 'grouped') : 'single';
  if (mode === 'stacked' && rows.some(d => d[o.y] < 0)) throw new BHError('Stacked bars cannot show negative values. Use mode "grouped" or a dot plot.');
  const layout = o.layout || (kind === 'category' ? 'horizontal' : 'vertical');
  return layout === 'horizontal' ? horizontal(o, rows, names, mode, width, kind) : vertical(o, rows, names, mode, width, kind);
}

// For a single series, highlight names categories; with series, it names series.
function colouring(o, names, cats) {
  if (names.length) {
    const colors = assignColors(names, o.highlight);
    const list = [...colors.values()];
    const key = list.filter(c => c.on).map(c => ({ name: c.name, color: c.color }));
    if (list.some(c => !c.on)) key.push({ name: o.contextLabel || 'Others', color: v('neutral-soft') });
    const soft = c => (c.on ? c.color : v('neutral-soft'));       // large fills use the soft neutral
    return { colorOf: name => soft(colors.get(name)), fill: d => soft(colors.get(d[o.series])), key };
  }
  if (o.highlight === undefined || o.highlight === null) return { fill: () => v('accent'), key: [] };
  const set = typeof o.highlight === 'function' ? null : new Set([].concat(o.highlight).map(String));
  const on = c => (set ? set.has(String(c)) : !!o.highlight(c));
  if (!cats.some(on)) throw new BHError(`highlight matched no bar. The categories are: ${cats.slice(0, 12).join(', ')}.`);
  return { fill: d => (on(d[o.x]) ? v('accent') : v('neutral-soft')), key: [] };
}

function horizontal(o, rows, names, mode, width, kind) {
  const size = microPx(), labelSize = smallPx(), compact = !!o.compact;
  const total = c => sum(rows.filter(d => d[o.x] === c).map(d => d[o.y]));
  const peak = c => Math.max(...rows.filter(d => d[o.x] === c).map(d => Number(d[o.y]) || 0));
  let cats = o.order ? o.order.filter(c => rows.some(d => d[o.x] === c)) : uniq(rows, o.x);
  if (!o.order && (o.sort ?? (kind === 'category' ? 'value' : 'none')) === 'value') {
    const rank = mode === 'grouped' ? peak : total;
    cats = [...cats].sort((a, b) => rank(b) - rank(a));
  }
  if (o.limit && cats.length > o.limit) cats = cats.slice(0, o.limit);
  const shown = rows.filter(d => cats.includes(d[o.x]));
  const { fill, key, colorOf } = colouring(o, names, cats);
  const values = mode === 'stacked' ? cats.map(total) : shown.map(d => d[o.y]);
  const dom = valueDomain(values, { zero: true, domain: zeroDomain(o.yDomain) });
  const negative = dom.domain[0] < 0;

  // Category labels sit beside the bars when they fit in about a third of the
  // width; otherwise each sits on its own line above its bar.
  const widest = Math.max(...cats.map(c => textWidth(c, labelSize)));
  const above = compact || width < 440 || widest > width * 0.36;
  const labelH = above ? Math.round(labelSize * 1.35) + 3 : 0;
  const labelCol = above ? 0 : Math.min(Math.ceil(widest), Math.floor(width * 0.36)) + 12;
  const valueCol = Math.ceil(Math.max(...values.map(x => textWidth(fmtY(x, o.unit), size, 600)))) + 12;
  const per = mode === 'grouped' ? names.length : 1;
  const bar = mode === 'grouped' ? 12 : 16, gap = 2;
  const group = per * bar + (per - 1) * gap;
  const top = above ? labelH : 7;
  const band = top + group + (above ? 11 : 7);
  const marginTop = negative ? 22 : 2;
  const height = marginTop + cats.length * band + 4;
  const mid = k => top + k * (bar + gap) + bar / 2 - band / 2;         // bar centre, from the band centre
  const insets = k => ({ insetTop: top + k * (bar + gap), insetBottom: band - top - k * (bar + gap) - bar });
  const title = d => `${d[o.x]}${o.series ? `\n${d[o.series]}` : ''}: ${fmtY(d[o.y], o.unit)}`;
  // Anchors are constants in Plot, so positive and negative values are separate marks.
  const valueLabel = (data, k, value, weight = 600) => [[d => value(d) >= 0, 'start', 6], [d => value(d) < 0, 'end', -6]].map(([keep, anchor, dx]) =>
    P().text(data.filter(keep), { y: o.x, x: value, text: d => fmtY(value(d), o.unit), textAnchor: anchor, dx, dy: mid(k), fill: v('ink'), fontWeight: weight }));

  const marks = [];
  if (negative) marks.push(...valueAxisX({ ticks: dom.ticks, unit: o.unit }));
  if (mode === 'grouped') {
    names.forEach((name, k) => {
      const own = shown.filter(d => d[o.series] === name);
      marks.push(P().barX(own, { y: o.x, x: o.y, fill: colorOf(name), ...insets(k), className: 'bh-bar-mark' }));
      marks.push(...valueLabel(own, k, d => d[o.y], 400));
    });
  } else if (mode === 'stacked') {
    marks.push(P().barX(shown, { y: o.x, x: o.y, fill, order: names, ...insets(0), insetLeft: 0.75, insetRight: 0.75, className: 'bh-bar-mark' }));
    marks.push(...valueLabel(cats.map(c => ({ [o.x]: c, total: total(c) })), 0, d => d.total));
  } else {
    marks.push(P().barX(shown, { y: o.x, x: o.y, fill, ...insets(0), className: 'bh-bar-mark' }));
    marks.push(...valueLabel(shown, 0, d => d[o.y]));
  }
  marks.push(P().ruleX([0], { stroke: v('ink') }));
  marks.push(above
    ? P().text(cats, { y: d => d, text: c => fit(c, width - 4, labelSize).text, frameAnchor: 'left', textAnchor: 'start', lineAnchor: 'top', dy: -band / 2, fontSize: labelSize, fill: v('ink') })
    : P().text(cats, { y: d => d, text: c => fit(c, labelCol - 12, labelSize).text, frameAnchor: 'left', textAnchor: 'end', dx: -12, dy: top + group / 2 - band / 2, fontSize: labelSize, fill: v('ink') }));
  if (!compact) marks.push(P().tip(shown, P().pointerY({ x: o.y, y: o.x, title, fill: v('ground'), stroke: v('rule-strong'), textPadding: 8, fontSize: size })));

  const svg = P().plot({
    width, height, marginTop, marginBottom: 4, marginLeft: labelCol + 1, marginRight: valueCol,
    style: plotStyle(),
    x: { domain: dom.domain, axis: null },
    y: { type: 'band', domain: cats, axis: null, padding: 0 },
    marks,
  });
  return key.length ? [legend(key), svg] : svg;
}

function vertical(o, rows, names, mode, width, kind) {
  const size = microPx(), compact = !!o.compact;
  const seen = new Map();
  for (const d of rows) if (!seen.has(keyOf(d[o.x]))) seen.set(keyOf(d[o.x]), d[o.x]);
  let cats = o.order ? o.order : [...seen.values()];
  if (!o.order && kind !== 'category') cats = [...cats].sort((a, b) => a - b);
  const { fill, key, colorOf } = colouring(o, names, cats);
  const total = c => sum(rows.filter(d => keyOf(d[o.x]) === keyOf(c)).map(d => d[o.y]));
  const values = mode === 'stacked' ? cats.map(total) : rows.map(d => d[o.y]);
  const dom = valueDomain(values, { zero: true, domain: zeroDomain(o.yDomain) });
  const height = o.height || Math.round(Math.min(compact ? 190 : 400, Math.max(compact ? 132 : 232, width * (compact ? 0.6 : 0.42))));
  const span = kind === 'time' ? Math.max(...cats) - Math.min(...cats) : 0;
  const label = c => (kind === 'time' ? fmtX(c, 'time', span) : String(c));
  const step = Math.max(1, Math.ceil(cats.length * (Math.max(...cats.map(c => textWidth(label(c), size))) + 12) / Math.max(1, width - 8)));
  const ticks = cats.filter((_, i) => i % step === 0);
  const title = d => `${label(d[o.x])}${o.series ? `\n${d[o.series]}` : ''}: ${fmtY(d[o.y], o.unit)}`;
  const padding = cats.length > 24 ? 0.12 : 0.28;
  const bw = D3().scaleBand().domain(cats.map(keyOf)).range([1, width - 1]).padding(padding).bandwidth();
  const showValues = !compact && mode !== 'grouped' && o.labels !== false && bw > Math.max(...values.map(x => textWidth(fmtY(x), size, 600))) + 2;

  const marks = [
    ...valueAxisY({ ticks: dom.ticks, unit: o.unit, width }),
    P().axisX(ticks, { tickSize: 0, tickPadding: 7, tickFormat: label, fill: v('ink-2'), label: null }),
  ];
  if (mode === 'grouped') {
    const n = names.length, g = 1.5, w = Math.max(1, (bw - (n - 1) * g) / n);
    names.forEach((name, k) => marks.push(P().barY(rows.filter(d => d[o.series] === name), {
      x: o.x, y: o.y, fill: colorOf(name), insetLeft: k * (w + g), insetRight: Math.max(0, bw - k * (w + g) - w), className: 'bh-bar-mark',
    })));
  } else {
    marks.push(P().barY(rows, { x: o.x, y: o.y, fill, ...(mode === 'stacked' ? { order: names, insetTop: 0.75, insetBottom: 0.75 } : {}), className: 'bh-bar-mark' }));
  }
  if (showValues) {
    const totals = cats.map(c => ({ c, t: total(c) }));
    marks.push(P().text(totals.filter(d => d.t >= 0), { x: 'c', y: 't', text: d => fmtY(d.t), lineAnchor: 'bottom', dy: -5, fill: v('ink'), fontWeight: 600 }));
    marks.push(P().text(totals.filter(d => d.t < 0), { x: 'c', y: 't', text: d => fmtY(d.t), lineAnchor: 'top', dy: 5, fill: v('ink'), fontWeight: 600 }));
  }
  marks.push(P().ruleY([0], { stroke: v('ink') }));
  if (!compact) marks.push(P().tip(rows, P().pointerX({ x: o.x, y: o.y, title, fill: v('ground'), stroke: v('rule-strong'), textPadding: 8, fontSize: size })));

  const svg = P().plot({
    width, height, marginTop: 20, marginBottom: 30, marginLeft: 1, marginRight: 1,
    style: plotStyle(),
    x: { type: 'band', domain: cats, padding },
    y: { domain: dom.domain },
    marks,
  });
  return key.length ? [legend(key), svg] : svg;
}
