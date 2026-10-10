<img src="assets/icon.svg" width="64" height="64" alt="">

# beautiful-html

Hunt & Hackett's skill for reports. It lets any coding agent turn data into a well-designed HTML report in the Hunt & Hackett house style: one self-contained file with sound charts, system flow diagrams and purposeful motion, checked before it goes out.

Left alone, an agent picks the most common fonts, colours and chart settings it saw in training, and never looks at what it made. This skill replaces those defaults with a prebuilt kit the agent composes from, a short procedure, and a checker that renders the result and reports what is wrong with it.

| | | |
|---|---|---|
| ![An incident report behind a navy cover](skills/beautiful-html/examples/incident-report/preview.png) | ![A threat landscape that opens on its chart, in the dark scheme](skills/beautiful-html/examples/threat-landscape/preview.png) | ![A network review that opens on its diagram](skills/beautiful-html/examples/network-review/preview.png) |
| An incident report: a cover, then a diagram that follows the text | A published data story: the chart is the front page | A network review: the diagram is the front page |
| ![A service review that opens on key figures](skills/beautiful-html/examples/service-review/preview.png) | ![A board brief that opens on three findings](skills/beautiful-html/examples/board-brief/preview.png) | ![A debrief for a meeting that opens on a title screen](skills/beautiful-html/examples/incident-debrief/preview.png) |
| A quarterly service review: key figures | A board brief: findings in words | A debrief for a meeting: a title screen |

Eight worked examples ship with the skill; these are the first screens of six. `npm run site` builds a gallery of all eight, with each report, its source and a PDF, into `dist/site/`; the same gallery is what GitHub Pages publishes. They are listed in [skills/beautiful-html/examples/README.md](skills/beautiful-html/examples/README.md).

## What you get

- **One file.** Fonts, styles, charts and data are embedded. It opens offline, makes no network requests, and weighs about 0.8 MB.
- **Three art directions**: three layouts of the one Hunt & Hackett look, for reports that are scanned, read, or shown on a screen.
- **A front page chosen for the content**: a navy cover, a byline, findings in words, the one figure that matters, or key figures. Numbers open a report only when the report is about them.
- **Charts that follow the evidence**: direct labels, one highlighted series, titles that state the finding, bars from zero, palettes checked for colour-blind readers. Lines, bars, dumbbells, scatters, heatmaps, small multiples, Sankeys.
- **Flow diagrams** of how systems connect, laid out automatically to minimise crossings, with zones, a highlighted path, hover tracing and step-by-step walkthroughs. A diagram can stay beside the text and follow the step being read.
- **Motion with a purpose**: figures draw in once, dots show the direction of flow, and readers who ask for reduced motion, or print, get the final state.
- **A checker** with no dependencies that renders the report at desktop and phone widths, in print and with reduced motion, and reports overflow, low contrast, colliding labels, network requests and more, with screenshots.
- **Reports that stay editable.** The content sits at the top of the file with a short guide, so whoever receives it can change it again, with or without this skill.
- **The Hunt & Hackett look, built in**: navy ink, amber as the one accent, Playfair Display over Lato, and the logo in the masthead. There is nothing to configure.

## Install

Pick the route that fits how your people work. All three install the same skill.

**Any agent that reads Agent Skills** (Claude Code, Codex, Cursor and others):

```
npx skills add cozybear-dev/beautiful-html
```

The current `skills` installer needs Node 22.20 or later. On an older Node, `npx skills@1.5.0 add cozybear-dev/beautiful-html` works.

**Claude Code, as a plugin:**

```
/plugin marketplace add cozybear-dev/beautiful-html
/plugin install beautiful-html@beautiful-html
```

**Claude for a whole organisation** (Team or Enterprise): an Owner builds the zip and uploads it once under Organization settings > Plugins & skills > Add > Upload a skill. It then appears for everyone, including in Claude Code for people signed in with their Claude account.

```
git clone https://github.com/cozybear-dev/beautiful-html && cd beautiful-html
node scripts/package-zip.mjs        # writes dist/beautiful-html.zip
```

All three routes work with a private repository; each person needs read access to it.

## Use

Ask for a report the way you already do:

> Here is `usage.csv` and `tickets.csv`. Make a quarterly review for the customer's COO that I can email and then present.

The agent picks the skill up from the request. It states the reader and the takeaway, writes a content file, joins it to a kit, runs the checker, looks at the screenshots, fixes what it finds, and hands you `report.html`.

