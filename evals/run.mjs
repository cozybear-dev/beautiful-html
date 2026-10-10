#!/usr/bin/env node
// Runs the evaluation briefs through Claude Code, with or without the skill.
//
//   node evals/run.mjs --arm baseline|skill [--only 01,04] [--out evals/results/<name>]
//                      [--concurrency 3] [--model <id>] [--timeout-min 25]
//
// Each brief runs in its own temporary directory outside this repository, so
// the baseline cannot see the skill. The skill arm gets the skill installed as
// a project skill (.claude/skills/beautiful-html), the way `npx skills add`
// would install it. Both arms use the same prompt: the text of brief.md.
// User-level settings and plugins are left out (--setting-sources project), so
// the result does not depend on what else the person running this has installed.
import { spawn } from 'node:child_process';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { checkReport } from '../skills/beautiful-html/tools/check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const repo = join(here, '..');
const TOOLS = ['Read', 'Write', 'Edit', 'Glob', 'Grep', 'Bash(cat:*)', 'Bash(ls:*)', 'Bash(cp:*)', 'Bash(mkdir:*)', 'Bash(head:*)',
  'Bash(tail:*)', 'Bash(wc:*)', 'Bash(grep:*)', 'Bash(sed:*)', 'Bash(awk:*)', 'Bash(sort:*)', 'Bash(node:*)', 'Bash(python3:*)'];

function parse(argv) {
  const a = { arm: null, only: null, out: join(here, 'results', 'latest'), concurrency: 3, model: null, timeoutMin: 25 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i], v = argv[i + 1];
    if (k === '--arm') { a.arm = v; i++; }
    else if (k === '--only') { a.only = v.split(','); i++; }
    else if (k === '--out') { a.out = resolve(v); i++; }
    else if (k === '--concurrency') { a.concurrency = Number(v); i++; }
    else if (k === '--model') { a.model = v; i++; }
    else if (k === '--timeout-min') { a.timeoutMin = Number(v); i++; }
    else throw new Error(`Unknown option ${k}`);
  }
  if (!['baseline', 'skill'].includes(a.arm)) throw new Error('--arm must be baseline or skill');
  return a;
}

function runClaude(prompt, cwd, { model, timeoutMin }) {
  return new Promise(resolvePromise => {
    const args = ['-p', '--output-format', 'json', '--setting-sources', 'project', '--permission-mode', 'acceptEdits', '--allowedTools', ...TOOLS];
    if (model) args.push('--model', model);
    const started = Date.now();
    const child = spawn('claude', args, { cwd, stdio: ['pipe', 'pipe', 'pipe'] });
    let stdout = '', stderr = '';
    child.stdout.on('data', d => { stdout += d; });
    child.stderr.on('data', d => { stderr = (stderr + d).slice(-4000); });
    const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMin * 60_000);
    child.on('close', code => {
      clearTimeout(timer);
      let json = null;
      try { json = JSON.parse(stdout); } catch { /* keep raw */ }
      resolvePromise({ code, ms: Date.now() - started, json, raw: json ? null : stdout.slice(-4000), stderr });
    });
    child.stdin.end(prompt);
  });
}

async function runBrief(brief, args) {
  const src = join(here, 'briefs', brief);
  const work = mkdtempSync(join(tmpdir(), `bh-eval-${brief}-${args.arm}-`));
  cpSync(join(src, 'data'), join(work, 'data'), { recursive: true });
  if (args.arm === 'skill') {
    cpSync(join(repo, 'skills', 'beautiful-html'), join(work, '.claude', 'skills', 'beautiful-html'), { recursive: true });
  }
  const outDir = join(args.out, brief, args.arm);
  mkdirSync(outDir, { recursive: true });
  console.log(`[${brief}] ${args.arm}: started in ${work}`);

  const run = await runClaude(readFileSync(join(src, 'brief.md'), 'utf8'), work, args);
  const result = {
    brief, arm: args.arm, exitCode: run.code, minutes: Number((run.ms / 60000).toFixed(1)),
    model: run.json?.modelUsage ? Object.keys(run.json.modelUsage).join(', ') : args.model,
    turns: run.json?.num_turns ?? null, costUsd: run.json?.total_cost_usd ?? null, isError: run.json?.is_error ?? null,
    files: readdirSync(work).filter(f => !f.startsWith('.') && f !== 'data'),
    report: false, bytes: null, errors: null, warnings: null, codes: {},
  };
  writeFileSync(join(outDir, 'run.json'), JSON.stringify({ ...run, json: run.json && { ...run.json, result: undefined }, finalMessage: run.json?.result ?? null }, null, 2));

  const report = join(work, 'report.html');
  if (existsSync(report)) {
    cpSync(report, join(outDir, 'report.html'));
    result.report = true;
    try {
      const check = await checkReport(join(outDir, 'report.html'), { out: join(outDir, 'check') });
      result.bytes = check.bytes;
      result.errors = check.findings.filter(f => f.level === 'error').length;
      result.warnings = check.findings.length - result.errors;
      for (const f of check.findings) result.codes[f.code] = (result.codes[f.code] || 0) + 1;
    } catch (e) {
      result.checkError = e.message;
    }
  }
  writeFileSync(join(outDir, 'result.json'), JSON.stringify(result, null, 2));
  console.log(`[${brief}] ${args.arm}: ${result.report ? `report ${(result.bytes / 1024).toFixed(0)} KB, ${result.errors} error(s), ${result.warnings} warning(s)` : 'NO report.html produced'} in ${result.minutes} min`);
  return result;
}

const args = parse(process.argv.slice(2));
let briefs = readdirSync(join(here, 'briefs')).filter(d => /^\d\d-/.test(d)).sort();
if (args.only) briefs = briefs.filter(b => args.only.some(o => b.startsWith(o)));
const queue = [...briefs], results = [];
await Promise.all(Array.from({ length: Math.min(args.concurrency, queue.length) }, async () => {
  for (let b; (b = queue.shift());) results.push(await runBrief(b, args));
}));
results.sort((a, b) => a.brief.localeCompare(b.brief));
writeFileSync(join(args.out, `summary-${args.arm}.json`), JSON.stringify(results, null, 2));
console.log(`\nDone: ${results.filter(r => r.report).length} of ${results.length} produced a report. Results in ${args.out}`);
