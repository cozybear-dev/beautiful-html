// Colour checks for the kit's palettes: contrast, perceptual difference, and
// separation under simulated colour-vision deficiency. Written from the
// published algorithms: WCAG 2 relative luminance, OKLab (Ottosson, 2020), and
// the Machado, Oliveira and Fernandes (2009) simulation matrices at full
// severity. Pure; usable from tests and from the command line:
//   node scripts/validate-palette.mjs "#1f5fbf,#d9730d,…" "#ffffff"
import { pathToFileURL } from 'node:url';

const toRgb = hex => {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map(c => c + c).join('') : h;
  return [0, 2, 4].map(i => parseInt(full.slice(i, i + 2), 16));
};
const toHex = rgb => '#' + rgb.map(v => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, '0')).join('');
const toLinear = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
const fromLinear = v => 255 * (v <= 0.0031308 ? 12.92 * v : 1.055 * Math.max(v, 0) ** (1 / 2.4) - 0.055);

export function luminance(hex) {
  const [r, g, b] = toRgb(hex).map(toLinear);
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}
export function contrast(a, b) {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

export function oklab(hex) {
  const [r, g, b] = toRgb(hex).map(toLinear);
  const l = Math.cbrt(0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b);
  const m = Math.cbrt(0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b);
  const s = Math.cbrt(0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b);
  return [0.2104542553 * l + 0.7936177850 * m - 0.0040720468 * s,
    1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s,
    0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s];
}
// Perceptual difference in OKLab, scaled so black to white is 100.
export function deltaE(a, b) {
  const p = oklab(a), q = oklab(b);
  return 100 * Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]);
}

const CVD = {
  protan: [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
  deutan: [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
  tritan: [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
};
// The colour as seen with a complete colour-vision deficiency of the given type.
export function simulate(hex, type) {
  const m = CVD[type];
  if (!m) throw new Error(`unknown deficiency "${type}"`);
  const lin = toRgb(hex).map(toLinear);
  return toHex(m.map(row => fromLinear(row[0] * lin[0] + row[1] * lin[1] + row[2] * lin[2])));
}

export const THRESHOLDS = { contrast: 3, normal: 15, protan: 8, deutan: 8, tritan: 5 };

// Every colour must stand out from the surface, and every pair must stay
// distinct for normal vision and for each deficiency.
export function validatePalette(hexes, surface, thresholds = THRESHOLDS) {
  const failures = [];
  for (const c of hexes) {
    const k = contrast(c, surface);
    if (k < thresholds.contrast) failures.push(`contrast: ${c} is ${k.toFixed(2)}:1 on ${surface} (needs ${thresholds.contrast}:1)`);
  }
  for (let i = 0; i < hexes.length; i++) for (let j = i + 1; j < hexes.length; j++) {
    const a = hexes[i], b = hexes[j];
    const n = deltaE(a, b);
    if (n < thresholds.normal) failures.push(`normal vision: ${a} and ${b} differ by ${n.toFixed(1)} (needs ${thresholds.normal})`);
    for (const type of ['protan', 'deutan', 'tritan']) {
      const d = deltaE(simulate(a, type), simulate(b, type));
      if (d < thresholds[type]) failures.push(`${type}: ${a} and ${b} differ by ${d.toFixed(1)} (needs ${thresholds[type]})`);
    }
  }
  return { ok: failures.length === 0, failures };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const [list, surface = '#ffffff'] = process.argv.slice(2);
  if (!list) { console.log('Usage: node scripts/validate-palette.mjs "#hex,#hex,…" "#surface"'); process.exit(2); }
  const { ok, failures } = validatePalette(list.split(',').map(s => s.trim()), surface);
  console.log(ok ? 'PASS' : failures.join('\n'));
  process.exit(ok ? 0 : 1);
}

// ------------------------------------------------------------------ suggestion

export function oklchToHex(L, C, hDeg) {
  const h = hDeg * Math.PI / 180, a = C * Math.cos(h), b = C * Math.sin(h);
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.2914855480 * b) ** 3;
  const lin = [4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.7076147010 * s];
  if (lin.some(v => v < -0.0005 || v > 1.0005)) return null;             // outside sRGB
  return toHex(lin.map(fromLinear));
}

// How well two colours stay apart: the worst case across normal vision and
// each deficiency, as a fraction of its threshold (1 = exactly at threshold).
function separation(a, b, t) {
  let worst = deltaE(a, b) / t.normal;
  for (const type of ['protan', 'deutan', 'tritan']) worst = Math.min(worst, deltaE(simulate(a, type), simulate(b, type)) / t[type]);
  return worst;
}

// Build an n-colour categorical palette that starts with `accent` and passes
// validatePalette on `surface`. Each step adds the candidate that stays
// furthest from the colours already chosen. Throws if no such palette exists.
export function suggestPalette(accent, surface, n = 6, thresholds = THRESHOLDS) {
  const dark = luminance(surface) < 0.2;
  const candidates = [];
  for (let L = dark ? 0.62 : 0.42; L <= (dark ? 0.86 : 0.72) + 1e-9; L += 0.04)
    for (let C = 0.07; C <= 0.21 + 1e-9; C += 0.035)
      for (let h = 0; h < 360; h += 8) {
        const hex = oklchToHex(L, C, h);
        if (hex && contrast(hex, surface) >= thresholds.contrast + 0.15) candidates.push(hex);
      }
  const chosen = [accent];
  while (chosen.length < n) {
    let best = null, bestScore = -1;
    for (const c of candidates) {
      const score = Math.min(...chosen.map(p => separation(c, p, thresholds)));
      if (score > bestScore) { bestScore = score; best = c; }
    }
    if (!best || bestScore < 1) throw new Error(`no colour can be added after ${chosen.length}; the accent or surface leaves too little room`);
    chosen.push(best);
  }
  return chosen;
}
