#!/usr/bin/env node
// Builds a blind side-by-side page from a results folder:
//   node evals/gallery.mjs evals/results/<name>
// For each brief the two reports are shown as "A" and "B" in a random order.
// The order is written to key.json and revealed by a button on the page.
// Findings that only a beautiful-html report can have (a missing kit or
// editing guide, token checks) are left out of the counts, so the comparison
// is like for like.
import { existsSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const KIT_ONLY = new Set(['missing-kit', 'missing-guide', 'figure-no-source', 'off-scale-size', 'off-token-color', 'template-text', 'edge-crossings']);
const dir = resolve(process.argv[2] || 'evals/results/latest');
const seed = Number(process.argv[3] || 20261010);
let s = seed;
const random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const esc = t => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const briefs = readdirSync(dir).filter(d => /^\d\d-/.test(d)).sort();
const key = {}, rows = [];
for (const brief of briefs) {
  const arms = ['baseline', 'skill'].filter(a => existsSync(join(dir, brief, a, 'report.html')));
  if (arms.length < 2) continue;
  const order = random() < 0.5 ? arms : [...arms].reverse();
  key[brief] = { A: order[0], B: order[1] };
  const side = (letter, arm) => {
    const result = JSON.parse(readFileSync(join(dir, brief, arm, 'result.json'), 'utf8'));
    const codes = Object.entries(result.codes || {}).filter(([c]) => !KIT_ONLY.has(c));
    const check = JSON.parse(readFileSync(join(dir, brief, arm, 'check', 'check.json'), 'utf8'));
    const comparable = check.findings.filter(f => !KIT_ONLY.has(f.code));
    const errors = comparable.filter(f => f.level === 'error').length, warnings = comparable.length - errors;
    const shots = ['desktop-01.png', 'desktop-02.png', 'phone-01.png'].filter(f => existsSync(join(dir, brief, arm, 'check', f)));
    return { letter, arm, errors, warnings, codes, minutes: result.minutes, kb: Math.round(result.bytes / 1024), shots: shots.map(f => `${brief}/${arm}/check/${f}`), report: `${brief}/${arm}/report.html` };
  };
  rows.push({ brief, sides: [side('A', order[0]), side('B', order[1])] });
}
writeFileSync(join(dir, 'key.json'), JSON.stringify({ seed, key }, null, 2));

const css = `*{box-sizing:border-box}body{margin:0;font:16px/1.5 system-ui,-apple-system,"Segoe UI",sans-serif;color:#15181d;background:#f3f4f6}
main{max-width:1700px;margin:0 auto;padding:28px 24px 80px}h1{font-size:24px;margin:0 0 6px}h2{font-size:19px;margin:44px 0 12px}
p{margin:0 0 10px;max-width:80ch;color:#48515e}.pair{display:grid;grid-template-columns:1fr 1fr;gap:20px}
.side{background:#fff;border:1px solid #d5d9e0;min-width:0}.side header{display:flex;justify-content:space-between;align-items:baseline;gap:12px;padding:10px 14px;border-bottom:1px solid #d5d9e0}
.side header b{font-size:20px}.side img{display:block;width:100%;height:auto;border-bottom:1px solid #e6e9ee}.side img.phone{width:38%;margin:12px auto;border:1px solid #e6e9ee}
.truth{display:none;padding:10px 14px;font-size:14px;color:#15181d;border-top:1px solid #d5d9e0}body.revealed .truth{display:block}
button{font:inherit;padding:8px 16px;border:1px solid #15181d;background:#15181d;color:#fff;border-radius:4px;cursor:pointer}a{color:#1d3cc0}
@media(max-width:900px){.pair{grid-template-columns:1fr}}`;
const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>With and without the skill: a blind comparison</title><style>${css}</style></head><body><main>
<h1>With and without the skill: a blind comparison</h1>
<p>Each brief was run twice through the same agent: once with nothing installed, once with the beautiful-html skill. The two reports are shown as A and B in a random order. Decide which you would rather send, then press Reveal.</p>
<p><button type="button" onclick="document.body.classList.toggle('revealed')">Reveal which is which</button></p>
${rows.map(r => `<h2>${esc(r.brief)}</h2><div class="pair">${r.sides.map(sd => `<div class="side"><header><b>${sd.letter}</b><a href="${esc(sd.report)}">Open the report</a></header>
${sd.shots.map(f => `<img loading="lazy" ${f.includes('phone') ? 'class="phone" ' : ''}alt="${sd.letter}: ${esc(f.split('/').pop())}" src="${esc(f)}">`).join('')}
<div class="truth"><strong>${sd.arm === 'skill' ? 'With the skill' : 'Without the skill'}</strong>: ${sd.errors} error(s), ${sd.warnings} warning(s) from the checker; ${sd.kb} KB; ${sd.minutes} min.${sd.codes.length ? ` Findings: ${esc(sd.codes.map(([c, n]) => `${c} ×${n}`).join(', '))}.` : ''}</div></div>`).join('')}</div>`).join('\n')}
</main></body></html>`;
writeFileSync(join(dir, 'index.html'), html);
console.log(`${join(dir, 'index.html')}: ${rows.length} brief(s) compared. Key in key.json.`);
