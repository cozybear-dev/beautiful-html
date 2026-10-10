// Small pages with exactly one known fault each, for the audit tests.
const page = (body, { style = '', title = 'Fixture' } = {}) => `<!doctype html>
<html lang="en"><head><meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1"><title>${title}</title>
<style>body{font:17px/1.5 system-ui,sans-serif;color:#111;background:#fff;margin:0}
main{max-width:40rem;margin:2rem auto;padding:0 1rem}${style}</style></head>
<body><main><h1>Fixture page</h1>
${body}
</main></body></html>`;

const chart = (inner, attrs = 'role="img" aria-label="A chart"') =>
  `<svg ${attrs} viewBox="0 0 300 80" width="300" height="80">${inner}</svg>`;
const goodChart = chart('<text x="10" y="20" font-size="12">alpha</text><text x="10" y="60" font-size="12">beta</text>');
const figure = svg => `<figure><h2>Alpha leads beta</h2>${svg}<figcaption>Source: test data.</figcaption></figure>`;

export const clean = page(`<p>Short paragraph of body text that is easy to read.</p>${figure(goodChart)}`);

export const faults = {
  'horizontal-overflow': page('<div style="width:2000px;height:20px;background:#eee"></div>'),
  'low-contrast': page('<p style="color:#aaa">Pale grey text on white is hard to read.</p>'),
  'console-error': page('<p>Text.</p><script>console.error("boom"); undefinedFunction();</script>'),
  'label-overlap': page(figure(chart('<text x="10" y="20" font-size="12">first label</text><text x="14" y="22" font-size="12">second label</text>'))),
  'clipped-text': page('<div style="width:80px;overflow:hidden;white-space:nowrap">This sentence is much longer than its box allows.</div>'),
  'small-text': page('<p style="font-size:13px">Running prose set at thirteen pixels is too small to read comfortably on a screen, and a paragraph this long is clearly body text, not a caption or a label.</p>'),
  'long-lines': page(`<p>${'This is a sentence in a paragraph that runs the full width of the page. '.repeat(8)}</p>`, { style: 'main{max-width:none}' }),
  'figure-no-title': page(`<figure>${goodChart}</figure>`),
  'heading-skip': page('<h4>A heading that skips two levels</h4><p>Text.</p>'),
  'hidden-content': page('<p class="reveal">This paragraph waits for a script that never runs.</p>', { style: '.reveal{opacity:0}' }),
  'motion-under-reduced': page('<p class="spin">Spinning.</p>', { style: '@keyframes s{to{transform:translateX(20px)}}.spin{animation:s 1s linear infinite}' }),
  'loop-without-pause': page('<figure><h2>Moving dots</h2><div class="dot" role="img" aria-label="dot"></div><figcaption>Source: test.</figcaption></figure>',
    { style: '@keyframes s{to{transform:translateX(20px)}}.dot{width:8px;height:8px;background:#111;animation:s 1s linear infinite}' }),
  'node-overlap': page(`<figure><h2>Two systems</h2><div id="d" role="img" aria-label="diagram" style="height:60px"></div><figcaption>Source: test.</figcaption></figure>
<script>document.getElementById('d').__bhFlow={nodes:[{id:'a',x:0,y:0,w:100,h:40},{id:'b',x:50,y:10,w:100,h:40}],edges:[],crossings:0};</script>`),
  'edge-through-node': page(`<figure><h2>Three systems</h2><div id="d" role="img" aria-label="diagram" style="height:60px"></div><figcaption>Source: test.</figcaption></figure>
<script>document.getElementById('d').__bhFlow={nodes:[{id:'a',x:0,y:0,w:100,h:40},{id:'b',x:400,y:0,w:100,h:40},{id:'c',x:200,y:0,w:100,h:40}],
edges:[{id:'a>b',points:[[100,20],[400,20]]}],crossings:0};</script>`),
};

// A label under the 11px floor, and a short caption at 13px that is fine.
export const tinyLabel = page('<p>Text.</p><p style="font-size:9px">Tiny label</p>');
export const shortCaption = page('<p>Text.</p><p style="font-size:13px">A short caption.</p>');

// A page with a looping animation that does have a pause control.
export const loopWithPause = page('<figure><h2>Moving dots</h2><div class="dot" role="img" aria-label="dot"></div><button type="button" data-bh-pause>Pause</button><figcaption>Source: test.</figcaption></figure>',
  { style: '@keyframes s{to{transform:translateX(20px)}}.dot{width:8px;height:8px;background:#111;animation:s 1s linear infinite}' });

// A page that tries to load something from the network.
export const networkRequest = page('<p>Text.</p><script>fetch("https://example.invalid/data.json").catch(()=>{});</script>');
