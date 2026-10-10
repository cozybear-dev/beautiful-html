// Motion. Three kinds only:
//   entrance  each figure, once, when it first scrolls into view
//   flow      dots along diagram edges, with a pause control
//   response  handled where the reader acts (hover, walkthrough steps)
// Nothing here hides content by itself: a starting state exists only as the
// first frame of an animation this script created, so without scripts, in
// print and with reduced motion the page shows its final state.

const reduce = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
const printing = () => matchMedia('print').matches;
export const enabled = () => document.documentElement.dataset.bhMotion !== 'off' && !reduce() && !printing();

const ms = (name, fallback) => {
  const raw = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  const n = parseFloat(raw);
  return Number.isFinite(n) ? (raw.endsWith('ms') ? n : n * 1000) : fallback;
};
const ease = () => getComputedStyle(document.documentElement).getPropertyValue('--bh-ease').trim() || 'ease-out';

const entered = new WeakSet();          // figures whose entrance has run; a re-render must not replay it
const waiting = new Map();              // element → { animations, counters }
const tracked = new Set();              // everything settle() must finish
const loops = new Set();

const watch = 'IntersectionObserver' in window ? new IntersectionObserver(entries => {
  for (const e of entries) {
    if (!e.isIntersecting) continue;
    const w = waiting.get(e.target);
    if (!w) continue;
    waiting.delete(e.target);
    watch.unobserve(e.target);
    entered.add(e.target);
    w.animations.forEach(a => a.play());
    w.counters.forEach(c => c.start());
  }
}, { threshold: 0.15 }) : null;

// Mark a figure as needing no entrance (motion: false on that figure).
export function skipEntrance(el) { const w = waiting.get(el); if (w) { w.animations.forEach(a => a.cancel()); w.counters.forEach(c => c.finish()); waiting.delete(el); } entered.add(el); }

// Register an entrance for `el`. `build()` returns WAAPI animations (created
// paused at their first frame) and/or counters; they play when `el` is seen.
export function enter(el, build) {
  if (entered.has(el)) return;
  const old = waiting.get(el);
  if (old) { old.animations.forEach(a => a.cancel()); old.counters.forEach(c => c.finish()); waiting.delete(el); }
  if (!enabled() || !watch) { entered.add(el); return; }
  const made = build() || [];
  const animations = made.filter(x => x && typeof x.play === 'function' && typeof x.cancel === 'function');
  const counters = made.filter(x => x && typeof x.start === 'function');
  if (!animations.length && !counters.length) { entered.add(el); return; }
  animations.forEach(a => { a.pause(); tracked.add(a); a.finished.then(() => tracked.delete(a), () => tracked.delete(a)); });
  counters.forEach(c => tracked.add(c));
  waiting.set(el, { animations, counters });
  watch.observe(el);
}

const anim = (node, frames, opts) => node.animate(frames, { easing: ease(), fill: 'backwards', ...opts });
const fade = (node, delay, duration) => anim(node, [{ opacity: 0 }, { opacity: 1 }], { delay, duration });

