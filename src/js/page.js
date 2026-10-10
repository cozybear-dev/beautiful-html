// Page furniture built by the kit: the section navigator.
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
