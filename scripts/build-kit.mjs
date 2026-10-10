// Builds the kit files that are appended to every report:
//   skills/beautiful-html/kit/<direction>.kit.html
// A kit is the tail of an HTML document: embedded fonts, styles and code on a
// few very long lines, then </body></html>. Dev-only; users never run this.
import { build, transform } from 'esbuild';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const kitDir = join(root, 'skills', 'beautiful-html', 'kit');

export const DIRECTIONS = ['analytical', 'narrative', 'presentation'];
export const KIT_BUDGET = 1_100_000;
export const FONT_BUDGET = 200_000;

const CSS_FILES = ['tokens.css', 'base.css', 'components.css', 'figures.css', 'motion.css', 'print.css'];
const VENDOR = ['d3.min.js', 'plot.umd.min.js', 'd3-sankey.min.js'];

const version = () => JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).version;
const read = path => readFileSync(path, 'utf8');

// Inline scripts end at the first "</script", and "<!--" can switch the parser
// into an escaped state, so neither may appear literally inside the kit's JS.
const safeForInlineScript = js => js.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

export function fontBytes(css) {
  let total = 0;
  for (const m of css.matchAll(/url\(["']?font:([^"')]+)["']?\)/g)) {
    total += readFileSync(join(src, 'fonts', m[1])).length;
  }
  return total;
}

async function buildCss(direction, extraCss) {
  const parts = CSS_FILES.filter(f => existsSync(join(src, 'css', f))).map(f => read(join(src, 'css', f)));
  parts.push(extraCss || read(join(src, 'css', 'directions', `${direction}.css`)));
  const all = parts.join('\n');

  // @font-face rules go outside the cascade layer; everything else goes inside
  // it, so a report's own unlayered overrides win even though the kit is later
  // in the document.
  const faces = all.match(/@font-face\s*\{[^}]*\}/g) || [];
  const rules = all.replace(/@font-face\s*\{[^}]*\}/g, '');
  const layered = `${faces.join('\n')}\n@layer bh{\n${rules}\n}\nhtml{visibility:visible}`;

  const { code } = await transform(layered, { loader: 'css', minify: true, target: ['chrome99', 'firefox97', 'safari15.4'] });
  const withFonts = code.replace(/url\(["']?font:([^"')]+)["']?\)/g, (_, file) => {
    const data = readFileSync(join(src, 'fonts', file)).toString('base64');
    return `url(data:font/woff2;base64,${data})`;
  });
  return { css: withFonts.replace(/\n/g, ''), fonts: fontBytes(all) };
}

async function buildJs(direction) {
  const result = await build({
    entryPoints: [join(src, 'js', 'index.js')],
    bundle: true,
    format: 'iife',
    minify: true,
    target: 'es2020',
    write: false,
    legalComments: 'none',
    define: { __BH_VERSION__: JSON.stringify(version()), __BH_DIRECTION__: JSON.stringify(direction) },
  });
  const ours = result.outputFiles[0].text.trim();
  const vendor = VENDOR.map(f => read(join(src, 'vendor', f)).trim());
  return safeForInlineScript([...vendor, ours].join('\n'));
}

// `css` and `out` override the direction's own stylesheet and the output path;
// they exist so candidate looks can be built without touching the real kits.
export async function buildKit(direction, { css: extraCss, out } = {}) {
  if (!DIRECTIONS.includes(direction)) throw new Error(`unknown direction "${direction}"`);
  const { css, fonts } = await buildCss(direction, extraCss);
  if (fonts > FONT_BUDGET) throw new Error(`${direction}: ${fonts} bytes of fonts exceeds the ${FONT_BUDGET} budget`);
  const js = await buildJs(direction);
  // The kit starts with a line break, so its marker begins a line even when the
  // content file it is appended to does not end with one.
  const kit = [
    '',
    `<!-- BH-KIT v${version()} ${direction}: embedded fonts, styles and code. Do not open, print or edit below this line. -->`,
    `<style id="bh-kit-css">${css}</style>`,
    `<script id="bh-kit-js">${js}</script>`,
    '</body>',
    '</html>',
    '',
  ].join('\n');
  mkdirSync(kitDir, { recursive: true });
  const path = out || join(kitDir, `${direction}.kit.html`);
  writeFileSync(path, kit);
  const bytes = Buffer.byteLength(kit);
  if (bytes > KIT_BUDGET) throw new Error(`${direction}: kit is ${bytes} bytes, over the ${KIT_BUDGET} budget`);
  return { path, bytes, fonts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const wanted = process.argv.slice(2);
  const list = (wanted.length ? wanted : DIRECTIONS).filter(d => existsSync(join(src, 'css', 'directions', `${d}.css`)));
  for (const d of list) {
    const { bytes, fonts } = await buildKit(d);
    console.log(`${d.padEnd(13)} kit ${(bytes / 1024).toFixed(0).padStart(5)} KB   fonts ${(fonts / 1024).toFixed(0).padStart(4)} KB`);
  }
}
