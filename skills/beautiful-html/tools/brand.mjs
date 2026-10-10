#!/usr/bin/env node
// Turn one brand colour into a complete, checked set of colour tokens for a
// report, in light and dark. No dependencies; Node 18+.
//
//   node brand.mjs --accent "#0b6e75"              print token overrides to paste into <style id="bh-overrides">
//   node brand.mjs --accent "#0b6e75" --ground "#fbfbf9"
//   node brand.mjs --check tokens.css              check a hand-written token block
//
// Every set it prints passes the same checks the kit's own directions pass:
// text contrast, mark contrast, and a six-colour chart palette that stays
// distinct for readers with a colour-vision deficiency.
import { readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { contrast, fromOklch, suggestPalette, toOklch, validatePalette } from './palette.mjs';

export const REQUIRED_TOKENS = ['ground', 'surface', 'ink', 'ink-2', 'ink-3', 'rule', 'rule-strong', 'neutral', 'neutral-soft',
  'accent', 'accent-ink', 'accent-soft', 'on-accent', 'good', 'warn', 'bad',
  'cat-1', 'cat-2', 'cat-3', 'cat-4', 'cat-5', 'cat-6', 'seq-1', 'seq-2', 'seq-3', 'seq-4', 'seq-5', 'seq-6', 'seq-7', 'div-neg', 'div-mid', 'div-pos'];

// Read the colour tokens for one scheme out of a CSS file.
export function parseTokens(css, scheme = 'light') {
  const block = scheme === 'dark'
    ? css.match(/:root\[data-scheme=["']dark["']\]\s*\{([^}]*)\}/)
    : css.match(/:root\s*,\s*:root\[data-scheme=["']light["']\]\s*\{([^}]*)\}/) || css.match(/:root\[data-scheme=["']light["']\]\s*\{([^}]*)\}/);
  const out = {};
  if (block) for (const m of block[1].matchAll(/--bh-([\w-]+)\s*:\s*(#[0-9a-fA-F]{3,8})\s*;/g)) out[m[1]] = m[2].toLowerCase();
  return out;
}

// Problems with a token set, as plain sentences. Empty when the set is sound.
export function checkTokens(t) {
  const out = [];
  const need = (name, on, min, what) => {
    if (!t[name] || !t[on]) return;
    const c = contrast(t[name], t[on]);
    if (c < min) out.push(`--bh-${name} (${t[name]}) is ${c.toFixed(2)}:1 on --bh-${on} (${t[on]}); ${what} needs ${min}:1.`);
  };
  for (const name of ['ink', 'ink-2', 'ink-3', 'accent-ink', 'good', 'warn', 'bad']) { need(name, 'ground', 4.5, 'text'); need(name, 'surface', 4.5, 'text'); }
  for (const name of ['rule-strong', 'neutral', 'accent']) need(name, 'ground', 3, 'a line or mark');
  need('on-accent', 'accent', 4.5, 'text on the accent');
  need('ink', 'accent-soft', 4.5, 'text on the soft accent');
  if (t['cat-1'] && t.accent && t['cat-1'] !== t.accent) out.push(`--bh-cat-1 (${t['cat-1']}) must be the accent (${t.accent}), so a single highlighted series and the accent agree.`);
  const cats = [1, 2, 3, 4, 5, 6].map(i => t[`cat-${i}`]);
  if (cats.every(Boolean) && t.ground) for (const f of validatePalette(cats, t.ground).failures) out.push(`cat palette, ${f}`);
  return out;
}

const hex = (L, C, h) => fromOklch(L, C, h);
// Move a colour's lightness one way until it reaches `min` contrast on every ground given.
function until(colour, grounds, min, direction) {
  let { L, C, h } = toOklch(colour), out = colour;
  for (let i = 0; i < 60 && grounds.some(g => contrast(out, g) < min); i++) { L += direction * 0.01; out = hex(L, C, h); }
  return out;
}

// A full token set from one accent. `ground` sets the page colour of the light scheme.
export function brandTokens({ accent, ground = '#ffffff' } = {}) {
  if (!/^#[0-9a-fA-F]{6}$/.test(accent || '')) throw new Error('Give the accent as a six-digit hex colour, for example --accent "#0b6e75".');
  accent = accent.toLowerCase();
  const notes = [];
  const a = toOklch(accent);
  const tint = a.C < 0.03 ? 0 : 0.011;                                   // neutrals lean slightly toward the accent
  const n = (L, k = 1) => hex(L, tint * k, a.h);
  const warm = a.h > 20 && a.h < 110;
  const build = dark => {
    const t = {};
    t.ground = dark ? n(0.17, 1.2) : ground.toLowerCase();
    t.surface = dark ? n(0.215, 1.3) : hex(toOklch(ground).L - 0.035, tint * 0.6, a.h);
    const grounds = [t.ground, t.surface], dir = dark ? 1 : -1;
    t.ink = dark ? n(0.95, 0.6) : n(0.2, 1.3);
    t['ink-2'] = until(dark ? n(0.79) : n(0.43, 1.6), grounds, 7, dir);
    t['ink-3'] = until(dark ? n(0.67, 1.2) : n(0.52, 1.6), grounds, 4.6, dir);
    t.rule = dark ? n(0.3, 1.2) : n(0.9, 0.8);
    t['rule-strong'] = until(dark ? n(0.56, 1.2) : n(0.65, 1.6), [t.ground], 3.1, dir);
    t.neutral = t['rule-strong'];
    t['neutral-soft'] = dark ? n(0.38, 1.2) : n(0.84);
    // The accent must be strong enough to draw lines and bars with.
    let acc = dark ? hex(Math.max(a.L, 0.74), a.C * 0.9, a.h) : accent;
    const drawn = until(acc, [t.ground], 3.2, dir);
    if (!dark && drawn !== accent) notes.push(`The accent ${accent} is too light to draw with on ${t.ground}; lines, bars and rules use the darker ${drawn}. Keep ${accent} for large fills such as a cover band.`);
    acc = drawn;
    t.accent = acc;
    t['accent-ink'] = until(acc, grounds, 4.6, dir);
    t['accent-soft'] = dark ? hex(0.3, Math.min(a.C * 0.5, 0.07), a.h) : hex(0.945, Math.min(a.C * 0.25, 0.035), a.h);
    const white = '#ffffff', black = dark ? t.ground : t.ink;
    t['on-accent'] = contrast(white, acc) >= 4.5 ? white : contrast(black, acc) >= 4.5 ? black : (contrast(white, acc) > contrast(black, acc) ? white : black);
    if (contrast(t['on-accent'], acc) < 4.5) { t.accent = until(acc, [t['on-accent']], 4.5, t['on-accent'] === white ? -1 : 1); t['accent-ink'] = until(t.accent, grounds, 4.6, dir); }
    t.good = until(dark ? '#5cc98d' : '#14733f', grounds, 4.6, dir);
    t.warn = until(dark ? '#e2ad4a' : '#8f5600', grounds, 4.6, dir);
    t.bad = until(dark ? '#ff8a7a' : '#bd2f25', grounds, 4.6, dir);
    const cats = suggestPalette(t.accent, t.ground, 6);
    cats.forEach((c, i) => { t[`cat-${i + 1}`] = c; });
    const c = Math.max(a.C, 0.05);
    for (let i = 0; i < 7; i++) {
      const k = i / 6;
      t[`seq-${i + 1}`] = dark ? hex(0.3 + k * 0.6, Math.min(c, 0.05 + k * c), a.h) : hex(0.945 - k * 0.645, Math.min(c * 1.05, 0.03 + k * 1.4 * c), a.h);
    }
    t['div-pos'] = t.accent;
    t['div-neg'] = until(warm ? '#2f6fb3' : '#c9550b', [t.ground], 3.2, dir);
    t['div-mid'] = dark ? n(0.4) : n(0.82, 0.5);
    return t;
  };
  return { light: build(false), dark: build(true), notes };
}

export function tokensToCss({ light, dark }) {
  const block = t => REQUIRED_TOKENS.map(k => `  --bh-${k}: ${t[k]};`).join('\n');
  // Paper is always light: a report set to the dark scheme still prints with the light tokens.
  return `:root, :root[data-scheme="light"] {\n${block(light)}\n}\n:root[data-scheme="dark"] {\n${block(dark)}\n}\n@media print {\n:root[data-scheme="dark"] {\n${block(light)}\n}\n}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2), opt = name => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
  try {
    if (opt('--check')) {
      const css = readFileSync(opt('--check'), 'utf8');
      let bad = 0;
      for (const scheme of ['light', 'dark']) {
        const t = parseTokens(css, scheme);
        const missing = REQUIRED_TOKENS.filter(k => !t[k]);
        const problems = [...(missing.length ? [`missing: ${missing.map(k => `--bh-${k}`).join(', ')}`] : []), ...checkTokens(t)];
        console.log(`${scheme}: ${problems.length ? '' : 'passes'}`);
        problems.forEach(p => console.log(`  ${p}`));
        bad += problems.length;
      }
      process.exit(bad ? 1 : 0);
    }
    if (!opt('--accent')) { console.log('Usage: node brand.mjs --accent "#rrggbb" [--ground "#rrggbb"]   or   node brand.mjs --check tokens.css'); process.exit(2); }
    const sets = brandTokens({ accent: opt('--accent'), ground: opt('--ground') || '#ffffff' });
    console.log(tokensToCss(sets));
    sets.notes.forEach(note => console.error(`Note: ${note}`));
  } catch (e) {
    console.error(e.message);
    process.exit(2);
  }
}
