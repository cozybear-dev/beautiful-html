# beautiful-html: design

Date: 2026-10-10
Status: approved (revision 2)

## Purpose

People across the company use coding agents to turn data into HTML reports for
colleagues and customers. Left alone, an agent picks the most common fonts,
colours, layouts and chart settings it saw in training, and it never looks at
what it made. The reports work, but they look generic, the charts are often
weak, and diagrams of how systems connect are boxes and arrows at best.

`beautiful-html` is an Agent Skill that replaces those defaults with a
hand-tuned kit, a procedure, and an automated check. Anyone with an agent
installs it once and gets consistently well-designed reports.

## Decisions already made

| Decision | Choice | Why |
|---|---|---|
| Form | Agent Skill (open `SKILL.md` format) | The gap is know-how, assets and verification, not access to a system. No server to host. |
| Agents | Mixed: Claude Code, other coding agents, unknown | Nothing Claude-only in the core path. |
| Brand | Neutral by default, swappable | One brand file overrides colour, type and logo. |
| Sharing | Email attachment, PDF or print, on screen in meetings | One self-contained file, real print styling, legible on a projector. |
| Editing after sharing | The shared file is the source | A recipient edits the same HTML again, with or without the skill installed. |
| Chart engine | Observable Plot, wrapped in house functions | Correct scales and dates from a mature library; house functions enforce the design rules. |
| System diagrams | A dedicated flow-diagram engine | Point-to-point flows between systems are a first-class figure, not an afterthought. |
| Motion | Built in, purposeful, always optional for the reader | Motion shows entrance, flow and change; it never decorates. |
| Proof | Run a small with-and-without comparison | "Better" is shown, not claimed. |

## Success criteria

1. Installs in one step by each of three routes: `npx skills add`, Claude Code
   plugin, claude.ai organisation upload.
2. A report built from a realistic brief is one HTML file that makes no network
   requests, opens offline, weighs under 1.5 MB before any images, and passes
   the checker with zero errors.
3. Producing a report needs no runtime: assembly is one file-concatenation
   command. Node is needed only for the automated check.
4. A person who receives only the HTML file can have an agent change its text,
   data, charts and diagrams without the skill installed and without the agent
   reading the embedded fonts or library code.
5. A flow diagram of up to 20 systems lays out with no overlapping nodes, no
   edge drawn through a node, and no overlapping labels.
6. With reduced motion requested, and in print, every figure shows its final
   state with nothing moving and nothing hidden.
7. Swapping the brand means editing one file.
8. On the test briefs, the with-skill report is preferred to the baseline in a
   blind side-by-side review, and has fewer checker findings.

## Out of scope for version 1

Hosted publishing, an MCP server, slide decks, live data connections,
dashboards with a backend, React or any build framework, editing in the browser
with a save button, and force-directed network layouts.

## The report file

A report is one HTML file with the editable part first and the kit last.

```html
<!doctype html>
<!-- EDITING GUIDE: what this file is, where to edit, the component and chart
     reference, and a warning not to open anything below the BH-KIT line. -->
<html lang="en" data-bh-direction="analytical" data-scheme="light">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Churn fell after the March pricing change</title>
  <style>html{visibility:hidden}</style>
  <script>window.BH={q:[],ready(f){this.q.push(f)}}</script>
  <style id="bh-overrides">/* brand and per-report overrides; usually empty */</style>
</head>
<body>
<main class="bh-report"> … text, figures, data … </main>
<script id="bh-figures">BH.ready(() => { /* chart and diagram calls */ });</script>
<!-- BH-KIT: embedded fonts, styles and code. Do not open, print or edit below. -->
<style id="bh-kit-css">…</style>
<script id="bh-kit-js">…</script>
</body>
</html>
```

- **Content first.** Everything a person or agent edits sits above the
  `BH-KIT` line, in ordinary indented HTML.
- **Kit last.** Fonts, styles, D3, Plot and the house code follow the marker on
  a few very long lines, so a tool that prints the file by line shows little of
  them.
- **Self-describing.** The editing guide at the top is about forty lines. It
  tells a reader with no skill installed where to edit, lists the components
  and figure functions, and says to change the file with targeted edits, never
  by rewriting it whole.
