#!/usr/bin/env node
// beautiful-html report checker. No npm dependencies; Node 18+.
//
//   node check.mjs report.html [--out <dir>] [--pdf] [--paper a4|letter] [--no-render]
//
// Stage 1 reads the file. Stage 2 opens it in a Chromium-based browser already
// on this machine, at desktop and phone widths, in print and with reduced
// motion, and runs audit.js inside the page. Exit codes: 0 clean, 1 errors
// found, 2 could not run.
import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, dirname, extname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));

export const SIZE_WARN = 1_500_000;
export const SIZE_ERROR = 5_000_000;
export const VIEWPORTS = [
  { name: 'desktop', width: 1440, height: 900 },
  { name: 'phone', width: 390, height: 844 },
];

const finding = (level, code, message, fix, extra = {}) => ({ level, code, message, fix, ...extra });

// ---------------------------------------------------------------- static stage

const REMOTE = String.raw`(?:https?:)?\/\/`;
const SAFE_LINK_RELS = /\brel=["']?(?:canonical|alternate|author|help|license|me|noopener|noreferrer|nofollow)\b/i;

export function staticCheck(html, bytes = Buffer.byteLength(html)) {
  const out = [];
  const marker = html.search(/^<!-- BH-KIT\b/m);
  const content = marker >= 0 ? html.slice(0, marker) : html;

  // Tags are scanned with script bodies removed, so markup inside a JavaScript
  // string is not mistaken for a real element.
  const tags = html.replace(/(<script\b[^>]*>)[\s\S]*?(<\/script>)/gi, '$1$2');
  const network = [];
  for (const m of tags.matchAll(new RegExp(String.raw`<(script|img|video|audio|source|track|iframe|embed|input)\b[^>]*?\s(?:src|poster)\s*=\s*["']?(${REMOTE}[^"'\s>]+)`, 'gi'))) network.push(`<${m[1]}> loads ${m[2]}`);
  for (const m of tags.matchAll(new RegExp(String.raw`<object\b[^>]*?\sdata\s*=\s*["']?(${REMOTE}[^"'\s>]+)`, 'gi'))) network.push(`<object> loads ${m[1]}`);
  for (const m of tags.matchAll(new RegExp(String.raw`<link\b[^>]*?\shref\s*=\s*["']?(${REMOTE}[^"'\s>]+)[^>]*>`, 'gi'))) {
    if (!SAFE_LINK_RELS.test(m[0])) network.push(`<link> loads ${m[1]}`);
  }
  for (const m of tags.matchAll(new RegExp(String.raw`\ssrcset\s*=\s*["'][^"']*?(${REMOTE}[^"'\s,]+)`, 'gi'))) network.push(`srcset loads ${m[1]}`);
  const css = [...tags.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(m => m[1])
    .concat([...tags.matchAll(/\sstyle\s*=\s*"([^"]*)"/gi)].map(m => m[1]));
  for (const block of css) {
    for (const m of block.matchAll(new RegExp(String.raw`url\(\s*["']?(${REMOTE}[^"')\s]+)`, 'gi'))) network.push(`CSS url() loads ${m[1].slice(0, 80)}`);
    if (/@import\b/i.test(block)) network.push('CSS @import');
  }
  for (const what of network) {
    out.push(finding('error', 'network-reference', `Network resource: ${what}`, 'Embed the resource in the file (inline SVG, a data: URI, or kit assets). A report must work offline and make no requests.'));
  }

  if (!/<title\b[^>]*>\s*[^<\s][^<]*<\/title>/i.test(content)) out.push(finding('error', 'missing-title', 'The document has no <title>.', 'Add a <title> that states the finding of the report.'));
  if (!/<html\b[^>]*\slang\s*=\s*["']?[a-zA-Z]/i.test(content)) out.push(finding('error', 'missing-lang', 'The <html> element has no lang attribute.', 'Add lang="en" (or the report language) to <html>; number and date formats follow it.'));
  if (!/<meta\b[^>]*name\s*=\s*["']?viewport/i.test(content)) out.push(finding('error', 'missing-viewport', 'There is no viewport meta tag.', 'Add <meta name="viewport" content="width=device-width, initial-scale=1"> so the report fits a phone.'));
  if (!/<!--\s*EDITING GUIDE\b/.test(content)) out.push(finding('error', 'missing-guide', 'The editing guide comment is missing from the top of the file.', 'Restore the EDITING GUIDE comment from kit/content-template.html; it lets the next person edit this file safely.'));
  if (marker < 0 || !/id=["']bh-kit-css["']/.test(html) || !/id=["']bh-kit-js["']/.test(html)) {
    out.push(finding('error', 'missing-kit', 'The embedded kit (the BH-KIT line, styles and code) is missing or incomplete.', 'Re-attach it: node tools/rekit.mjs <report> --direction <name>, or cat content.html kit/<direction>.kit.html > report.html.'));
  }
  for (const m of content.matchAll(/\{\{\s*[A-Z][A-Z0-9_ ]*\}\}/g)) {
    out.push(finding('error', 'template-text', `Leftover template text: ${m[0]}`, 'Replace every {{PLACEHOLDER}} from the content template with real content.'));
  }

  if (bytes > SIZE_ERROR) out.push(finding('error', 'size-error', `The file is ${(bytes / 1e6).toFixed(1)} MB; the limit is 5 MB.`, 'Reduce embedded images or aggregate the data before embedding it.'));
  else if (bytes > SIZE_WARN) out.push(finding('warning', 'size-warning', `The file is ${(bytes / 1e6).toFixed(1)} MB; aim for under 1.5 MB.`, 'Compress or drop embedded images, and embed aggregated data instead of raw rows.'));
  return out;
}

// ---------------------------------------------------------- browser discovery

export function findBrowser(env = process.env, platform = process.platform, exists = existsSync, list = safeList) {
  const c = [env.BH_BROWSER, env.CHROME_PATH, env.PUPPETEER_EXECUTABLE_PATH];
  const home = env.HOME || env.USERPROFILE;
  if (platform === 'darwin') {
    for (const base of ['/Applications', home && join(home, 'Applications')]) {
      if (!base) continue;
      c.push(`${base}/Google Chrome.app/Contents/MacOS/Google Chrome`, `${base}/Microsoft Edge.app/Contents/MacOS/Microsoft Edge`,
        `${base}/Chromium.app/Contents/MacOS/Chromium`, `${base}/Brave Browser.app/Contents/MacOS/Brave Browser`);
    }
  } else if (platform === 'win32') {
    for (const base of [env.PROGRAMFILES, env['PROGRAMFILES(X86)'], env.LOCALAPPDATA]) {
      if (!base) continue;
      c.push(`${base}\\Google\\Chrome\\Application\\chrome.exe`, `${base}\\Microsoft\\Edge\\Application\\msedge.exe`,
        `${base}\\Chromium\\Application\\chrome.exe`, `${base}\\BraveSoftware\\Brave-Browser\\Application\\brave.exe`);
    }
  } else {
    c.push('/usr/bin/google-chrome', '/usr/bin/google-chrome-stable', '/opt/google/chrome/chrome', '/usr/bin/chromium',
      '/usr/bin/chromium-browser', '/snap/bin/chromium', '/usr/bin/microsoft-edge', '/usr/bin/microsoft-edge-stable', '/usr/bin/brave-browser');
  }
  // A Playwright download is a last resort; newest revision first.
  if (home) {
    const cache = platform === 'darwin' ? join(home, 'Library', 'Caches', 'ms-playwright')
      : platform === 'win32' ? join(env.LOCALAPPDATA || home, 'ms-playwright') : join(home, '.cache', 'ms-playwright');
    const revisions = list(cache).filter(d => /^chromium-\d+$/.test(d)).sort((a, b) => Number(b.split('-')[1]) - Number(a.split('-')[1]));
    for (const rev of revisions) {
      for (const sub of list(join(cache, rev))) {
        c.push(join(cache, rev, sub, 'chrome'), join(cache, rev, sub, 'chrome.exe'),
          join(cache, rev, sub, 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
          join(cache, rev, sub, 'Google Chrome for Testing.app', 'Contents', 'MacOS', 'Google Chrome for Testing'));
      }
    }
  }
  return c.find(p => p && exists(p)) || null;
}

function safeList(dir) {
  try { return readdirSync(dir); } catch { return []; }
}

// ------------------------------------------------------------------- helpers

export function sliceHeights(total, slice, max) {
  const out = [];
  for (let y = 0; y < total && out.length < max; y += slice) out.push({ y, height: Math.min(slice, total - y) });
  return out;
}

// ------------------------------------------------------------ browser control
// A minimal Chrome DevTools Protocol client over --remote-debugging-pipe:
// JSON messages separated by NUL bytes, written to fd 3 and read from fd 4.

const AUDIT_SOURCE = () => readFileSync(join(HERE, 'audit.js'), 'utf8');

function startBrowser(browserPath, extraArgs) {
  const profile = mkdtempSync(join(tmpdir(), 'bh-profile-'));
  const args = ['--headless=new', '--remote-debugging-pipe', '--no-first-run', '--no-default-browser-check', '--disable-gpu',
    '--hide-scrollbars', '--disable-extensions', '--disable-background-networking', '--disable-component-update', '--disable-sync',
    '--mute-audio', '--force-color-profile=srgb', `--user-data-dir=${profile}`, ...extraArgs, 'about:blank'];
  const proc = spawn(browserPath, args, { stdio: ['ignore', 'ignore', 'pipe', 'pipe', 'pipe'] });
  let stderr = '';
  proc.stderr.on('data', d => { stderr = (stderr + d).slice(-2000); });
  const toBrowser = proc.stdio[3], fromBrowser = proc.stdio[4];
  toBrowser.on('error', () => {});
  let nextId = 0, buffer = Buffer.alloc(0), dead = null;
  const pending = new Map(), sessions = new Map();

  const fail = why => {
    dead = dead || new Error(why);
    for (const p of pending.values()) p.reject(dead);
    pending.clear();
  };
  proc.on('error', e => fail(`could not start ${browserPath}: ${e.message}`));
  proc.on('exit', code => fail(`the browser exited (code ${code}). ${stderr.trim().split('\n').pop() || ''}`));
  fromBrowser.on('data', chunk => {
    buffer = Buffer.concat([buffer, chunk]);
    for (let i; (i = buffer.indexOf(0)) >= 0;) {
      let msg;
      try { msg = JSON.parse(buffer.subarray(0, i).toString('utf8')); } catch { msg = null; }
      buffer = buffer.subarray(i + 1);
      if (!msg) continue;
      if (msg.id && pending.has(msg.id)) {
        const p = pending.get(msg.id);
        pending.delete(msg.id);
        if (msg.error) p.reject(new Error(`${p.method}: ${msg.error.message}`)); else p.resolve(msg.result);
      } else if (msg.method && msg.sessionId && sessions.has(msg.sessionId)) {
        sessions.get(msg.sessionId)(msg);
      }
    }
  });

  const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
    if (dead) return reject(dead);
    const id = ++nextId;
    pending.set(id, { resolve, reject, method });
    toBrowser.write(JSON.stringify({ id, method, params, sessionId }) + '\0');
  });
  const close = async () => {
    try { await Promise.race([send('Browser.close'), new Promise(r => setTimeout(r, 1500))]); } catch { /* already gone */ }
    try { proc.kill(); } catch { /* already gone */ }
    try { rmSync(profile, { recursive: true, force: true, maxRetries: 3 }); } catch { /* leave it to the OS */ }
  };
  return { send, sessions, close };
}

const withTimeout = (promise, ms, what) => Promise.race([promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`timed out after ${ms / 1000}s: ${what}`)), ms).unref())]);

export async function launch(browserPath) {
  if (!browserPath) throw new Error('no browser path given');
  let core, lastError;
  // Sandboxed first; containers and root users need --no-sandbox. Only local files are ever opened.
  for (const extra of [[], ['--no-sandbox']]) {
    core = startBrowser(browserPath, extra);
    try { await withTimeout(core.send('Browser.getVersion'), 15000, 'starting the browser'); lastError = null; break; }
    catch (e) { lastError = e; await core.close(); }
  }
  if (lastError) throw lastError;
  const audit = AUDIT_SOURCE();

  async function newPage() {
    const { targetId } = await core.send('Target.createTarget', { url: 'about:blank' });
    const { sessionId } = await core.send('Target.attachToTarget', { targetId, flatten: true });
    const events = [];
    const waiters = [];
    core.sessions.set(sessionId, msg => {
      events.push(msg);
      for (const w of [...waiters]) if (w.method === msg.method) { waiters.splice(waiters.indexOf(w), 1); w.resolve(msg); }
    });
    const send = (method, params) => core.send(method, params, sessionId);
    const once = (method, ms) => withTimeout(new Promise(resolve => waiters.push({ method, resolve })), ms, method);
    await Promise.all([send('Page.enable'), send('Runtime.enable'), send('Network.enable'), send('Log.enable')]);
    // Offline: nothing leaves this machine during a check, and the report is seen as an offline reader sees it.
    await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: -1, uploadThroughput: -1 });
    await send('Page.addScriptToEvaluateOnNewDocument', { source: audit });

    const page = {
      sessionId, events, send,
      async evaluate(expression, ms = 45000) {
        const r = await withTimeout(send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true, userGesture: true }), ms, 'running a script in the page');
        if (r.exceptionDetails) throw new Error(r.exceptionDetails.exception?.description || r.exceptionDetails.text || 'script failed');
        return r.result.value;
      },
      async open(url, mode = VIEWPORTS[0]) {
        await send('Emulation.setDeviceMetricsOverride', { width: mode.width, height: mode.height, deviceScaleFactor: mode.scale || 1, mobile: false });
        await send('Emulation.setEmulatedMedia', { media: mode.media || '', features: [{ name: 'prefers-reduced-motion', value: mode.reducedMotion ? 'reduce' : 'no-preference' }] });
        events.length = 0;
        const loaded = once('Page.loadEventFired', 30000);
        const nav = await send('Page.navigate', { url });
        if (nav.errorText) throw new Error(`could not open ${url}: ${nav.errorText}`);
        await loaded;
        if (mode.prepare !== false) await page.evaluate('__bhPrepare()');
      },
      // Errors seen by the browser itself: script failures and network activity.
      problems() {
        const out = [], seen = new Set();
        const add = (code, message, fix) => { const k = code + message; if (!seen.has(k)) { seen.add(k); out.push(finding('error', code, message, fix)); } };
        const FIX_CONSOLE = 'Open the report in a browser, read the console, and fix the script. A report must load without errors.';
        const FIX_NET = 'Remove the request. Embed data and assets in the file; a report must work offline.';
        for (const e of events) {
          if (e.method === 'Runtime.exceptionThrown') {
            const d = e.params.exceptionDetails;
            add('console-error', `Uncaught error: ${(d.exception?.description || d.text || '').split('\n')[0].slice(0, 200)}`, FIX_CONSOLE);
          } else if (e.method === 'Runtime.consoleAPICalled' && e.params.type === 'error') {
            add('console-error', `console.error: ${e.params.args.map(a => a.value ?? a.description ?? '').join(' ').slice(0, 200)}`, FIX_CONSOLE);
          } else if (e.method === 'Log.entryAdded' && e.params.entry.level === 'error' && e.params.entry.source !== 'network') {
            add('console-error', `Browser error: ${e.params.entry.text.slice(0, 200)}`, FIX_CONSOLE);
          } else if (e.method === 'Network.requestWillBeSent' && /^(https?|wss?|ftp):/i.test(e.params.request.url)) {
            add('network-request', `The page requested ${e.params.request.url.slice(0, 160)}`, FIX_NET);
          }
        }
        return out;
      },
      async screenshot({ y, height, width, format = 'png', quality }) {
        const r = await send('Page.captureScreenshot', { format, quality, captureBeyondViewport: true, clip: { x: 0, y, width, height, scale: 1 } });
        return Buffer.from(r.data, 'base64');
      },
      async pdf({ paper = 'a4', preferCss = true, landscape = false } = {}) {
        const [w, h] = paper === 'letter' ? [8.5, 11] : [8.27, 11.69];
        const r = await send('Page.printToPDF', { printBackground: true, preferCSSPageSize: preferCss, paperWidth: w, paperHeight: h, landscape });
        return Buffer.from(r.data, 'base64');
      },
      async close() { try { await core.send('Target.closeTarget', { targetId }); } catch { /* gone */ } core.sessions.delete(sessionId); },
    };
    return page;
  }
  return { newPage, close: core.close, send: core.send };
}

