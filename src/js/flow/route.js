// Edge routing for a finished flow layout. Pure: no DOM.
// Each edge leaves and enters nodes at its own point, runs straight across the
// rank it starts in and any rank it skips, and bends only in the gaps between
// ranks, so it never passes through a node.

// True when the segment p→q passes through `box` shrunk by `pad` on every side.
export function segmentHitsBox(p, q, box, pad = 0) {
  const x0 = box.x + pad, y0 = box.y + pad, x1 = box.x + box.w - pad, y1 = box.y + box.h - pad;
  if (x1 <= x0 || y1 <= y0) return false;
  let t0 = 0, t1 = 1;
  const dx = q[0] - p[0], dy = q[1] - p[1];
  for (const [d, dist] of [[-dx, p[0] - x0], [dx, x1 - p[0]], [-dy, p[1] - y0], [dy, y1 - p[1]]]) {
    if (d === 0) { if (dist < 0) return false; continue; }
    const t = dist / d;
    if (d < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
  }
  return t0 < t1;
}

const overlap = (a, b, pad = 0) => a.x < b.x + b.w + pad && b.x < a.x + a.w + pad && a.y < b.y + b.h + pad && b.y < a.y + a.h + pad;
const r1 = x => Math.round(x * 10) / 10;

export function routeEdges(layout, { direction = layout.direction, arrow = 7 } = {}) {
  const right = direction !== 'down';
  const byId = new Map(layout.nodes.map(n => [n.id, n]));
  // Work in (main, cross) coordinates and convert at the end.
  const M = n => (right ? { m: n.x, c: n.y, ms: n.w, cs: n.h } : { m: n.y, c: n.x, ms: n.h, cs: n.w });
  const xy = (m, c) => (right ? [m, c] : [c, m]);
  const centre = id => { const b = M(byId.get(id)); return b.c + b.cs / 2; };

  // Ports: the hops on one side of a node share its edge, ordered by where they go.
  const outs = new Map(), ins = new Map();
  for (const e of layout.edges) for (let i = 1; i < e.chain.length; i++) {
    const a = e.chain[i - 1], b = e.chain[i], key = `${e.id}|${i}`;
    if (!outs.has(a)) outs.set(a, []);
    if (!ins.has(b)) ins.set(b, []);
    outs.get(a).push({ key, other: centre(b) });
    ins.get(b).push({ key, other: centre(a) });
  }
  const port = (map, id, key) => {
    const b = M(byId.get(id));
    if (byId.get(id).virtual) return b.c + b.cs / 2;
    const list = map.get(id).slice().sort((p, q) => p.other - q.other);
    const i = list.findIndex(p => p.key === key), k = list.length;
    const spread = Math.min(0.6, 0.22 * (k - 1));                        // keep ports on the flat part of the shape
    return b.c + b.cs * (k === 1 ? 0.5 : 0.5 - spread / 2 + spread * i / (k - 1));
  };

  const real = layout.nodes.filter(n => !n.virtual);
  const toXY = p => xy(p[0], p[1]).map(r1);

  // Pass 1: geometry for every edge.
  const drawn = layout.edges.map(e => {
    const pts = [];                                                       // sampled polyline, in main/cross
    let d = '';
    let labelCurve = null;
    for (let i = 1; i < e.chain.length; i++) {
      const A = byId.get(e.chain[i - 1]), B = byId.get(e.chain[i]);
      const a = M(A), b = M(B), ra = layout.ranks[A.rank], rb = layout.ranks[B.rank];
      const ca = port(outs, A.id, `${e.id}|${i}`), cb = port(ins, B.id, `${e.id}|${i}`);
      const start = A.virtual ? ra.start : a.m + a.ms;                    // leave the node…
      const gapA = ra.start + ra.size, gapB = rb.start;                   // …run to the edge of its rank, bend in the gap
      const end = B.virtual ? rb.start + rb.size : b.m;
      if (i === 1) { pts.push([start, ca]); d += `M${xy(start, ca).map(r1)}`; }
      if (gapA > start + 0.5) { pts.push([gapA, ca]); d += `L${xy(gapA, ca).map(r1)}`; }
      const k = (gapB - gapA) / 2;
      const curve = t => { const u = 1 - t; return [u * u * u * gapA + 3 * u * u * t * (gapA + k) + 3 * u * t * t * (gapB - k) + t * t * t * gapB, u * u * u * ca + 3 * u * u * t * ca + 3 * u * t * t * cb + t * t * t * cb]; };
      for (let s = 1; s <= 12; s++) pts.push(curve(s / 12));
      d += `C${xy(gapA + k, ca).map(r1)} ${xy(gapB - k, cb).map(r1)} ${xy(gapB, cb).map(r1)}`;
      if (end > gapB + 0.5) { pts.push([end, cb]); d += `L${xy(end, cb).map(r1)}`; }
      if (i === (e.labelHop || 1)) labelCurve = curve;
    }
    return { e, pts, d, labelCurve, xyPts: pts.map(toXY) };
  });

  // Pass 2: labels and arrowheads. A label goes where it covers no node, no
  // other label, no zone's name and, if possible, no other edge.
  const placed = (layout.zones || []).filter(z => z.labelSize).map(z => ({ x: z.x + 8, y: z.y + 2, w: z.labelSize.w, h: 20 }));
  return drawn.map(({ e, pts, d, labelCurve, xyPts }) => {
    // The arrowhead sits at the real target. A reversed edge was laid out
    // backwards, so its target is where the drawn path starts.
    const first = pts[0], last = pts[pts.length - 1];
    const tip = e.reversed ? first : last;
    const angle = right ? (e.reversed ? 180 : 0) : (e.reversed ? 270 : 90);
    // Shorten the stroke under the arrowhead so the line does not show through its point.
    const stroke = pts.map(p => p.slice());
    if (e.reversed) stroke[0][0] += arrow; else stroke[stroke.length - 1][0] -= arrow;

    let label = null;
    if (e.label && e.labelSize && labelCurve) {
      const { w, h } = e.labelSize;
      const spots = [];
      for (const t of [0.5, 0.62, 0.38, 0.74, 0.26]) for (const shift of [0, -(h + 3), h + 3]) spots.push([t, shift]);
      const boxAt = ([t, shift]) => { const [m, c] = labelCurve(t); const [x, y] = xy(m, c + (right ? shift : 0)); return { x: x - w / 2 + (right ? 0 : shift * (w / h)), y: y - h / 2, w, h }; };
      const fits = b => b.x >= 0 && b.y >= 0 && b.x + b.w <= layout.width && b.y + b.h <= layout.height && !placed.some(p => overlap(b, p, 3)) && !real.some(n => overlap(b, n, 2));
      const clearOfEdges = b => !drawn.some(o => o.e !== e && o.xyPts.some(p => p[0] > b.x - 2 && p[0] < b.x + b.w + 2 && p[1] > b.y - 2 && p[1] < b.y + b.h + 2));
      const boxes = spots.map(boxAt);
      const box = boxes.find(b => fits(b) && clearOfEdges(b)) || boxes.find(fits) || boxes[0];
      placed.push(box);
      label = { text: e.label, x: r1(box.x + w / 2), y: r1(box.y + h / 2), w, h };
    }

    const path = e.reversed
      ? d.replace(/^M[-\d.]+,[-\d.]+/, `M${toXY(stroke[0])}`)
      : d.replace(/[-\d.]+,[-\d.]+$/, `${toXY(stroke[stroke.length - 1])}`);
    return {
      id: e.id, from: e.from, to: e.to, reversed: e.reversed, d: path,
      points: xyPts, label,
      arrow: { x: toXY(tip)[0], y: toXY(tip)[1], angle },
    };
  });
}
