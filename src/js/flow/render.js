// BH.flow: draws a directed flow diagram from a plain description of nodes,
// edges and zones, with hover highlighting and an optional walkthrough.
import { BHError, textWidth, tokenPx, v } from '../core.js';
import { layoutFlow, validateGraph } from './layout.js';
import { routeEdges } from './route.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, text) => {
  const n = document.createElementNS(NS, name);
  for (const [k, val] of Object.entries(attrs)) if (val !== undefined && val !== null) n.setAttribute(k, val);
  if (text !== undefined) n.textContent = text;
  return n;
};
const html = (name, attrs = {}, text) => {
  const n = document.createElement(name);
  for (const [k, val] of Object.entries(attrs)) n.setAttribute(k, val);
  if (text !== undefined) n.textContent = text;
  return n;
};

// Break a label into lines no wider than `max` pixels.
function wrap(text, max, size, weight) {
  const words = String(text).split(/\s+/).filter(Boolean), lines = [];
  let line = '';
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (line && textWidth(next, size, weight) > max) { lines.push(line); line = w; } else line = next;
  }
  if (line) lines.push(line);
  return lines.length ? lines : [''];
}

// The outline for each kind of node, in a box of w by h. Shape says what a thing is.
function shape(kind, w, h) {
  switch (kind) {
    case 'store': {                                                     // a cylinder
      const r = 5;
      return [el('path', { class: 'bh-node-shape', d: `M0,${r}C0,${-r / 3} ${w},${-r / 3} ${w},${r}V${h - r}C${w},${h + r / 3} 0,${h + r / 3} 0,${h - r}Z` }),
        el('path', { class: 'bh-node-detail', d: `M0,${r}C0,${r * 2.3} ${w},${r * 2.3} ${w},${r}` })];
    }
    case 'queue':                                                       // a tray of waiting items
      return [el('rect', { class: 'bh-node-shape', width: w, height: h, rx: 5 }),
        el('path', { class: 'bh-node-detail', d: [7, 11.5, 16].map(x => `M${x},7V${h - 7}`).join('') })];
    case 'gateway':                                                     // a checkpoint: cut corners
      return [el('path', { class: 'bh-node-shape', d: `M8,0H${w - 8}L${w},8V${h - 8}L${w - 8},${h}H8L0,${h - 8}V8Z` })];
    case 'external':                                                    // outside our control: dashed
      return [el('rect', { class: 'bh-node-shape bh-node-external', width: w, height: h, rx: 5 })];
    case 'person':
      return [el('rect', { class: 'bh-node-shape', width: w, height: h, rx: Math.min(h / 2, 16) })];
    default:
      return [el('rect', { class: 'bh-node-shape', width: w, height: h, rx: 5 })];
  }
}
const PAD = { service: [14, 14], store: [14, 14], queue: [26, 14], gateway: [16, 16], external: [14, 14], person: [18, 18] };

