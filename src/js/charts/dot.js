// BH.dot: values on one scale, one row per category. With y2 it becomes a
// dumbbell that shows the change between two values (before and after).
import { BHError, textWidth, v } from '../core.js';
import { P, assignColors, fit, fmtY, legend, microPx, multiples, need, plotStyle, present, requireData, smallPx, uniq, valueAxisX, valueDomain } from './common.js';

export function drawDot(el, o, width) {
  need(o, 'x', 'dot'); need(o, 'y', 'dot');
  requireData('dot', o, ['x', 'y', 'y2', 'series', 'facet']);
  if (o.y2 && o.series) throw new BHError('Use either y2 (a dumbbell) or series (several dots per row), not both.');
  if (o.facet) {
    const vals = o.data.flatMap(d => [d[o.y], o.y2 ? d[o.y2] : null]);
    return multiples(o, width, drawDot, { yDomain: valueDomain(vals, { zero: o.zero }).domain, order: uniq(o.data, o.x) });
  }
  const size = microPx(), labelSize = smallPx(), compact = !!o.compact;
  const rows = o.data.filter(d => present(d[o.x]) && present(d[o.y]));
  const names = uniq(rows, o.series);
  const colors = names.length ? assignColors(names, o.highlight) : null;
  const end = d => (o.y2 && present(d[o.y2]) ? d[o.y2] : d[o.y]);
  let cats = o.order ? o.order.filter(c => rows.some(d => d[o.x] === c)) : uniq(rows, o.x);
  if (!o.order && (o.sort ?? 'value') === 'value') {
    const rank = c => Math.max(...rows.filter(d => d[o.x] === c).map(end));
    cats = [...cats].sort((a, b) => rank(b) - rank(a));
  }
  const dom = valueDomain(rows.flatMap(d => [d[o.y], o.y2 ? d[o.y2] : null]), { zero: o.zero, domain: o.yDomain });

  const widest = Math.max(...cats.map(c => textWidth(c, labelSize)));
  const above = compact || width < 440 || widest > width * 0.36;
  const labelH = above ? Math.round(labelSize * 1.35) + 2 : 0;
  const labelCol = above ? 0 : Math.min(Math.ceil(widest), Math.floor(width * 0.36)) + 14;
  const band = labelH + (above ? 26 : 30);
  const dy = labelH / 2;                                             // dots sit below a label that is above
  const marginTop = 26, height = marginTop + cats.length * band + 6;
  const fmt = x => fmtY(x, o.unit);
  const valueW = Math.ceil(Math.max(...rows.map(d => textWidth(fmt(end(d)), size, 600)))) + 14;
  // In a dumbbell the lower end is labelled on its left; leave room for that label before the scale starts.
  const leftW = o.y2 ? Math.ceil(Math.max(0, ...rows.filter(d => present(d[o.y2])).map(d => textWidth(fmt(Math.min(d[o.y], d[o.y2])), size, 600)))) + 12 : 0;
  const single = !o.y2 && !names.length;
  const lit = o.highlight === undefined || names.length ? () => true
    : (set => c => set.has(String(c)))(new Set([].concat(o.highlight).map(String)));

  const marks = [
    ...valueAxisX({ ticks: dom.ticks, unit: o.unit }),
    above ? null : P().ruleY(cats, { y: d => d, stroke: v('rule'), dy }),
  ].filter(Boolean);
  if (o.y2) {
    const both = rows.filter(d => present(d[o.y2]));
    marks.push(P().ruleY(both, { y: o.x, x1: o.y, x2: o.y2, stroke: v('ink-3'), strokeWidth: 2, dy, className: 'bh-dumbbell' }));
    marks.push(P().dot(both, { y: o.x, x: o.y, r: 5, fill: v('ground'), stroke: v('neutral'), strokeWidth: 2, dy }));
    marks.push(P().dot(both, { y: o.x, x: o.y2, r: 5.5, fill: v('accent'), stroke: v('ground'), strokeWidth: 1.5, dy }));
    for (const [rowsOf, endAnchor, startAnchor, sign] of [[both.filter(d => d[o.y2] >= d[o.y]), 'start', 'end', 1], [both.filter(d => d[o.y2] < d[o.y]), 'end', 'start', -1]]) {
      marks.push(P().text(rowsOf, { y: o.x, x: o.y2, text: d => fmt(d[o.y2]), textAnchor: endAnchor, dx: 10 * sign, dy, fill: v('ink'), fontWeight: 600, stroke: v('ground'), strokeWidth: 4 }));
      marks.push(P().text(rowsOf, { y: o.x, x: o.y, text: d => fmt(d[o.y]), textAnchor: startAnchor, dx: -10 * sign, dy, fill: v('ink-2'), stroke: v('ground'), strokeWidth: 4 }));
    }
  } else if (names.length) {
    marks.push(P().dot(rows.filter(d => !colors.get(d[o.series]).on), { y: o.x, x: o.y, r: 4.5, fill: v('neutral'), stroke: v('ground'), strokeWidth: 1.5, dy }));
    marks.push(P().dot(rows.filter(d => colors.get(d[o.series]).on), { y: o.x, x: o.y, r: 5.5, fill: d => colors.get(d[o.series]).color, stroke: v('ground'), strokeWidth: 1.5, dy }));
  } else {
    if (o.stem) marks.push(P().ruleY(rows, { y: o.x, x1: Math.max(dom.domain[0], Math.min(0, dom.domain[1])), x2: o.y, stroke: v('rule-strong'), strokeWidth: 1.5, dy }));
    marks.push(P().dot(rows, { y: o.x, x: o.y, r: 5.5, fill: d => (lit(d[o.x]) ? v('accent') : v('neutral')), stroke: v('ground'), strokeWidth: 1.5, dy }));
    marks.push(P().text(rows, { y: o.x, x: o.y, text: d => fmt(d[o.y]), textAnchor: 'start', dx: 10, dy, fill: v('ink'), fontWeight: 600, stroke: v('ground'), strokeWidth: 4 }));
  }
  marks.push(above
    ? P().text(cats, { y: d => d, text: c => fit(c, width - 4, labelSize).text, frameAnchor: 'left', textAnchor: 'start', lineAnchor: 'top', dy: -band / 2 + 1, fontSize: labelSize, fill: v('ink') })
    : P().text(cats, { y: d => d, text: c => fit(c, labelCol - 14, labelSize).text, frameAnchor: 'left', textAnchor: 'end', dx: -14, fontSize: labelSize, fill: v('ink') }));
  if (!compact) {
    const title = d => `${d[o.x]}${o.series ? `\n${d[o.series]}` : ''}: ${fmt(d[o.y])}${o.y2 && present(d[o.y2]) ? ` → ${fmt(d[o.y2])}` : ''}`;
    marks.push(P().tip(rows, P().pointerY({ x: d => end(d), y: o.x, title, dy, fill: v('ground'), stroke: v('rule-strong'), textPadding: 8, fontSize: size })));
  }

  const svg = P().plot({
    width, height, marginTop, marginBottom: 4, marginLeft: above ? 1 : labelCol + 8, marginRight: single || o.y2 ? valueW + 6 : 14,
    style: plotStyle(),
    x: { domain: dom.domain, axis: null, insetLeft: (above ? 6 : 0) + leftW },
    y: { type: 'band', domain: cats, axis: null, padding: 0 },
    marks,
  });
  const key = o.y2
    ? [{ name: (o.names && o.names.y) || o.y.replace(/_/g, ' '), color: v('neutral'), shape: 'ring' }, { name: (o.names && o.names.y2) || o.y2.replace(/_/g, ' '), color: v('accent'), shape: 'dot' }]
    : names.length ? [...colors.values()].filter(c => c.on).map(c => ({ name: c.name, color: c.color, shape: 'dot' })).concat([...colors.values()].some(c => !c.on) ? [{ name: o.contextLabel || 'Others', color: v('neutral'), shape: 'dot' }] : []) : [];
  return key.length ? [legend(key), svg] : svg;
}
