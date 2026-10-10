// Layout for directed flow diagrams. Pure: no DOM. Given nodes, edges and
// zones, it assigns every node a rank along the flow, a band across it, an
// order, and coordinates.
//
// The aims, in order: every edge runs one way; members of a zone stay together
// inside a frame that holds nothing else; edges cross as little as possible
// (crossings hurt reading far more than bends do); and edges run straight.

export const KINDS = ['service', 'store', 'queue', 'gateway', 'external', 'person'];
export const MAX_NODES = 20;
const DEFAULT_GAPS = { rank: 76, node: 20, band: 30, pad: 16, zoneLabel: 22, zoneGap: 14, labelPad: 22, virtual: 18, margin: 4 };

export function validateGraph(g) {
  const out = [];
  const nodes = (g && g.nodes) || [], edges = (g && g.edges) || [], zones = (g && g.zones) || [];
  if (!nodes.length) return ['The diagram has no nodes. Pass nodes: [{ id, label }, …].'];
  if (nodes.length > MAX_NODES) out.push(`A diagram can hold at most ${MAX_NODES} nodes; this one has ${nodes.length}. Draw an overview of the main systems and a second figure for the detail.`);
  const ids = new Set(), zoneIds = new Set(zones.map(z => z.id));
  for (const n of nodes) {
    if (n.id === undefined || n.id === null || n.id === '') { out.push('Every node needs an id.'); continue; }
    if (ids.has(n.id)) out.push(`Duplicate node id "${n.id}". Each node needs its own id.`);
    ids.add(n.id);
    if (!n.label) out.push(`Node "${n.id}" has no label.`);
    if (n.kind !== undefined && !KINDS.includes(n.kind)) out.push(`Node "${n.id}" has kind "${n.kind}". The kinds are: ${KINDS.join(', ')}.`);
    if (n.zone !== undefined && n.zone !== null && !zoneIds.has(n.zone)) out.push(`Node "${n.id}" is in zone "${n.zone}", which is not in zones. The zones are: ${[...zoneIds].join(', ') || 'none'}.`);
  }
  for (const e of edges) {
    if (e.from === e.to) { out.push(`Edge ${e.from}>${e.to} connects a node to itself. Describe that step in the node's sublabel instead.`); continue; }
    for (const end of [e.from, e.to]) if (!ids.has(end)) out.push(`Edge ${e.from}>${e.to} points to an unknown node "${end}". The node ids are: ${[...ids].join(', ')}.`);
  }
  return out;
}

