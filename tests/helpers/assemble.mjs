// Join a content file (or string) to a kit, as `cat content.html kit/<direction>.kit.html` does.
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = new URL('../../', import.meta.url);
export const kitPath = direction => fileURLToPath(new URL(`skills/beautiful-html/kit/${direction}.kit.html`, root));
export const fixture = name => readFileSync(new URL(`tests/fixtures/${name}`, root), 'utf8');

export function assemble(content, direction = 'analytical') {
  const path = kitPath(direction);
  if (!existsSync(path)) throw new Error(`kit not built: run "npm run build" first (${path})`);
  return content + readFileSync(path, 'utf8');
}

// The top of a report around a body, for small test pages.
export const shell = (body, script = '', { title = 'Test report', attrs = 'lang="en" data-scheme="light"' } = {}) => `<!doctype html>
<!-- EDITING GUIDE: test page -->
<html ${attrs}>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>html{visibility:hidden}</style>
<script>window.BH={q:[],ready(f){this.q.push(f)}}</script>
</head>
<body>
<main class="bh-report">
<header class="bh-header"><h1>${title}</h1></header>
<section class="bh-section"><h2>Figures</h2>
${body}
</section>
</main>
<script id="bh-figures">BH.ready(() => {
${script}
});</script>
`;
export const fig = (id, title = 'A finding about the data') => `<figure class="bh-figure"><h3 class="bh-figure-title">${title}</h3><p class="bh-figure-sub">What is measured, and its unit</p><div class="bh-plot" id="${id}"></div><figcaption class="bh-figure-note">Source: test data.</figcaption></figure>`;
