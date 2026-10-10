// Page furniture built by the kit: the brand's logo and the section navigator.

// The logo is built into the kit from brand/logo.svg. A report asks for it with
// <span class="bh-logo">Name</span>: the name becomes the logo's label, and is
// what a reader sees from a kit that has no logo.
export function buildLogo(svg) {
  if (!svg) return;
  for (const el of document.querySelectorAll('.bh-logo')) {
    if (el.querySelector('svg, img')) continue;
    const name = el.textContent.trim();
    el.innerHTML = svg;
    const mark = el.firstElementChild;
    if (mark && name) { mark.setAttribute('role', 'img'); mark.setAttribute('aria-label', name); }
  }
}

const slug = s => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'section';

// A sticky list of sections, for reports with four or more. Each section may
// carry data-nav="Short name"; otherwise its heading is used.
export function buildNav() {
  const main = document.querySelector('main.bh-report');
  if (!main || main.dataset.bhNav === 'off' || main.querySelector(':scope > .bh-nav')) return;
  const sections = [...main.querySelectorAll(':scope > .bh-section')].filter(s => s.querySelector(':scope > h2'));
  if (sections.length < 4) return;
  const nav = document.createElement('nav');
  nav.className = 'bh-nav';
  nav.setAttribute('aria-label', 'Sections');
  const list = document.createElement('ol');
  const links = new Map();
  const used = new Set();
  for (const s of sections) {
    const full = s.querySelector(':scope > h2').textContent.trim();
    const name = s.dataset.nav || full;
    if (!s.id) { let id = slug(name), n = 2; while (used.has(id) || document.getElementById(id)) id = `${slug(name)}-${n++}`; s.id = id; }
    used.add(s.id);
    const a = document.createElement('a');
    a.href = `#${s.id}`;
    a.textContent = name.length > 28 ? `${name.slice(0, 27).trimEnd()}…` : name;
    if (a.textContent !== full) a.title = full;
    const li = document.createElement('li');
    li.appendChild(a);
    list.appendChild(li);
    links.set(s, a);
  }
  nav.appendChild(list);
  const header = main.querySelector(':scope > .bh-header');
  if (header) header.after(nav); else main.prepend(nav);
  // The section being read is the last one whose top has passed a line a quarter
  // of the way down the window. Above the first there is none; at the end of
  // the page it is the last, however short that one is.
  let queued = false;
  const mark = () => {
    queued = false;
    let current = null;
    for (const s of sections) if (s.getBoundingClientRect().top <= innerHeight * 0.25) current = s;
    if (current && scrollY + innerHeight >= document.documentElement.scrollHeight - 2) current = sections[sections.length - 1];
    links.forEach((a, s) => { if (s === current) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
  };
  addEventListener('scroll', () => { if (!queued) { queued = true; requestAnimationFrame(mark); } }, { passive: true });
  mark();
}

// Presentation: one section per screen. Show where you are and let the arrow
// keys, Page Up and Page Down move between sections.
export function buildProgress() {
  const main = document.querySelector('main.bh-report');
  if (!main || main.querySelector(':scope > .bh-progress')) return;
  const screens = [...main.querySelectorAll(':scope > .bh-header, :scope > .bh-section')];
  if (screens.length < 2) return;
  const badge = document.createElement('div');
  badge.className = 'bh-progress';
  badge.setAttribute('aria-hidden', 'true');
  main.appendChild(badge);
  let current = 0;
  const paint = () => { badge.textContent = `${current + 1} / ${screens.length}`; };
  paint();
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) { current = screens.indexOf(e.target); paint(); }
    }, { rootMargin: '-45% 0px -45% 0px' });
    screens.forEach(s => io.observe(s));
  }
  const go = i => {
    const next = Math.max(0, Math.min(screens.length - 1, i));
    const smooth = !matchMedia('(prefers-reduced-motion: reduce)').matches && document.documentElement.dataset.bhMotion !== 'off';
    screens[next].scrollIntoView({ behavior: smooth ? 'smooth' : 'auto', block: 'start' });
  };
  document.addEventListener('keydown', e => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    // Leave the keys alone inside anything that uses them itself.
    if (e.target.closest && e.target.closest('input, textarea, select, button, summary, a, [contenteditable], .bh-flow-stage, .bh-node, .bh-table-wrap')) return;
    if (e.key === 'ArrowDown' || e.key === 'PageDown' || e.key === 'ArrowRight') { e.preventDefault(); go(current + 1); }
    else if (e.key === 'ArrowUp' || e.key === 'PageUp' || e.key === 'ArrowLeft') { e.preventDefault(); go(current - 1); }
    else if (e.key === 'Home') { e.preventDefault(); go(0); }
    else if (e.key === 'End') { e.preventDefault(); go(screens.length - 1); }
  });
}

