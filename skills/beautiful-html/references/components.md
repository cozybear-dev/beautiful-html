# Page components

Everything goes inside `<main class="bh-report">`. The page is a grid with a **text column**, a **side column** beside it on wide screens, and a **wide** span across both. Elements sit in the text column unless they say otherwise, so every left edge lines up.

| Class | Width |
|---|---|
| (none) | Text column |
| `bh-wide` | Text plus side column. Figures, key figures, tables and comparisons are wide already |
| `bh-in-text` | Forces a figure or table back into the text column |
| `bh-aside` | The side column, beside the element before it; below it on small screens |
| `bh-full` | Edge to edge. Rarely right |

A section with `class="bh-section bh-split"` puts its text on the left and its one figure on the right, for the full height. Use it for a tall figure, such as a top-to-bottom diagram, that should stay on screen beside the words about it. It stacks on small screens and in print. With `bh-step` blocks in it, the diagram follows the text as it is read: see "Reading steps" in `diagrams.md`.

## Front page

The header always has the masthead, the headline and a standfirst. The rest is chosen for this report.

```html
<header class="bh-header">
  <div class="bh-masthead">
    <span class="bh-org"><span class="bh-logo">Hunt &amp; Hackett</span></span>   <!-- the kit's logo; plain text for another organisation -->
    <span class="bh-doc">Research note, October 2026</span>
  </div>
  <h1>The capability check runs inside the process it is meant to confine</h1>
  <p class="bh-standfirst">Two sentences: the evidence, with <strong>the point that matters most</strong>, and what follows.</p>
  <p class="bh-byline">By the detection team, for the platform owners. 10 October 2026.</p>
</header>
```

| Part | What it is | Use it when |
|---|---|---|
| `bh-byline` | One line: who it is from, who it is for, the date or period | Nearly always |
| `bh-meta` | A short list of facts in the side column (`<dl>` of `<div><dt>…</dt><dd>…</dd></div>`) | The reader files or cites the document: customer, period, version, classification. Instead of a byline, not as well |
| `bh-findings` | Three or four conclusions in words, under rules | The reader wants the verdicts before the evidence |
| A `bh-figure` | One chart or diagram, as wide as the masthead | The figure is the finding. Leave out the standfirst if the figure's title says it |
| `bh-keyfigures` | Three or four measures with their comparisons | The report is about those measures |
| `bh-cover` on the header | The header becomes a navy title band, edge to edge | A document that is sent out or published. Works with any of the above; prints light |

A heading inside the header is an `<h2>`, whatever it is: `<h2 class="bh-figure-title">`, or the `<h2>` of a finding. The kit sets it by its class, not its level.

Put a strip of numbers there only when the report is about them. A count of the things in the report ("4 calls, 2 routes, 0 servers") is not a measure; say it in the standfirst or leave it out.

## Findings

Conclusions in words. In the header they open the report; in a section they close it, as next steps or controls.

```html
<ol class="bh-findings">
  <li><h2>The legacy gateway still accepts passwords alone</h2><p>It predates single sign-on and was left running for two suppliers.</p></li>
  <li><h2>Backups have never been restored in a test</h2><p>Nobody can say how long a recovery would take.</p></li>
</ol>
```

An `<ol>` numbers them, so a meeting can refer to "finding 2"; a `<ul>` does not. Two to four, each a sentence that could stand alone and one line of support. Inside a section the headings are `<h3>`.

## Key figures

Three or four measures the report rests on. A ruled strip, not cards. Each needs a comparison. In the header when they are what the reader came for; in a section when they belong to one finding.

```html
<div class="bh-keyfigures">
  <div class="bh-keyfigure">
    <p class="bh-keyfigure-label">Monthly active users</p>
    <p class="bh-keyfigure-value">536 <span id="spark-users"></span></p>
    <p class="bh-keyfigure-note"><span class="bh-delta" data-dir="up" data-tone="good">38%</span> since June</p>
  </div>
  <div class="bh-keyfigure">
    <p class="bh-keyfigure-label">Seats in use</p>
    <p class="bh-keyfigure-value">82<small>%</small></p>
    <p class="bh-keyfigure-note">536 of 650 licensed seats</p>
  </div>
</div>
```

- Put the unit in `<small>`. The number counts up on entrance by itself.
- `bh-delta`: `data-dir="up|down"` draws the arrow; `data-tone="good|bad"` colours it. Direction and tone are separate: churn going up is `up` and `bad`.
- A sparkline goes in an empty `<span>` filled with `BH.spark`.

## Sections

```html
<section class="bh-section" data-nav="Usage">
  <h2>Usage grew fastest in the three months after onboarding</h2>
  <p>Body text …</p>
  <aside class="bh-aside"><h3>How we count</h3><p>A definition or caveat that would interrupt the text.</p></aside>
  <figure class="bh-figure"> … </figure>
</section>
```

`data-nav` is the short name used by the section navigator, which appears by itself when there are four or more sections. Use `<h3>` for sub-headings; never skip a level. `<p class="bh-lead">` sets a larger opening paragraph.

