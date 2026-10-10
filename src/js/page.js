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
  if ('IntersectionObserver' in window) {
    const io = new IntersectionObserver(entries => {
      for (const e of entries) if (e.isIntersecting) {
        links.forEach(a => a.removeAttribute('aria-current'));
        links.get(e.target).setAttribute('aria-current', 'true');
      }
    }, { rootMargin: '-15% 0px -75% 0px' });
    sections.forEach(s => io.observe(s));
  }
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