// Run the audits on a page that is already open in `mode`.
export async function auditPage(page, mode) {
  const motion = await page.evaluate(`__bhAuditMotion(${JSON.stringify({ reducedMotion: !!mode.reducedMotion })})`);
  if (!mode.reducedMotion) await page.evaluate('__bhSettle()');
  const main = await page.evaluate(`__bhAudit(${JSON.stringify({ viewport: mode.name })})`);
  const findings = [...page.problems(), ...motion.findings, ...main.findings].map(f => ({ ...f, viewport: mode.name }));
  return { findings, metrics: main.metrics };
}

export async function auditFile(browser, url, mode = VIEWPORTS[0]) {
  const page = await browser.newPage();
  try {
    await page.open(url, mode);
    return await auditPage(page, mode);
  } finally {
    await page.close();
  }
}

// The same fault seen at several widths is one finding that names them all.
export function mergeFindings(findings) {
  const map = new Map();
  for (const f of findings) {
    const key = `${f.code}|${f.selector || ''}|${f.selector ? '' : f.message}`;
    if (!map.has(key)) map.set(key, { ...f, viewport: f.viewport ? [f.viewport] : [] });
    else if (f.viewport && !map.get(key).viewport.includes(f.viewport)) map.get(key).viewport.push(f.viewport);
  }
  return [...map.values()].map(f => ({ ...f, viewport: f.viewport.join(', ') || undefined }));
}