// Reading steps. In a split section, blocks marked data-bh-step="n" stand for
// the steps of the section's diagram. On a wide screen the diagram is pinned
// beside them and shows the step of the block being read; scrolling is the
// control. A diagram taller than the window keeps its size and moves inside
// its frame to keep the current step in view. On a phone and on paper the
// blocks are plain text and the diagram keeps its own controls.
export function buildSteps(entryFor) {
  const wide = matchMedia('screen and (min-width: 62rem)');
  const calm = matchMedia('(prefers-reduced-motion: reduce)');
  const TOP = 76, BOTTOM = 20, LEAST = 240;        // clear of the section navigator and the window's edge; the smallest useful frame
  const groups = [];
  for (const section of document.querySelectorAll('main.bh-report > .bh-section.bh-split')) {
    const blocks = [...section.querySelectorAll(':scope > [data-bh-step]')];
    const figure = section.querySelector(':scope > .bh-figure');
    const plot = figure && figure.querySelector('.bh-plot[data-bh-kind="flow"]');
    if (!blocks.length || !plot || !entryFor(plot)) continue;
    blocks[blocks.length - 1].classList.add('is-last');
    groups.push({ section, blocks, figure, plot, entry: entryFor(plot), pinned: false, room: 0, step: -1 });
  }
  if (!groups.length) return;
  const stageOf = g => g.plot.querySelector('.bh-flow-stage');

  const unpin = g => {
    const stage = stageOf(g);
    g.pinned = false; g.step = -1;
    g.section.classList.remove('has-steps');
    g.figure.classList.remove('is-pinned');
    g.figure.style.top = '';
    g.blocks.forEach(b => b.classList.remove('is-current'));
    if (stage) { stage.style.maxHeight = ''; stage.classList.remove('is-framed', 'more-above', 'more-below'); stage.scrollTop = 0; }
    if (g.room) { g.room = 0; delete g.entry.options.maxHeight; g.entry.render(); }
    else if (g.entry.api) g.entry.api.step(0);
  };
  // Pin the diagram. If it is taller than the room it has, ask it to close up
  // its gaps; if that is not enough, show it through a frame of that height.
  const fit = g => {
    const stage = stageOf(g);
    if (!wide.matches || !stage) return unpin(g);
    g.section.classList.add('has-steps');
    g.figure.classList.add('is-pinned');
    stage.style.maxHeight = '';
    stage.classList.remove('is-framed');
    const room = Math.floor(innerHeight - TOP - BOTTOM - (g.figure.offsetHeight - stage.offsetHeight));   // less the title, key and note
    if (room < LEAST) return unpin(g);
    if (stage.scrollHeight > room && room !== g.room) { g.room = room; g.entry.options.maxHeight = room; g.entry.render(); return; }   // runs again on bh:render
    if (stage.scrollHeight > room) { stage.style.maxHeight = `${room}px`; stage.classList.add('is-framed'); }
    g.figure.style.top = `${TOP}px`;
    g.pinned = true;
  };
  // Move a framed diagram so the nodes of the current step sit in the middle of the frame.
  const frame = g => {
    const stage = stageOf(g), flow = g.plot.__bhFlow;
    if (!stage || !stage.classList.contains('is-framed') || !flow) return;
    const ids = ((g.entry.options.steps || [])[g.step - 1] || {}).nodes || [];
    const boxes = flow.nodes.filter(n => ids.includes(n.id));
    const most = stage.scrollHeight - stage.clientHeight;
    const to = boxes.length ? Math.max(0, Math.min(most, (Math.min(...boxes.map(b => b.y)) + Math.max(...boxes.map(b => b.y + b.h))) / 2 - stage.clientHeight / 2)) : 0;
    stage.classList.toggle('more-above', to > 1);
    stage.classList.toggle('more-below', to < most - 1);
    stage.scrollTo({ top: to, behavior: calm.matches ? 'auto' : 'smooth' });
  };

  // The block being read is the last whose top has passed a line two fifths down the window.
  let queued = false;
  const read = () => {
    queued = false;
    for (const g of groups) {
      if (!g.pinned) continue;
      let current = null;
      for (const b of g.blocks) if (b.getBoundingClientRect().top <= innerHeight * 0.4) current = b;
      const step = current ? Number(current.dataset.bhStep) || 0 : 0;
      g.blocks.forEach(b => b.classList.toggle('is-current', b === current));
      if (step !== g.step && g.entry.api) { g.step = step; g.entry.api.pause(); g.entry.api.step(step); frame(g); }
    }
  };
  const queue = () => { if (!queued) { queued = true; requestAnimationFrame(read); } };
  const refit = () => { groups.forEach(g => { g.step = -1; fit(g); }); read(); };
  for (const g of groups) g.plot.addEventListener('bh:render', () => { g.step = -1; fit(g); queue(); });
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', refit);
  wide.addEventListener('change', refit);
  addEventListener('beforeprint', () => groups.forEach(unpin));
  addEventListener('afterprint', refit);
  refit();
}
