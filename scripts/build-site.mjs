// Builds the site of example reports, for GitHub Pages, into dist/site/:
//   index.html             the gallery: site/index.content.html joined to the analytical kit
//   <name>/index.html      each example as a report
//   <name>/content.txt     the content file behind it, to read
//   <name>/shot.jpg        the screen the gallery shows, and phone.jpg, the front page on a phone
//   <name>/<name>.pdf      the same report on paper
// Pictures and PDFs need a Chromium-based browser. Without one the gallery
// falls back to each example's preview.png and leaves the PDF links out.
// Dev-only: `node scripts/build-site.mjs [--out dir] [--no-render]`.
import { copyFileSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { findBrowser, launch } from '../skills/beautiful-html/tools/check.mjs';
import { examples } from './build-examples.mjs';
import { GALLERY } from '../site/examples.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const skill = join(root, 'skills', 'beautiful-html');
const kit = d => readFileSync(join(skill, 'kit', `${d}.kit.html`), 'utf8');
const esc = s => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

// The figures and page parts the gallery points to: what each is for, and how it appears in a content file.
const FIGURES = [
  ['Change over time', 'BH.line', 'line'], ['Size or ranking', 'BH.bar', 'bar'], ['Before and after', 'BH.dot', 'dot'],
  ['How two measures relate', 'BH.scatter', 'scatter'], ['A value for every pair of two groupings', 'BH.heatmap', 'heatmap'],
  ['How systems connect, what flows where', 'BH.flow', 'flow'], ['Volumes between stages', 'BH.sankey', 'sankey'],
  ['A trend beside a number', 'BH.spark', 'spark'], ['A share of a whole', 'BH.waffle', 'waffle'], ['A form made for one report', 'BH.plot', 'plot'],
];
const PARTS = [
  ['bh-cover', 'The header as a navy title band'], ['bh-findings', 'Conclusions in words, numbered'], ['bh-keyfigures', 'Measures with their comparisons'],
  ['bh-step', 'Text that drives the diagram beside it'], ['bh-split', 'Text and one tall figure side by side'], ['bh-band', 'One section set apart on a tint'],
  ['bh-statement', 'One sentence set large'], ['bh-code', 'Commands and log lines, as written'], ['bh-terms', 'Terms and their meanings'],
  ['bh-table', 'Exact values, with inline bars and status'], ['bh-timeline', 'Dated events'], ['bh-compare', 'Options side by side'],
  ['bh-callout', 'The one decision or recommendation'], ['bh-aside', 'A note beside the text'], ['bh-pair', 'Two figures side by side'], ['bh-quote', 'A quotation'],
];

// What an example says about itself, read from its content file.
function describe(example) {
  const text = readFileSync(example.path, 'utf8');
  const body = text.slice(text.indexOf('<main class="bh-report">', text.indexOf('<body>')));
  const pick = (re, from = text) => (from.match(re) || [])[1] || '';
  return {
    ...example, text, body,
    title: pick(/<title>([\s\S]*?)<\/title>/).trim(),
    scheme: pick(/<html[^>]*data-scheme="(\w+)"/),
    front: pick(/<!-- Front page: ([^.]+)\./),
    bytes: Buffer.byteLength(text),
  };
}

// Screens for the gallery, and a PDF, from the assembled report.
async function picture(browser, file, dir, name, shot) {
  const url = pathToFileURL(file).href;
  const settle = `(async () => { await (window.BH && BH.done); await new Promise(r => setTimeout(r, 300)); if (window.BH && BH.settle) BH.settle(); })()`;
  let page = await browser.newPage();
  try {
    await page.open(url, { name: 'desktop', width: 1440, height: 900 });
    await page.evaluate(settle);
    const y = (shot - 1) * 900;
    await page.evaluate(`(async () => { scrollTo(0, ${y}); await new Promise(r => setTimeout(r, 500)); if (window.BH && BH.settle) BH.settle(); await new Promise(r => setTimeout(r, 200)); })()`);
    writeFileSync(join(dir, 'shot.jpg'), await page.screenshot({ y, height: 900, width: 1440, format: 'jpeg', quality: 84 }));
  } finally { await page.close(); }
  page = await browser.newPage();
  try {
    await page.open(url, { name: 'phone', width: 390, height: 844, scale: 2 });
    await page.evaluate(settle);
    writeFileSync(join(dir, 'phone.jpg'), await page.screenshot({ y: 0, height: 720, width: 390, format: 'jpeg', quality: 84 }));
  } finally { await page.close(); }
  page = await browser.newPage();
  try {
    await page.open(url, { name: 'print', width: 794, height: 1123, media: 'print' });
    await page.evaluate(settle);
    writeFileSync(join(dir, `${name}.pdf`), await page.pdf({ paper: 'a4', preferCss: true }));
  } finally { await page.close(); }
}

export async function buildSite({ out = join(root, 'dist', 'site'), render = true, browserPath = findBrowser(), log = () => {} } = {}) {
  const found = new Map(examples().map(e => [e.name, describe(e)]));
  const missing = GALLERY.filter(g => !found.has(g.name)).map(g => g.name), unlisted = [...found.keys()].filter(n => !GALLERY.some(g => g.name === n));
  if (missing.length || unlisted.length) throw new Error(`site/examples.mjs and the examples folder disagree. Not in the folder: ${missing.join(', ') || 'none'}. Not in the gallery: ${unlisted.join(', ') || 'none'}.`);
  rmSync(out, { recursive: true, force: true });
  mkdirSync(out, { recursive: true });
  writeFileSync(join(out, '.nojekyll'), '');

  const browser = render && browserPath ? await launch(browserPath) : null;
  const cards = [];
  try {
    for (const g of GALLERY) {
      const e = found.get(g.name), dir = join(out, g.name);
      mkdirSync(dir, { recursive: true });
      const file = join(dir, 'index.html');
      writeFileSync(file, e.text + kit(e.direction));
      writeFileSync(join(dir, 'content.txt'), e.text);
      let shot = 'preview.png', phone = false, pdf = false;
      if (browser) {
        await picture(browser, file, dir, g.name, g.shot);
        shot = 'shot.jpg'; phone = true; pdf = true;
      } else copyFileSync(join(e.dir, 'preview.png'), join(dir, 'preview.png'));
      log(`${g.name.padEnd(20)} ${e.direction} ${e.scheme}${browser ? '' : '  (no browser: preview only)'}`);
      const front = e.front.replace(/^a |^the /i, m => m.toLowerCase());
      cards.push(`    <article class="ex-card${g.lead ? ' is-lead' : ''}">
      <a class="ex-shot" href="${g.name}/" aria-label="Open: ${esc(e.title)}"><img src="${g.name}/${shot}" width="1440" height="900" alt="" loading="lazy">${phone ? `<img class="ex-phone" src="${g.name}/phone.jpg" width="780" height="1440" alt="" loading="lazy">` : ''}</a>
      <div>
        <p class="ex-kind">${esc(g.kind)}</p>
        <h3><a href="${g.name}/">${esc(e.title)}</a></h3>
        <p>${esc(g.reader)}. ${esc(e.direction[0].toUpperCase() + e.direction.slice(1))} layout, ${esc(e.scheme)} scheme; opens on ${esc(front)}.</p>
        <p class="ex-look">${esc(g.look)}</p>
        <p class="ex-links"><a href="${g.name}/">Open the report</a>${pdf ? `<a href="${g.name}/${g.name}.pdf">PDF</a>` : ''}<a href="${g.name}/content.txt">Source, ${Math.round(e.bytes / 1024)} KB</a></p>
      </div>
    </article>`);
    }
  } finally { if (browser) await browser.close(); }

  // Where each figure and part is used: a link to the first place in each example.
  const all = GALLERY.map(g => found.get(g.name));
  const short = name => name.replace(/-/g, ' ');
  const links = hits => hits.map(([e, id]) => `<a href="${e.name}/${id ? `#${id}` : ''}">${esc(short(e.name))}</a>`).join(', ');
  const figures = FIGURES.map(([what, fn, key]) => {
    const hits = all.map(e => [e, (e.body.match(new RegExp(`BH\\.${key}\\('#([\\w-]+)'`)) || [])[1]]).filter(([, id]) => id);
    return hits.length ? `        <tr><th scope="row">${esc(what)}</th><td><code>${fn}</code></td><td>${links(hits)}</td></tr>` : null;
  }).filter(Boolean);
  const parts = PARTS.map(([cls, what]) => {
    const hits = all.filter(e => new RegExp(`class="[^"]*\\b${cls}\\b`).test(e.body)).map(e => [e, null]);
    return hits.length ? `        <tr><th scope="row"><code>${cls}</code></th><td>${esc(what)}</td><td>${links(hits)}</td></tr>` : null;
  }).filter(Boolean);
  const asks = GALLERY.map(g => `    <div><p>${esc(g.kind)}</p><p>"${esc(g.ask)}"</p></div>`);

  const built = new Date().toISOString().slice(0, 10);
  const content = readFileSync(join(root, 'site', 'index.content.html'), 'utf8')
    .replace('{{CARDS}}', () => cards.join('\n')).replace('{{FIGURES}}', () => figures.join('\n')).replace('{{PARTS}}', () => parts.join('\n'))
    .replace('{{ASKS}}', () => asks.join('\n')).replace('{{BUILT}}', () => built);
  if (/\{\{[A-Z]+\}\}/.test(content)) throw new Error('site/index.content.html has a placeholder that was not filled in');
  writeFileSync(join(out, 'index.html'), content + kit('analytical'));
  return { out, examples: GALLERY.map(g => g.name), rendered: !!browser };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), at = args.indexOf('--out');
  const r = await buildSite({ out: at >= 0 ? args[at + 1] : undefined, render: !args.includes('--no-render'), log: line => console.log(line) });
  console.log(`${r.examples.length} examples and the gallery written to ${r.out}${r.rendered ? '' : ' (no pictures or PDFs: no browser)'}`);
}
