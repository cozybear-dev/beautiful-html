# beautiful-html Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship an Agent Skill that lets any coding agent produce a
well-designed, self-contained, re-editable HTML report with sound charts,
system flow diagrams and purposeful motion.

**Architecture:** A report is one HTML file: editable content first, a prebuilt
kit last (fonts, styles, D3, Observable Plot and our `BH` code), joined by file
concatenation. The kit is built from `src/` by a dev-only script. A
dependency-free Node checker drives a local Chromium browser over its debug
pipe to audit and screenshot the result.

**Tech Stack:** HTML, CSS custom properties, vanilla JavaScript (ES2020), D3 7,
Observable Plot 0.6, d3-sankey 0.12, Node 18+ with `node:test`, esbuild (dev
only), Chrome DevTools Protocol over `--remote-debugging-pipe`.

**Spec:** `docs/superpowers/specs/2026-10-10-beautiful-html-design.md`

**Execution note:** The owner approved building without a plan review and
without subagents, so this plan is executed inline. Tests and interfaces are
written out in full. Implementation steps for long modules describe the
algorithm instead of repeating every line, because the same person writes both.

## Global Constraints

- A report makes **no network requests**. No CDN, no remote font, no remote image.
- Report under **1.5 MB** before images; error above 5 MB. Each kit file under **1.1 MB**.
- Fonts: SIL OFL only, Latin subset, at most **200 KB** per direction, at most **two families**, every face with tabular figures.
- Assembly needs **no runtime**: `cat content.html kit/<direction>.kit.html > report.html`.
- `tools/check.mjs`, `tools/rekit.mjs` and `tools/audit.js` have **zero npm dependencies** and run on Node 18+.
- Class prefix `bh-`, token prefix `--bh-`, global object `BH`, marker text `BH-KIT`.
- Scheme is set by `data-scheme` on `<html>`, never by the system setting. Print uses light.
- Charts: bars start at zero; no dual axis; no pie; at most **6** coloured series.
- Diagrams: at most **20** nodes; no overlapping nodes; no edge through a node.
- Text contrast at least **4.5:1** (3:1 for large text). Body text at least 16 px; figure labels at least 11 px; lines at most 80 characters.
- Motion: entrance once, flow with a pause control, response to the reader. Final state under `prefers-reduced-motion`, in print and in PDF. No content hidden by CSS alone.
- Checker viewports: **1440** and **390** px wide, plus print. Exit codes 0, 1, 2.
- Check loop: fix in one batch, re-run once. Two rounds is the ceiling.
- Commit on `main` after each task. End messages with the `Co-Authored-By` line.

## Review Focus

Inputs the spec implies but does not spell out, most likely first. Each has a
test in the task that owns the code.

1. **Messy CSV:** quoted commas, empty cells, a byte-order mark, date strings. Expect correct parsing, gaps for missing values, never a silent zero. (Task 4)
2. **Long text:** a 60-character node label, a 40-character category, a three-line title. Expect wrapping or a clean cut with the full text available, never overflow. (Tasks 4 and 5)
3. **Degenerate data:** empty array, one row, all-equal values. Expect a readable message in the figure, never an exception. (Task 4)
4. **Awkward graphs:** a cycle, a self-loop, two disconnected groups, a duplicate id, an edge to a missing node. Expect a sane layout or a message naming the fault. (Task 5)
5. **Hostile environment for the checker:** a path with spaces, no browser installed, a report whose kit was deleted. Expect exit 2 or a named error, never a stack trace. (Task 2)

## File Structure

```
package.json                         private; scripts: build, test, fetch
src/vendor/                          d3.min.js, plot.umd.min.js, d3-sankey.min.js, manifest.json
src/fonts/<family>/                  *.woff2, OFL.txt
src/css/tokens.css                   scales shared by all directions
src/css/base.css                     reset, typography, layout grid
src/css/components.css               header, key figures, section, callout, table, …
src/css/figures.css                  figure frame, chart and diagram styling, controls
src/css/motion.css                   entrance states, reduced-motion and print overrides
src/css/print.css                    page size, breaks, hidden controls
src/css/directions/<name>.css        tokens and font faces for one direction
src/js/core.js                       BH namespace, ready queue, tokens, figure wiring, errors
src/js/format.js                     number and date formatting (pure)
src/js/data.js                       BH.data CSV parsing
src/js/labels.js                     label collision avoidance (pure)
src/js/charts/{line,bar,dot,scatter,spark,waffle,plot}.js
src/js/flow/layout.js                rank, band, order, coordinates (pure)
src/js/flow/route.js                 ports, paths, label placement (pure)
src/js/flow/render.js                SVG, hover, walkthrough, flow dots
src/js/flow/sankey.js                BH.sankey
src/js/motion.js                     gate, entrance, count-up, pause, settle
src/js/page.js                       section navigator, presentation keys, data tables
scripts/fetch-vendor.mjs             pinned downloads with SHA-256
scripts/fetch-fonts.mjs              Latin woff2 and licence texts
scripts/build-kit.mjs                src → skills/beautiful-html/kit/*.kit.html
scripts/validate-palette.mjs         colour-blind separation and contrast
scripts/package-zip.mjs              zip for claude.ai upload
skills/beautiful-html/…              the shipped skill (see spec)
tests/unit/*.test.mjs                pure functions
tests/render/*.test.mjs              browser tests through the checker's CDP client
tests/fixtures/                      content files, faulty pages
evals/briefs/NN-name/{brief.md,data/*.csv}
evals/run.mjs                        runs each brief with and without the skill
evals/gallery.mjs                    builds the blind side-by-side page
docs/research.md                     the research record with sources
```