// The entrance for a drawn figure, by what it contains.
export function enterFigure(el) {
  enter(el, () => {
    const slow = ms('--bh-slow', 900), med = ms('--bh-medium', 420);
    const out = [];
    // Lines draw from left to right; what annotates them follows.
    const lines = [...el.querySelectorAll('.bh-line-signal path, svg > path.bh-line')];
    for (const p of lines) {
      const len = p.getTotalLength ? p.getTotalLength() : 0;
      if (len > 0) out.push(anim(p, [{ strokeDasharray: `${len} ${len}`, strokeDashoffset: len }, { strokeDasharray: `${len} ${len}`, strokeDashoffset: 0 }], { duration: slow }));
    }
    for (const g of el.querySelectorAll('.bh-line-context')) out.push(fade(g, 0, med));
    for (const g of el.querySelectorAll('.bh-end-dot, .bh-end-labels, .bh-point-labels')) out.push(fade(g, lines.length ? slow * 0.85 : med, med));
    // Bars grow from the baseline.
    [...el.querySelectorAll('.bh-bar-x rect')].forEach((r, i) => { r.style.transformBox = 'fill-box'; r.style.transformOrigin = 'left center'; out.push(anim(r, [{ transform: 'scaleX(0)' }, { transform: 'scaleX(1)' }], { duration: slow * 0.7, delay: Math.min(i * 35, 420) })); });
    [...el.querySelectorAll('.bh-bar-y rect')].forEach((r, i) => { r.style.transformBox = 'fill-box'; r.style.transformOrigin = 'center bottom'; out.push(anim(r, [{ transform: 'scaleY(0)' }, { transform: 'scaleY(1)' }], { duration: slow * 0.7, delay: Math.min(i * 25, 420) })); });
    // Diagram: edges draw in rank order, each node appears as the flow reaches it.
    for (const g of el.querySelectorAll('.bh-node')) out.push(fade(g, Number(g.dataset.rank || 0) * 150, med));
    for (const g of el.querySelectorAll('.bh-edge-group')) {
      const delay = Number(g.dataset.rank || 0) * 150 + 120;
      const p = g.querySelector('.bh-edge');
      if (p && p.hasAttribute('pathLength')) out.push(anim(p, [{ strokeDasharray: '1 1', strokeDashoffset: 1 }, { strokeDasharray: '1 1', strokeDashoffset: 0 }], { delay, duration: med }));
      else if (p) out.push(fade(p, delay, med));
      for (const extra of g.querySelectorAll('.bh-arrow, .bh-edge-block')) out.push(fade(extra, delay + med * 0.8, 160));
    }
    for (const g of el.querySelectorAll('.bh-edge-label-group, .bh-zone')) out.push(fade(g, 200, med));
    for (const g of el.querySelectorAll('.bh-dots')) out.push(fade(g, slow, med));
    // Sankey ribbons wipe in along the flow.
    for (const g of el.querySelectorAll('.bh-sankey-links')) out.push(anim(g, [{ clipPath: 'inset(0 100% 0 0)' }, { clipPath: 'inset(0 0 0 0)' }], { duration: slow }));
    for (const g of el.querySelectorAll('.bh-sankey-label')) out.push(fade(g, slow * 0.6, med));
    // Anything else simply fades in.
    if (!out.length) for (const s of el.querySelectorAll(':scope > svg, :scope > .bh-multiples')) out.push(fade(s, 0, med));
    return out;
  });
}

// Count a number up to the value already written in `node` (a text node's
// parent span). The final text is restored exactly as written.
function counter(span) {
  const final = span.textContent;
  const m = final.match(/^(\D*?)(-?[\d.,  \s]*\d)(\D*)$/);
  if (!m) return null;
  const lang = document.documentElement.lang || 'en';
  const parts = new Intl.NumberFormat(lang).formatToParts(12345.6);
  const group = (parts.find(p => p.type === 'group') || {}).value || ',', dec = (parts.find(p => p.type === 'decimal') || {}).value || '.';
  const plain = m[2].split(group).join('').replace(/[\s  ]/g, '').replace(dec, '.');
  const to = Number(plain);
  if (!Number.isFinite(to)) return null;
  const digits = (plain.split('.')[1] || '').length;
  const fmt = new Intl.NumberFormat(lang, { minimumFractionDigits: digits, maximumFractionDigits: digits, useGrouping: m[2].includes(group) });
  let frame = 0, done = false;
  const finish = () => { done = true; cancelAnimationFrame(frame); span.textContent = final; span.style.minWidth = ''; tracked.delete(api); };
  const api = {
    finish,
    start() {
      if (done) return;
      span.style.display = 'inline-block';
      span.style.minWidth = `${span.getBoundingClientRect().width}px`;      // no layout shift while the digits change
      const t0 = performance.now(), duration = ms('--bh-slow', 900);
      const step = now => {
        const t = Math.min(1, (now - t0) / duration), k = 1 - (1 - t) ** 3;
        if (t >= 1) return finish();
        span.textContent = `${m[1]}${fmt.format(to * k)}${m[3]}`;
        frame = requestAnimationFrame(step);
      };
      span.textContent = `${m[1]}${fmt.format(0)}${m[3]}`;
      frame = requestAnimationFrame(step);
    },
  };
  return api;
}

// Page-level entrances: the header settles in once, key figures count up.
export function enterPage() {
  if (!enabled()) return;
  const header = document.querySelector('.bh-report > .bh-header');
  if (header) {
    enter(header, () => [...header.children].filter(c => !c.classList.contains('bh-keyfigures')).map((c, i) =>
      anim(c, [{ opacity: 0, transform: 'translateY(8px)' }, { opacity: 1, transform: 'none' }], { duration: ms('--bh-medium', 420), delay: i * 70 })));
  }
  for (const strip of document.querySelectorAll('.bh-keyfigures')) {
    enter(strip, () => {
      const out = [];
      for (const value of strip.querySelectorAll('.bh-keyfigure-value')) {
        const node = [...value.childNodes].find(n => n.nodeType === 3 && n.nodeValue.trim());
        if (!node || !/\d/.test(node.nodeValue)) continue;
        const span = document.createElement('span');
        span.textContent = node.nodeValue.trim();
        const lead = node.nodeValue.match(/^\s*/)[0], trail = node.nodeValue.match(/\s*$/)[0];
        node.replaceWith(...[lead && document.createTextNode(lead), span, trail && document.createTextNode(trail)].filter(Boolean));
        const c = counter(span);
        if (c) out.push(c);
      }
      return out;
    });
  }
}