Useful follow-ups:

- "Make a presentation version of this in the dark scheme."
- "Add a diagram of how the request reaches the database, and walk through it step by step."
- "Give me a PDF as well."
- With a report someone sent you: "Update the September figures in this report."

To run the checker yourself: `node skills/beautiful-html/tools/check.mjs report.html`. It needs Node 18 or later and any Chrome, Edge, Chromium or Brave on the machine.

## The brand

The look is taken from huntandhackett.com and is built into the kits, so every report carries it without any setup:

- **Colour:** navy `#080630` as ink, and as the page in the dark scheme; amber `#fcaf15` as the one accent, drawn darker on white so it stays legible.
- **Type:** Playfair Display for headings and big figures, Lato for text and data.
- **Logo:** the Hunt & Hackett wordmark at the left of the masthead, over an amber rule.

`skills/beautiful-html/brand/DESIGN.md` describes the look for agents and people, and `skills/beautiful-html/brand/logo.svg` is the logo. Changing any of it means building the kits again; see "Building a kit" below.

## What is in the repository

```
skills/beautiful-html/   the skill: instructions, references, kits, tools, examples
src/                     kit sources: css, js, fonts, vendored libraries
scripts/                 build the kits, generate directions, package the zip
tests/                   unit tests and browser tests
site/                    the gallery of examples that GitHub Pages publishes
evals/                   six briefs, the runner, and results with and without the skill
docs/research.md         what exists, what works, and why this is built the way it is
```

## Building a kit

Only needed if you change the kit itself.

```
npm install              # esbuild, for bundling
npm run build            # regenerate directions and build the three kits
npm test                 # 180+ tests; browser tests skip if no browser is found
npm run examples         # check the eight examples, refresh their previews, write them to dist/examples/
npm run site             # build the gallery of examples into dist/site/, as GitHub Pages publishes it
```

- **A different typeface or accent:** edit `src/directions.mjs`, add the family to `scripts/fetch-fonts.mjs` and run `node scripts/fetch-fonts.mjs`, then `npm run build`. Use fonts whose licence allows embedding; the shipped ones are under the SIL Open Font License.
- **Layout rules for a direction:** `src/css/directions/structure/`.
- **The logo:** `skills/beautiful-html/brand/logo.svg` is built into every kit and shown where a report has `<span class="bh-logo">`; its height is `--bh-logo-height` in `src/css/tokens.css`. Replace the file and run `npm run build`. Without the file the kits carry no logo, and the name inside the span is shown as text.
- **Colour tokens are generated**, never typed: `tools/brand.mjs` derives them from the accent, and `tests/unit/directions.test.mjs` checks every direction in both schemes.

## Does it work?

Six briefs were each run twice through Claude Code (Opus 5.5): once with nothing installed, once with the skill. These runs were made with the kit's earlier, brand-neutral look and have not been repeated since it took on the Hunt & Hackett look.

| | Without the skill | With the skill |
|---|---|---|
| Checker errors, six reports | 21 | 0 |
| Checker warnings, six reports | 98 | 3 |
| Time, six reports | 35 minutes | 24 minutes |
| Cost, six reports | 7.79 US dollars | 7.76 US dollars |

Only findings that apply to any HTML report are counted. Two of the six briefs share their subject with a shipped example; on the other four the result was 20 errors and 59 warnings against 0 and 3. This is one run per brief with one model, so it shows the direction of the effect, not its variance. [evals/README.md](evals/README.md) has the method, the per-brief table and a blind side-by-side page, and `node evals/run.mjs` reproduces it.

## Limits

- The checker drives Chromium-based browsers. The kit uses only features Safari and Firefox have shipped since 2023, but they are not tested here.
- Embedded fonts are Latin subsets. Other scripts fall back to the reader's system fonts.
- A diagram holds at most twenty nodes, and a wide one scrolls sideways on a phone.
- Some mail systems block `.html` attachments. The checker's `--pdf` option is the fallback.
- A report embeds its data. Include only what the reader may see.

## Licence

The skill is under the MIT licence. Every report embeds fonts under the SIL Open Font License and D3, Observable Plot and d3-sankey under the ISC and BSD licences; the texts are in `skills/beautiful-html/licenses/`. The Hunt & Hackett name and logo belong to Hunt & Hackett and are not covered by the MIT licence.
