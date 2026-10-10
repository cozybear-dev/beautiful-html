# Page components

Everything goes inside `<main class="bh-report">`. The page is a grid with a **text column**, a **side column** beside it on wide screens, and a **wide** span across both. Elements sit in the text column unless they say otherwise, so every left edge lines up.

| Class | Width |
|---|---|
| (none) | Text column |
| `bh-wide` | Text plus side column. Figures, key figures, tables and comparisons are wide already |
| `bh-in-text` | Forces a figure or table back into the text column |
| `bh-aside` | The side column, beside the element before it; below it on small screens |
| `bh-full` | Edge to edge. Rarely right |

A section with `class="bh-section bh-split"` puts its text on the left and its one figure on the right, for the full height. Use it for a tall figure, such as a top-to-bottom diagram, that should stay on screen beside the words about it. It stacks on small screens and in print.

## Header

```html
<header class="bh-header">
  <div class="bh-masthead">
    <span class="bh-org">Routewise</span>              <!-- text, or an inline <svg> logo -->
    <span class="bh-doc">Quarterly business review, Q3 2026</span>
  </div>
  <h1>Active use rose 38% after onboarding, but two teams are not yet on board</h1>
  <p class="bh-standfirst">Two sentences: the evidence, with <strong>the key number</strong>, and what follows.</p>
  <dl class="bh-meta">
    <div><dt>Prepared for</dt><dd>Northwind Logistics</dd></div>
    <div><dt>Period</dt><dd>July to September 2026</dd></div>
  </dl>
  <div class="bh-keyfigures"> … </div>                 <!-- optional -->
</header>
```

## Key figures

Three or four numbers the report rests on. A ruled strip, not cards. Each needs a comparison.

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

`bh-compare` sets two to four options side by side under rules. In a timeline, `data-key` marks the moments that matter.

## Notes and footer

```html
<div class="bh-notes"><h3>Method</h3><p>How the figures were worked out.</p></div>
<blockquote class="bh-quote"><p>A quotation.</p><footer>Who said it</footer></blockquote>
<footer class="bh-footer"><p>Who prepared this, from what data, and when.</p></footer>
```

## Composition

- Give the reader a figure early. A section that is only text needs a reason.
- Vary the rhythm: text, a wide figure, a pair, a table. Avoid three identical blocks in a row.
- Do not nest components: no figure in a callout, no callout in a table.
- Leave the space the kit gives. Do not add margins, wrappers, borders or backgrounds.
