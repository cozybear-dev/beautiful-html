// BH.timeline: what happened when, from start to end, drawn to scale.
// Each event is a flag on a line of time: a stem at its moment and a label
// beside the stem. One group of events stands above the line and a second,
// if there is one, hangs below it, so two sides of a story (what an intruder
// did, what the response did) can be read against each other. Phases colour
// the line and are named, with their length, above it.
// Where a line cannot carry the labels (a phone, or a burst of events too
// tight to separate) the same events are set as a list in order, which says
// in words where the long gaps are.
import { BHError, locale, textWidth, v, wrap } from '../core.js';
import { inferType } from '../data.js';
import { formatNumber } from '../format.js';
import { D3, legend, microPx, need, present, requireData, smallPx, svgEl, uniq } from './common.js';
import { duration, fitScale, placeFlags } from '../timeline-layout.js';

const DAY = 864e5;
const TONES = { bad: 'bad', warn: 'warn', good: 'good', accent: 'accent' };
const tone = name => v(TONES[name] || 'neutral');

// A moment given as a Date, a number, or text such as "2026-09-14 08:12".
function moment(value, what) {
  const val = typeof value === 'string' ? inferType(value) : value;
  if (val instanceof Date || (typeof val === 'number' && Number.isFinite(val))) return val;
  throw new BHError(`${what} is "${value}", which is not a date, a time or a number.`);
}

