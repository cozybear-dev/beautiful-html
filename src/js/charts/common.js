// Helpers shared by the chart functions: validation, colour assignment,
// scales, axes, legends and tooltips. Plot and d3 are globals from the kit.
import { BHError, locale, textWidth, tokenPx, v } from '../core.js';
import { formatDate, formatNumber, isYearLike } from '../format.js';

export const P = () => window.Plot;
export const D3 = () => window.d3;
export const DAY = 864e5;

export const plotStyle = () => ({ background: 'transparent', color: v('ink'), fontFamily: v('font-data'), fontSize: v('size-micro'), overflow: 'visible' });
export const microPx = () => tokenPx('size-micro');
export const smallPx = () => tokenPx('size-small');

// ---------------------------------------------------------------- validation

export function requireData(kind, o, fields) {
  if (!Array.isArray(o.data)) throw new BHError(`Pass the rows as data: an array of objects, for example BH.data('#my-csv').`);
  if (!o.data.length) throw new BHError('There is no data to draw: the data array is empty.');
  const columns = Object.keys(o.data[0]);
  for (const f of fields) {
    const name = o[f];
    if (name === undefined || name === null) continue;
    if (typeof name !== 'string') throw new BHError(`The ${f} option must be a column name (a string).`);
    if (!columns.includes(name)) throw new BHError(`The data has no "${name}" column (used for ${f}). Its columns are: ${columns.join(', ')}.`);
  }
}
export function need(o, field, kind) {
  if (!o[field]) throw new BHError(`BH.${kind} needs the ${field} option: the name of a column.`);
}
export const present = val => val !== null && val !== undefined && !(typeof val === 'number' && Number.isNaN(val));

// ------------------------------------------------------------------- colour

// Who gets colour. With `highlight`, only the named series are coloured and
// the rest are neutral context. Without it, every series is coloured, and more
// than six is refused: nobody can tell seven hues apart reliably.
export function assignColors(names, highlight) {
  const list = names.length ? names : [undefined];
  const pick = highlight === undefined || highlight === null ? null
    : typeof highlight === 'function' ? highlight
      : (set => n => set.has(String(n)))(new Set([].concat(highlight).map(String)));
  const on = list.filter(n => (pick ? pick(n) : true));
  if (pick && names.length && !on.length) throw new BHError(`highlight matched no series. The series are: ${names.join(', ')}.`);
  if (on.length > 6) {
    throw new BHError(`${on.length} coloured series are too many to tell apart. Use highlight to colour the one or two that matter, or facet to draw small multiples.`);
  }
  const map = new Map();
  let i = 0;
  for (const n of list) {
    const lit = on.includes(n);
    map.set(n, { name: n, on: lit, color: lit ? v(`cat-${++i}`) : v('neutral') });
  }
  return map;
}
export const uniq = (data, field) => (field ? [...new Set(data.map(d => d[field]).filter(present))] : []);

// ------------------------------------------------------------------- scales

export function kindOf(values) {
  const vals = values.filter(present);
  if (vals.length && vals.every(x => x instanceof Date)) return 'time';
  if (vals.length && vals.every(x => typeof x === 'number')) return isYearLike(vals) ? 'year' : 'number';
  return 'category';
}

// A value domain with honest padding. `zero` forces the baseline to zero.
export function valueDomain(values, { zero = false, domain, compact = false } = {}) {
  // Small multiples get three labels: both ends and the middle.
  const thin = t => (compact && t.length > 3 ? [t[0], t[Math.floor((t.length - 1) / 2)], t[t.length - 1]] : t);
  if (domain) return { domain, ticks: thin(D3().ticks(domain[0], domain[1], 5)) };
  const vals = values.filter(x => typeof x === 'number' && Number.isFinite(x));
  if (!vals.length) throw new BHError('The value column has no numbers in it.');
  let lo = Math.min(...vals), hi = Math.max(...vals);
  // Start at zero when the data is already close to it; a truncated axis exaggerates change.
  if (zero || (lo >= 0 && lo < hi * 0.6)) lo = Math.min(0, lo);
  if (hi <= 0 && (zero || hi > lo * 0.6)) hi = Math.max(0, hi);
  if (lo === hi) { if (lo === 0) hi = 1; else if (lo > 0) lo = 0; else hi = 0; }
  const scale = D3().scaleLinear().domain([lo, hi]).nice(5);
  return { domain: scale.domain(), ticks: thin(scale.ticks(5)) };
}

