// BH.spark, BH.waffle and BH.plot: the small forms and the escape hatch.
import { BHError, v } from '../core.js';
import { P, plotStyle, present, svgEl } from './common.js';

// An inline sparkline to sit beside a number. Shape only: no axes, no labels.
export function drawSpark(el, o) {
  const values = (o.values || (o.data || []).map(d => d[o.y])).filter(present).map(Number);
  if (values.length < 2) throw new BHError('A sparkline needs at least two values (pass values: [...] or data and y).');
  const w = o.width || 84, h = o.height || 24, pad = 3;
  const lo = Math.min(...values), hi = Math.max(...values), range = hi - lo || 1;
  const x = i => pad + i * (w - 2 * pad) / (values.length - 1);
  const y = val => h - pad - (val - lo) * (h - 2 * pad) / range;
  const svg = svgEl('svg', { width: w, height: h, viewBox: `0 0 ${w} ${h}`, 'aria-hidden': 'true', focusable: 'false' });
  svg.appendChild(svgEl('path', { d: values.map((val, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(val).toFixed(1)}`).join(''), fill: 'none', stroke: v('ink-2'), 'stroke-width': 1.5, 'stroke-linejoin': 'round', 'stroke-linecap': 'round', class: 'bh-line' }));
  svg.appendChild(svgEl('circle', { cx: x(values.length - 1), cy: y(values[values.length - 1]), r: 2.75, fill: v('accent') }));
  return svg;
}

// A ten-by-ten grid: a share of a whole that can be counted.
export function drawWaffle(el, o) {
  const total = o.total ?? 100;
  if (typeof o.value !== 'number' || !(total > 0)) throw new BHError('A waffle needs value (a number) and a positive total.');
  const on = Math.max(0, Math.min(100, Math.round(o.value / total * 100)));
  const box = document.createElement('span');
  box.className = 'bh-waffle';
  for (let i = 0; i < 100; i++) {
    const cell = document.createElement('i');
    if (i < on) cell.dataset.on = '';
    box.appendChild(cell);
  }
  return box;
}

// Any Observable Plot specification, with the house type and colours applied.
export function drawPlot(el, spec, width) {
  if (!spec || !Array.isArray(spec.marks)) throw new BHError('BH.plot takes an Observable Plot specification: an object with a marks array.');
  const cats = [1, 2, 3, 4, 5, 6].map(i => v(`cat-${i}`));
  return P().plot({
    width, ...spec,
    style: { ...plotStyle(), ...(typeof spec.style === 'object' ? spec.style : {}) },
    color: { range: cats, ...(spec.color || {}) },
  });
}