- **No flash.** The page is hidden until the kit's styles load, then shown.
- **Data in the page.** Data sits in `<script type="text/csv">` blocks that
  `BH.data` parses, so numbers are pasted, never retyped, and a later editor can
  change them.

`BH.ready` runs the figure calls once the kit and fonts have loaded. The
one-line stub in the head defines it before the kit arrives.

## How a report is made

`SKILL.md` states five steps; reference files carry the detail and load only
when needed.

1. **Brief.** Name the reader, the one takeaway, the decision the report
   supports, and how it will be shared. Ask one question only if the takeaway
   cannot be inferred.
2. **Shape.** Pick a report structure and one art direction from the content.
3. **Write.** Copy `kit/content-template.html` and fill it. This is the top
   part of the report: a normal HTML document without its closing tags.
4. **Assemble.** Join it to a prebuilt kit:
   `cat content.html kit/<direction>.kit.html > report.html`
   (Windows: `copy /b`). The agent never reads or edits a kit file.
5. **Check.** Run `node tools/check.mjs report.html`, look at the screenshots,
   fix everything in one batch, re-run once, and deliver. Two rounds is the
   ceiling.

**Editing an existing report.** Change the top part in place with targeted
edits. To switch direction or update the kit, `node tools/rekit.mjs report.html
--direction <name>` replaces everything below the marker; `delivery.md` gives
the equivalent shell commands for machines without Node.

## Repository layout

```
beautiful-html/
├── README.md                      install and use, for people
├── .claude-plugin/                plugin.json and marketplace.json
├── skills/beautiful-html/         the installable skill
│   ├── SKILL.md
│   ├── references/
│   │   ├── brief-and-story.md     reader, takeaway, report shapes, writing
│   │   ├── directions.md          the three art directions and when to use each
│   │   ├── components.md          page components and composition rules
│   │   ├── charts.md              choosing a form, the chart functions, rules
│   │   ├── diagrams.md            flow diagrams, flows by volume, steppers
│   │   ├── motion.md              the three kinds of motion and their limits
│   │   ├── brand.md               applying a brand; deriving a new direction
│   │   └── delivery.md            assemble, edit, check, PDF, email, print, screen
│   ├── kit/
│   │   ├── analytical.kit.html
│   │   ├── narrative.kit.html
│   │   ├── presentation.kit.html
│   │   └── content-template.html
│   ├── brand/DESIGN.md            neutral placeholder brand
│   ├── tools/
│   │   ├── check.mjs              Node CLI, no dependencies
│   │   ├── rekit.mjs              swap the kit under an existing report
│   │   └── audit.js               runs inside the page; injected by check.mjs
│   ├── examples/                  content sources and preview images
│   └── licenses/                  font and library licences
├── src/                           kit sources: css, js, fonts, vendored libraries
├── scripts/                       build-kit, fetch-fonts, package-zip
├── tests/                         node:test suites and fixtures
├── evals/                         briefs, runner, results
└── docs/                          research.md, specs, plans
```

Everything a user needs is inside `skills/beautiful-html/`. The rest of the
repository builds and tests it.

## The kit

### Tokens

All design values are CSS custom properties with a `--bh-` prefix: colour roles
(ground, surface, three ink levels, rule, accent, three status colours), chart
palettes (six categorical, a seven-step sequential, a diverging pair), three
font roles (display, text, data), a type scale, a spacing scale, a text measure,
and motion durations and easing. Components, charts and diagrams read only
tokens, so a direction, a brand or a colour scheme changes them all at once.

Each direction ships a light and a dark set of tokens. The scheme is chosen by a
`data-scheme` attribute on `<html>`, never by the reader's system setting, so
the author sees what the reader sees. Print always uses the light set.

### Art directions

Each direction is a complete system anchored to a specific reference, because a
specific reference steers better than adjectives.

| Direction | Use for | Reference | Character |
|---|---|---|---|
| `analytical` | Metrics, performance reviews, operational reports | The financial review pages of a well-set annual report | Sans throughout, tabular figures, generous white, thin rules, one spot colour |
| `narrative` | Findings and recommendations sent to customers | A research institute's briefing paper | Serif reading column, figures wider than the text, side notes, numbered figures |
| `presentation` | Shown on a screen in a meeting | An investor-day screen | Large type, one idea per screen, strong figure and ground, big numbers |