export function drawTimeline(el, o, width) {
  need(o, 'x', 'timeline'); need(o, 'label', 'timeline');
  requireData('timeline', o, ['x', 'label', 'text', 'series']);
  if (o.layout !== undefined && !['line', 'list'].includes(o.layout)) throw new BHError('layout must be "line" or "list".');
  const rows = o.data.filter(d => present(d[o.x]) && present(d[o.label])).map(d => ({ ...d }));
  if (!rows.length) throw new BHError('There are no events to draw: every row lacks a time or a label.');
  const dated = rows.every(d => d[o.x] instanceof Date), counted = rows.every(d => typeof d[o.x] === 'number');
  if (!dated && !counted) throw new BHError(`The ${o.x} column must hold dates and times (such as 2026-09-14 08:12) or numbers, the same kind in every row.`);
  rows.sort((a, b) => a[o.x] - b[o.x]);
  const groups = uniq(rows, o.series);
  if (groups.length > 2) throw new BHError(`A timeline shows one or two groups of events, one above the line and one below. This data has ${groups.length}: ${groups.slice(0, 5).join(', ')}.`);
  const set = o.highlight === undefined || o.highlight === null ? null : typeof o.highlight === 'function' ? null : new Set([].concat(o.highlight).map(String));
  const isKey = d => (set ? set.has(String(d[o.label])) : typeof o.highlight === 'function' ? !!o.highlight(d) : false);

  const phases = (o.phases || []).map((p, i) => {
    const from = moment(p.from, `The start of phase ${i + 1}`), to = moment(p.to, `The end of phase ${i + 1}`);
    if (!(to - from > 0)) throw new BHError(`Phase ${i + 1}${p.label ? ` ("${p.label}")` : ''} ends before it starts.`);
    return { from: +from, to: +to, label: p.label || '', tone: p.tone };
  });
  const times = rows.map(d => +d[o.x]);
  const lo = Math.min(...times, ...phases.map(p => p.from)), hi = Math.max(...times, ...phases.map(p => p.to));
  const span = hi - lo || 1;

  // How a moment and a length of time are written.
  const loc = locale();
  const part = opts => d => new Intl.DateTimeFormat(loc, { ...opts, timeZone: 'UTC' }).format(d);
  const clock = part({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }), dayName = part({ weekday: 'short' }), dayMonth = part({ day: 'numeric', month: 'short' }), monthYear = part({ month: 'short', year: 'numeric' });
  const count = x => formatNumber(x, { locale: loc, unit: o.unit || '' });
  const short = t => (!dated ? count(t) : span < 20 * 3600e3 ? clock(t) : span < 6 * DAY ? `${dayName(t)} ${clock(t)}` : span < 400 * DAY ? dayMonth(t) : monthYear(t));
  const full = t => (!dated ? count(t) : span < 400 * DAY ? `${dayName(t)} ${dayMonth(t)}${span < 60 * DAY ? `, ${clock(t)}` : ''}` : monthYear(t));
  const length = ms => (dated ? duration(ms) : count(ms));

  const events = rows.map((d, i) => ({ row: d, t: +d[o.x], i, group: Math.max(0, groups.indexOf(d[o.series])), key: isKey(d), title: String(d[o.label]), text: o.text && present(d[o.text]) ? String(d[o.text]) : '' }));
  const key = groups.length === 2 ? legend(groups.map((g, i) => ({ name: g, color: v('ink'), shape: i ? 'ring' : 'dot' }))) : null;

  const line = o.layout !== 'list' && width >= 520 ? drawLine() : null;
  return [key, line || drawList()].filter(Boolean);

  // ------------------------------------------------------------ along a line
  function drawLine() {
    // The moment is set small and what happened a size larger, as in the list.
    const size = microPx(), big = smallPx(), lineH = Math.round(big * 1.25), maxLabel = Math.max(112, Math.min(184, Math.round(width * 0.2)));
    for (const e of events) {
      e.when = short(e.t);
      e.lines = wrap(e.title, maxLabel, big, 600);
      if (e.lines.length > 3) return null;
      e.w = Math.ceil(Math.max(textWidth(e.when, size, 400), ...e.lines.map(s => textWidth(s, big, 600))));
    }
    const scale = fitScale(events.map(e => (e.t - lo) / span), events.map(e => e.w), width);
    if (!scale) return null;
    const X = t => scale.left + (t - lo) / span * scale.span;
    events.forEach((e, i) => { e.x = scale.x[i]; });
    const sides = [events.filter(e => e.group === 0), events.filter(e => e.group === 1)];
    for (const side of sides) {
      const tiers = placeFlags(side.map(e => ({ x: e.x, w: e.w })), { maxTiers: 5 });
      if (!tiers) return null;
      side.forEach((e, i) => { e.tier = tiers[i]; });
    }
    const most = Math.max(...events.map(e => e.lines.length)) + 1;       // lines in the tallest label
    const tierH = most * lineH + 12, reach = 18;                           // a stem always shows this much before its label
    const depth = side => (side.length ? Math.max(...side.map(e => e.tier)) * tierH + reach : 10);
    const strip = phases.length ? 34 : 6;
    const axisY = strip + depth(sides[0]), bottom = axisY + depth(sides[1]), height = bottom + 34;

    const svg = svgEl('svg', { class: 'bh-tl', width, height, viewBox: `0 0 ${width} ${height}`, focusable: 'false' });
    const text = (str, attrs) => { const t = svgEl('text', { 'font-size': size, 'dominant-baseline': 'central', ...attrs }); t.textContent = str; return t; };
    const halo = { stroke: v('ground'), 'stroke-width': 4, 'paint-order': 'stroke', 'stroke-linejoin': 'round' };

    // Ticks: a faint rule the height of the drawing, named at the foot.
    const n = Math.max(2, Math.min(9, Math.floor(scale.span / 112)));
    const ticks = dated ? D3().utcTicks(new Date(lo), new Date(hi), n).map(Number) : D3().ticks(lo, hi, n);
    const gTicks = svgEl('g', { class: 'bh-tl-ticks' });
    ticks.forEach((t, k) => {
      const x = X(t), midnight = dated && new Date(t).getUTCHours() === 0 && new Date(t).getUTCMinutes() === 0;
      gTicks.appendChild(svgEl('line', { x1: x, x2: x, y1: strip, y2: bottom + 6, stroke: v('rule') }));
      const name = !dated ? formatNumber(t, { locale: loc, unit: k === ticks.length - 1 ? o.unit || '' : '' })
        : span >= 400 * DAY ? monthYear(t) : span >= 6 * DAY ? dayMonth(t) : midnight ? `${dayName(t)} ${dayMonth(t)}` : clock(t);
      gTicks.appendChild(text(name, { class: 'bh-tl-tick', x, y: bottom + 18, 'text-anchor': x < 24 ? 'start' : x > width - 24 ? 'end' : 'middle', fill: v('ink-2'), 'font-weight': midnight ? 600 : 400 }));
    });
    svg.appendChild(gTicks);

    // The line of time, coloured by phase; each phase bracketed and named above it.
    const track = svgEl('g', { class: 'bh-tl-track' });
    track.appendChild(svgEl('line', { x1: X(lo), x2: X(hi), y1: axisY, y2: axisY, stroke: v('neutral-soft'), 'stroke-width': 5 }));
    for (const p of phases) track.appendChild(svgEl('line', { x1: X(p.from), x2: X(p.to), y1: axisY, y2: axisY, stroke: tone(p.tone), 'stroke-width': 5 }));
    svg.appendChild(track);
    const gPhases = svgEl('g', { class: 'bh-tl-phases' });
    let taken = -Infinity;
    for (const p of phases) {
      const xa = X(p.from), xb = X(p.to);
      gPhases.appendChild(svgEl('path', { d: `M${xa + 0.75},${strip - 2}V${strip - 9}H${xb - 0.75}V${strip - 2}`, fill: 'none', stroke: tone(p.tone), 'stroke-width': 1.5 }));
      const long = `${p.label}${p.label ? ', ' : ''}${length(p.to - p.from)}`;
      const fits = str => { const w = textWidth(str, size, 600); let x = Math.max(xa, taken + 14); if (x + w > width) x = width - w; return x >= taken + 14 || taken === -Infinity ? { x: Math.max(0, x), w } : null; };
      const spot = fits(long) || (p.label ? fits(p.label) : null);
      const t = text('', { class: 'bh-tl-phase-label', x: spot ? spot.x : xa, y: strip - 21, fill: v('ink'), ...(spot ? {} : { 'aria-hidden': 'true', visibility: 'hidden' }) });
      const name = svgEl('tspan', { 'font-weight': 600 }); name.textContent = p.label;
      const rest = svgEl('tspan', { fill: v('ink-2') }); rest.textContent = `${p.label ? ', ' : ''}${length(p.to - p.from)}`;
      t.append(name, ...(spot && spot.w < textWidth(long, size, 600) - 1 ? [] : [rest]));
      gPhases.appendChild(t);
      if (spot) taken = spot.x + spot.w;
    }
    svg.appendChild(gPhases);

    // The flags.
    const gEvents = svgEl('g', { class: 'bh-tl-events' });
    events.forEach(e => {
      const up = e.group === 0, rows = e.lines.length + 1;
      const near = up ? axisY - reach - (e.tier - 1) * tierH : axisY + reach + (e.tier - 1) * tierH;      // the edge of the label nearest the line
      const top = up ? near - rows * lineH : near, r = e.key ? 6 : 4.5;
      const g = svgEl('g', { class: `bh-tl-event${e.key ? ' is-key' : ''}`, 'data-order': e.i, 'data-at': ((e.t - lo) / span).toFixed(3) });
      g.appendChild(svgEl('line', { class: 'bh-tl-stem', x1: e.x, x2: e.x, y1: up ? axisY - r : axisY + r, y2: up ? top + 2 : top + rows * lineH - 2, stroke: e.key ? v('accent') : v('rule-strong'), 'stroke-width': e.key ? 1.5 : 1 }));
      g.appendChild(svgEl('circle', { class: 'bh-tl-mark', cx: e.x, cy: axisY, r, fill: e.key ? v('accent') : up ? v('ink') : v('ground'), stroke: e.key ? v('ground') : up ? v('ground') : v('ink'), 'stroke-width': up || e.key ? 1.5 : 2 }));
      const label = svgEl('g', { class: 'bh-tl-label' });
      label.appendChild(text(e.when, { class: 'bh-tl-when', x: e.x + 5, y: top + lineH / 2, fill: v('ink-2'), ...halo }));
      const what = text('', { class: 'bh-tl-what', x: e.x + 5, fill: v('ink'), 'font-size': big, 'font-weight': 600, ...halo });
      e.lines.forEach((str, k) => { const s = svgEl('tspan', { x: e.x + 5, y: top + lineH * (k + 1.5) }); s.textContent = str; what.appendChild(s); });
      label.appendChild(what);
      g.appendChild(label);
      const tip = svgEl('title'); tip.textContent = `${full(e.t)}: ${e.title}${e.text ? `. ${e.text}` : ''}`;
      g.appendChild(tip);
      gEvents.appendChild(g);
    });
    svg.appendChild(gEvents);
    return svg;
  }

  // ---------------------------------------------------------------- as a list
  function drawList() {
    const list = document.createElement('ol');
    list.className = 'bh-tl-list';
    const item = (cls, colour) => { const li = document.createElement('li'); li.className = cls; if (colour) li.style.setProperty('--tone', colour); list.appendChild(li); return li; };
    const p = (cls, str) => { const n = document.createElement('p'); n.className = cls; n.textContent = str; return n; };
    const phaseAt = t => phases.find(ph => t >= ph.from && t < ph.to) || (phases.length && t === phases[phases.length - 1].to ? phases[phases.length - 1] : null);
    // A gap is worth a line of its own when it is long for this timeline.
    const gaps = events.slice(1).map((e, i) => e.t - events[i].t);
    const sorted = [...gaps].sort((a, b) => a - b), median = sorted[Math.floor(sorted.length / 2)] || 0;
    let current = null;
    events.forEach((e, i) => {
      const ph = phaseAt(e.t), colour = ph ? tone(ph.tone) : null;
      if (i && gaps[i - 1] > span * 0.15 && gaps[i - 1] > median * 2) item('bh-tl-gap', current ? tone(current.tone) : null).textContent = `${length(gaps[i - 1])} later`;
      if (ph && ph !== current) {
        const head = item('bh-tl-phase', colour);
        const name = document.createElement('strong'); name.textContent = ph.label;
        head.append(name, document.createTextNode(` ${length(ph.to - ph.from)}`));
      }
      current = ph || current;
      const li = item(`bh-tl-item${e.key ? ' is-key' : ''}`, colour);
      li.dataset.group = e.group;
      li.append(p('bh-tl-when', full(e.t)), p('bh-tl-what', e.title));
      if (e.text) li.appendChild(p('bh-tl-text', e.text));
    });
    return list;
  }
}

