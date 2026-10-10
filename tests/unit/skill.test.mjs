// The skill text must be findable, short, and true to the code it describes.
import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const skill = join(root, 'skills', 'beautiful-html');
const read = p => readFileSync(p, 'utf8');
const walk = dir => readdirSync(dir, { withFileTypes: true }).flatMap(e => (e.isDirectory() ? walk(join(dir, e.name)) : [join(dir, e.name)]));
const docs = () => [join(skill, 'SKILL.md'), ...walk(join(skill, 'references')).filter(f => f.endsWith('.md'))];
const REFERENCES = ['brief-and-story', 'directions', 'components', 'charts', 'diagrams', 'motion', 'brand', 'delivery'];

test('SKILL.md has a name and a findable description', () => {
  const text = read(join(skill, 'SKILL.md'));
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fm, 'no front matter');
  assert.match(fm[1], /^name: beautiful-html$/m);
  const description = fm[1].match(/^description: (.+)$/m)[1];
  assert.ok(fm[1].length <= 1024, `front matter is ${fm[1].length} characters`);
  assert.match(description, /^Use when /);
  for (const word of [/report/i, /chart|graph/i, /diagram/i, /HTML/]) assert.match(description, word);
  assert.ok(!/\b(first|then|step|assemble|run the check)\b/i.test(description), 'the description must say when to use the skill, not how it works');
});
test('SKILL.md is short and every reference exists', () => {
  const text = read(join(skill, 'SKILL.md'));
  assert.ok(text.split('\n').length <= 220, `${text.split('\n').length} lines`);
  assert.ok(text.split(/\s+/).length <= 1300, `${text.split(/\s+/).length} words`);
  for (const name of REFERENCES) {
    assert.ok(existsSync(join(skill, 'references', `${name}.md`)), `references/${name}.md is missing`);
    assert.ok(text.includes(`references/${name}.md`), `SKILL.md does not point to references/${name}.md`);
  }
});
test('every relative link and every file path named in the skill text exists', () => {
  for (const file of docs()) {
    const text = read(file);
    for (const m of text.matchAll(/\]\((?!https?:|#|mailto:)([^)\s]+)\)/g)) assert.ok(existsSync(join(dirname(file), m[1].split('#')[0])), `${file}: broken link ${m[1]}`);
    for (const m of text.matchAll(/(?:^|[\s`(<>/])((?:kit|tools|references|brand|examples|licenses)\/[\w./-]+\.(?:html|mjs|js|md|css|txt))/g)) {
      if (/<direction>|\*/.test(m[1])) continue;
      assert.ok(existsSync(join(skill, m[1])), `${file}: names ${m[1]}, which does not exist`);
    }
  }
});
test('every BH function and bh- class the skill text names is real', () => {
  const js = walk(join(root, 'src', 'js')).map(read).join('\n'), css = walk(join(root, 'src', 'css')).map(read).join('\n');
  const members = new Set([...js.matchAll(/\bBH\.(\w+)\s*=/g)].map(m => m[1]).concat([...js.matchAll(/^\s{2}(\w+)[(:,]/gm)].map(m => m[1])));
  const template = read(join(skill, 'kit', 'content-template.html'));
  for (const file of [...docs(), join(skill, 'kit', 'content-template.html')]) {
    const text = read(file);
    for (const m of text.matchAll(/\bBH\.(\w+)/g)) assert.ok(members.has(m[1]), `${file}: BH.${m[1]} does not exist`);
    for (const m of text.matchAll(/(?<![\w-])(bh-[a-z][a-z0-9-]*)/g)) {
      const cls = m[1];
      if (['bh-figures', 'bh-overrides', 'bh-kit-css', 'bh-kit-js', 'bh-report'].includes(cls) || cls.startsWith('bh-eval') ) { assert.ok(template.includes(cls) || css.includes(cls) || js.includes(cls), `${file}: ${cls}`); continue; }
      assert.ok(css.includes(`.${cls}`) || js.includes(cls) || css.includes(`--${cls}`) || text.includes(`--${cls}`), `${file}: class or token ${cls} does not exist in the kit`);
    }
    for (const m of text.matchAll(/--bh-([a-z][a-z0-9-]*)/g)) assert.ok(css.includes(`--bh-${m[1]}`) || /\*$/.test(m[0]) || m[1].endsWith('-'), `${file}: token --bh-${m[1]} does not exist`);
  }
});
test('the brand file follows the DESIGN.md shape', () => {
  const text = read(join(skill, 'brand', 'DESIGN.md'));
  const fm = text.match(/^---\n([\s\S]*?)\n---\n/);
  assert.ok(fm, 'no YAML front matter');
  for (const key of [/^name:/m, /^colors:/m, /^typography:/m]) assert.match(fm[1], key);
  assert.match(text, /^## Overview/m);
});
test('licences for everything embedded ship with the skill', () => {
  const files = readdirSync(join(skill, 'licenses'));
  for (const needed of [/source-?sans/i, /stix/i, /atkinson/i, /d3/i, /plot/i]) assert.ok(files.some(f => needed.test(f)), `no licence file matching ${needed}`);
});
