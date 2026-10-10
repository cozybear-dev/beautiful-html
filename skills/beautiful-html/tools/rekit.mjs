#!/usr/bin/env node
// Swap the kit under an existing report: change its art direction, or update
// it to this version of the kit. The report's own content is not touched.
// No dependencies; Node 18+.
//
//   node rekit.mjs report.html --direction narrative [--scheme light|dark] [--out other.html]
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const KIT_DIR = join(HERE, '..', 'kit');

// The report's own part and the embedded kit, split at the line that starts "<!-- BH-KIT".
export function splitReport(html) {
  const at = html.search(/^<!-- BH-KIT\b/m);
  return at < 0 ? null : { content: html.slice(0, at), kit: html.slice(at) };
}

const setAttr = (content, name, value) => content.replace(/<html\b[^>]*>/i, tag =>
  (new RegExp(`\\s${name}=`).test(tag) ? tag.replace(new RegExp(`(\\s${name}=)("[^"]*"|'[^']*'|[^\\s>]+)`), `$1"${value}"`) : tag.replace(/>$/, ` ${name}="${value}">`)));

// The same report on a different kit. `kitHtml` is the text of a kit file.
export function rekit(html, kitHtml, direction, scheme) {
  const parts = splitReport(html);
  if (!parts) throw new Error('This file has no embedded kit (no line starting "<!-- BH-KIT"). It may not be a beautiful-html report, or its kit was removed.');
  let content = parts.content;
  if (direction) content = setAttr(content, 'data-bh-direction', direction);
  if (scheme) content = setAttr(content, 'data-scheme', scheme);
  // A kit file starts with a line break; the content already ends where the old marker began.
  return content.replace(/\n$/, '') + kitHtml;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  const file = args.find((a, i) => !a.startsWith('--') && !(i > 0 && args[i - 1].startsWith('--')));
  const directions = existsSync(KIT_DIR) ? readdirSync(KIT_DIR).filter(f => f.endsWith('.kit.html')).map(f => f.replace('.kit.html', '')).sort() : [];
  const fail = message => { console.error(message); process.exit(2); };
  const direction = opt('--direction'), scheme = opt('--scheme');
  if (!file || !direction) fail('Usage: node rekit.mjs <report.html> --direction <name> [--scheme light|dark] [--out <file>]\nDirections: ' + directions.join(', '));
  if (!directions.includes(direction)) fail(`Unknown direction "${direction}". The directions are: ${directions.join(', ')}.`);
  if (scheme && !['light', 'dark'].includes(scheme)) fail('--scheme must be light or dark.');
  if (!existsSync(file)) fail(`Cannot read "${file}": no such file.`);
  try {
    const out = rekit(readFileSync(file, 'utf8'), readFileSync(join(KIT_DIR, `${direction}.kit.html`), 'utf8'), direction, scheme);
    const target = resolve(opt('--out') || file);
    writeFileSync(target, out);
    console.log(`${target}: now on the ${direction} kit${scheme ? `, ${scheme} scheme` : ''}. Run check.mjs on it before sharing.`);
  } catch (e) {
    fail(e.message);
  }
}