// Width of the widest value-axis label, so data can start clear of the labels.
export function tickLabelWidth(ticks, unit) {
  const big = Math.max(...ticks.map(Math.abs)) >= 10000;
  const size = microPx();
  return Math.ceil(Math.max(...ticks.map((d, i) => textWidth(formatNumber(d, { locale: locale(), compact: big, unit: i === ticks.length - 1 ? unit : '' }), size))));
}

// Value-axis marks: hairline grid, labels sitting on the lines at the left
// edge, the unit on the top label only.
export function valueAxisY({ ticks, unit, width }) {
  const big = Math.max(...ticks.map(Math.abs)) >= 10000;
  const fmt = (d, i) => formatNumber(d, { locale: locale(), compact: big, unit: i === ticks.length - 1 ? unit : '' });
  return [
    P().gridY(ticks, { stroke: v('rule'), strokeOpacity: 1 }),
    P().axisY(ticks, { anchor: 'left', tickSize: 0, tickPadding: 0, dx: 0, dy: -6, textAnchor: 'start', lineAnchor: 'bottom', tickFormat: fmt, fill: v('ink-2'), textStroke: v('ground'), textStrokeWidth: 4, label: null }),
  ];
}
export function valueAxisX({ ticks, unit, anchor = 'top' }) {
  const big = Math.max(...ticks.map(Math.abs)) >= 10000;
  const fmt = (d, i) => formatNumber(d, { locale: locale(), compact: big, unit: i === ticks.length - 1 ? unit : '' });
  return [
    P().gridX(ticks, { stroke: v('rule'), strokeOpacity: 1 }),
    P().axisX(ticks, { anchor, tickSize: 0, tickPadding: 6, tickFormat: fmt, fill: v('ink-2'), label: null }),
  ];
}

// Time ticks with the month on one line and the year below when it changes.
export function timeAxisX(values, width, { anchor = 'bottom' } = {}) {
  const dates = values.filter(present);
  const lo = new Date(Math.min(...dates)), hi = new Date(Math.max(...dates));
  const span = hi - lo;
  const count = Math.max(2, Math.min(10, Math.floor(width / 96)));
  const ticks = D3().utcTicks(lo, hi, count);
  const loc = locale();
  const part = opts => d => new Intl.DateTimeFormat(loc, { ...opts, timeZone: 'UTC' }).format(d);
  const year = part({ year: 'numeric' });
  let fmt;
  if (span > 730 * DAY) fmt = d => year(d);
  else if (span > 2 * DAY) {
    const top = span > 60 * DAY ? part({ month: 'short' }) : part({ day: 'numeric', month: 'short' });
    fmt = (d, i) => (i === 0 || year(d) !== year(ticks[i - 1]) ? `${top(d)}\n${year(d)}` : top(d));
  } else fmt = d => formatDate(d, { locale: loc, span });
  return { span, mark: P().axisX(ticks, { anchor, tickSize: 4, tickPadding: 5, stroke: v('rule-strong'), tickFormat: fmt, fill: v('ink-2'), label: null }) };
}
export const fmtX = (val, kind, span) => (kind === 'time' ? formatDate(val, { locale: locale(), span: Math.min(span || 365 * DAY, 700 * DAY) })
  : kind === 'number' ? formatNumber(val, { locale: locale() }) : String(val));
export const fmtY = (val, unit) => formatNumber(val, { locale: locale(), unit });

