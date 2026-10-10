// Layout for BH.timeline. Pure; no DOM.
// An event is drawn as a flag: a stem at its moment, and a label that starts
// just right of the stem at the stem's far end. Flags that would collide are
// stood on taller stems.

// The tier of each flag, 1 being nearest the line. items: [{ x, w }], where w
// is the width of the label. Working from the last event back, each flag takes
// the lowest tier in which its label touches no other label and is crossed by
// no taller stem; a cluster becomes a staircase that falls towards the later
// events. Returns null if more than maxTiers would be needed.
export function placeFlags(items, { maxTiers = 5, gap = 10, offset = 5 } = {}) {
  const order = items.map((_, i) => i).sort((a, b) => items[b].x - items[a].x || b - a);
  const tiers = new Array(items.length).fill(0);
  const placed = [];
  for (const i of order) {
    const x = items[i].x, x0 = x + offset, x1 = x0 + items[i].w;
    let tier = 1;
    for (; tier <= maxTiers; tier++) {
      const clash = placed.some(p => (p.tier === tier && x0 < p.x1 + gap && p.x0 < x1 + gap)      // a label already in this tier
        || (p.tier > tier && p.x >= x0 - 3 && p.x <= x1 + 3)                                       // a taller stem would cross this label
        || (p.tier < tier && x >= p.x0 - 3 && x <= p.x1 + 3));                                     // this stem would cross a lower label
      if (!clash) break;
    }
    if (tier > maxTiers) return null;
    tiers[i] = tier;
    placed.push({ x, x0, x1, tier });
  }
  return tiers;
}

// Where each event sits across `width`, given its position in time as a
// fraction from 0 to 1 and the width of its label. Room is left on the right
// so that the labels of the last events end inside the drawing. Returns null
// when that would squeeze the scale to less than `least` of the width.
export function fitScale(fractions, widths, width, { left = 6, offset = 5, least = 0.5 } = {}) {
  let right = 8;
  for (let pass = 0; pass < 40; pass++) {
    const span = width - left - right;
    if (span < width * least) return null;
    const over = Math.max(...fractions.map((f, i) => left + f * span + offset + widths[i] - width));
    if (over <= 0.5) return { left, right, span, x: fractions.map(f => left + f * span) };
    right += over + 1;
  }
  return null;
}

// A length of time in words: "41 h 38 min", "2 hours", "3 days".
export function duration(ms) {
  const S = 1000, M = 60 * S, H = 60 * M, D = 24 * H;
  const plural = (n, word) => `${n} ${word}${n === 1 ? '' : 's'}`;
  const abs = Math.abs(ms);
  if (abs < M) return plural(Math.round(abs / S), 'second');
  if (abs < H) return plural(Math.round(abs / M), 'minute');
  if (abs < 2 * D) {
    const h = Math.floor(Math.round(abs / M) / 60), m = Math.round(abs / M) % 60;
    return m ? `${h} h ${m} min` : plural(h, 'hour');
  }
  if (abs < 60 * D) { const d = Math.round(abs / D * 10) / 10; return `${d} day${d === 1 ? '' : 's'}`; }
  if (abs < 730 * D) return plural(Math.round(abs / (30.44 * D)), 'month');
  const y = Math.round(abs / (365.25 * D) * 10) / 10;
  return `${y} year${y === 1 ? '' : 's'}`;
}
