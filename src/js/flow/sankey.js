// BH.sankey: flows by volume between stages. Ribbon width is the amount.
import { BHError, locale, textWidth, tokenPx, v } from '../core.js';
import { formatNumber } from '../format.js';

const NS = 'http://www.w3.org/2000/svg';
const el = (name, attrs = {}, text) => {
  const n = document.createElementNS(NS, name);
  for (const [k, val] of Object.entries(attrs)) if (val !== undefined && val !== null) n.setAttribute(k, val);
  if (text !== undefined) n.textContent = text;
  return n;
};

export function drawSankey(target, o, width) {
  const d3 = window.d3;
  if (!Array.isArray(o.links) || !o.links.length) throw new BHError('BH.sankey needs links: [{ source, target, value }, …].');
  for (const l of o.links) {
    if (l.source === undefined || l.target === undefined) throw new BHError('Every link needs a source and a target.');
    if (!(Number(l.value) > 0)) throw new BHError(`The link ${l.source}>${l.target} needs a value above zero.`);
  }
  const ids = [...new Set([...(o.nodes || []).map(n => n.id), ...o.links.flatMap(l => [l.source, l.target])])];
  const labelOf = new Map(ids.map(id => [id, id]));
  for (const n of o.nodes || []) if (n.label) labelOf.set(n.id, n.label);
  const linkIds = new Set(o.links.map(l => `${l.source}>${l.target}`));
  const keyLinks = new Set(), keyNodes = new Set();
  const list = o.highlight === undefined || o.highlight === null ? [] : [].concat(o.highlight);
  const path = list.filter(x => !String(x).includes('>'));
  for (const x of list) {
    if (String(x).includes('>')) { if (!linkIds.has(x)) throw new BHError(`highlight names a link "${x}" that is not in the data.`); keyLinks.add(x); }
    else { if (!ids.includes(x)) throw new BHError(`highlight names a node "${x}" that is not in the data.`); keyNodes.add(x); }
  }
  for (let i = 1; i < path.length; i++) if (linkIds.has(`${path[i - 1]}>${path[i]}`)) keyLinks.add(`${path[i - 1]}>${path[i]}`);

  const size = tokenPx('size-micro');
  const fmt = x => formatNumber(x, { locale: locale(), compact: x >= 100000 });
  const build = height => d3.sankey().nodeId(d => d.id).nodeWidth(8).nodePadding(20).nodeAlign(d3.sankeyJustify).extent([[1, 8], [width - 1, height - 8]])({
    nodes: ids.map(id => ({ id })), links: o.links.map(l => ({ source: l.source, target: l.target, value: Number(l.value) })),
  });
  let graph;
  try { graph = build(300); } catch (e) {
    if (/circular/i.test(e.message)) throw new BHError('The links form a loop. A Sankey needs stages that only move forward; to show a loop, use BH.flow.');
    throw e;
  }
  const columns = new Map();
  for (const n of graph.nodes) columns.set(n.depth, (columns.get(n.depth) || 0) + 1);
  const height = o.height || Math.min(560, Math.max(240, Math.max(...columns.values()) * 58 + 40));
  graph = build(height);

  const svg = el('svg', { class: 'bh-sankey-svg', width, height, viewBox: `0 0 ${width} ${height}` });
  const gLinks = el('g', { class: 'bh-sankey-links' }), gNodes = el('g'), gLabels = el('g');
  // A ribbon is a filled band between two nodes, as wide as the amount it carries.
  const ribbon = l => {
    const x0 = l.source.x1, x1 = l.target.x0, m = (x0 + x1) / 2, h = Math.max(1, l.width) / 2;
    return `M${x0},${l.y0 - h}C${m},${l.y0 - h} ${m},${l.y1 - h} ${x1},${l.y1 - h}V${l.y1 + h}C${m},${l.y1 + h} ${m},${l.y0 + h} ${x0},${l.y0 + h}Z`;
  };
  const linkEls = [];
  for (const l of [...graph.links].sort((a, b) => keyLinks.has(`${a.source.id}>${a.target.id}`) - keyLinks.has(`${b.source.id}>${b.target.id}`))) {
    const id = `${l.source.id}>${l.target.id}`;
    const p = el('path', { class: `bh-sankey-link${keyLinks.has(id) ? ' is-key' : ''}`, d: ribbon(l), 'data-id': id });
    p.appendChild(el('title', {}, `${labelOf.get(l.source.id)} → ${labelOf.get(l.target.id)}: ${fmt(l.value)}${o.unit ? ` ${o.unit}` : ''}`));
    p.addEventListener('pointerenter', () => linkEls.forEach(q => q.classList.toggle('is-dim', q !== p)));
    p.addEventListener('pointerleave', () => linkEls.forEach(q => q.classList.remove('is-dim')));
    linkEls.push(p);
    gLinks.appendChild(p);
  }
  const lastDepth = Math.max(...graph.nodes.map(n => n.depth));
  const placed = [];
  for (const n of [...graph.nodes].sort((a, b) => (a.y0 + a.y1) - (b.y0 + b.y1))) {
    gNodes.appendChild(el('rect', { class: `bh-sankey-node${keyNodes.has(n.id) ? ' is-key' : ''}`, x: n.x0, y: n.y0, width: n.x1 - n.x0, height: Math.max(1, n.y1 - n.y0), 'data-id': n.id }));
    const end = n.x1 > width - 24 && lastDepth > 0;
    const room = (width / (lastDepth + 1 || 1)) - 26;
    let name = String(labelOf.get(n.id));
    const value = fmt(n.value);
    while (name.length > 3 && textWidth(`${name} ${value}`, size, 600) > Math.max(70, room)) name = `${name.slice(0, -2).trimEnd()}…`;
    // Keep labels from landing on each other: move a label down until it is clear.
    const w = textWidth(`${name} ${value}`, size, 600), h = size * 1.3;
    const box = { x: end ? n.x0 - 7 - w : n.x1 + 7, y: (n.y0 + n.y1) / 2 - h / 2, w, h };
    for (let tries = 0; tries < 12 && placed.some(p => p.x < box.x + box.w + 4 && box.x < p.x + p.w + 4 && p.y < box.y + box.h + 1 && box.y < p.y + p.h + 1); tries++) box.y += h * 0.5;
    box.y = Math.min(box.y, height - h);
    placed.push(box);
    const t = el('text', { class: 'bh-sankey-label', x: end ? n.x0 - 7 : n.x1 + 7, y: box.y + h / 2, 'text-anchor': end ? 'end' : 'start', 'dominant-baseline': 'central' });
    t.append(el('tspan', { class: 'bh-sankey-name' }, name), el('tspan', { class: 'bh-sankey-value' }, ` ${value}`));
    if (name !== String(labelOf.get(n.id))) t.setAttribute('aria-label', `${labelOf.get(n.id)} ${value}`);
    gLabels.appendChild(t);
  }
  svg.append(gLinks, gNodes, gLabels);
  target.classList.add('bh-sankey');
  return svg;
}

export function sankeyTable(o) {
  const name = new Map((o.nodes || []).filter(n => n.label).map(n => [n.id, n.label]));
  return {
    columns: [{ key: 'source', label: 'From' }, { key: 'target', label: 'To' }, { key: 'value', label: o.unit ? o.unit[0].toUpperCase() + o.unit.slice(1) : 'Value', numeric: true }],
    rows: (o.links || []).map(l => ({ source: name.get(l.source) || l.source, target: name.get(l.target) || l.target, value: Number(l.value) })),
  };
}