export function drawFlow(target, o, width, entry) {
  const graph = { nodes: o.nodes, edges: o.edges || [], zones: o.zones || [] };
  const problems = validateGraph(graph);
  if (problems.length) throw new BHError(problems[0]);
  const ids = new Set(graph.nodes.map(n => n.id));
  const edgeIds = new Set(graph.edges.map(e => `${e.from}>${e.to}`));
  const steps = o.steps || [];
  for (const e of graph.edges) if (e.kind !== undefined && !['normal', 'async', 'blocked', 'risk'].includes(e.kind)) throw new BHError(`Edge ${e.from}>${e.to} has kind "${e.kind}". The kinds are: normal, async, blocked, risk.`);
  steps.forEach((s, i) => {
    if (!s || !s.title) throw new BHError(`Step ${i + 1} needs a title: one short line that says what happens.`);
    for (const id of s.nodes || []) if (!ids.has(id)) throw new BHError(`Step ${i + 1} names a node "${id}" that is not in the diagram.`);
    for (const id of s.edges || []) if (!edgeIds.has(id)) throw new BHError(`Step ${i + 1} names an edge "${id}" that is not in the diagram. Write edges as "from>to".`);
  });

  // ---- sizes ---------------------------------------------------------------
  const labelSize = tokenPx('size-small'), subSize = tokenPx('size-micro');
  const narrow = width < 560;
  const lineH = Math.round(labelSize * 1.25), subH = Math.round(subSize * 1.3);
  const sizeNodes = maxText => {
    const map = new Map();
    for (const n of graph.nodes) {
      const kind = n.kind || 'service', [pl, pr] = PAD[kind];
      const lines = wrap(n.label, maxText, labelSize, 600), sub = n.sub ? wrap(n.sub, maxText + 10, subSize, 400) : [];
      const textW = Math.max(...lines.map(t => textWidth(t, labelSize, 600)), ...sub.map(t => textWidth(t, subSize, 400)), 30);
      const cap = kind === 'store' ? 5 : 0;
      map.set(n.id, { kind, lines, sub, pl, cap, w: Math.ceil(textW + pl + pr), h: Math.ceil(lines.length * lineH + (sub.length ? sub.length * subH + 3 : 0) + 20 + cap) });
    }
    return map;
  };
  const measureLabel = text => ({ w: Math.ceil(textWidth(text, subSize, 400)) + 12, h: Math.round(subSize * 1.5) });

  // ---- layout: left to right when it fits, otherwise top to bottom -----------
  // Before giving up on left to right, tighten the gaps, then wrap labels sooner.
  let layout, sized;
  const wanted = o.direction === 'right' || o.direction === 'down' ? o.direction : 'auto';
  const tight = { rank: 44, node: 16, band: 24, pad: 12, zoneGap: 8, labelPad: 14 };
  if (wanted !== 'down') {
    for (const [maxText, gaps] of [[150, {}], [150, tight], [104, tight]]) {
      sized = sizeNodes(maxText);
      layout = layoutFlow(graph, { direction: 'right', measure: n => sized.get(n.id), measureLabel, gaps });
      if (layout.width <= width) break;
    }
  }
  if (wanted === 'down' || (wanted === 'auto' && layout.width > width)) {
    sized = sizeNodes(narrow ? 118 : 150);
    layout = layoutFlow(graph, { direction: 'down', measure: n => sized.get(n.id), measureLabel, gaps: narrow ? { node: 14, band: 20, rank: 54, labelPad: 18 } : { rank: 58, labelPad: 20 } });
    // If it is taller than most of the screen, close up the gaps so it can be seen whole.
    if (!narrow && layout.height > innerHeight * 0.72) layout = layoutFlow(graph, { direction: 'down', measure: n => sized.get(n.id), measureLabel, gaps: { rank: 40, labelPad: 12, pad: 11, zoneLabel: 19, zoneGap: 6, band: 22 } });
  }
  const routes = routeEdges(layout);
  const routeById = new Map(routes.map(r => [r.id, r]));

  // ---- what is highlighted ---------------------------------------------------
  const key = { nodes: new Set(), edges: new Set() };
  const list = o.highlight === undefined || o.highlight === null ? [] : [].concat(o.highlight);
  const path = list.filter(x => !String(x).includes('>'));
  for (const x of list) {
    if (String(x).includes('>')) { if (!edgeIds.has(x)) throw new BHError(`highlight names an edge "${x}" that is not in the diagram.`); key.edges.add(x); }
    else { if (!ids.has(x)) throw new BHError(`highlight names a node "${x}" that is not in the diagram.`); key.nodes.add(x); }
  }
  for (let i = 1; i < path.length; i++) for (const id of [`${path[i - 1]}>${path[i]}`, `${path[i]}>${path[i - 1]}`]) if (edgeIds.has(id)) key.edges.add(id);

  // ---- draw --------------------------------------------------------------------
  const svg = el('svg', { class: 'bh-flow-svg', width: layout.width, height: layout.height, viewBox: `0 0 ${layout.width} ${layout.height}`, 'data-direction': layout.direction, focusable: 'false' });
  const gZones = el('g', { class: 'bh-zones' }), gEdges = el('g', { class: 'bh-edges' }), gDots = el('g', { class: 'bh-dots', 'aria-hidden': 'true' }), gLabels = el('g', { class: 'bh-edge-labels' }), gNodes = el('g', { class: 'bh-nodes' });
  for (const z of layout.zones) {
    const g = el('g', { class: 'bh-zone', 'data-id': z.id });
    g.append(el('rect', { x: z.x, y: z.y, width: z.w, height: z.h, rx: 6 }), el('text', { x: z.x + 12, y: z.y + 16, class: 'bh-zone-label' }, z.label));
    gZones.appendChild(g);
  }
  const edgeEls = new Map(), nodeEls = new Map();
  graph.edges.forEach((e, i) => {
    const r = routes[i];
    const cls = ['bh-edge-group', e.kind === 'async' ? 'is-async' : '', e.kind === 'blocked' ? 'is-blocked' : '', e.kind === 'risk' ? 'is-risk' : '', key.edges.has(`${e.from}>${e.to}`) ? 'is-key' : ''].filter(Boolean).join(' ');
    const g = el('g', { class: cls, 'data-id': r.id, 'data-from': e.from, 'data-to': e.to, 'data-rank': layout.nodes.find(n => n.id === (r.reversed ? e.to : e.from)).rank });
    g.appendChild(el('path', { class: 'bh-edge', d: r.d, fill: 'none', pathLength: e.kind === 'async' ? null : 1 }));
    g.appendChild(el('path', { class: 'bh-arrow', d: 'M0,0L-8,-3.6V3.6Z', transform: `translate(${r.arrow.x},${r.arrow.y}) rotate(${r.arrow.angle})` }));
    if (e.kind === 'blocked') {
      const mid = r.points[Math.floor(r.points.length * 0.78)];
      g.appendChild(el('path', { class: 'bh-edge-block', d: `M${mid[0] - 5},${mid[1] - 5}l10,10m0,-10l-10,10` }));
    }
    gEdges.appendChild(g);
    edgeEls.set(r.id, g);
    if (r.label) {
      const lg = el('g', { class: `bh-edge-label-group${cls.includes('is-key') ? ' is-key' : ''}${e.kind === 'risk' || e.kind === 'blocked' ? ' is-flagged' : ''}`, 'data-id': r.id });
      lg.append(el('rect', { x: r.label.x - r.label.w / 2, y: r.label.y - r.label.h / 2, width: r.label.w, height: r.label.h, rx: 3 }),
        el('text', { class: 'bh-edge-label', x: r.label.x, y: r.label.y, 'text-anchor': 'middle', 'dominant-baseline': 'central' }, r.label.text));
      gLabels.appendChild(lg);
      edgeEls.set(`${r.id}|label`, lg);
    }
  });
  const real = layout.nodes.filter(n => !n.virtual);
  const names = new Map(graph.nodes.map(n => [n.id, n.label]));
  for (const n of graph.nodes) {
    const box = real.find(m => m.id === n.id), s = sized.get(n.id);
    const feeds = graph.edges.filter(e => e.from === n.id).map(e => names.get(e.to)), fed = graph.edges.filter(e => e.to === n.id).map(e => names.get(e.from));
    const g = el('g', {
      class: `bh-node${key.nodes.has(n.id) ? ' is-key' : ''}`, 'data-id': n.id, 'data-kind': s.kind, 'data-rank': box.rank, transform: `translate(${box.x},${box.y})`, tabindex: 0,
      'aria-label': `${n.label}${n.sub ? `, ${n.sub}` : ''}. ${fed.length ? `Receives from ${fed.join(', ')}. ` : ''}${feeds.length ? `Sends to ${feeds.join(', ')}.` : ''}`.trim(),
    });
    g.append(...shape(s.kind, box.w, box.h));
    const textH = s.lines.length * lineH + (s.sub.length ? s.sub.length * subH + 3 : 0);
    let y = s.cap + (box.h - s.cap - textH) / 2 + lineH / 2;
    const label = el('text', { class: 'bh-node-label', 'dominant-baseline': 'central' });
    for (const line of s.lines) { label.appendChild(el('tspan', { x: s.pl, y }, line)); y += lineH; }
    g.appendChild(label);
    if (s.sub.length) {
      y += 3 - lineH / 2 + subH / 2;
      const sub = el('text', { class: 'bh-node-sub', 'dominant-baseline': 'central' });
      for (const line of s.sub) { sub.appendChild(el('tspan', { x: s.pl, y }, line)); y += subH; }
      g.appendChild(sub);
    }
    gNodes.appendChild(g);
    nodeEls.set(n.id, g);
  }
  svg.append(gZones, gEdges, gDots, gLabels, gNodes);

  const stage = html('div', { class: 'bh-flow-stage', tabindex: steps.length ? 0 : -1 });
  if (layout.width > width) stage.classList.add('is-scroll');
  stage.appendChild(svg);

  // What the audit and the motion layer read.
  target.__bhFlow = {
    direction: layout.direction, crossings: layout.crossings,
    nodes: layout.nodes.map(n => ({ id: n.id, x: n.x, y: n.y, w: n.w, h: n.h, rank: n.rank, ...(n.virtual ? { virtual: true } : {}) })),
    edges: routes.map((r, i) => ({ id: r.id, points: r.points, reversed: r.reversed, volume: graph.edges[i].volume, kind: graph.edges[i].kind || 'normal', key: key.edges.has(`${graph.edges[i].from}>${graph.edges[i].to}`) })),
  };
  target.classList.add('bh-flow');
  target.classList.toggle('has-key', key.nodes.size + key.edges.size > 0);

  // ---- hover and focus: light what feeds a node and what it feeds --------------
  const reach = (start, next) => { const seen = new Set([start]), todo = [start]; while (todo.length) for (const id of next(todo.pop())) if (!seen.has(id)) { seen.add(id); todo.push(id); } return seen; };
  const down = id => graph.edges.filter(e => e.from === id).map(e => e.to), up = id => graph.edges.filter(e => e.to === id).map(e => e.from);
  const dimTo = (keepNodes, keepEdges) => {
    for (const [id, g] of nodeEls) g.classList.toggle('is-dim', !!keepNodes && !keepNodes.has(id));
    for (const [id, g] of edgeEls) g.classList.toggle('is-dim', !!keepEdges && !keepEdges.has(id.replace(/\|label$/, '').replace(/#\d+$/, '')));
  };
  let current = 0;                                                          // 0 is the overview
  const showStep = () => {
    const s = steps[current - 1];
    for (const [id, g] of nodeEls) g.classList.toggle('is-step', !!s && (s.nodes || []).includes(id));
    for (const [id, g] of edgeEls) g.classList.toggle('is-step', !!s && (s.edges || []).includes(id.replace(/\|label$/, '').replace(/#\d+$/, '')));
    if (s) dimTo(new Set(s.nodes || []), new Set(s.edges || [])); else dimTo(null, null);
  };
  for (const [id, g] of nodeEls) {
    const on = () => {
      const a = reach(id, down), b = reach(id, up), nodes = new Set([...a, ...b]);
      dimTo(nodes, new Set(graph.edges.filter(e => (a.has(e.from) && a.has(e.to)) || (b.has(e.from) && b.has(e.to))).map(e => `${e.from}>${e.to}`)));
    };
    g.addEventListener('pointerenter', on);
    g.addEventListener('focus', on);
    g.addEventListener('pointerleave', showStep);
    g.addEventListener('blur', showStep);
  }

  // ---- walkthrough ---------------------------------------------------------------
  const out = [stage];
  const api = { step() {}, play() {}, pause() {} };
  if (steps.length) {
    const controls = html('div', { class: 'bh-controls', role: 'group', 'aria-label': 'Walkthrough' });
    const prev = html('button', { type: 'button', class: 'bh-button', 'data-bh-prev': '', 'aria-label': 'Previous step' }, '←');
    const play = html('button', { type: 'button', class: 'bh-button', 'data-bh-play': '' }, 'Play');
    const next = html('button', { type: 'button', class: 'bh-button', 'data-bh-next': '', 'aria-label': 'Next step' }, '→');
    const counter = html('span', { class: 'bh-controls-count' });
    const caption = html('p', { class: 'bh-caption-live', 'aria-live': 'polite' });
    controls.append(prev, play, next, counter, caption);
    let timer = null;
    const paint = () => {
      const s = steps[current - 1];
      counter.textContent = `${current} / ${steps.length}`;
      caption.replaceChildren();
      if (s) { caption.append(html('strong', {}, s.title), document.createTextNode(s.text ? ` ${s.text}` : '')); }
      else caption.append(document.createTextNode(o.overview || 'The whole flow. Step through it, or press Play.'));
      prev.disabled = current === 0;
      next.disabled = current === steps.length;
      showStep();
      target.dispatchEvent(new CustomEvent('bh:step', { bubbles: true, detail: { step: current } }));
    };
    api.step = n => { current = Math.max(0, Math.min(steps.length, Number(n) || 0)); paint(); };
    api.pause = () => { clearInterval(timer); timer = null; play.textContent = 'Play'; play.setAttribute('aria-pressed', 'false'); };
    api.play = ({ interval = 2600 } = {}) => {
      api.pause();
      if (current >= steps.length) current = 0;
      api.step(current + 1);
      play.textContent = 'Pause';
      play.setAttribute('aria-pressed', 'true');
      timer = setInterval(() => { if (current >= steps.length) api.pause(); else api.step(current + 1); if (current >= steps.length) api.pause(); }, interval);
    };
    prev.addEventListener('click', () => { api.pause(); api.step(current - 1); });
    next.addEventListener('click', () => { api.pause(); api.step(current + 1); });
    play.addEventListener('click', () => (timer ? api.pause() : api.play()));
    stage.addEventListener('keydown', ev => {
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowDown') { ev.preventDefault(); api.pause(); api.step(current + 1); }
      else if (ev.key === 'ArrowLeft' || ev.key === 'ArrowUp') { ev.preventDefault(); api.pause(); api.step(current - 1); }
    });
    stage.setAttribute('aria-label', 'Diagram walkthrough. Use the arrow keys to step.');
    if (entry) { current = Math.min(entry.step || 0, steps.length); entry.cleanup = () => { entry.step = current; clearInterval(timer); }; }
    paint();
    out.unshift(controls);
  }
  if (entry) entry.api = api;

  // A key for line styles, when the diagram uses more than one.
  const kinds = new Set(graph.edges.map(e => e.kind || 'normal'));
  if (kinds.size > 1 || key.edges.size) {
    const legend = html('div', { class: 'bh-legend bh-flow-key' });
    const item = (cls, text) => { const s = html('span', { class: 'bh-legend-item' }); const i = html('i', { class: `bh-flow-swatch ${cls}` }); s.append(i, document.createTextNode(text)); legend.appendChild(s); };
    if (key.edges.size) item('is-key', o.highlightLabel || 'The path in question');
    if (kinds.has('normal') && (kinds.size > 1)) item('', 'Call');
    if (kinds.has('async')) item('is-async', 'Asynchronous');
    if (kinds.has('blocked')) item('is-blocked', 'Blocked');
    if (kinds.has('risk')) item('is-blocked', o.riskLabel || 'At risk');
    out.unshift(legend);
  }
  return out;
}

// Rows for the data table under a diagram: one per connection.
export function flowTable(o) {
  const name = new Map((o.nodes || []).map(n => [n.id, n.label]));
  return {
    columns: [{ key: 'from', label: 'From' }, { key: 'to', label: 'To' }, { key: 'what', label: 'What moves' }],
    rows: (o.edges || []).map(e => ({ from: name.get(e.from) || e.from, to: name.get(e.to) || e.to, what: e.label || '' })),
  };
}