Rules that hold in every direction:

- One accent colour on at most a tenth of the page. Status colours only mean status.
- No more than two font families. Every face has tabular figures.
- Sizes, gaps and radii come from the scales. Nothing is invented per report.
- None of the current generated-page looks as a default: cream ground with a
  serif heading and a clay accent; near-black with an acid accent; identical
  rounded cards with soft shadows; gradient text; purple gradients.

Fonts are open-licensed (SIL OFL), Latin-subset, and embedded as base64, with a
budget of 200 KB of font data per direction. Each kit file stays under 1.1 MB.
Starting choices: Source Sans 3 for `analytical`; STIX Two Text with Source
Sans 3 for `narrative`; Atkinson Hyperlegible Next for `presentation`. Before
the kit is finalised I render two or three candidate looks per direction and
the user picks, because the final call on taste is theirs.

### Components

Classes use a `bh-` prefix: report header (title, standfirst, meta line),
key-figures strip, section, figure (title, subtitle, plot, note, source, data
table), callout, table (numeric alignment, inline bars), comparison columns,
timeline, notes and sources, appendix, and a section navigator that appears for
four or more sections. `presentation` adds screen-height sections and arrow-key
movement between them. A print stylesheet sets page size and margins, keeps
figures and tables from splitting, and hides controls.

### Charts

A global `BH` object, inlined after D3 and Observable Plot:

| Function | Form |
|---|---|
| `BH.line` | Change over time, one or many series |
| `BH.bar` | Magnitude and ranking; horizontal, vertical, grouped, stacked |
| `BH.dot` | Dot plot, lollipop, dumbbell for before and after |
| `BH.scatter` | Relationship between two measures |
| `BH.spark` | Inline sparkline beside a number |
| `BH.waffle` | Share of a whole |
| `BH.plot` | Any raw Plot specification with the house theme applied |
| `BH.data` | Parse CSV embedded in the page |

`line`, `bar`, `dot` and `scatter` take a `facet` option for small multiples.

Built in, so the rules hold by construction:

- `highlight` draws the named series in colour and the rest in neutral ink.
- Direct labels with collision avoidance; a legend only when labels cannot fit.
- `annotations` place a short note with a leader line at a data point.
- Bars always start at zero. There is no dual-axis option and no pie.
- More than six coloured series is refused with a visible message that says to
  highlight or facet.
- Each chart generates a data table inside the figure and sets a text
  alternative from the figure title.
- Charts read colours and fonts from tokens, re-render on resize and before
  printing, and format numbers and dates for the page language.

Palettes are checked at build time for colour-blind separation and contrast by
our own script, written from the published algorithms.

### Flow diagrams

Diagrams of how things move from system to system get their own engine,
because the generic options are either heavy and hard to style (Mermaid is
3.5 MB) or leave the agent placing every box by hand.

**`BH.flow(target, { nodes, edges, zones, steps })`** draws a directed
node-link diagram from a plain description.

- **Nodes** have a label, an optional sublabel, and a kind. The kind sets the
  shape, so shape says what a thing is: service, data store, queue, gateway or
  firewall, external system, person.
- **Edges** have a source, a target, a label (a verb, a protocol, a volume),
  and a kind: normal, asynchronous, blocked. `highlight` marks the path the
  figure is about; everything else stays neutral.
- **Zones** are named groups such as a network segment or trust boundary,
  drawn as a quiet labelled frame around their members.
- **Layout is automatic.** Ranks follow edge direction, so the flow reads one
  way. Order within a rank is chosen to minimise crossings, the factor shown
  to matter most for reading a graph. Members of a zone stay together. A node
  may carry a `rank` or `order` hint when position has meaning. The layout is
  our own. The dagre library was considered and dropped: it cannot keep a
  zone's members together when they connect outside the zone, and at twenty
  nodes we can afford to try many more orderings than it does.