// ----------------------------------------------------------------------- CLI

const MODES = [
  { name: 'desktop', width: 1440, height: 900, slice: 900, maxSlices: 12 },
  { name: 'phone', width: 390, height: 844, scale: 2, slice: 1266, maxSlices: 8 },
  { name: 'print', width: 794, height: 1123, media: 'print', slice: 1123, maxSlices: 3 },
  { name: 'reduced-motion', width: 1440, height: 900, reducedMotion: true },
];

function parseArgs(argv) {
  const args = { file: null, out: null, pdf: false, paper: null, render: true, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--help' || a === '-h') args.help = true;
    else if (a === '--pdf') args.pdf = true;
    else if (a === '--no-render') args.render = false;
    else if (a === '--out') args.out = argv[++i];
    else if (a === '--paper') args.paper = String(argv[++i] || '').toLowerCase();
    else if (a.startsWith('--')) throw new Error(`Unknown option ${a}`);
    else if (!args.file) args.file = a;
    else throw new Error(`Unexpected argument "${a}". If the path has spaces, put it in quotes.`);
  }
  if (args.paper !== null && !['a4', 'letter'].includes(args.paper)) throw new Error('--paper must be a4 or letter');
  return args;
}

const USAGE = 'Usage: node check.mjs <report.html> [--out <dir>] [--pdf] [--paper a4|letter] [--no-render]';

