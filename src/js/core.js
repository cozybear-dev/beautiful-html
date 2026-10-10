// The BH namespace and the plumbing every figure shares: the ready queue,
// tokens, mounting, errors, re-rendering and the data table.
import { formatDate, formatNumber } from './format.js';
import { parseCsv } from './data.js';
import { enterFigure, enterPage, settle } from './motion.js';

// A one-line stub in the report head collects BH.ready() callbacks before this
// file loads; they are taken over here.
const queued = (window.BH && Array.isArray(window.BH.q)) ? window.BH.q : [];

// A problem with the author's call or data. Its message is shown in the figure.
export class BHError extends Error {}

export const v = name => `var(--bh-${name})`;
export const locale = () => document.documentElement.lang || 'en';

export function token(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(`--bh-${name}`).trim();
}

// Resolve a size token to pixels (tokens may be rem or clamp()).
export function tokenPx(name) {
  const probe = document.createElement('span');
  probe.style.cssText = `position:absolute;visibility:hidden;font-size:var(--bh-${name})`;
  document.body.appendChild(probe);
  const px = parseFloat(getComputedStyle(probe).fontSize);
  probe.remove();
  return px;
}

let canvas;
// Width in pixels of `text` set in the figure font at `size` px.
export function textWidth(text, size, weight = 400) {
  canvas = canvas || document.createElement('canvas').getContext('2d');
  const family = getComputedStyle(document.body).getPropertyValue('--bh-font-data') || 'sans-serif';
  canvas.font = `${weight} ${size}px ${family}`;
  return canvas.measureText(String(text)).width;
}

// --------------------------------------------------------------- figure calls

const live = new Set();       // every drawn figure, for re-rendering
const pending = [];            // promises from the current queue run

function resolveTarget(target, kind) {
  const el = typeof target === 'string' ? document.querySelector(target) : target;
  if (!el || el.nodeType !== 1) throw new BHError(`BH.${kind}: nothing matches ${JSON.stringify(target)}. Pass the selector of the figure's .bh-plot element.`);
  return el;
}

function showError(el, kind, error) {
  const box = document.createElement('div');
  box.className = 'bh-error';
  box.setAttribute('role', 'alert');
  const strong = document.createElement('strong');
  strong.textContent = `BH.${kind} could not draw this figure.`;
  box.append(strong, document.createTextNode(error instanceof BHError ? error.message : `${error.name}: ${error.message}`));
  el.replaceChildren(box);
  if (!(error instanceof BHError)) console.error(error);
}

// Describe the figure for assistive technology from its own title and subtitle.
function describe(el) {
  const fig = el.closest('figure, .bh-figure');
  const title = fig && fig.querySelector('.bh-figure-title, h2, h3, h4');
  const sub = fig && fig.querySelector('.bh-figure-sub');
  const label = [title, sub].filter(Boolean).map(n => n.textContent.trim()).join('. ');
  el.setAttribute('role', 'img');
  if (label) el.setAttribute('aria-label', label);
}

// Draw a figure now and again whenever its width, the scheme or the medium
// changes. `draw(el, options, width)` returns a node (or nodes) to mount.
export function figure(kind, target, options, draw, { table, inline, after } = {}) {
  let el;
  try { el = resolveTarget(target, kind); } catch (e) { console.error(e.message); return null; }
  el.classList.add(inline || 'bh-plot');
  el.dataset.bhKind = kind;
  const entry = { el, kind, options: { ...options }, width: 0, cleanup: null };
  entry.render = () => {
    if (entry.cleanup) { try { entry.cleanup(); } catch { /* ignore */ } entry.cleanup = null; }
    const width = Math.max(240, Math.floor(el.getBoundingClientRect().width) || 640);
    entry.width = width;
    try {
      const out = draw(el, entry.options, width, entry);
      const nodes = Array.isArray(out) ? out : [out];
      el.replaceChildren(...nodes.filter(Boolean));
      if (!inline) describe(el);
      if (table) attachTable(el, table(entry.options));
      if (after) after(el, entry.options, entry);
      enterFigure(el);
      el.dispatchEvent(new CustomEvent('bh:render', { bubbles: true }));
    } catch (e) {
      showError(el, kind, e);
    }
  };
  entry.render();
  if (!inline) { live.add(entry); resizeWatch.observe(el); }
  return {
    el, entry,
    update(next) { entry.options = { ...entry.options, ...next }; entry.render(); },
    destroy() { live.delete(entry); resizeWatch.unobserve(el); el.replaceChildren(); },
  };
}

let resizeTimer;
const resizeWatch = new ResizeObserver(entries => {
  const changed = [];
  for (const r of entries) for (const e of live) if (e.el === r.target && Math.abs(Math.floor(r.contentRect.width) - e.width) >= 2 && r.contentRect.width > 0) changed.push(e);
  if (!changed.length) return;
  clearTimeout(resizeTimer);
  resizeTimer = setTimeout(() => changed.forEach(e => e.render()), 120);
});
export const rerenderAll = () => live.forEach(e => e.render());
// Paper shows the final state: finish all motion, then redraw at the print width.
addEventListener('beforeprint', () => { settle(); rerenderAll(); });
addEventListener('afterprint', rerenderAll);