// A loop that runs only while its figure is on screen, with a pause button.
// tick(dt) receives the seconds since the last frame.
export function loop(el, tick, { label = 'motion' } = {}) {
  const figure = el.closest('figure, .bh-figure') || el.parentElement;
  let frame = 0, last = 0, visible = false, paused = false, stopped = false;
  let controls = figure.querySelector(':scope > .bh-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.className = 'bh-controls';
    el.after(controls);
  }
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'bh-button';
  button.setAttribute('data-bh-pause', '');
  controls.prepend(button);
  const state = () => {
    el.dataset.bhLoop = stopped ? 'stopped' : paused ? 'paused' : visible ? 'running' : 'idle';
    button.textContent = paused ? `Play ${label}` : `Pause ${label}`;
    button.setAttribute('aria-pressed', String(paused));
  };
  const run = now => {
    frame = 0;
    if (stopped || paused || !visible) return;
    tick(Math.min(0.05, last ? (now - last) / 1000 : 0));
    last = now;
    frame = requestAnimationFrame(run);
  };
  const kick = () => { last = 0; if (!frame && !stopped && !paused && visible) frame = requestAnimationFrame(run); state(); };
  const io = new IntersectionObserver(entries => { visible = entries[entries.length - 1].isIntersecting; kick(); }, { threshold: 0.05 });
  io.observe(el);
  button.addEventListener('click', () => { paused = !paused; kick(); });
  const api = {
    pause() { paused = true; state(); },
    resume() { paused = false; kick(); },
    stop() { stopped = true; cancelAnimationFrame(frame); frame = 0; io.disconnect(); button.remove(); if (!controls.children.length) controls.remove(); loops.delete(api); state(); },
    finish() { api.stop(); },
  };
  loops.add(api);
  state();
  return api;
}

// Dots that travel along a diagram's edges: direction at a glance, and more
// dots where more flows. Returns the loop, or null when motion is off.
export function flowDots(el) {
  const g = el.__bhFlow, layer = el.querySelector('.bh-dots');
  if (!enabled() || !g || !layer) return null;
  const edges = g.edges.filter(e => e.kind !== 'blocked' && (g.edges.some(x => x.key) ? e.key : true));
  if (!edges.length) return null;
  const most = Math.max(...edges.map(e => Number(e.volume) || 1));
  const dots = [];
  for (const e of edges) {
    const pts = e.reversed ? [...e.points].reverse() : e.points;
    const cum = [0];
    for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]));
    const length = cum[cum.length - 1];
    if (length < 12) continue;
    const count = Math.max(1, Math.min(4, Math.round(3 * (Number(e.volume) || 1) / most), Math.floor(length / 34)));
    for (let k = 0; k < count; k++) {
      const c = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      c.setAttribute('r', e.key ? 3 : 2.5);
      c.setAttribute('class', `bh-flow-dot${e.key ? ' is-key' : ''}`);
      layer.appendChild(c);
      dots.push({ c, pts, cum, length, at: length * k / count });
    }
  }
  const place = d => {
    let i = 1;
    while (i < d.cum.length - 1 && d.cum[i] < d.at) i++;
    const t = (d.at - d.cum[i - 1]) / Math.max(1e-6, d.cum[i] - d.cum[i - 1]);
    d.c.setAttribute('cx', (d.pts[i - 1][0] + (d.pts[i][0] - d.pts[i - 1][0]) * t).toFixed(1));
    d.c.setAttribute('cy', (d.pts[i - 1][1] + (d.pts[i][1] - d.pts[i - 1][1]) * t).toFixed(1));
  };
  dots.forEach(place);
  const l = loop(el, dt => { for (const d of dots) { d.at = (d.at + 64 * dt) % d.length; place(d); } }, { label: 'flow' });
  const stop = l.stop;
  l.stop = () => { stop(); dots.forEach(d => d.c.remove()); };
  l.finish = l.stop;
  return l;
}

// Finish every entrance and stop every loop: the page in its final state.
export function settle() {
  for (const [el, w] of waiting) { entered.add(el); w.animations.forEach(a => { try { a.finish(); } catch { a.cancel(); } }); w.counters.forEach(c => c.finish()); if (watch) watch.unobserve(el); }
  waiting.clear();
  for (const t of [...tracked]) { try { t.finish(); } catch { try { t.cancel(); } catch { /* gone */ } } }
  tracked.clear();
  for (const l of [...loops]) l.stop();
}