const NO_BROWSER = `No Chromium-based browser was found, so the rendered checks did not run.
Set BH_BROWSER to the path of Chrome, Edge, Chromium or Brave and run again. Until then:
  1. Take a screenshot yourself:
       "<browser>" --headless=new --screenshot=report.png --window-size=1440,2400 "file:///<absolute path>/report.html"
  2. Look at it, then review the report against the checklist in references/delivery.md.`;

function printFindings(findings) {
  const order = { error: 0, warning: 1 };
  const sorted = [...findings].sort((a, b) => order[a.level] - order[b.level] || a.code.localeCompare(b.code));
  for (const f of sorted) {
    const where = [f.viewport, f.selector].filter(Boolean).join(' · ');
    console.log(`${f.level === 'error' ? 'ERROR  ' : 'warning'}  ${f.code}${where ? `  [${where}]` : ''}`);
    console.log(`         ${f.message}`);
    console.log(`         Fix: ${f.fix}`);
  }
}

export async function checkReport(file, { out, pdf = false, paper = null, render = true, browserPath = findBrowser() } = {}) {
  const html = readFileSync(file, 'utf8');
  const bytes = statSync(file).size;
  const outDir = resolve(out || join(dirname(file), `${basename(file, extname(file))}.check`));
  mkdirSync(outDir, { recursive: true });
  const report = { file, bytes, rendered: false, browser: null, findings: staticCheck(html, bytes), metrics: {}, screenshots: [], pdf: null, outDir };

  if (render && browserPath) {
    const browser = await launch(browserPath);
    try {
      const url = pathToFileURL(file).href;
      const all = [];
      // A presentation prints on landscape pages, so its paper view is laid out for one.
      const landscape = /<html[^>]*data-bh-direction="presentation"/.test(html);
      for (const mode of MODES.map(m => (m.media === 'print' && landscape ? { ...m, width: 1123, height: 794, slice: 794 } : m))) {
        const page = await browser.newPage();
        try {
          await page.open(url, mode);
          const { findings, metrics } = await auditPage(page, mode);
          all.push(...findings);
          report.metrics[mode.name] = metrics;
          if (mode.slice) {
            const slices = sliceHeights(metrics.height, mode.slice, mode.maxSlices);
            for (const [i, s] of slices.entries()) {
              const name = `${mode.name}-${String(i + 1).padStart(2, '0')}.png`;
              // Scroll there first, so that whatever is pinned sits where a reader would see it.
              if (mode.media !== 'print') await page.evaluate(`(async () => { scrollTo(0, ${s.y}); await new Promise(r => setTimeout(r, 260)); })()`);
              writeFileSync(join(outDir, name), await page.screenshot({ y: s.y, height: s.height, width: mode.width }));
              report.screenshots.push(join(outDir, name));
            }
          }
          if (mode.media === 'print' && pdf) {
            report.pdf = join(dirname(file), `${basename(file, extname(file))}.pdf`);
            writeFileSync(report.pdf, await page.pdf({ paper: paper || 'a4', preferCss: paper === null, landscape }));
          }
        } finally {
          await page.close();
        }
      }
      report.findings.push(...mergeFindings(all));
      report.rendered = true;
      report.browser = browserPath;
    } finally {
      await browser.close();
    }
  }
  writeFileSync(join(outDir, 'check.json'), JSON.stringify(report, null, 2));
  return report;
}