- **Edges are routed** as smooth curves that leave and enter nodes at separate
  points, never pass through a node, and carry labels on a ground-coloured
  halo.
- **Direction is shown three ways:** every edge runs with the rank order, ends
  in a small arrowhead, and can carry moving dots. Arrowheads alone read
  poorly in busy graphs.
- **Reading aids.** Hovering or focusing a node lights what feeds it and what
  it feeds, and dims the rest. `steps` turns the diagram into a walkthrough:
  each step names the nodes and edges involved and a one-line caption, with
  previous, next and play controls and arrow-key support.
- **Small screens.** Below a width threshold the layout turns to run top to
  bottom, and text never shrinks under the minimum size.
- **Limits.** Twenty nodes per diagram. Beyond that the function refuses with a
  message telling the author to draw an overview and a detail figure.

**`BH.sankey(target, { nodes, links })`** draws flows by volume between stages,
using d3-sankey (6 KB), with the same tokens, labels, highlight and hover.

### Motion

Motion is part of the kit, with three permitted kinds:

| Kind | What moves | When |
|---|---|---|
| Entrance | The header once on load. Each figure once, when it first scrolls into view: lines draw, bars grow from the baseline, numbers count up, diagram edges draw in rank order | One time only |
| Flow | Dots travel along diagram edges to show direction, and their rate shows relative volume | Only while the figure is on screen, with a visible pause control |
| Response | Path highlight on hover or focus, steps in a walkthrough, staged change between two views | When the reader acts |

Rules:

- Durations and easing come from tokens. Complex changes are staged, one thing
  at a time.
- With `prefers-reduced-motion`, in print, and in PDF, every figure shows its
  final state. Walkthroughs still work, because the reader starts them.
- Content is never hidden by styles alone. The script adds the starting state,
  so a page without scripts shows everything.
- Anything that loops has a pause control and stops when off screen.
- No parallax, no scroll-jacking, no decorative loops, no bounce.

`BH` exposes `motion: false` per figure and `data-bh-motion="off"` on `<html>`
for a fully static report.

## The checker

`node tools/check.mjs report.html [--out <dir>] [--pdf] [--paper a4|letter]`

It has no npm dependencies. It finds a Chromium-based browser already on the
machine (an environment variable, then the usual Chrome, Edge, Chromium and
Brave paths, then a Playwright cache) and drives it over the browser's own debug
pipe. A trial confirmed this works for viewport emulation, console and network
capture, screenshots and PDF.

**Static stage, no browser needed**

- Errors: any reference to a network resource; missing title, language,
  viewport, editing guide or `BH-KIT` marker; leftover template text; file over
  5 MB.
- Warnings: file over 1.5 MB.

**Rendered stage, at 1440 and 390 pixels wide, and in print**

- Errors: console errors or exceptions; any network request; a figure that
  failed to render; horizontal overflow; text below a 4.5 to 1 contrast ratio
  (3 to 1 for large text); overlapping diagram nodes; an edge through a node;
  anything still moving or hidden under reduced motion; a looping animation
  with no pause control.
- Warnings: overlapping labels; clipped text; body text under 16 px or figure
  labels under 11 px; lines longer than 80 characters; a figure with no title,
  source or text alternative; font sizes or colours that are not from the
  tokens; skipped heading levels; the count of edge crossings in each diagram.

Before each screenshot the checker scrolls the page and finishes all
animations, so images show the settled state.

**Output:** a summary naming each finding, the element, and the fix; a JSON
report; screenshots cut into screen-height slices so they stay readable; and,
with `--pdf`, a PDF.

**Exit codes:** 0 clean, 1 errors found, 2 could not run. On 2 it prints the
fallback: take a screenshot with the browser's own command line and review
against the checklist in `delivery.md`.

The audit logic lives in `audit.js`, which runs inside the page. `check.mjs`
only launches, injects and reports, so another runner can reuse the audit later.

## Skill content

`SKILL.md` stays under about 200 lines: when to use the skill, the five steps,
the rules that are never broken, and pointers to the references. The reference
files hold:

- **Story.** Titles state the finding, not the topic. Every figure has one
  claim. Numbers carry units and a comparison. Sources are visible.
