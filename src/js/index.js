// Entry point for the kit's own code. Bundled by scripts/build-kit.mjs and
// inlined after D3 and Observable Plot.
import { BH, figure, start, tableSpec } from './core.js';
import { drawLine } from './charts/line.js';
import { drawBar } from './charts/bar.js';
import { drawDot } from './charts/dot.js';
import { drawScatter } from './charts/scatter.js';
import { drawPlot, drawSpark, drawWaffle } from './charts/small.js';
import { drawFlow, flowTable } from './flow/render.js';
import { drawSankey, sankeyTable } from './flow/sankey.js';
import { buildNav } from './page.js';
import { enabled, enter, flowDots, loop, settle } from './motion.js';

BH.line = (target, o = {}) => figure('line', target, o, drawLine, { table: opts => tableSpec(opts, ['x', 'series', 'y']) });
BH.bar = (target, o = {}) => figure('bar', target, o, drawBar, { table: opts => tableSpec(opts, ['x', 'series', 'y']) });
BH.dot = (target, o = {}) => figure('dot', target, o, drawDot, { table: opts => tableSpec(opts, ['x', 'series', 'y', 'y2']) });
BH.scatter = (target, o = {}) => figure('scatter', target, o, drawScatter, { table: opts => tableSpec(opts, ['label', 'series', 'x', 'y', 'size']) });
BH.spark = (target, o = {}) => figure('spark', target, o, drawSpark, { inline: 'bh-spark' });
BH.waffle = (target, o = {}) => figure('waffle', target, o, drawWaffle, { inline: 'bh-waffle-wrap' });
BH.plot = (target, spec = {}) => figure('plot', target, spec, drawPlot);
BH.flow = (target, o = {}) => {
  const f = figure('flow', target, o, drawFlow, {
    table: flowTable,
    // Dots along the edges show direction; they are rebuilt whenever the diagram is redrawn.
    after(el, opts, entry) {
      const stepsCleanup = entry.cleanup;
      const dots = opts.flow ? flowDots(el) : null;
      entry.cleanup = () => { if (stepsCleanup) stepsCleanup(); if (dots) dots.stop(); };
    },
  });
  if (!f) return null;
  const call = name => (...args) => (f.entry.api ? f.entry.api[name](...args) : undefined);
  return { ...f, step: call('step'), play: call('play'), pause: call('pause') };
};
BH.sankey = (target, o = {}) => figure('sankey', target, o, drawSankey, { table: sankeyTable });

BH.motion = { enabled, enter, loop };
BH.settle = settle;

window.BH = BH;
buildNav();
start();