// --------------------------------------------------------------- data table

// columns: [{ key, label, unit? }]; rows: objects. Shown on request under the figure.
function attachTable(el, spec) {
  const fig = el.closest('figure, .bh-figure');
  if (!fig || !spec || !spec.rows || !spec.rows.length || fig.dataset.bhTable === 'off') return;
  const old = fig.querySelector(':scope > details.bh-data');
  const details = document.createElement('details');
  details.className = 'bh-data';
  if (old && old.open) details.open = true;
  const summary = document.createElement('summary');
  summary.textContent = 'Show the data';
  const wrap = document.createElement('div');
  wrap.className = 'bh-table-wrap';
  const table = document.createElement('table');
  table.className = 'bh-table';
  const head = table.createTHead().insertRow();
  const dates = spec.rows.map(r => r[spec.columns[0].key]).filter(d => d instanceof Date);
  const span = dates.length > 1 ? Math.max(...dates) - Math.min(...dates) : 365 * 864e5;
  for (const c of spec.columns) {
    const th = document.createElement('th');
    th.scope = 'col';
    th.textContent = c.label + (c.unit && c.unit !== '%' ? ` (${c.unit})` : '');
    if (c.numeric) th.className = 'bh-num';
    head.appendChild(th);
  }
  const body = table.createTBody();
  const rows = spec.rows.slice(0, 400);
  for (const r of rows) {
    const tr = body.insertRow();
    for (const c of spec.columns) {
      const td = tr.insertCell();
      const val = r[c.key];
      if (val instanceof Date) td.textContent = formatDate(val, { locale: locale(), span: Math.min(span, 700 * 864e5) });
      else if (typeof val === 'number') { td.textContent = formatNumber(val, { locale: locale(), unit: c.unit === '%' ? '%' : '' }); td.className = 'bh-num'; }
      else td.textContent = val === null || val === undefined ? '–' : String(val);
    }
  }
  wrap.appendChild(table);
  details.append(summary, wrap);
  if (spec.rows.length > rows.length) {
    const more = document.createElement('p');
    more.textContent = `First ${rows.length} of ${spec.rows.length} rows.`;
    details.appendChild(more);
  }
  if (old) old.replaceWith(details);
  else {
    const note = fig.querySelector(':scope > .bh-figure-note, :scope > figcaption');
    if (note) fig.insertBefore(details, note); else fig.appendChild(details);
  }
}

// Columns for a data table from the fields a chart used.
export function tableSpec(options, keys) {
  const data = options.data || [];
  const columns = keys.filter(k => options[k] && typeof options[k] === 'string').map(k => ({
    key: options[k],
    label: (options.names && options.names[k]) || options[k].replace(/_/g, ' '),
    unit: (k === 'y' || k === 'y2') ? options.unit : undefined,
    numeric: data.some(d => typeof d[options[k]] === 'number'),
  }));
  return { columns: columns.filter((c, i) => columns.findIndex(o => o.key === c.key) === i), rows: data };
}

// ------------------------------------------------------------------ BH object

export const BH = {
  version: __BH_VERSION__,
  direction: __BH_DIRECTION__,
  q: queued,
  ready(fn) { this.q.push(fn); },
  token,
  // BH.data('#id') reads CSV from <script type="text/csv" id="id">; BH.data(text) parses CSV text.
  data(source, opts) {
    const s = String(source).trim();
    if (/^[#.][\w-]+$/.test(s) && !s.includes('\n')) {
      const el = document.querySelector(s);
      if (!el) throw new BHError(`BH.data: nothing matches ${s}. Put the CSV in <script type="text/csv" id="${s.slice(1)}">.`);
      return parseCsv(el.textContent, opts);
    }
    return parseCsv(source, opts);
  },
  format: { number: (n, o = {}) => formatNumber(n, { locale: locale(), ...o }), date: (d, o = {}) => formatDate(d, { locale: locale(), ...o }) },
};

let done;
BH.done = new Promise(resolve => { done = resolve; });

// Run the queued figure calls once fonts are ready, so text is measured in the
// real typeface. Later BH.ready() calls run at once.
export async function start() {
  try { if (document.fonts && document.fonts.ready) await document.fonts.ready; } catch { /* draw anyway */ }
  enterPage();
  const run = fn => { try { const r = fn(BH); if (r && typeof r.then === 'function') pending.push(r.catch(e => console.error(e))); } catch (e) { console.error(e); } };
  BH.q.splice(0).forEach(run);
  BH.ready = run;
  await Promise.all(pending);
  document.documentElement.setAttribute('data-bh-ready', '');
  done(true);
}
