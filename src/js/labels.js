// Vertical label placement. Pure; no DOM.

// Move labels apart so that none overlap, moving each as little as possible.
// items: [{ y: wanted centre, height }]. Returns the new centres in input order.
// Labels keep their relative order and stay inside [min, max]. If they cannot
// all fit, they are spread evenly across the available space.
export function dodge(items, { min = -Infinity, max = Infinity, gap = 2 } = {}) {
  const n = items.length;
  if (!n) return [];
  const order = items.map((_, i) => i).sort((a, b) => items[a].y - items[b].y || a - b);
  const want = order.map(i => items[i].y);
  const h = order.map(i => items[i].height);
  const out = new Array(n);

  const total = h.reduce((s, v) => s + v, 0) + gap * (n - 1);
  if (total > max - min) {
    const lo = min + h[0] / 2, hi = max - h[n - 1] / 2;
    order.forEach((i, k) => { out[i] = n === 1 ? (lo + hi) / 2 : lo + (hi - lo) * k / (n - 1); });
    return out;
  }

  // Each block is a run of labels stacked with `gap` between them. A block sits
  // where it displaces its labels least; blocks that collide are merged.
  const blocks = want.map((y, k) => ({ from: k, to: k, span: h[k], start: y - h[k] / 2 }));
  const place = b => {
    let sum = 0, offset = 0;
    for (let k = b.from; k <= b.to; k++) { sum += want[k] - (offset + h[k] / 2); offset += h[k] + gap; }
    b.span = offset - gap;
    b.start = Math.min(Math.max(sum / (b.to - b.from + 1), min), max - b.span);
  };
  blocks.forEach(place);
  for (let i = 0; i < blocks.length - 1;) {
    const a = blocks[i], b = blocks[i + 1];
    if (a.start + a.span + gap > b.start + 1e-9) {
      a.to = b.to;
      blocks.splice(i + 1, 1);
      place(a);
      if (i > 0) i--;
    } else i++;
  }
  for (const b of blocks) {
    let offset = b.start;
    for (let k = b.from; k <= b.to; k++) { out[order[k]] = offset + h[k] / 2; offset += h[k] + gap; }
  }
  return out;
}

// True when two boxes {x, y, w, h} (top-left origin) overlap by more than `slack`.
export function boxesOverlap(a, b, slack = 0) {
  return a.x + a.w - slack > b.x && b.x + b.w - slack > a.x && a.y + a.h - slack > b.y && b.y + b.h - slack > a.y;
}