- **Bespoke without drift.** Structure follows the content. The subject supplies
  a light motif in two or three places: an accent hue, a domain convention, a
  typographic habit. The kit's scales are never overridden.
- **Charts.** Which form answers which question, the function reference, and
  the mistakes to check against.
- **Diagrams.** When a flow diagram beats a table or a sentence; one flow
  direction; verbs on edges; one highlighted path; overview before detail; when
  to use a walkthrough; when volume calls for `BH.sankey`.
- **Motion.** The three kinds, what each is for, and the limits above.
- **Brand.** How to fill in `brand/DESIGN.md` and turn it into token overrides,
  and how to derive a new direction from a named reference.
- **Delivery.** Assembly on each operating system, editing a received report,
  the check loop, PDF export, and a warning that embedded data travels with the
  file.

`brand/DESIGN.md` follows Google's open DESIGN.md format, so it can be linted
and read by other tools.

## Distribution

- `npx skills add <owner>/beautiful-html` for Claude Code, Codex, Cursor and
  other agents that read the Agent Skills format.
- Claude Code plugin: the repository is its own marketplace.
- claude.ai: `scripts/package-zip.mjs` builds a zip an Owner uploads once under
  Organization settings. It also syncs to Claude Code for signed-in users.

The README covers all three, how to update, and how to set a company brand
before distributing.

## Proof

- **Examples.** Three complete reports, one per direction, kept as content
  sources with preview images. The `presentation` example is built around a
  system-to-system flow diagram with a walkthrough. They are the reference an
  agent copies parts from, and they must pass the checker with zero errors.
- **Comparison.** Six briefs with data: a customer quarterly review, an incident
  review with the failure path through the systems, survey results, an
  experiment readout, a sales pipeline review with stage-to-stage volumes, and
  a data-flow overview between systems for a security review. A runner produces
  each report with and without the skill, runs the checker on both, and builds
  a blind side-by-side gallery for review. The baseline is run before
  `SKILL.md` is written, so the skill answers observed failures.

## Testing

- Unit tests with `node:test` for chart helpers (label placement, formatting,
  palette validation), flow layout (no overlaps, no edge through a node,
  crossing counts on fixture graphs), and the checker's static stage.
- Fixture pages with known faults confirm the audit reports each one; these
  skip with a notice when no browser is found.
- A build test confirms each kit builds, stays under 1.1 MB, and contains no
  network references.
- A round-trip test edits an assembled report in place and swaps its kit, then
  confirms it still passes the checker.
- Code is written test-first.

## Research basis for the diagram and motion rules

- Fewer edge crossings help comprehension far more than fewer bends or more
  symmetry (Purchase, 1997).
- Animated and tapered edges both convey direction well, and arrowheads alone
  do poorly in dense graphs (Holten and van Wijk, 2009; Holten and others,
  2011). I read summaries, not the papers.
- Animation helps when it matches the structure of what it shows and is slow
  and simple enough to follow; staged transitions help tracking (Tversky and
  others, 2002; Heer and Robertson, 2007).
- Moving content that starts on its own and runs longer than five seconds needs
  a way to pause it (WCAG 2.2.2).

## Risks

| Risk | Handling |
|---|---|
| Agents misuse the Plot API | Wrapper functions cover the common forms; the reference is short; the checker catches render failures. |
| Automatic diagram layout looks poor on awkward graphs | Rank and order hints, a 20-node limit, crossing counts in the checker, and overview-then-detail guidance. |
| An agent prints a whole report and floods its context | The editing guide and `SKILL.md` forbid it; the kit sits last on a few long lines. |
| An agent rewrites the whole file and loses the kit | The static check fails on a missing marker or kit; `rekit.mjs` restores it. |
| Motion distracts or excludes | Three permitted kinds only, reduced-motion and print states, pause controls, all enforced by the checker. |
| Mail filters block HTML attachments | One-command PDF export. |
| Other installed design skills pull in a different direction | `SKILL.md` states that the kit's tokens and figure rules take precedence. |
| The directions date | They are versioned, and the comparison is re-run after changes. |
| Font or library licensing | OFL fonts only; licence texts ship with the skill. |