---

### Task 1: Scaffold, vendored libraries, fonts, kit builder

**Files:**
- Create: `package.json`, `.gitignore`, `scripts/fetch-vendor.mjs`, `scripts/fetch-fonts.mjs`, `scripts/build-kit.mjs`, `src/vendor/*`, `src/fonts/*`, `src/css/tokens.css` (minimal), `src/css/directions/analytical.css` (minimal), `src/js/core.js` (minimal)
- Test: `tests/unit/build-kit.test.mjs`

**Interfaces:**
- Produces: `buildKit(direction: string) → { path: string, bytes: number }` exported from `scripts/build-kit.mjs`; kit files at `skills/beautiful-html/kit/<direction>.kit.html` whose first line is `<!-- BH-KIT v<version> <direction>: embedded fonts, styles and code. Do not open, print or edit below this line. -->`, followed by `<style id="bh-kit-css">`, `<script id="bh-kit-js">`, `</body>`, `</html>`.
- Produces: `DIRECTIONS = ['analytical', 'narrative', 'presentation']` exported from `scripts/build-kit.mjs`.

- [ ] **Step 1: Write the failing test**

```js
// tests/unit/build-kit.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { buildKit } from '../../scripts/build-kit.mjs';

test('analytical kit builds within budget and is self-contained', async () => {
  const { path, bytes } = await buildKit('analytical');
  const kit = readFileSync(path, 'utf8');
  assert.ok(bytes < 1_100_000, `kit is ${bytes} bytes`);
  assert.match(kit.split('\n')[0], /^<!-- BH-KIT v\d+\.\d+\.\d+ analytical:/);
  assert.match(kit, /<style id="bh-kit-css">/);
  assert.match(kit, /<script id="bh-kit-js">/);
  assert.ok(kit.trimEnd().endsWith('</html>'));
  assert.ok(kit.split('\n').length <= 40, 'kit must sit on few long lines');
  const urls = kit.match(/(?:src|href)=["']https?:|url\(\s*["']?https?:|@import/g) || [];
  assert.deepEqual(urls, []);
});
```

- [ ] **Step 2: Run it and confirm it fails**

Run: `node --test tests/unit/build-kit.test.mjs`
Expected: FAIL, cannot find `scripts/build-kit.mjs`.

- [ ] **Step 3: Implement**

`fetch-vendor.mjs` downloads pinned files from jsDelivr (`d3@7.9.0/dist/d3.min.js`, `@observablehq/plot@0.6.17/dist/plot.umd.min.js`, `d3-sankey@0.12.3/dist/d3-sankey.min.js`), writes them to `src/vendor/`, and records name, version, licence and SHA-256 in `manifest.json`. `fetch-fonts.mjs` requests the Google Fonts CSS with a current Chrome user agent, keeps only the `latin` faces, saves the woff2 files, and fetches each family's `OFL.txt` from the `google/fonts` repository. `build-kit.mjs` concatenates the CSS files in the order listed under File Structure, replaces each `url(font:<file>)` with a base64 data URI, strips comments and collapses whitespace to one line, bundles `src/js/core.js` and its imports with esbuild (`format: 'iife'`, `minify: true`, `target: 'es2020'`), prepends the vendored files, escapes any `</script` in the JS, and writes the kit.

- [ ] **Step 4: Run the test and confirm it passes**

