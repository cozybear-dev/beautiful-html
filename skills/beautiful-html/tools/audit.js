// beautiful-html in-page audit. Runs inside the report; injected by check.mjs.
// Defines three globals:
//   __bhPrepare()        scroll through the page so scroll-triggered content appears
//   __bhAuditMotion(o)   looping animations without a pause control; motion under reduced motion
//   __bhSettle()         finish every animation so screenshots show the final state
//   __bhAudit(o)         layout, contrast, text, figures, headings, tokens, diagrams
// Each audit returns { findings, metrics }. No dependencies; plain ES2020.
(() => {
  const F = (level, code, message, fix, el) => ({ level, code, message, fix, selector: el ? describe(el) : undefined });
  const raf = () => new Promise(r => requestAnimationFrame(() => r()));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const root = () => document.querySelector('main') || document.body;

  function describe(el) {
    if (!el || el.nodeType !== 1) return '';
    const parts = [];
    for (let n = el; n && n.nodeType === 1 && n !== document.documentElement && parts.length < 4; n = n.parentElement) {
      let s = n.tagName.toLowerCase();
      if (n.id) { parts.unshift(`${s}#${n.id}`); break; }
      const cls = (n.getAttribute('class') || '').trim().split(/\s+/).filter(Boolean).slice(0, 2);
      if (cls.length) s += '.' + cls.join('.');
      const sibs = n.parentElement ? [...n.parentElement.children].filter(c => c.tagName === n.tagName) : [];
      if (sibs.length > 1) s += `:nth-of-type(${sibs.indexOf(n) + 1})`;
      parts.unshift(s);
    }
    return parts.join(' > ');
  }
  const snippet = (el, n = 48) => (el.textContent || '').replace(/\s+/g, ' ').trim().slice(0, n);

  // ------------------------------------------------------------------ colour
  const ctx = document.createElement('canvas').getContext('2d', { willReadFrequently: true });
  function parseColor(str) {
    if (!str || str === 'none') return null;
    const m = str.match(/^rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+%?))?\s*\)$/);
    if (m) {
      const a = m[4] === undefined ? 1 : m[4].endsWith('%') ? parseFloat(m[4]) / 100 : parseFloat(m[4]);
      return [Number(m[1]), Number(m[2]), Number(m[3]), a];
    }
    // Any other syntax (oklch, color(), named): let the canvas resolve it.
    ctx.clearRect(0, 0, 1, 1);
    ctx.fillStyle = '#000';
    ctx.fillStyle = str;
    ctx.fillRect(0, 0, 1, 1);
    const d = ctx.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2], d[3] / 255];
  }
  const over = (top, bottom) => {
    const a = top[3] + bottom[3] * (1 - top[3]);
    if (a === 0) return [0, 0, 0, 0];
    return [0, 1, 2].map(i => (top[i] * top[3] + bottom[i] * bottom[3] * (1 - top[3])) / a).concat(a);
  };
  const lum = c => {
    const f = v => { v /= 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; };
    return 0.2126 * f(c[0]) + 0.7152 * f(c[1]) + 0.0722 * f(c[2]);
  };
  const ratio = (a, b) => { const [hi, lo] = [lum(a), lum(b)].sort((x, y) => y - x); return (hi + 0.05) / (lo + 0.05); };
  const hex = c => '#' + [0, 1, 2].map(i => Math.round(c[i]).toString(16).padStart(2, '0')).join('');
  const isSvg = el => el instanceof SVGElement;

  function opacityChain(el) {
    let o = 1;
    for (let n = el; n && n.nodeType === 1; n = n.parentElement) o *= parseFloat(getComputedStyle(n).opacity || '1');
    return o;
  }

  // The colour painted behind the centre of `el`: walk the stack of elements
  // under that point until something opaque is found. Returns null when the
  // backdrop is an image or gradient and cannot be known.
  function backdrop(el) {
    const r = el.getBoundingClientRect();
    if (r.bottom < 0 || r.top > innerHeight || r.right < 0 || r.left > innerWidth) el.scrollIntoView({ block: 'center', inline: 'nearest' });
    const b = el.getBoundingClientRect();
    const x = Math.min(Math.max(b.left + b.width / 2, 1), innerWidth - 1);
    const y = Math.min(Math.max(b.top + b.height / 2, 1), innerHeight - 1);
    const stack = document.elementsFromPoint(x, y);
    const at = stack.findIndex(n => n === el || el.contains(n));
    if (at < 0) return null;                                   // covered by something else
    let color = [0, 0, 0, 0];
    for (const n of stack.slice(at)) {
      const cs = getComputedStyle(n);
      let paint = null;
      if (isSvg(n) && n.tagName.toLowerCase() !== 'svg') {
        if (n === el || n.tagName.toLowerCase() === 'text' || n.tagName.toLowerCase() === 'tspan') continue;
        if (n.tagName.toLowerCase() === 'g') continue;
        paint = parseColor(cs.fill);
        if (paint) paint = [paint[0], paint[1], paint[2], paint[3] * parseFloat(cs.fillOpacity || '1') * parseFloat(cs.opacity || '1')];
      } else {
        if (cs.backgroundImage && cs.backgroundImage !== 'none') return null;
        paint = parseColor(cs.backgroundColor);
        if (paint) paint = [paint[0], paint[1], paint[2], paint[3] * (n === el ? 1 : parseFloat(cs.opacity || '1'))];
      }
      if (!paint || paint[3] === 0) continue;
      color = over(color, paint);
      if (color[3] >= 0.999) return color;
    }
    return over(color, [255, 255, 255, 1]);                    // the canvas default is white
  }

  function ownText(el) {
    for (const n of el.childNodes) if (n.nodeType === 3 && n.nodeValue.trim()) return true;
    return false;
  }
  function visible(el) {
    const cs = getComputedStyle(el);
    if (cs.display === 'none' || cs.visibility === 'hidden') return false;
    const r = el.getBoundingClientRect();
    return r.width > 0 && r.height > 0;
  }
  // Rendered font size in CSS pixels, accounting for SVG viewBox scaling.
  function renderedSize(el) {
    const px = parseFloat(getComputedStyle(el).fontSize);
    if (!isSvg(el)) return px;
    const m = el.getScreenCTM && el.getScreenCTM();
    return m ? px * Math.hypot(m.a, m.b) : px;
  }
  const textElements = scope => [...scope.querySelectorAll('*')].filter(el =>
    !['SCRIPT', 'STYLE', 'NOSCRIPT', 'TEMPLATE', 'TITLE', 'DESC'].includes(el.tagName.toUpperCase()) && ownText(el) && visible(el));
  const isBodyText = el => ['P', 'LI', 'DD', 'BLOCKQUOTE'].includes(el.tagName) &&
    !el.closest('figure, figcaption, table, nav, footer, aside, header, details, [class*="note"], [class*="meta"], [class*="caption"], [class*="source"], [class*="label"], [class*="key"]');

  // ------------------------------------------------------------------ prepare
  window.__bhPrepare = async () => {
    if (document.fonts && document.fonts.ready) await document.fonts.ready;
    if (window.BH && window.BH.done && typeof window.BH.done.then === 'function') await window.BH.done;
    await raf(); await raf();
    const step = Math.max(200, Math.floor(innerHeight * 0.8));
    for (let y = 0; y < document.documentElement.scrollHeight; y += step) {
      scrollTo(0, y);
      await raf(); await raf(); await wait(40);
    }
    scrollTo(0, document.documentElement.scrollHeight);
    await raf(); await wait(60);
    scrollTo(0, 0);
    await raf(); await raf();
    return true;
  };

  // ------------------------------------------------------------------- motion
  const running = () => document.getAnimations().filter(a => a.playState === 'running');
  const endless = a => { try { return a.effect && a.effect.getComputedTiming().iterations === Infinity; } catch { return false; } };
  const target = a => (a.effect && a.effect.target) || null;

  window.__bhAuditMotion = async ({ reducedMotion = false } = {}) => {
    const findings = [];
    await wait(250);
    const jsLoops = [...document.querySelectorAll('[data-bh-loop="running"]')];
    if (reducedMotion) {
      const moving = [...new Set(running().map(target).filter(Boolean).concat(jsLoops))];
      for (const el of moving.slice(0, 5)) {
        findings.push(F('error', 'motion-under-reduced', 'Something is still animating although the reader asked for reduced motion.',
          'Gate the animation behind BH.motion.enabled(), or add a @media (prefers-reduced-motion: reduce) rule that removes it. Show the final state instead.', el));
      }
    } else {
      const loops = [...new Set(running().filter(endless).map(target).filter(Boolean).concat(jsLoops))];
      const seen = new Set();
      for (const el of loops) {
        const box = el.closest('figure, .bh-figure, section, article') || el.parentElement || document.body;
        if (seen.has(box)) continue;
        seen.add(box);
        const control = [...box.querySelectorAll('button, [role="button"]')].some(b =>
          b.hasAttribute('data-bh-pause') || /pause|stop/i.test(`${b.textContent} ${b.getAttribute('aria-label') || ''}`));
        if (!control) {
          findings.push(F('error', 'loop-without-pause', 'An animation loops with no way for the reader to pause it.',
            'Use BH.motion.loop(), which adds a pause button, or remove the loop. Motion that runs past five seconds needs a pause control.', el));
        }
      }
    }
    return { findings };
  };

  window.__bhSettle = async () => {
    try { if (window.BH && typeof window.BH.settle === 'function') window.BH.settle(); } catch (e) { /* reported as a console error */ }
    for (const a of document.getAnimations()) {
      try { if (endless(a)) a.pause(); else a.finish(); } catch { try { a.cancel(); } catch { /* ignore */ } }
    }
    await raf(); await raf();
    return true;
  };

  // -------------------------------------------------------------------- audit
  window.__bhAudit = async ({ viewport = 'desktop' } = {}) => {
    const findings = [];
    const doc = document.documentElement;
    const scope = root();
    const metrics = { viewport, width: innerWidth, height: doc.scrollHeight, figures: 0, diagrams: [] };

    // Failed figures.
    for (const el of document.querySelectorAll('.bh-error')) {
      findings.push(F('error', 'figure-failed', `A figure could not be drawn: ${snippet(el, 160)}`, 'Read the message in the figure and correct the call or its data.', el));
    }

    // Horizontal overflow.
    if (doc.scrollWidth > innerWidth + 1) {
      const wide = [...scope.querySelectorAll('*')].filter(el => visible(el) && el.getBoundingClientRect().right > innerWidth + 1)
        .filter((el, _, all) => !all.some(o => o !== el && el.contains(o)));
      const el = wide[0];
      findings.push(F('error', 'horizontal-overflow', `The page is ${doc.scrollWidth}px wide in a ${innerWidth}px viewport, so it scrolls sideways.`,
        'Let the widest element shrink (max-width:100%, min-width:0 on grid and flex children) or put a wide table or diagram in a scrolling frame.', el));
    }

    // Contrast, sizes, clipping.
    const texts = textElements(scope);
    const lowContrast = [], small = [], clipped = [];
    for (const el of texts) {
      const cs = getComputedStyle(el);
      const svg = isSvg(el);
      const size = renderedSize(el);
      const opacity = opacityChain(el);
      if (opacity < 0.05) continue;                             // reported as hidden content
      let fg = parseColor(svg ? cs.fill : cs.color);
      if (fg && fg[3] > 0) {
        fg = [fg[0], fg[1], fg[2], fg[3] * (svg ? parseFloat(cs.fillOpacity || '1') : 1) * opacity];
        // A text halo (paint-order: stroke) is the backdrop the text is read against.
        const halo = svg && /stroke/.test(cs.paintOrder || '') && cs.stroke !== 'none' && parseFloat(cs.strokeWidth) > 0 ? parseColor(cs.stroke) : null;
        const bg = halo && halo[3] > 0.9 ? halo : backdrop(el);
        if (bg) {
          const c = ratio(over(fg, bg), bg);
          const large = size >= 24 || (size >= 18.66 && parseInt(cs.fontWeight, 10) >= 700);
          const need = large ? 3 : 4.5;
          if (c < need - 0.05) lowContrast.push({ el, c, need, fg: hex(over(fg, bg)), bg: hex(bg) });
        }
      }
      if (svg ? size < 10.95 : size < 10.95 || (isBodyText(el) && size < 15.95)) small.push({ el, size, body: !svg && isBodyText(el) });
      if (!svg) {
        const hidesX = cs.overflowX !== 'visible';
        if (hidesX && el.scrollWidth > el.clientWidth + 1 && !el.hasAttribute('title') && !['auto', 'scroll'].includes(cs.overflowX)) clipped.push(el);
      } else {
        const owner = el.ownerSVGElement;
        if (owner && getComputedStyle(owner).overflow !== 'visible') {
          const a = el.getBoundingClientRect(), b = owner.getBoundingClientRect();
          if (a.right > b.right + 1.5 || a.left < b.left - 1.5 || a.bottom > b.bottom + 1.5 || a.top < b.top - 1.5) clipped.push(el);
        }
      }
    }
    for (const { el, c, need, fg, bg } of lowContrast.slice(0, 12)) {
      findings.push(F('error', 'low-contrast', `"${snippet(el)}" has contrast ${c.toFixed(2)}:1 (${fg} on ${bg}); it needs ${need}:1.`,
        'Use an ink token with enough contrast for this ground (--bh-ink, --bh-ink-2), or put the text on a different surface.', el));
    }
    if (lowContrast.length > 12) findings.push(F('error', 'low-contrast', `${lowContrast.length - 12} more low-contrast text elements.`, 'Fix the tokens involved; the same colours usually cause all of them.'));
    for (const { el, size, body } of small.slice(0, 8)) {
      findings.push(F('warning', 'small-text', `"${snippet(el)}" renders at ${size.toFixed(1)}px; ${body ? 'body text needs 16px' : 'labels need 11px'} or more.`,
        body ? 'Set body text with the kit\'s text size token; never shrink it to fit.' : 'Use the label size token, shorten the label, or give the figure more room.', el));
    }
    for (const el of clipped.slice(0, 8)) {
      findings.push(F('warning', 'clipped-text', `"${snippet(el)}" is cut off by its container.`, 'Let the text wrap, shorten it, or widen the container. If the cut is intended, add a title attribute with the full text.', el));
    }

    // Line length of body text.
    const longLines = [];
    for (const el of scope.querySelectorAll('p, li')) {
      if (!visible(el) || !isBodyText(el)) continue;
      const cs = getComputedStyle(el);
      const lh = parseFloat(cs.lineHeight) || parseFloat(cs.fontSize) * 1.4;
      const lines = Math.round(el.getBoundingClientRect().height / lh);
      const chars = (el.textContent || '').replace(/\s+/g, ' ').trim().length;
      if (lines >= 2 && chars / (lines - 0.5) > 80) longLines.push({ el, per: Math.round(chars / (lines - 0.5)) });
    }
    if (longLines.length) {
      const worst = longLines.sort((a, b) => b.per - a.per)[0];
      findings.push(F('warning', 'long-lines', `${longLines.length} paragraph(s) run to about ${worst.per} characters a line; aim for 45 to 75.`,
        'Keep body text inside the text column (the --bh-measure token). Only figures and tables go wider.', worst.el));
    }

    // Overlapping labels inside one SVG.
    for (const svg of scope.querySelectorAll('svg')) {
      if (!visible(svg)) continue;
      const labels = [...svg.querySelectorAll('text')].filter(t => t.textContent.trim() && visible(t) && opacityChain(t) > 0.05)
        .map(t => ({ t, r: t.getBoundingClientRect() }));
      let hits = 0, first = null;
      for (let i = 0; i < labels.length; i++) for (let j = i + 1; j < labels.length; j++) {
        const a = labels[i].r, b = labels[j].r;
        const w = Math.min(a.right, b.right) - Math.max(a.left, b.left);
        const h = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);
        if (w > 2 && h > 2) { hits++; first = first || [labels[i].t, labels[j].t]; }
      }
      if (hits) {
        findings.push(F('warning', 'label-overlap', `${hits} pair(s) of labels overlap, for example "${snippet(first[0], 30)}" and "${snippet(first[1], 30)}".`,
          'Label fewer points, shorten the labels, give the figure more height, or switch to small multiples.', first[0]));
      }
    }

    // Figures.
    const figures = [...scope.querySelectorAll('figure, .bh-figure')].filter(f => visible(f) && !f.parentElement.closest('figure, .bh-figure'));
    metrics.figures = figures.length;
    for (const fig of figures) {
      const title = fig.querySelector('.bh-figure-title, h1, h2, h3, h4, h5, h6, figcaption, caption');
      if (!title || !title.textContent.trim()) {
        findings.push(F('warning', 'figure-no-title', 'A figure has no title.', 'Give every figure a title that states its finding, for example "Churn halved after March", not "Churn by month".', fig));
      }
      const graphic = fig.querySelector('svg, canvas, img');
      if (graphic) {
        const labelled = [...fig.querySelectorAll('svg, canvas, img, [role="img"]')].some(g =>
          (g.getAttribute('aria-label') || '').trim() || g.getAttribute('aria-labelledby') || (g.getAttribute('alt') || '').trim() || g.querySelector(':scope > title'));
        if (!labelled && !fig.querySelector('table')) {
          findings.push(F('warning', 'figure-no-alt', 'A figure has no text alternative.', 'Add role="img" and an aria-label that states what the figure shows, or include a data table. BH figure functions do both.', fig));
        }
      }
      if (fig.classList.contains('bh-figure')) {
        const note = fig.querySelector('.bh-figure-note');
        if (!note || !note.textContent.trim()) {
          findings.push(F('warning', 'figure-no-source', 'A figure does not say where its data comes from.', 'Add <figcaption class="bh-figure-note">Source: …</figcaption> with the source and period.', fig));
        }
      }
    }

    // Headings.
    const heads = [...scope.querySelectorAll('h1, h2, h3, h4, h5, h6')].filter(visible);
    const h1s = [...document.querySelectorAll('h1')].filter(visible);
    if (h1s.length !== 1) {
      findings.push(F('warning', 'heading-h1', `The page has ${h1s.length} top-level headings; it should have exactly one.`, 'Use one <h1> for the report title and <h2> for sections.', h1s[1] || document.body));
    }
    let prev = 0;
    for (const h of heads) {
      const level = Number(h.tagName[1]);
      if (prev && level > prev + 1) {
        findings.push(F('warning', 'heading-skip', `"${snippet(h)}" is an h${level} directly after an h${prev}.`, 'Do not skip heading levels; pick the heading by structure and style it with classes.', h));
        break;
      }
      prev = level;
    }

    // Content still hidden after scrolling through the page and finishing animations.
    const hidden = [];
    for (const el of scope.querySelectorAll('*')) {
      if (el.closest('[aria-hidden="true"], [hidden], [role="tooltip"], template')) continue;
      const cs = getComputedStyle(el);
      if (cs.display === 'none' || !['static', 'relative', 'sticky'].includes(cs.position)) continue;
      const gone = parseFloat(cs.opacity) < 0.05 || cs.visibility === 'hidden';
      if (!gone) continue;
      if (el.parentElement && el.parentElement.closest('[data-bh-hidden-reported]')) continue;
      const r = el.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue;
      if (!(el.textContent || '').trim() && !el.querySelector('svg, img, canvas')) continue;
      el.setAttribute('data-bh-hidden-reported', '');
      hidden.push(el);
    }
    for (const el of hidden) el.removeAttribute('data-bh-hidden-reported');
    for (const el of hidden.slice(0, 6)) {
      findings.push(F('error', 'hidden-content', `"${snippet(el)}" is invisible at rest.`,
        'Never hide content with CSS alone and wait for a script to reveal it. Let the script add the starting state (BH.motion.enter does this), so the page reads without scripts, in print and with reduced motion.', el));
    }

    // Values that are not from the kit's tokens (only when a kit is present).
    const rootStyle = getComputedStyle(doc);
    const tokenNames = new Set();
    const collect = rules => {
      for (const rule of rules) {
        if (rule.cssRules) collect(rule.cssRules);
        if (rule.style) for (const name of rule.style) if (name.startsWith('--bh-')) tokenNames.add(name);
      }
    };
    for (const sheet of document.styleSheets) { try { collect(sheet.cssRules); } catch { /* cross-origin sheet */ } }
    if (tokenNames.size) {
      const probe = document.createElement('span');
      probe.style.cssText = 'position:absolute;visibility:hidden;pointer-events:none';
      scope.appendChild(probe);
      const sizes = [], colors = new Set(['rgba(0, 0, 0, 0)']);
      for (const name of tokenNames) {
        if (/^--bh-size-/.test(name)) { probe.style.fontSize = `var(${name})`; sizes.push(parseFloat(getComputedStyle(probe).fontSize)); probe.style.fontSize = ''; }
        const raw = rootStyle.getPropertyValue(name).trim();
        if (raw && CSS.supports('color', raw)) { probe.style.color = `var(${name})`; colors.add(getComputedStyle(probe).color); probe.style.color = ''; }
      }
      probe.remove();
      const offSize = [], offColor = [];
      for (const el of texts) {
        if (el.closest('.bh-error, [data-bh-free]')) continue;
        const cs = getComputedStyle(el);
        const fs = parseFloat(cs.fontSize);
        if (sizes.length && !sizes.some(s => Math.abs(s - fs) <= 0.6)) offSize.push({ el, fs });
        const col = isSvg(el) ? cs.fill : cs.color;
        if (col && col !== 'none' && !colors.has(col)) offColor.push({ el, col });
      }
      if (offSize.length) {
        const list = [...new Set(offSize.map(o => `${o.fs.toFixed(1)}px`))].slice(0, 5).join(', ');
        findings.push(F('warning', 'off-scale-size', `${offSize.length} text element(s) use sizes outside the type scale (${list}).`,
          'Use the kit\'s classes or the --bh-size-* tokens. Do not set font sizes by hand.', offSize[0].el));
      }
      if (offColor.length) {
        const list = [...new Set(offColor.map(o => o.col))].slice(0, 4).join(', ');
        findings.push(F('warning', 'off-token-color', `${offColor.length} text element(s) use colours that are not tokens (${list}).`,
          'Use the --bh-ink, --bh-accent and status tokens. To change a colour everywhere, override the token in #bh-overrides.', offColor[0].el));
      }
    }

    // Diagram geometry, from the layout the diagram function recorded.
    const hitsBox = (p, q, b, pad) => {
      const x0 = b.x + pad, y0 = b.y + pad, x1 = b.x + b.w - pad, y1 = b.y + b.h - pad;
      if (x1 <= x0 || y1 <= y0) return false;
      let t0 = 0, t1 = 1;
      const dx = q[0] - p[0], dy = q[1] - p[1];
      for (const [pp, qq] of [[-dx, p[0] - x0], [dx, x1 - p[0]], [-dy, p[1] - y0], [dy, y1 - p[1]]]) {
        if (pp === 0) { if (qq < 0) return false; continue; }
        const t = qq / pp;
        if (pp < 0) { if (t > t1) return false; if (t > t0) t0 = t; } else { if (t < t0) return false; if (t < t1) t1 = t; }
      }
      return t0 < t1;
    };
    for (const el of document.querySelectorAll('*')) {
      const g = el.__bhFlow;
      if (!g || !Array.isArray(g.nodes)) continue;
      const nodes = g.nodes.filter(n => !n.virtual);
      metrics.diagrams.push({ id: el.id || describe(el), nodes: nodes.length, crossings: g.crossings || 0 });
      let reported = false;
      for (let i = 0; i < nodes.length && !reported; i++) for (let j = i + 1; j < nodes.length; j++) {
        const a = nodes[i], b = nodes[j];
        if (a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h) {
          findings.push(F('error', 'node-overlap', `Diagram nodes "${a.id}" and "${b.id}" overlap.`, 'Shorten the labels, add rank or order hints, or split the diagram into an overview and a detail figure.', el));
          reported = true; break;
        }
      }
      reported = false;
      for (const e of g.edges || []) {
        if (reported) break;
        const ends = String(e.id).split('>');
        for (const n of nodes) {
          if (ends.includes(n.id)) continue;
          const pts = e.points || [];
          if (pts.some((p, k) => k > 0 && hitsBox(pts[k - 1], p, n, 2))) {
            findings.push(F('error', 'edge-through-node', `The edge ${e.id} is drawn through the node "${n.id}".`, 'Give the node a rank or order hint so the edge has a clear path, or split the diagram.', el));
            reported = true; break;
          }
        }
      }
      if (g.crossings > 0) {
        findings.push(F('warning', 'edge-crossings', `A diagram has ${g.crossings} edge crossing(s).`, 'Crossings are the main thing that makes a diagram hard to read. Reorder with rank or order hints, remove secondary edges, or split the diagram.', el));
      }
    }

    scrollTo(0, 0);
    return { findings, metrics };
  };
})();
