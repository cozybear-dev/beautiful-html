// Shared browser for render tests. Tests skip with a notice when none is found.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';
import { findBrowser, launch, auditFile } from '../../skills/beautiful-html/tools/check.mjs';

export const browserPath = findBrowser();
export const skip = browserPath ? false : 'no Chromium-based browser found; set BH_BROWSER to run render tests';
export const DESKTOP = { name: 'desktop', width: 1440, height: 900 };
export const PHONE = { name: 'phone', width: 390, height: 844 };

let browser;
const dir = mkdtempSync(join(tmpdir(), 'bh-test-'));
let n = 0;

export async function getBrowser() {
  browser ??= await launch(browserPath);
  return browser;
}
export async function closeBrowser() {
  if (browser) await browser.close();
  browser = undefined;
}
export function writeTemp(html, name = `page-${++n}.html`) {
  const file = join(dir, name);
  writeFileSync(file, html);
  return file;
}
// Audit an HTML string in the given mode; returns { findings, metrics }.
export async function audit(html, mode = DESKTOP) {
  return auditFile(await getBrowser(), pathToFileURL(writeTemp(html)).href, mode);
}
// Open an HTML string and hand the live page to fn.
export async function withPage(html, mode, fn) {
  const page = await (await getBrowser()).newPage();
  try {
    await page.open(pathToFileURL(writeTemp(html)).href, mode);
    return await fn(page);
  } finally {
    await page.close();
  }
}