async function main(argv) {
  let args;
  try { args = parseArgs(argv); } catch (e) { console.error(`${e.message}\n${USAGE}`); return 2; }
  if (args.help || !args.file) { console.log(USAGE); return args.help ? 0 : 2; }
  const file = resolve(args.file);
  if (!existsSync(file) || !statSync(file).isFile()) { console.error(`Cannot read "${args.file}": no such file.`); return 2; }

  const browserPath = args.render ? findBrowser() : null;
  let report;
  try {
    report = await checkReport(file, { out: args.out, pdf: args.pdf, paper: args.paper, render: args.render, browserPath });
  } catch (e) {
    console.error(`The rendered checks could not run: ${e.message}`);
    report = await checkReport(file, { out: args.out, render: false });
    printFindings(report.findings);
    return 2;
  }

  printFindings(report.findings);
  const errors = report.findings.filter(f => f.level === 'error').length;
  const warnings = report.findings.length - errors;
  console.log(`\n${errors} error(s), ${warnings} warning(s) in ${basename(file)} (${(report.bytes / 1024).toFixed(0)} KB).`);
  if (report.rendered) {
    for (const d of report.metrics.desktop?.diagrams || []) console.log(`Diagram ${d.id}: ${d.nodes} nodes, ${d.crossings} crossing(s).`);
    console.log(`Screenshots to look at (${report.screenshots.length}): ${report.outDir}`);
    if (report.pdf) console.log(`PDF: ${report.pdf}`);
  } else if (args.render) {
    console.log(`\n${NO_BROWSER}`);
    return errors ? 1 : 2;
  }
  return errors ? 1 : 0;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv.slice(2)).then(code => process.exit(code), err => {
    console.error(`check.mjs could not run: ${err.message}`);
    process.exit(2);
  });
}