// The table behind a timeline: every event, with its moment written in full.
export function timelineTable(o) {
  const data = (o.data || []).filter(d => present(d[o.x]) && present(d[o.label])).sort((a, b) => a[o.x] - b[o.x]);
  const dates = data.map(d => d[o.x]).filter(x => x instanceof Date);
  const span = dates.length > 1 ? Math.max(...dates) - Math.min(...dates) : 0;
  const when = x => (x instanceof Date ? new Intl.DateTimeFormat(locale(), { day: 'numeric', month: 'short', ...(span < 400 * DAY ? {} : { year: 'numeric' }), ...(span < 60 * DAY ? { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' } : {}), timeZone: 'UTC' }).format(x) : formatNumber(x, { locale: locale(), unit: o.unit || '' }));
  const name = (k, fallback) => (o.names && o.names[k]) || fallback;
  const columns = [{ key: 'when', label: name('x', 'When') }];
  if (o.series) columns.push({ key: 'group', label: name('series', String(o.series).replace(/_/g, ' ')) });
  columns.push({ key: 'what', label: name('label', 'What happened') });
  if (o.text && data.some(d => present(d[o.text]))) columns.push({ key: 'text', label: name('text', 'Detail') });
  return { columns, rows: data.map(d => ({ when: when(d[o.x]), group: o.series ? d[o.series] : undefined, what: d[o.label], text: o.text ? d[o.text] : undefined })) };
}