// A small seeded generator, so layouts are the same on every run.
function random(seed) {
  return () => { seed = (seed + 0x6D2B79F5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
const median = list => { const s = [...list].sort((a, b) => a - b); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
function* permutations(list) {
  if (list.length <= 1) { yield list; return; }
  for (let i = 0; i < list.length; i++) for (const rest of permutations([...list.slice(0, i), ...list.slice(i + 1)])) yield [list[i], ...rest];
}

export function layoutFlow(g, opts = {}) {
  const problems = validateGraph(g);
  if (problems.length) throw new Error(problems[0]);
  const direction = opts.direction === 'down' ? 'down' : 'right';
  const right = direction === 'right';
  const G = { ...DEFAULT_GAPS, ...(opts.gaps || {}) };
  const measure = opts.measure || (n => ({ w: 40 + 7 * String(n.label).length, h: 40 }));
  const measureLabel = opts.measureLabel || (text => ({ w: String(text).length * 6.6 + 12, h: 18 }));
  const zones = g.zones || [];

  // ---- nodes and edges -----------------------------------------------------
  const N = new Map();
  g.nodes.forEach((n, index) => { const s = measure(n); N.set(n.id, { id: n.id, index, zone: n.zone ?? null, hintRank: Number.isFinite(n.rank) ? n.rank : null, hintOrder: Number.isFinite(n.order) ? n.order : null, w: s.w, h: s.h, virtual: false }); });
  const count = new Map();
  const E = g.edges.map(e => {
    const base = `${e.from}>${e.to}`, k = (count.get(base) || 0) + 1;
    count.set(base, k);
    return { id: k > 1 ? `${base}#${k}` : base, from: e.from, to: e.to, label: e.label || null, labelSize: e.label ? measureLabel(e.label) : null, reversed: false };
  });

  // ---- break cycles: an edge back to a node still being visited is reversed --
  const outOf = new Map([...N.keys()].map(id => [id, []]));
  E.forEach(e => outOf.get(e.from).push(e));
  const state = new Map();
  const visit = u => {
    state.set(u, 1);
    for (const e of outOf.get(u)) { if (state.get(e.to) === 1) e.reversed = true; else if (!state.get(e.to)) visit(e.to); }
    state.set(u, 2);
  };
  for (const id of N.keys()) if (!state.get(id)) visit(id);
  const tail = e => (e.reversed ? e.to : e.from), head = e => (e.reversed ? e.from : e.to);

  // ---- ranks: longest path, then pull each source up to its first successor --
  const preds = new Map([...N.keys()].map(id => [id, []])), succs = new Map([...N.keys()].map(id => [id, []]));
  E.forEach(e => { preds.get(head(e)).push(tail(e)); succs.get(tail(e)).push(head(e)); });
  const indeg = new Map([...N.keys()].map(id => [id, preds.get(id).length]));
  const queue = [...N.keys()].filter(id => !indeg.get(id)), topo = [];
  while (queue.length) { const u = queue.shift(); topo.push(u); for (const w of succs.get(u)) { indeg.set(w, indeg.get(w) - 1); if (!indeg.get(w)) queue.push(w); } }
  // A rank hint is the earliest rank a node may take. Whatever feeds a node is
  // always at least one rank before it, so no edge is ever level or backward.
  for (const id of topo) {
    const n = N.get(id);
    n.rank = Math.max(n.hintRank ?? 0, ...preds.get(id).map(p => N.get(p).rank + 1));
  }
  for (const id of N.keys()) {
    const n = N.get(id);
    const after = succs.get(id);
    if (n.hintRank === null && !preds.get(id).length && after.length) n.rank = Math.min(...after.map(x => N.get(x).rank)) - 1;
  }
  if (![...N.values()].some(n => n.hintRank !== null)) { const lo = Math.min(...[...N.values()].map(n => n.rank)); N.forEach(n => { n.rank -= lo; }); }
  const lastRank = Math.max(...[...N.values()].map(n => n.rank));

  // ---- virtual nodes: one on every rank an edge skips -----------------------
  for (const e of E) {
    const a = N.get(tail(e)), b = N.get(head(e));
    e.chain = [a.id];
    for (let r = a.rank + 1; r < b.rank; r++) {
      const id = `~${e.id}~${r}`;
      N.set(id, { id, index: 1000 + N.size, zone: null, hintRank: null, hintOrder: null, w: right ? 0 : G.virtual, h: right ? G.virtual : 0, virtual: true, rank: r, edge: e });
      e.chain.push(id);
    }
    e.chain.push(b.id);
  }

  // ---- bands: zones whose ranks overlap sit in different bands --------------
  const span = new Map();
  for (const z of zones) {
    const members = [...N.values()].filter(n => n.zone === z.id);
    if (members.length) span.set(z.id, { lo: Math.min(...members.map(n => n.rank)), hi: Math.max(...members.map(n => n.rank)), band: -1 });
  }
  let bands = 0;
  for (const s of span.values()) {
    let b = 0;
    while ([...span.values()].some(o => o !== s && o.band === b && o.lo <= s.hi && s.lo <= o.hi)) b++;
    s.band = b;
    bands = Math.max(bands, b + 1);
  }
  bands = Math.max(bands, 1);
  const zoneAt = (band, rank) => { for (const [id, s] of span) if (s.band === band && s.lo <= rank && rank <= s.hi) return id; return null; };
  const anyZoneAt = rank => [...span.values()].some(s => s.lo <= rank && rank <= s.hi);
  const neighbours = id => E.flatMap(e => { const i = e.chain.indexOf(id); return i < 0 ? [] : [e.chain[i - 1], e.chain[i + 1]].filter(Boolean); });
  for (const n of N.values()) if (n.zone !== null) n.band = span.get(n.zone).band;
  for (const n of [...N.values()].filter(m => m.zone === null && !m.virtual).sort((a, b) => a.rank - b.rank || a.index - b.index)) {
    let free = [];
    for (let b = 0; b < bands; b++) if (!zoneAt(b, n.rank)) free.push(b);
    if (!free.length) { free = [bands]; bands++; }
    const near = E.filter(e => e.from === n.id || e.to === n.id).map(e => N.get(e.from === n.id ? e.to : e.from).band).filter(b => b !== undefined);
    const want = near.length ? near.reduce((s, b) => s + b, 0) / near.length : free[0];
    n.band = free.reduce((best, b) => (Math.abs(b - want) < Math.abs(best - want) ? b : best), free[0]);
  }
  // A long edge changes band once, straight after its source, then runs straight to its target.
  for (const e of E) {
    const b = N.get(e.chain[e.chain.length - 1]).band;
    e.chain.slice(1, -1).forEach(id => { N.get(id).band = b; });
  }
  // The label sits on the hop next to the less crowded end, where it can only mean this edge.
  const degOut = id => E.filter(x => x.chain[0] === id).length, degIn = id => E.filter(x => x.chain[x.chain.length - 1] === id).length;
  for (const e of E) e.labelHop = e.chain.length > 2 && degOut(e.chain[0]) > degIn(e.chain[e.chain.length - 1]) ? e.chain.length - 1 : 1;

  // ---- order inside each (rank, band) cell, to minimise crossings -----------
  const cellKey = n => `${n.rank}|${n.band}`;
  const initial = new Map();
  for (const n of [...N.values()].sort((a, b) => a.index - b.index)) { if (!initial.has(cellKey(n))) initial.set(cellKey(n), []); initial.get(cellKey(n)).push(n.id); }
  const locked = new Set();
  for (const [key, ids] of initial) if (ids.some(id => N.get(id).hintOrder !== null)) {
    ids.sort((a, b) => (N.get(a).hintOrder ?? Infinity) - (N.get(b).hintOrder ?? Infinity) || N.get(a).index - N.get(b).index);
    locked.add(key);
  }
  const segments = [];                                                  // every hop between adjacent ranks
  for (const e of E) for (let i = 1; i < e.chain.length; i++) segments.push([e.chain[i - 1], e.chain[i], N.get(e.chain[i - 1]).rank]);
  const segAt = Array.from({ length: lastRank + 1 }, (_, r) => segments.filter(s => s[2] === r));
  const positions = cells => {
    const pos = new Map();
    for (let r = 0; r <= lastRank; r++) { let i = 0; for (let b = 0; b < bands; b++) for (const id of cells.get(`${r}|${b}`) || []) pos.set(id, i++); }
    return pos;
  };
  const crossingsAt = (pos, r) => {
    const s = segAt[r] || [];
    let c = 0;
    for (let i = 0; i < s.length; i++) for (let j = i + 1; j < s.length; j++) if ((pos.get(s[i][0]) - pos.get(s[j][0])) * (pos.get(s[i][1]) - pos.get(s[j][1])) < 0) c++;
    return c;
  };
  const total = cells => { const pos = positions(cells); let c = 0; for (let r = 0; r < lastRank; r++) c += crossingsAt(pos, r); return c; };
  // Try orders for one cell at a time. Only that cell's positions change, so the
  // cost of an order is the crossings in the two gaps beside its rank.
  const improve = cells => {
    const pos = positions(cells);
    for (let pass = 0; pass < 6; pass++) {
      let changed = false;
      const ranks = Array.from({ length: lastRank + 1 }, (_, r) => r);
      for (const r of pass % 2 ? ranks.reverse() : ranks) for (let b = 0; b < bands; b++) {
        const key = `${r}|${b}`, ids = cells.get(key);
        if (!ids || ids.length < 2 || locked.has(key)) continue;
        const first = Math.min(...ids.map(id => pos.get(id)));
        const put = order => order.forEach((id, i) => pos.set(id, first + i));
        const cost = order => { put(order); return (r > 0 ? crossingsAt(pos, r - 1) : 0) + crossingsAt(pos, r); };
        let best = ids, bestCost = cost(ids);
        if (bestCost > 0) {
          if (ids.length <= 5) {
            for (const p of permutations(ids)) { const c = cost(p); if (c < bestCost) { best = p; bestCost = c; if (!c) break; } }
          } else {
            // Too many to try every order: sort by where the neighbours sit, then swap neighbours while it helps.
            const side = pass % 2 ? r + 1 : r - 1;
            const centre = id => { const ns = neighbours(id).filter(x => N.get(x).rank === side).map(x => pos.get(x)); return ns.length ? ns.reduce((sum, x) => sum + x, 0) / ns.length : pos.get(id) - first; };
            let order = [...ids].sort((x, y) => centre(x) - centre(y));
            let c = cost(order);
            for (let again = true, guard = 0; again && guard < 4; guard++) {
              again = false;
              for (let i = 0; i + 1 < order.length; i++) {
                const swapped = [...order]; [swapped[i], swapped[i + 1]] = [swapped[i + 1], swapped[i]];
                const c2 = cost(swapped);
                if (c2 < c) { order = swapped; c = c2; again = true; }
              }
            }
            if (c < bestCost) { best = order; bestCost = c; }
          }
        }
        put(best);
        if (best !== ids) { cells.set(key, best); changed = true; }
      }
      if (!changed) break;
    }
    return cells;
  };
  const rand = random(7);
  let bestCells = null, bestScore = Infinity;
  for (let start = 0; start < 4; start++) {
    const cells = new Map([...initial].map(([key, ids]) => {
      const order = [...ids];
      if (start && !locked.has(key)) for (let i = order.length - 1; i > 0; i--) { const j = Math.floor(rand() * (i + 1)); [order[i], order[j]] = [order[j], order[i]]; }
      return [key, order];
    }));
    improve(cells);
    const score = total(cells);
    if (score < bestScore) { bestScore = score; bestCells = cells; }
    if (!bestScore) break;
  }
  const pos = positions(bestCells);
  N.forEach(n => { n.order = pos.get(n.id); });

  // ---- coordinates -----------------------------------------------------------
  const main = n => (right ? n.w : n.h), cross = n => (right ? n.h : n.w);
  const inRank = r => [...N.values()].filter(n => n.rank === r).sort((a, b) => a.order - b.order);
  const rankSize = Array.from({ length: lastRank + 1 }, (_, r) => Math.max(24, ...inRank(r).filter(n => !n.virtual).map(main)));
  const starts = r => [...span.values()].some(s => s.lo === r), ends = r => [...span.values()].some(s => s.hi === r);
  const rankStart = [];
  let at = G.margin + (starts(0) ? G.pad + (right ? 0 : G.zoneLabel) : 0);
  for (let r = 0; r <= lastRank; r++) {
    rankStart[r] = at;
    if (r === lastRank) break;
    const labels = E.filter(e => e.labelSize && N.get(e.chain[e.labelHop - 1]).rank === r).map(e => (right ? e.labelSize.w + G.labelPad : e.labelSize.h + G.labelPad + 4));
    const zoneRoom = (ends(r) ? G.pad : 0) + (starts(r + 1) ? G.pad + (right ? 0 : G.zoneLabel) : 0) + (ends(r) || starts(r + 1) ? G.zoneGap : 0);
    at += rankSize[r] + Math.max(G.rank, ...labels) + zoneRoom;
  }
  const mainTotal = rankStart[lastRank] + rankSize[lastRank] + (ends(lastRank) ? G.pad : 0) + G.margin;

  const bandInner = [], bandStart = [], bandTop = [];
  let crossAt = G.margin;
  for (let b = 0; b < bands; b++) {
    const zoned = [...span.values()].some(s => s.band === b);
    let inner = 0;
    for (let r = 0; r <= lastRank; r++) { const cell = (bestCells.get(`${r}|${b}`) || []).map(id => N.get(id)); if (cell.length) inner = Math.max(inner, cell.reduce((s, n) => s + cross(n), 0) + G.node * (cell.length - 1)); }
    bandTop[b] = zoned ? G.pad + (right ? G.zoneLabel : 0) : 0;
    bandInner[b] = inner;
    bandStart[b] = crossAt + bandTop[b];
    crossAt += bandTop[b] + inner + (zoned ? G.pad : 0) + G.band;
  }
  const crossTotal = crossAt - G.band + G.margin;

  // Start each cell stacked and centred in its band, then straighten edges by
  // moving every node toward the median of its neighbours, keeping order and gaps.
  for (let r = 0; r <= lastRank; r++) for (let b = 0; b < bands; b++) {
    const cell = (bestCells.get(`${r}|${b}`) || []).map(id => N.get(id));
    let c = bandStart[b] + (bandInner[b] - (cell.reduce((s, n) => s + cross(n), 0) + G.node * (cell.length - 1))) / 2;
    for (const n of cell) { n.c = c + cross(n) / 2; c += cross(n) + G.node; }
  }
  const bounds = n => (n.zone !== null || n.virtual || anyZoneAt(n.rank)
    ? [bandStart[n.band] + cross(n) / 2, bandStart[n.band] + bandInner[n.band] - cross(n) / 2]
    : [G.margin + cross(n) / 2, crossTotal - G.margin - cross(n) / 2]);
  for (let pass = 0; pass < 14; pass++) {
    const ranks = Array.from({ length: lastRank + 1 }, (_, r) => r);
    for (const r of pass % 2 ? ranks.reverse() : ranks) {
      const row = inRank(r);
      const want = row.map(n => { const ns = neighbours(n.id).map(id => N.get(id).c); return ns.length ? median(ns) : n.c; });
      const lim = row.map(bounds);
      const sep = i => cross(row[i - 1]) / 2 + G.node + cross(row[i]) / 2;
      const c = row.map((n, i) => Math.min(Math.max(want[i], lim[i][0]), lim[i][1]));
      for (let i = 1; i < row.length; i++) c[i] = Math.max(c[i], c[i - 1] + sep(i));
      for (let i = row.length - 1; i >= 0; i--) { c[i] = Math.min(c[i], lim[i][1]); if (i > 0) c[i - 1] = Math.min(c[i - 1], c[i] - sep(i)); }
      for (let i = 0; i < row.length; i++) { c[i] = Math.max(c[i], lim[i][0]); if (i > 0) c[i] = Math.max(c[i], c[i - 1] + sep(i)); }
      row.forEach((n, i) => { n.c = c[i]; });
    }
  }

  const round = x => Math.round(x * 2) / 2;
  const nodes = [...N.values()].map(n => {
    const m = rankStart[n.rank] + (rankSize[n.rank] - main(n)) / 2, k = n.c - cross(n) / 2;
    return { id: n.id, x: round(right ? m : k), y: round(right ? k : m), w: n.w, h: n.h, rank: n.rank, band: n.band, order: n.order, ...(n.virtual ? { virtual: true } : {}) };
  });
  const byId = new Map(nodes.map(n => [n.id, n]));
  const frames = zones.filter(z => span.has(z.id)).map(z => {
    const m = nodes.filter(n => !n.virtual && N.get(n.id).zone === z.id);
    const x0 = Math.min(...m.map(n => n.x)), y0 = Math.min(...m.map(n => n.y)), x1 = Math.max(...m.map(n => n.x + n.w)), y1 = Math.max(...m.map(n => n.y + n.h));
    return { id: z.id, label: z.label || z.id, x: x0 - G.pad, y: y0 - G.pad - G.zoneLabel, w: x1 - x0 + 2 * G.pad, h: y1 - y0 + 2 * G.pad + G.zoneLabel };
  });
  const layout = {
    direction, nodes, zones: frames,
    edges: E.map(e => ({ id: e.id, from: e.from, to: e.to, reversed: e.reversed, chain: e.chain, label: e.label, labelSize: e.labelSize, labelHop: e.labelHop })),
    ranks: rankStart.map((start, r) => ({ start, size: rankSize[r] })),
    width: Math.ceil(right ? mainTotal : crossTotal), height: Math.ceil(right ? crossTotal : mainTotal),
  };
  layout.crossings = countCrossings(layout, byId);
  return layout;
}

// Edge crossings in a finished layout, counted hop by hop between adjacent ranks.
export function countCrossings(layout, byId = new Map(layout.nodes.map(n => [n.id, n]))) {
  const right = layout.direction !== 'down';
  const c = id => { const n = byId.get(id); return right ? n.y + n.h / 2 : n.x + n.w / 2; };
  const hops = new Map();
  for (const e of layout.edges) for (let i = 1; i < e.chain.length; i++) {
    const r = byId.get(e.chain[i - 1]).rank;
    if (!hops.has(r)) hops.set(r, []);
    hops.get(r).push([c(e.chain[i - 1]), c(e.chain[i])]);
  }
  let total = 0;
  for (const list of hops.values()) for (let i = 0; i < list.length; i++) for (let j = i + 1; j < list.length; j++) if ((list[i][0] - list[j][0]) * (list[i][1] - list[j][1]) < 0) total++;
  return total;
}