Run: `npm run fetch && node --test tests/unit/build-kit.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit** (`git add -A && git commit -m "Add kit builder with vendored libraries and fonts"`)

---

### Task 2: The checker

**Files:**
- Create: `skills/beautiful-html/tools/check.mjs`, `skills/beautiful-html/tools/audit.js`, `tests/helpers/browser.mjs`, `tests/fixtures/faults/*.html`
- Test: `tests/unit/check-static.test.mjs`, `tests/render/audit.test.mjs`

**Interfaces:**
- Produces from `check.mjs`: `staticCheck(html: string, bytes: number) → Finding[]`; `findBrowser(env, platform, exists) → string | null`; `launch(browserPath) → { send(method, params, sessionId), newPage() → { sessionId, evaluate(expr), navigate(url), setViewport(w, h), emulate({ media, reducedMotion }), screenshot(clip), pdf(opts), events }, close() }`; `sliceHeights(total: number, slice: number, max: number) → Array<{ y, height }>`.
- `Finding = { level: 'error' | 'warning', code: string, message: string, selector?: string, fix: string, viewport?: string }`.
- Produces from `audit.js`: a global function `__bhAudit({ viewport }) → { findings: Finding[], metrics: { height, figures, diagrams: [{ id, crossings }] } }`.
- Consumes from the kit (Task 5 onward): `element.__bhFlow = { nodes: [{ id, x, y, w, h }], edges: [{ id, points: [[x, y], …] }], crossings }` on each flow diagram mount; `BH.settle()`; `.bh-error` for failed figures.

- [ ] **Step 1: Write the failing static tests**

```js
// tests/unit/check-static.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { staticCheck, findBrowser, sliceHeights } from '../../skills/beautiful-html/tools/check.mjs';

const ok = `<!doctype html>
<!-- EDITING GUIDE: … -->
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>T</title></head>
<body><main class="bh-report"></main>
<!-- BH-KIT v0.1.0 analytical: embedded -->
<style id="bh-kit-css">a{}</style><script id="bh-kit-js">1</script></body></html>`;
const codes = (html, bytes = html.length) => staticCheck(html, bytes).map(f => f.code);

test('a well-formed report has no static findings', () => assert.deepEqual(codes(ok), []));
test('network references are errors', () => {
  assert.ok(codes(ok.replace('<title>', '<link rel="stylesheet" href="https://x.test/a.css"><title>')).includes('network-reference'));
  assert.ok(codes(ok.replace('a{}', 'a{background:url(https://x.test/i.png)}')).includes('network-reference'));
  assert.ok(codes(ok.replace('<main', '<img src="//x.test/i.png"><main')).includes('network-reference'));
});
test('ordinary links are allowed', () =>
  assert.deepEqual(codes(ok.replace('</main>', '<a href="https://example.com">x</a></main>')), []));
test('missing parts are named', () => {
  assert.ok(codes(ok.replace('<title>T</title>', '')).includes('missing-title'));
  assert.ok(codes(ok.replace(' lang="en"', '')).includes('missing-lang'));
  assert.ok(codes(ok.replace(/<meta name="viewport"[^>]*>/, '')).includes('missing-viewport'));
  assert.ok(codes(ok.replace(/<!-- BH-KIT[^]*$/, '</body></html>')).includes('missing-kit'));
  assert.ok(codes(ok.replace(/<!-- EDITING GUIDE[^]*?-->/, '')).includes('missing-guide'));
});
test('leftover template text is an error', () =>
  assert.ok(codes(ok.replace('<title>T', '<title>{{TITLE}}')).includes('template-text')));
test('size budgets', () => {
  assert.ok(codes(ok, 1_600_000).includes('size-warning'));
  assert.ok(codes(ok, 5_100_000).includes('size-error'));
});
test('findBrowser prefers the environment variable, then known paths', () => {
  const exists = p => p === '/opt/x/chrome' || p === '/usr/bin/chromium';
  assert.equal(findBrowser({ BH_BROWSER: '/opt/x/chrome' }, 'linux', exists), '/opt/x/chrome');
  assert.equal(findBrowser({}, 'linux', exists), '/usr/bin/chromium');
  assert.equal(findBrowser({}, 'linux', () => false), null);
});
test('sliceHeights cuts a tall page into capped screen slices', () => {
  assert.deepEqual(sliceHeights(2000, 900, 8), [{ y: 0, height: 900 }, { y: 900, height: 900 }, { y: 1800, height: 200 }]);
  assert.equal(sliceHeights(90000, 900, 8).length, 8);
});
```

- [ ] **Step 2: Run and confirm failure.** `node --test tests/unit/check-static.test.mjs` → FAIL, module not found.

- [ ] **Step 3: Implement the static stage, browser discovery and CLI skeleton.** Keep `check.mjs` importable without side effects: run the CLI only when `import.meta.url` matches `process.argv[1]`. Unknown arguments, a missing file, or a path with spaces must produce a one-line message, not a stack trace.

- [ ] **Step 4: Run and confirm the static tests pass.**

- [ ] **Step 5: Write the failing audit tests.** `tests/helpers/browser.mjs` exports `withPage(html, { width, height, reducedMotion, media }, fn)` which writes `html` to a temp file, opens it, injects `audit.js`, and skips the test with a notice when `findBrowser` returns null. Each fixture is a small page with one fault:

```js
// tests/render/audit.test.mjs  (each case asserts the code appears; the clean page asserts none)
const cases = [
  ['overflow.html',        'horizontal-overflow'],
  ['low-contrast.html',    'low-contrast'],
  ['console-error.html',   'console-error'],      // reported by check.mjs from CDP events
  ['label-overlap.html',   'label-overlap'],
  ['clipped-text.html',    'clipped-text'],
  ['small-text.html',      'small-text'],
  ['long-lines.html',      'long-lines'],
  ['figure-no-title.html', 'figure-no-title'],
  ['heading-skip.html',    'heading-skip'],
  ['hidden-at-rest.html',  'hidden-content'],
  ['moving-reduced.html',  'motion-under-reduced'],
  ['loop-no-pause.html',   'loop-without-pause'],
  ['node-overlap.html',    'node-overlap'],        // page sets element.__bhFlow by hand
  ['edge-through.html',    'edge-through-node'],
];
```

- [ ] **Step 6: Run and confirm failure**, then implement `audit.js` and the CDP client. Contrast: for each element with its own text, composite the text colour over the nearest opaque ancestor background and compute the WCAG ratio; skip elements over a background image. Label overlap: rectangles of `text` elements inside one `svg` intersecting by more than 2 px. Geometry checks read `__bhFlow`. Motion: with reduced motion emulated, `document.getAnimations()` must have no running animation, and no element inside `main` may have computed `opacity: 0` or `visibility: hidden` after a scroll to the end.

- [ ] **Step 7: Implement the run:** static stage; then for each of `desktop 1440×900`, `phone 390×844`, `print`, `reduced-motion`: navigate, wait for load, `document.fonts.ready` and `BH.ready` settle, scroll through, call `BH.settle()` if present, run the audit, capture slices. Write `<out>/check.json`, the PNG slices and, with `--pdf`, the PDF. Print the summary grouped by level with selector and fix.

- [ ] **Step 8: Run all tests and confirm they pass.** `node --test tests/` → PASS (render tests skip with a notice if no browser).

- [ ] **Step 9: Commit** (`"Add dependency-free report checker"`)

---

### Task 3: Evaluation briefs and baseline runs

**Files:**
- Create: `evals/briefs/01-customer-quarterly-review/`, `02-incident-review/`, `03-survey-results/`, `04-experiment-readout/`, `05-sales-pipeline/`, `06-security-data-flows/` (each `brief.md` and `data/*.csv` or `data/*.json`), `evals/run.mjs`
- Test: `tests/unit/evals.test.mjs`

**Interfaces:**
- Produces: `evals/run.mjs --arm baseline|skill [--only NN] [--out evals/results/<stamp>]`, which for each brief copies it to a temp directory, runs `claude -p "<brief text>" --setting-sources project --permission-mode acceptEdits --allowedTools …` (adding `--plugin-dir <repo>` for the skill arm), requires `report.html` in the directory, copies it to `<out>/<brief>/<arm>/report.html`, and runs the checker on it.
- Produces: `<out>/<brief>/<arm>/check.json` and screenshots.

- [ ] **Step 1: Write the test** that every brief directory has a `brief.md` naming a reader and a deliverable `report.html`, and at least one non-empty data file whose CSV rows all have the header's column count.
- [ ] **Step 2: Run and confirm failure**, then write the six briefs and their data. Data is synthetic, plausible, and has a real story in it (a visible change point, an outlier, a clear winner). Briefs 02 and 06 describe systems and the flows between them; brief 05 has stage-to-stage volumes.
- [ ] **Step 3: Implement `run.mjs`** and run the test → PASS.
- [ ] **Step 4: Launch the baseline arm in the background:** `node evals/run.mjs --arm baseline`. It does not need the kit, so the build continues while it runs.
- [ ] **Step 5: Commit** (`"Add evaluation briefs and runner"`)

---

### Task 4: Page styles and charts

**Files:**
- Create: `src/css/{tokens,base,components,figures,print}.css`, `src/css/directions/analytical.css`, `src/js/{core,format,data,labels,page}.js`, `src/js/charts/*.js`, `scripts/validate-palette.mjs`, `tests/fixtures/charts.content.html`
- Test: `tests/unit/{format,labels,palette,data}.test.mjs`, `tests/render/charts.test.mjs`

**Interfaces:**
- Produces: `BH.ready(fn)`, `BH.data(source) → object[]`, `BH.token(name) → string`, `BH.line|bar|dot|scatter|spark|waffle|plot(target, options) → { el, update(options), destroy() }`, `BH.version`.
- Common options: `data`, `x`, `y`, `series`, `highlight` (string, array or predicate), `labels` (`'auto' | 'end' | false`), `annotations` (`[{ x, y, text }]`), `unit`, `facet`, `height`, `motion`.
- Bar options: `layout: 'horizontal' | 'vertical'`, `mode: 'grouped' | 'stacked'`, `sort: 'value' | 'none'`.
- Dot options: `x2` for a dumbbell.
- Produces from `labels.js`: `dodge(items: [{ y, height }], { min, max, gap }) → number[]`.
- Produces from `format.js`: `formatNumber(value, { unit, locale, compact }) → string`, `formatDate(value, { locale, span }) → string`.
- Produces from `validate-palette.mjs`: `contrast(hexA, hexB) → number`, `simulate(hex, 'protan' | 'deutan' | 'tritan') → hex`, `deltaE(hexA, hexB) → number` (OKLab × 100), `validatePalette(hexes, surface) → { ok, failures }`.
- Figure markup: `<figure class="bh-figure">` containing `<h3 class="bh-figure-title">`, optional `<p class="bh-figure-sub">`, `<div class="bh-plot">`, `<figcaption class="bh-figure-note">`.

- [ ] **Step 1: Write the failing unit tests**

```js
// tests/unit/labels.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { dodge } from '../../src/js/labels.js';

test('labels that already fit do not move', () =>
  assert.deepEqual(dodge([{ y: 10, height: 12 }, { y: 60, height: 12 }], { min: 0, max: 100, gap: 2 }), [10, 60]));
test('overlapping labels separate by at least height plus gap, keeping order', () => {
  const out = dodge([{ y: 50, height: 12 }, { y: 52, height: 12 }, { y: 54, height: 12 }], { min: 0, max: 100, gap: 2 });
  assert.ok(out[1] - out[0] >= 14 && out[2] - out[1] >= 14);
  assert.ok(out[0] < out[1] && out[1] < out[2]);
});
test('labels stay inside the bounds', () => {
  const out = dodge([{ y: 98, height: 12 }, { y: 99, height: 12 }], { min: 0, max: 100, gap: 2 });
  assert.ok(out.every(y => y >= 6 && y <= 94));
});
```

```js
// tests/unit/format.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber } from '../../src/js/format.js';

test('units and compact notation', () => {
  assert.equal(formatNumber(1234567, { locale: 'en', compact: true }), '1.2M');
  assert.equal(formatNumber(0.5, { locale: 'en', unit: '%' }), '0.5%');
  assert.equal(formatNumber(-3, { locale: 'en' }), '−3');        // true minus sign
  assert.equal(formatNumber(null, { locale: 'en' }), '–');         // missing, not zero
});
```

```js
// tests/unit/palette.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { contrast, deltaE, validatePalette } from '../../scripts/validate-palette.mjs';

test('contrast matches WCAG reference values', () => {
  assert.equal(Math.round(contrast('#000000', '#ffffff')), 21);
  assert.ok(Math.abs(contrast('#767676', '#ffffff') - 4.54) < 0.02);
});
test('identical colours have zero difference', () => assert.equal(deltaE('#336699', '#336699'), 0));
test('a red and green of equal lightness fail colour-blind separation', () =>
  assert.equal(validatePalette(['#d32f2f', '#388e3c'], '#ffffff').ok, false));
```

`tests/unit/data.test.mjs` covers Review Focus 1: a CSV with a byte-order mark, a quoted comma, an empty cell and ISO dates parses to the right row count, the empty cell is `null` (not `0`), and dates are `Date` objects.

- [ ] **Step 2: Run and confirm failure**, then implement the pure modules until the unit tests pass.

- [ ] **Step 3: Write the failing render tests.** `tests/fixtures/charts.content.html` holds one figure per function. `tests/render/charts.test.mjs` assembles it with the kit and asserts, per figure: an `svg` exists inside `.bh-plot`; there is no `.bh-error`; the figure has a generated `details.bh-data` table whose row count equals the data; `aria-label` is set from the title. Extra cases:
  - a bar chart's value axis includes zero;
  - seven series with no `highlight` renders `.bh-error` containing "highlight or facet";
  - `highlight: 'Enterprise'` gives exactly one series the accent colour;
  - Review Focus 3: empty data, one row and all-equal values each render a message or a valid chart and log no console error;
  - Review Focus 2: a 40-character category label does not make the page overflow at 390 px.

- [ ] **Step 4: Run and confirm failure**, then implement styles and charts. `core.js` reads tokens with `getComputedStyle`, waits for `document.fonts.ready`, runs the queue, wraps every figure call in a try/catch that renders `.bh-error` with the message, and re-renders on resize (debounced) and `beforeprint`. Each chart builds a Plot specification with house defaults: no frame, hairline grid on the value axis only, tabular figures, direct end labels placed with `dodge`, neutral ink for context series, accent for highlighted ones, Plot `tip` for hover. `page.js` builds the data table and section navigator.

- [ ] **Step 5: Look at it.** Assemble the fixture, run the checker, read every screenshot at both widths, and fix what is wrong. Repeat until clean.

- [ ] **Step 6: Run all tests → PASS. Commit** (`"Add page styles and chart layer"`)

---

### Task 5: Flow diagrams and Sankey

**Files:**
- Create: `src/js/flow/{layout,route,render,sankey}.js`, `tests/fixtures/flow.content.html`, `tests/fixtures/graphs.mjs`
- Test: `tests/unit/{flow-layout,flow-route}.test.mjs`, `tests/render/flow.test.mjs`

**Interfaces:**
- Produces from `layout.js`: `layoutFlow({ nodes, edges, zones }, { direction: 'right' | 'down', measure(node) → { w, h }, gaps }) → { nodes: [{ id, x, y, w, h, rank, band, order, virtual? }], zones: [{ id, x, y, w, h }], edges: [{ id, from, to, reversed, chain: string[] }], width, height, crossings }`; `validateGraph({ nodes, edges, zones }) → string[]` (messages; empty when valid); `countCrossings(layout) → number`.
- Produces from `route.js`: `routeEdges(layout, { direction }) → [{ id, d: string, points: [[x, y], …], label: { x, y } | null, arrow: { x, y, angle } }]`; `segmentHitsBox(p, q, box, pad) → boolean`.
- Produces: `BH.flow(target, { nodes, edges, zones, steps, highlight, direction, flow, motion }) → { el, step(n), play(), pause(), destroy() }` and `BH.sankey(target, { links, nodes, highlight, unit })`.
- Node: `{ id, label, sub?, kind?: 'service' | 'store' | 'queue' | 'gateway' | 'external' | 'person', zone?, rank?, order? }`. Edge: `{ from, to, label?, kind?: 'normal' | 'async' | 'blocked', volume? }`. Step: `{ title, text?, nodes?: string[], edges?: string[] }` where an edge is named `"from>to"`.
- Sets `element.__bhFlow` as specified in Task 2.

- [ ] **Step 1: Write the failing layout tests**

```js
// tests/unit/flow-layout.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { layoutFlow, validateGraph, countCrossings } from '../../src/js/flow/layout.js';
import { routeEdges, segmentHitsBox } from '../../src/js/flow/route.js';
import { graphs } from '../fixtures/graphs.mjs';

const measure = n => ({ w: 40 + 7 * Math.max(n.label.length, (n.sub || '').length), h: n.sub ? 52 : 40 });
const overlap = (a, b) => a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h;

for (const [name, g] of Object.entries(graphs)) {
  for (const direction of ['right', 'down']) {
    test(`${name} (${direction}): no node overlaps, edges avoid nodes, zones hold only their members`, () => {
      const L = layoutFlow(g, { direction, measure });
      const real = L.nodes.filter(n => !n.virtual);
      for (let i = 0; i < real.length; i++) for (let j = i + 1; j < real.length; j++)
        assert.ok(!overlap(real[i], real[j]), `${real[i].id} overlaps ${real[j].id}`);
      for (const e of routeEdges(L, { direction })) {
        const ends = new Set(e.id.split('>'));
        for (const n of real) if (!ends.has(n.id))
          for (let k = 1; k < e.points.length; k++)
            assert.ok(!segmentHitsBox(e.points[k - 1], e.points[k], n, 2), `${e.id} crosses ${n.id}`);
      }
      for (const z of L.zones) for (const n of real) {
        const inside = n.x >= z.x && n.x + n.w <= z.x + z.w && n.y >= z.y && n.y + n.h <= z.y + z.h;
        assert.equal(inside, (g.nodes.find(m => m.id === n.id).zone || null) === z.id, `${n.id} vs zone ${z.id}`);
      }
    });
  }
}
test('edges run with the rank order', () => {
  const L = layoutFlow(graphs.threeTier, { direction: 'right', measure });
  const rank = Object.fromEntries(L.nodes.map(n => [n.id, n.rank]));
  for (const e of L.edges) if (!e.reversed) assert.ok(rank[e.from] < rank[e.to]);
});
test('a planar graph is drawn without crossings', () =>
  assert.equal(countCrossings(layoutFlow(graphs.fanOutFanIn, { direction: 'right', measure })), 0));
test('rank and order hints are honoured', () => {
  const L = layoutFlow(graphs.hinted, { direction: 'right', measure });
  assert.equal(L.nodes.find(n => n.id === 'audit').rank, 3);
});
test('awkward graphs are handled or named', () => {               // Review Focus 4
  assert.doesNotThrow(() => layoutFlow(graphs.cycle, { direction: 'right', measure }));
  assert.doesNotThrow(() => layoutFlow(graphs.twoIslands, { direction: 'right', measure }));
  assert.match(validateGraph(graphs.duplicateId)[0], /duplicate/i);
  assert.match(validateGraph(graphs.danglingEdge)[0], /unknown node/i);
  assert.match(validateGraph(graphs.selfLoop)[0], /itself/i);
  assert.match(validateGraph(graphs.twentyOne)[0], /20/);
});
```

`graphs.mjs` defines `threeTier` (6 nodes, 3 zones as columns), `fanOutFanIn`, `crossZone` (zones whose ranks overlap), `longEdges` (an edge skipping two ranks past other nodes), `hinted`, `dense` (12 nodes, 18 edges), `cycle`, `twoIslands`, and the four invalid graphs.

- [ ] **Step 2: Run and confirm failure.**

- [ ] **Step 3: Implement the layout.**
  1. Validate; break cycles by reversing back edges found in a depth-first walk.
  2. Rank by longest path from sources, honour `rank` hints, then pull each source to one rank before its nearest successor.
  3. Insert a virtual node on every rank an edge skips.
  4. Bands: give each zone a rank interval; zones whose intervals overlap get different bands, zones with disjoint intervals may share one; each unzoned node is its own group. Assign bands greedily in zone order.
  5. Order: within each rank, sort by band, then choose the order inside each band that minimises crossings with the neighbouring rank. Try every permutation when a band holds six nodes or fewer, barycentre sweeps otherwise. Run eight down-and-up sweeps from several seeded starts and keep the best. Honour `order` hints.
  6. Coordinates: rank positions from the widest node per rank plus a gap wide enough for the longest edge label between those ranks; cross positions spread evenly in the band, then eight passes moving each node toward the median of its neighbours without breaking the minimum gap.
  7. Zone frames are the padded bounding boxes of their members.

- [ ] **Step 4: Implement routing.** One port per edge on the facing side of each node, ordered by where the other end sits. A smooth curve with tangents along the rank axis through each virtual node. Labels at the midpoint, moved along the curve when two collide. Reversed edges keep their geometry and put the arrowhead at the original target.

- [ ] **Step 5: Run the unit tests → PASS.**

- [ ] **Step 6: Write the failing render tests** in `tests/render/flow.test.mjs`: the diagram renders with one `g.bh-node` per node and one `path.bh-edge` per edge; `__bhFlow` is set; a 60-character label wraps and the node stays inside the viewBox (Review Focus 2); at 390 px the direction is `down` and the page does not overflow; `highlight` marks the named path; hovering a node adds a dimmed class to unrelated nodes; `step(1)` shows the first caption and Play advances; an invalid graph renders `.bh-error` naming the fault; `BH.sankey` renders one `path` per link.

- [ ] **Step 7: Implement rendering.** Measure text with a hidden SVG `text` element after fonts load. Shapes by kind: service is a rounded rectangle, store a cylinder, queue a rectangle with three dividers, gateway a hexagon, external a dashed rectangle, person a pill. Zones are quiet labelled frames behind everything. Controls for the walkthrough are real buttons with a caption list and a `1 / N` counter; left and right arrows work when the figure has focus. `BH.sankey` uses `d3.sankey()` for layout and our own ribbons and labels.

- [ ] **Step 8: Look at it.** Run the checker on the fixture and on each graph in `graphs.mjs`; read every screenshot; tune gaps, weights and label placement until each is clean and handsome.

- [ ] **Step 9: Run all tests → PASS. Commit** (`"Add flow diagram engine and Sankey"`)

---

### Task 6: Motion

**Files:**
- Create: `src/js/motion.js`, `src/css/motion.css`
- Modify: `src/js/charts/*.js`, `src/js/flow/render.js`, `src/js/core.js`
- Test: `tests/render/motion.test.mjs`

**Interfaces:**
- Produces: `BH.motion.enabled() → boolean` (false when `html[data-bh-motion="off"]`, when reduced motion is requested, or while printing); `BH.motion.enter(el, animate: () => Animation[])` (runs once when `el` first intersects the viewport); `BH.motion.countUp(el, to, format)`; `BH.motion.loop(figure, tick(dt)) → { pause(), resume() }` (adds the pause button, stops off screen); `BH.settle()` (finishes every animation and stops loops).

- [ ] **Step 1: Write the failing tests:** with motion allowed, a line chart's path has a running animation just after it enters and `BH.settle()` leaves none; with reduced motion emulated there are no animations and no element in `main` has `opacity: 0`; with JavaScript's starting state absent (the kit script removed) all content is visible; a flow diagram with `flow: true` has a pause button, and after clicking it the dots stop moving between two frames; `data-bh-motion="off"` produces no animations; under print emulation there are none.
- [ ] **Step 2: Run and confirm failure**, then implement. Entrance uses the Web Animations API on `stroke-dashoffset`, `transform` and `opacity` with token durations. Diagram edges draw in rank order, then nodes settle. Flow dots are circles moved with `getPointAtLength` in one `requestAnimationFrame` loop per figure, at a rate proportional to `volume`.
- [ ] **Step 3: Run all tests → PASS. Commit** (`"Add motion system"`)

---

### Task 7: Art directions and the owner's choice

**Files:**
- Create: `src/css/directions/{narrative,presentation}.css`, `tests/fixtures/specimen.content.html`
- Modify: `src/css/directions/analytical.css`, `src/css/components.css`
- Test: `tests/unit/directions.test.mjs`

**Interfaces:**
- Produces: three kits. Each direction file defines every `--bh-*` colour and font token for `[data-scheme="light"]` and `[data-scheme="dark"]`.

- [ ] **Step 1: Write the failing test:** for each direction and scheme, parse the token values and assert that the three ink levels and the accent reach 4.5:1 on ground and surface; the rule colour reaches 3:1 where it outlines a diagram node; the six categorical colours pass `validatePalette` against the ground; embedded font data is at most 200 KB; at most two families are declared.
- [ ] **Step 2: Run and confirm failure**, then author the directions. For each, write the specimen (every component, three charts, one flow diagram), render it, and iterate on screenshots.
- [ ] **Step 3: Prepare two or three candidate looks per direction** (font pairing and accent varied; scales fixed), render them to one comparison page, and ask the owner to pick. This is the one planned stop.
- [ ] **Step 4: Apply the choices, rebuild, run all tests → PASS. Commit** (`"Add the three art directions"`)

---

### Task 8: Template, editing guide and re-kitting

**Files:**
- Create: `skills/beautiful-html/kit/content-template.html`, `skills/beautiful-html/tools/rekit.mjs`
- Test: `tests/unit/rekit.test.mjs`, `tests/render/roundtrip.test.mjs`

**Interfaces:**
- Produces: `splitReport(html) → { content, kit } | null` (splits at the line starting `<!-- BH-KIT`); `rekit(html, kitHtml) → string`; CLI `node tools/rekit.mjs <report.html> --direction <name> [--out <file>]`, which also sets `data-bh-direction` on `<html>`.

- [ ] **Step 1: Write the failing tests:** `splitReport` returns the two parts and `content + kit` equals the input; a file with no marker returns null and the CLI exits 2 with a message; `rekit` keeps the content byte-for-byte and swaps the kit; the template plus each kit passes the static check once its placeholders are filled. Round trip: assemble, apply a text edit above the marker, re-kit to another direction, run the checker → zero errors.
- [ ] **Step 2: Run and confirm failure**, then implement. The editing guide in the template is at most 45 lines and covers: what the file is, edit only above the marker, make targeted edits and never rewrite the file, the component classes, the figure functions with one-line signatures, and where the full reference lives.
- [ ] **Step 3: Run all tests → PASS. Commit** (`"Add content template and re-kit tool"`)

---

### Task 9: The skill text

**Files:**
- Create: `skills/beautiful-html/SKILL.md`, `skills/beautiful-html/references/*.md`, `skills/beautiful-html/brand/DESIGN.md`, `skills/beautiful-html/licenses/*`
- Test: `tests/unit/skill.test.mjs`

- [ ] **Step 1: Invoke `superpowers:writing-skills`** and read the baseline results from Task 3. List what the baseline reports got wrong; the skill text must answer those failures.
- [ ] **Step 2: Write the failing test:** `SKILL.md` has `name: beautiful-html` and a description under 1024 characters that names reports, charts, diagrams and HTML; the body is under 220 lines; every relative link resolves; every `BH.` function and `bh-` class named in the references exists in `src/`; `brand/DESIGN.md` has YAML front matter with `name`, `colors` and `typography`.
- [ ] **Step 3: Write the skill and references** as the spec's "Skill content" section lays out. Lint the brand file with `npx @google/design.md lint` if the network allows.
- [ ] **Step 4: Run all tests → PASS. Commit** (`"Add skill instructions and references"`)

---

### Task 10: Examples

**Files:**
- Create: `skills/beautiful-html/examples/{analytical,narrative,presentation}/{content.html,preview.png}`, `skills/beautiful-html/examples/README.md`
- Test: `tests/render/examples.test.mjs`

- [ ] **Step 1: Write the failing test:** each example assembles and passes the checker with zero errors at both widths, in print and under reduced motion; the presentation example contains a `BH.flow` call with `steps`.
- [ ] **Step 2: Build the three examples** by following `SKILL.md` exactly as an agent would, noting every place the instructions were unclear and fixing the skill text.
- [ ] **Step 3: Run all tests → PASS. Commit** (`"Add example reports"`)

---

### Task 11: Comparison run

**Files:**
- Create: `evals/gallery.mjs`, `evals/results/<stamp>/index.html`

- [ ] **Step 1: Run the skill arm:** `node evals/run.mjs --arm skill`.
- [ ] **Step 2: Build the gallery:** for each brief, the two reports side by side under labels A and B in a random order recorded in `key.json`, with first-screen screenshots and checker counts hidden until revealed.
- [ ] **Step 3: Read every with-skill report yourself.** Where the skill text caused a weak result, fix the text and re-run that brief once.
- [ ] **Step 4: Commit** (`"Add comparison results"`) and show the gallery to the owner.

---

### Task 12: Distribution and research record

**Files:**
- Create: `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`, `scripts/package-zip.mjs`, `docs/research.md`, `LICENSE`
- Modify: `README.md`
- Test: `tests/unit/package.test.mjs`

- [ ] **Step 1: Write the failing test:** both JSON files parse and name the plugin `beautiful-html`; `package-zip.mjs` produces a zip whose entries all sit under `beautiful-html/` and include `beautiful-html/SKILL.md`; the zip holds no file from `src/`, `tests/` or `evals/`.
- [ ] **Step 2: Run and confirm failure**, then implement. Check the plugin and marketplace schemas against the local `plugin-dev` reference before writing them. Write the zip with Node's `zlib` and a minimal store-or-deflate writer so there is no dependency.
- [ ] **Step 3: Write the README:** what it is, the three install routes, a first report in three commands, setting a company brand, updating, and licences. Write `docs/research.md` from the research notes with every source linked.
- [ ] **Step 4: Verify the install routes that can be verified locally:** `claude --plugin-dir . -p "list your skills"` shows the skill; `npx skills add ./ --list` finds it.
- [ ] **Step 5: Run all tests → PASS. Commit** (`"Add packaging, README and research record"`)