// ------------------------------------------------------------------- pieces

export function legend(items, shape = 'square') {
  const box = document.createElement('div');
  box.className = 'bh-legend';
  for (const it of items) {
    const item = document.createElement('span');
    item.className = 'bh-legend-item';
    const sw = document.createElement('i');
    sw.style.setProperty('--c', it.color);
    if ((it.shape || shape) !== 'square') sw.dataset.shape = it.shape || shape;
    item.append(sw, document.createTextNode(String(it.name)));
    box.appendChild(item);
  }
  return box;
}

// Hover tooltip: the nearest point, with a plain three-line title.
export function tip(data, { x, y, title, pointer = 'pointer' }) {
  return P().tip(data, P()[pointer]({ x, y, title, fill: v('ground'), stroke: v('rule-strong'), textPadding: 8, lineHeight: 1.3, fontSize: microPx() }));
}

// An SVG <text> with a ground-coloured halo, for labels drawn after Plot is done.
export function svgText(text, { x, y, anchor = 'start', weight = 400, fill = v('ink'), size, halo = true, cls }) {
  const t = document.createElementNS('http://www.w3.org/2000/svg', 'text');
  t.setAttribute('x', x);
  t.setAttribute('y', y);
  t.setAttribute('text-anchor', anchor);
  t.setAttribute('dominant-baseline', 'central');
  t.setAttribute('fill', fill);
  t.setAttribute('font-weight', weight);
  if (size) t.setAttribute('font-size', size);
  if (halo) { t.setAttribute('stroke', v('ground')); t.setAttribute('stroke-width', 4); t.setAttribute('paint-order', 'stroke'); t.setAttribute('stroke-linejoin', 'round'); }
  if (cls) t.setAttribute('class', cls);
  t.textContent = text;
  return t;
}
export const svgEl = (name, attrs = {}) => {
  const n = document.createElementNS('http://www.w3.org/2000/svg', name);
  for (const [k, val] of Object.entries(attrs)) n.setAttribute(k, val);
  return n;
};

// Cut a label to fit `max` pixels, keeping the full text available on hover.
export function fit(text, max, size, weight) {
  const s = String(text);
  if (textWidth(s, size, weight) <= max) return { text: s, cut: false };
  let lo = 1, hi = s.length;
  while (lo < hi) { const mid = (lo + hi + 1) >> 1; if (textWidth(`${s.slice(0, mid)}…`, size, weight) <= max) lo = mid; else hi = mid - 1; }
  return { text: `${s.slice(0, lo).trimEnd()}…`, cut: true };
}

// Small multiples: split rows by a column and draw each group with one shared scale.
export function multiples(o, width, drawOne, shared) {
  const groups = uniq(o.data, o.facet);
  if (!groups.length) throw new BHError(`The facet column "${o.facet}" has no values.`);
  if (groups.length > 24) throw new BHError(`${groups.length} small multiples are too many to read. Group or filter the data to 24 or fewer.`);
  const box = document.createElement('div');
  box.className = 'bh-multiples';
  const cols = Math.max(1, Math.min(groups.length, Math.floor((width + 24) / (208 + 24))));
  const cell = Math.floor((width - (cols - 1) * 24) / cols);
  box.style.gridTemplateColumns = `repeat(${cols}, minmax(0, 1fr))`;
  for (const g of groups) {
    const item = document.createElement('div');
    item.className = 'bh-multiple';
    const title = document.createElement('p');
    title.className = 'bh-multiple-title';
    title.textContent = String(g);
    const plot = document.createElement('div');
    plot.className = 'bh-multiple-plot';
    const out = drawOne(null, { ...o, ...shared, facet: undefined, data: o.data.filter(d => d[o.facet] === g), compact: true }, cell);
    plot.append(...[].concat(out).filter(Boolean));
    item.append(title, plot);
    box.appendChild(item);
  }
  return box;
}