- `class="bh-section bh-band"` sets one section on a tinted band, edge to edge: the part that is different in kind, such as the path of an attack among findings, or the method. One or two in a report; never every other section.
- `<p class="bh-statement">` is one sentence set as large as the headline: the point the report comes down to. It can be a section by itself, with no `<h2>`. At most one or two.

## Figure

```html
<figure class="bh-figure">
  <h3 class="bh-figure-title">Active users have risen every month since the May programme</h3>
  <p class="bh-figure-sub">Monthly active users, October 2025 to September 2026</p>
  <div class="bh-plot" id="fig-users"></div>
  <figcaption class="bh-figure-note">Source: product analytics. Licensed seats: 650 throughout.</figcaption>
</figure>
```

The kit adds a "Show the data" table under each chart and sets the text alternative from the title and subtitle; `data-bh-table="off"` on the figure removes the table. Two figures side by side: wrap them in `<div class="bh-pair bh-wide">`.

## Callout

For the one thing the reader must decide or remember. At most one or two in a report.

```html
<div class="bh-callout">
  <p class="bh-callout-label">Recommendation</p>
  <h3>Run the onboarding programme for Warehouse Ops and Finance in November</h3>
  <p>Why, in a sentence or two, with the number that supports it.</p>
</div>
```

## Table

```html
<div class="bh-table-wrap">
  <table class="bh-table">
    <caption>Seats and weekly use by team, September 2026</caption>
    <thead><tr><th scope="col">Team</th><th scope="col" class="bh-num">Seats</th><th scope="col" class="bh-num">In use</th><th scope="col">Status</th></tr></thead>
    <tbody>
      <tr><th scope="row">Dispatch</th><td class="bh-num">140</td><td class="bh-num"><span class="bh-bar" style="--v:.91"></span>91%</td><td><span class="bh-status" data-status="good">On track</span></td></tr>
      <tr data-highlight><th scope="row">Finance</th><td class="bh-num">64</td><td class="bh-num"><span class="bh-bar" style="--v:.38"></span>38%</td><td><span class="bh-status" data-status="bad">At risk</span></td></tr>
    </tbody>
    <tfoot><tr><th scope="row">All teams</th><td class="bh-num">650</td><td class="bh-num">73%</td><td></td></tr></tfoot>
  </table>
</div>
```

- `bh-num` right-aligns numbers and lines up their digits.
- `bh-bar` draws a bar in the cell; `--v` is the share from 0 to 1.
- `bh-status` is a shape and a word: `data-status="good|warn|bad"`. Status colours mean status only.
- Use a table when the reader needs exact values or to look one row up; use a chart when they need the pattern.

## Code and terms

```html
<pre class="bh-code"><code>CoInitializeEx(NULL, COINIT_MULTITHREADED)
<mark>  -> E_ACCESSDENIED          <i>// the capability check</i></mark>
CoCreateInstance(CLSID_Known, …)
  -> CO_E_NOTINITIALIZED</code></pre>

<dl class="bh-terms">
  <dt>LPAC</dt><dd>Less Privileged AppContainer: a sandbox that starts with no access to shared resources.</dd>
  <dt>lpacCom</dt><dd>The capability that lets such a process start COM.</dd>
</dl>
```

`bh-code` is for commands, calls, log lines and configuration, exactly as written. `<mark>` is the line that matters and `<i>` a comment beside it. Keep lines under about 70 characters; add `bh-wide` for longer ones. It scrolls on a screen and wraps on paper. `bh-terms` sets terms and their meanings, or settings and their values, in two columns.

## Comparison and timeline

```html
<div class="bh-compare">
  <div><h3>Onboard two teams</h3><p>Two-week programme, starting 3 November.</p></div>
  <div><h3>Review seat allocation</h3><p>Move 40 unused seats to Dispatch.</p></div>
</div>

<ol class="bh-timeline">
  <li><span class="bh-when">13:52</span><div><p>Cache memory lowered</p><p>Change CHG-4471.</p></div></li>
  <li data-key><span class="bh-when">14:06</span><div><p>Checkout fails for customers</p></div></li>
</ol>
```

`bh-compare` sets two to four options side by side under rules. Keep each to a heading and a sentence or two; the text is set small, so anything longer belongs in the section body. In a timeline, `data-key` marks the moments that matter.

## Notes and footer

```html
<div class="bh-notes"><h3>Method</h3><p>How the figures were worked out.</p></div>
<blockquote class="bh-quote"><p>A quotation.</p><footer>Who said it</footer></blockquote>
<footer class="bh-footer"><p>Who prepared this, from what data, and when.</p></footer>
```

## Composition

- Open with what this reader needs first; that is rarely the same thing in two reports. See "Front page".
- Give the reader a figure early. A section that is only text needs a reason.
- Vary the rhythm: text, a wide figure, a pair, a table. Avoid three identical blocks in a row.
- Do not nest components: no figure in a callout, no callout in a table.
- Leave the space the kit gives. Do not add margins, wrappers, borders or backgrounds.
