// Entry point for the kit's own code. Bundled by scripts/build-kit.mjs and
// inlined after D3 and Observable Plot.
import { BH, figure, start, tableSpec } from './core.js';
import { drawLine } from './charts/line.js';
import { drawBar } from './charts/bar.js';
import { drawDot } from './charts/dot.js';
import { drawScatter } from './charts/scatter.js';
import { drawPlot, drawSpark, drawWaffle } from './charts/small.js';
import { buildNav } from './page.js';

BH.line = (target, o = {}) => figure('line', target, o, drawLine, { table: opts => tableSpec(opts, ['x', 'series', 'y']) });
BH.bar = (target, o = {}) => figure('bar', target, o, drawBar, { table: opts => tableSpec(opts, ['x', 'series', 'y']) });
BH.dot = (target, o = {}) => figure('dot', target, o, drawDot, { table: opts => tableSpec(opts, ['x', 'series', 'y', 'y2']) });
BH.scatter = (target, o = {}) => figure('scatter', target, o, drawScatter, { table: opts => tableSpec(opts, ['label', 'series', 'x', 'y', 'size']) });
BH.spark = (target, o = {}) => figure('spark', target, o, drawSpark, { inline: 'bh-spark' });
BH.waffle = (target, o = {}) => figure('waffle', target, o, drawWaffle, { inline: 'bh-waffle-wrap' });
BH.plot = (target, spec = {}) => figure('plot', target, spec, drawPlot);

window.BH = BH;
buildNav();
start();
