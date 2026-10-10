// Reads a PDF the way a reader's eye would: where each run of text sits on
// each page. Used to check that a report printed to PDF has no text drawn
// over other text and none cut off by the page. Needs pdfjs-dist (dev only).
let lib;
export async function pdfAvailable() {
  try { lib ??= await import('pdfjs-dist/legacy/build/pdf.mjs'); return true; } catch { return false; }
}

// Pages of a PDF: [{ width, height, items: [{ text, x, y, w, h }] }], y measured from the top.
export async function pdfPages(bytes) {
  await pdfAvailable();
  const doc = await lib.getDocument({ data: new Uint8Array(bytes), verbosity: 0 }).promise;
  const pages = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n), [, , width, height] = page.view;
    const items = (await page.getTextContent()).items.filter(i => i.str && i.str.trim() && i.width > 0).map(i => {
      const size = Math.hypot(i.transform[2], i.transform[3]) || i.height;
      return { text: i.str, x: i.transform[4], y: height - i.transform[5] - size * 0.8, w: i.width, h: size };
    });
    pages.push({ width, height, items });
  }
  await doc.destroy();
  return pages;
}

// Pairs of text runs on a page that sit on top of each other. Two runs on the
// same line that touch end to end are one line of text, not an overlap, and a
// run drawn twice in the same place (a fill and its outline) is one run.
export function textOverlaps(page) {
  const out = [], it = page.items;
  for (let i = 0; i < it.length; i++) for (let j = i + 1; j < it.length; j++) {
    const a = it[i], b = it[j];
    const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x), h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
    if (w <= 1 || h <= 1) continue;
    if (a.text === b.text && Math.abs(a.x - b.x) < 1 && Math.abs(a.y - b.y) < 1) continue;
    const sameLine = Math.abs(a.y - b.y) < Math.min(a.h, b.h) * 0.25;
    if (sameLine && w < Math.min(a.h, b.h) * 0.6) continue;
    if (w * h < 0.2 * Math.min(a.w * a.h, b.w * b.h)) continue;
    out.push([a.text, b.text]);
  }
  return out;
}
// Text that runs past the edge of the paper.
export const textOffPage = page => page.items.filter(i => i.x < -1 || i.y < -1 || i.x + i.w > page.width + 1 || i.y + i.h > page.height + 1).map(i => i.text);
