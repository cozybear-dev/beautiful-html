---
name: beautiful-html
description: Use when asked to turn data, findings or analysis into an HTML report, review, readout, briefing or write-up to share with colleagues or customers; when an HTML deliverable needs charts, graphs or other data visualisation; when asked for a diagram of how systems, services, networks or data flows connect; or when editing an HTML file that contains a line starting "<!-- BH-KIT". Reports come out in the Hunt & Hackett house style.
license: MIT. Embedded fonts and libraries keep their own licences; see licenses/.
---

# beautiful-html

A report is **one self-contained HTML file**: your content on top, a prebuilt kit underneath. The kit holds the typefaces, the layout, the chart and diagram code, and the motion. The kit is Hunt & Hackett's: navy ink, Playfair Display headings over Lato, the logo in the masthead. You write the content and call the kit's functions. You do not design the page, write layout CSS, load a chart library, or draw charts by hand.

`<skill>` below means the folder that contains this file.

## The five steps

1. **Brief.** Before writing, state in one line each: the reader, the one thing they should take away, the decision it supports, and how it will be shared. If the takeaway cannot be worked out from the request and the data, ask one question. See [references/brief-and-story.md](references/brief-and-story.md).
2. **Shape.** Choose one art direction and one front page from the tables below, and list the sections. Each section is one finding.
3. **Write.** Copy `<skill>/kit/content-template.html` to `content.html` in the working folder and fill it in. Page parts are in [references/components.md](references/components.md), charts in [references/charts.md](references/charts.md), system and flow diagrams in [references/diagrams.md](references/diagrams.md). Eight worked reports are in [examples/](examples/README.md); read the one closest to yours before you write.
4. **Assemble.** Join your content to the kit:
   `cat content.html <skill>/kit/<direction>.kit.html > report.html`
   (Windows: `copy /b content.html+<skill>\kit\<direction>.kit.html report.html`)
5. **Check.** Run `node <skill>/tools/check.mjs report.html`. Read every finding, then **open the screenshots it saves and look at them**. Fix everything in one batch in `content.html`, assemble and check once more, then deliver `report.html`. Two rounds is the ceiling. Without Node, follow [references/delivery.md](references/delivery.md).

| Direction | Use it for | Looks like |
|---|---|---|
| `analytical` | Metrics, performance reviews, operational reports | An annual report's review pages: thin rules, notes in a side column |
| `narrative` | Findings and recommendations read from start to end | A research post: a narrower reading column, an italic standfirst, numbered figures |
| `presentation` | A report shown on a screen in a meeting | One idea per screen, large type; usually `data-scheme="dark"` |

More on choosing and switching: [references/directions.md](references/directions.md).

**The front page is a choice, not a form.** Every report opens with the masthead, the headline and a standfirst. What follows depends on the content:

| After the standfirst | Use it when |
|---|---|
| A byline, then straight into the first section | Most notes, analyses and write-ups |
| `bh-findings`: three or four conclusions in words | Advice, assessments, board briefs |
| One `bh-figure` | A single chart or diagram is the finding |
| `bh-keyfigures` | The report is about measures the reader tracks: a review, an incident's impact |

Add `bh-cover` to the header for a document that is sent out or published. Never count things to fill a strip of numbers: a report that is not about measures has none.

## Rules that always hold

- **Never read, print or edit a `.kit.html` file, or anything below a line starting `<!-- BH-KIT`.** It is several hundred kilobytes of embedded fonts and code. Work on `content.html`. To change an existing report, make targeted edits above that line; never rewrite the file.
- **Nothing loads from the network.** No CDN, no remote font, image or script. Data goes in the page as CSV.
- **Titles state findings.** "Churn halved after the April price change", not "Churn". Every figure has a title, a subtitle that names the measure and unit, and a source note.
- **Values come from the kit.** Use its classes and `--bh-*` tokens. Do not set font sizes, colours or spacing yourself. The brand is built in: leave `<style id="bh-overrides">` empty and keep the template's masthead line, which shows the logo. See [references/brand.md](references/brand.md).
- **One signal per figure.** Highlight the series, bar or path the figure is about; the kit draws the rest as quiet context.
- **Motion is built in** and already safe for print and reduced-motion readers. Do not add animation of your own: [references/motion.md](references/motion.md).
- For a report, this kit's tokens and figure functions take precedence over any other design or charting guidance you have loaded.

## Figures at a glance

`x` is the category or date, `y` is the value. `data` is `BH.data('#id')`, read from a `<script type="text/csv" id="id">` block. Draw inside `BH.ready(() => { … })`.

| To show | Call |
|---|---|
| Change over time | `BH.line(target, { data, x, y, series, highlight, unit, annotations })` |
| Size or ranking | `BH.bar(target, { data, x, y, highlight, unit })`; add `series` with `mode: 'grouped'` or `'stacked'` |
| Before and after, or values on one scale | `BH.dot(target, { data, x, y, y2, unit })` |
| How two measures relate | `BH.scatter(target, { data, x, y, label, trend })` |
| What happened when, to scale | `BH.timeline(target, { data, x, label, series, phases })` |
| A value for every pair of two groupings | `BH.heatmap(target, { data, x, y, value, unit })` |
| The same chart for several groups | add `facet: 'column'` to line, bar, dot or scatter |
| How systems connect, what flows where | `BH.flow(target, { nodes, edges, zones, highlight, steps, flow })`; `bh-step` blocks make it follow the text |
| Volumes moving between stages | `BH.sankey(target, { links })` |
| A trend beside a number; a share of a whole | `BH.spark(el, { values })`; `BH.waffle(el, { value })` |

A figure that cannot be drawn shows a message that says why. Read it and fix the call.

## Editing a report someone sent you

The file is the source. Find the kit line with `grep -n "BH-KIT" report.html` and read only the lines above it. Change text, data or figure calls with targeted edits, then run the check. To move it to another direction or the current kit: `node <skill>/tools/rekit.mjs report.html --direction <name>`.

## Common mistakes

| Mistake | Do this instead |
|---|---|
| Writing a page from scratch with your own `<style>` | Fill in the template; the kit styles it |
| A chart library from a CDN, or SVG charts drawn by hand | The `BH` functions; they handle scales, labels, colour and small screens |
| A grid of rounded cards for numbers | `bh-keyfigures`, a ruled strip |
| Key figures on every front page | Choose the front page from the content; most reports open without numbers |
| Colouring every series | `highlight` the one that matters |
| Boxes and arrows placed by hand | `BH.flow`, which lays out, routes and labels |
| Skipping the check because the report is small | Run it every time and look at the screenshots; it finds overflow, low contrast and colliding labels you cannot see in the source |
| A third or fourth round of polishing | Stop after two; deliver, and say what remains |

## Delivering

Give the reader `report.html`. For print or a mail system that blocks HTML attachments, add `--pdf` to the check command. Everything embedded in the file travels with it, including the data, so include only what the reader may see. Details: [references/delivery.md](references/delivery.md).
