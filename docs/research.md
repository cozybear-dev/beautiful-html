# Research record

Date: 10 October 2026. This is the research behind `beautiful-html`: what already exists for making agents produce better-looking HTML, what is known to work, what is missing, and how each finding shaped the build. Star counts and versions are as read on that date. Where a claim rests on a summary and not the source itself, it says so.

## The question

People across a company use coding agents to turn data into HTML reports for colleagues and customers. The reports work, but they look alike, the charts are weak, and nobody checks them before they go out. What is the right vehicle for fixing that (a skill, an MCP server, something else), and what demonstrably improves the result?

## Short answers

1. **Use an Agent Skill, not an MCP server.** The gap is know-how, assets and verification. A skill carries all three, costs a few hundred tokens until used, and needs no hosting. An MCP server gives access to a system, which is not what is missing.
2. **Do not rely on instructions alone.** Every strong project in this space converged on the same three things: a constrained kit to compose from, checks that a script can run, and a render-and-look step. Advice about taste without those has only screenshot comparisons as evidence.
3. **Nothing existing covers the case.** The closest project is built for technical explainers and loads fonts from a CDN; the best chart guidance ships only inside Claude Code; the rest target landing pages and product UI.

## What already exists

Read from the repositories themselves (shallow clones), not from write-ups.

| Project | Stars | Licence | What it is | Why it does not solve this case |
|---|---|---|---|---|
| [anthropics/skills `frontend-design`](https://github.com/anthropics/skills/tree/main/skills/frontend-design) | 180k (repo) | see repo | Persona and principles; names five clusters of generated-page looks and asks for a plan, a self-review and screenshots | Guidance only; aimed at UI and landing pages; no charts, no assets, no checks |
| [pbakaus/impeccable](https://github.com/pbakaus/impeccable) | 79k | Apache-2.0 | One skill, 24 commands, 59 detector rules that run with no model, edit hooks, a browser extension | Aimed at product UI and websites; heavy; no data visualisation |
| [Leonxlnx/taste-skill](https://github.com/Leonxlnx/taste-skill) | 94k | MIT | 1,200 lines of contextual rules with three "dials" | Its own first line: "Not dashboards, not data tables" |
| [nicobailon/visual-explainer](https://github.com/nicobailon/visual-explainer) | 10k | MIT | Self-contained HTML explainers; four "registers" with fixed token tables; a delivery checklist; hand-drawn SVG diagrams; flow dots; a stepper | Closest in spirit. Built for technical explainers; fonts and libraries from a CDN, so not offline; charts are secondary; diagrams are placed by hand |
| [jdrhyne/agent-skills `elegant-reports`](https://github.com/jdrhyne/agent-skills) | 240 | MIT | Markdown into fixed Nordic templates | PDF through a paid third-party API; one look |
| `dataviz` (bundled with Claude Code 2.1) | n/a | bundled | A chart procedure with a runnable palette validator and an anti-pattern catalogue | Charts only; ships only inside Claude Code; not redistributable as far as I could tell |
| [anthropics/knowledge-work-plugins `data-visualization`](https://github.com/anthropics/knowledge-work-plugins) | 29k (repo) | Apache-2.0 | Chart selection and Python patterns (matplotlib, plotly) | Python images, not HTML reports |
| [antvis/chart-visualization-skills](https://github.com/antvis/chart-visualization-skills) | 506 | MIT | AntV chart, graph and infographic skills, with a 174-case evaluation | Tied to the AntV stack; general purpose |
| [google-labs-code/design.md](https://github.com/google-labs-code/design.md) | 28k | Apache-2.0 | An open format for describing a brand to agents: tokens in front matter, prose for intent; a linter | A format, not a builder. Adopted here as the brand file |
| [VoltAgent/awesome-design-md](https://github.com/VoltAgent/awesome-design-md) | 120k | MIT | DESIGN.md files written from popular brands' sites | Useful input for a brand file |
| [ThariqS/html-effectiveness](https://github.com/ThariqS/html-effectiveness) | 686 | Apache-2.0 | Twenty example files for the essay arguing HTML should replace Markdown as agent output | Examples, including a status and an incident report; no method |
| Claude Design (Anthropic Labs) | n/a | product | A design product that ingests a design system and exports standalone HTML | Research preview; a product, not a team convention. Known here only from third-party coverage |

## What is known to work

Ordered by strength of evidence.

### 1. Charts: perception research

- **Position and length are read more accurately than angle and area**, with colour last (Cleveland and McGill, 1984). [Heer and Bostock (2010)](https://idl.uw.edu/papers/crowdsourcing-graphical-perception) replicated the ranking with crowdsourced participants. This is the basis for: bars and dots before pies; bars from zero; no dual axis.
- **Titles and supporting text carry the message.** [Borkin and others (2015)](https://vcg.seas.harvard.edu/publications/20150101-beyond-memorability-visualization-recognition-and-recall), with eye tracking on 393 visualisations, found readers fixate on titles and that "titles and supporting text should convey the message of a visualization". Basis for: figure titles state the finding.
- **Readers prefer annotated charts.** [Stokes and others (2022)](https://www.tableau.com/research/publications/striking-balance-reader-takeaways-and-preferences-when-integrating-text-and), 302 participants: charts with the most text annotation were preferred over sparser ones. Basis for: direct labels, annotations, and a source note on every figure. (Read from the publisher's summary.)
- Practice agrees: the [FT Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md) picks the form from the relationship, and Datawrapper's defaults label series directly and explain in the title instead of on the axes.

### 2. Diagrams: graph-drawing research

- **Edge crossings matter most.** [Purchase (1997)](https://research.monash.edu/en/publications/which-aesthetic-has-the-greatest-effect-on-human-understanding/): "reducing the number of edge crosses is by far the most important aesthetic, while minimising the number of bends and maximising symmetry have a lesser effect"; fixing nodes to a grid and widening angles had no significant effect. Basis for: the layout spends its effort on ordering to minimise crossings, and the checker reports the count.
- **Arrowheads alone show direction poorly in busy graphs; tapered or animated edges do better** (Holten and van Wijk, 2009; [Holten and others, 2011](https://www.lri.fr/~isenberg/publications/papers/Holten_2011_AEP.pdf)). Read from summaries. Basis for: direction shown three ways (every edge runs with the layout, a small arrowhead, optional moving dots).

### 3. Motion

- **Animation helps only when it matches what it shows and is simple enough to follow.** Tversky, Morrison and Betrancourt (2002) found earlier claims for animation confounded with extra information, and proposed the congruence and apprehension principles. Heer and Robertson (2007) found staged, simple transitions help object tracking. Read from course material that summarises both. Basis for: three kinds of motion only, each tied to meaning; complex changes staged.
- **Moving content that starts on its own and runs past five seconds must be pausable** ([WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)). Basis for: the Pause button on flow dots, and the checker's `loop-without-pause`.

### 4. Rendering the result and looking at it

- An Amazon study of a vision-model critic in the loop reports [up to 17.8% improvement over three refinement cycles](https://cdn.amazon.science/e2/87/68ecc1e04ecc9e2e92bcd5fd3750/scipub-approval152129-45356067-visionguided-iterative-refinement-for-frontend-code-generation.pdf) for front-end generation. Read from the summary; one paper, one benchmark.
- Anthropic's skill says to take screenshots; Impeccable caps the loop at one batched inspection and one confirmation because "open-ended self-QA burns the user's money". Basis for: the checker saves screenshots, and the skill allows two rounds.

### 5. Checks a script can run

No controlled study, but the three strongest projects all arrived here: Impeccable's 59 rules, the bundled `dataviz` palette validator ("the color part is computable, so compute it"), and the DESIGN.md linter's contrast check. Basis for: `check.mjs`, `brand.mjs`, and palettes validated in tests.

### 6. A specific reference, not adjectives

Google's [DESIGN.md philosophy](https://github.com/google-labs-code/design.md/blob/main/PHILOSOPHY.md): "Adjectives describe a region. A specific reference describes a point." Anthropic's ["right altitude"](https://claude.com/blog/improving-frontend-design-through-skills) says the same from the other side. Evidence is paired screenshots. Basis for: each art direction is anchored to one named reference.

### 7. Naming the model's defaults

Anthropic explains the sameness as ["distributional convergence"](https://claude.com/blog/improving-frontend-design-through-skills): a model samples the centre of what it saw. Listing the defaults helps, but the lists go stale and disagree. Anthropic's current skill now lists a cream ground with a serif heading and a clay accent as a tell; visual-explainer prescribes a small label above headings while Impeccable bans exactly that. Basis for: the kit replaces the choices instead of forbidding them; only a short, objective mistakes table is kept.

## What the baseline actually does

Six realistic briefs were run through Claude Code (Opus 5.5) with no skill. All six produced a self-contained report with sensible writing. The failures were consistent:

- system fonts, bordered card grids, small capital labels above headings, callouts with a coloured edge;
- charts and diagrams drawn as SVG by hand, with 8 to 17 labels under 11 px in every report;
- low-contrast text in three of six; body lines over 80 characters in all six; sideways overflow on a phone in one;
- diagram edges drawn straight through other nodes;
- none rendered its own output to look at it.

The skill text answers these, and nothing else. Results with the skill are in `evals/results/`.

## Decisions and the findings behind them

| Decision | Because |
|---|---|
| A skill in the open Agent Skills format | Works in Claude Code, Codex, Cursor and others through [`npx skills`](https://github.com/vercel-labs/skills); a Claude Code plugin; and a zip an Owner uploads once for a whole organisation ([help article](https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization)) |
| A prebuilt kit the agent composes from | Convergence is beaten by taking the default choices away, not by describing better ones |
| Fonts and code embedded in every report | Offline, emailable, no third-party requests; the closest existing project fails this |
| Observable Plot behind house functions | Measured sizes: D3 280 KB plus Plot 209 KB; Chart.js 209 KB; ECharts 1.0 to 1.1 MB; Vega and Vega-Lite 779 KB. Plot's defaults are the best starting point, and the functions make the rules hold by construction. No evidence was found on which library models write most reliably, so the functions hide the library |
| Our own diagram layout | Mermaid is 3.5 MB and hard to restyle; ELK is 1.6 MB; dagre cannot keep a zone's members together when they connect outside it. At twenty nodes an exhaustive ordering search is cheap |
| A checker with no dependencies | Chrome's `--remote-debugging-pipe` gives viewport emulation, console and network capture, screenshots and PDF with nothing to install. Plain `--window-size` cannot go below 500 px wide |
| Content first, kit last, in one file | So a recipient can edit the report again without the kit entering an agent's context |
| A brand file in DESIGN.md format | An open format with a linter that other tools already read |
| Two check rounds at most | Gains concentrate in the first rounds; open loops waste money |

## What was not verified

- Whether a given mail system blocks `.html` attachments. Administrators can block them; the PDF export exists for that case.
- How SharePoint and similar stores serve a raw HTML file.
- Safari and Firefox rendering. The checker drives Chromium only; the kit uses features all three have shipped since 2023 (cascade layers, subgrid, `text-wrap`).
- Which charting library models write most reliably. No source was found.
- The Holten, Tversky and Heer papers were read through summaries, and the Amazon and Stokes results through abstracts or publisher pages.

## Sources

Anthropic: [Improving frontend design through Skills](https://claude.com/blog/improving-frontend-design-through-skills) · [Prompting for frontend aesthetics](https://platform.claude.com/cookbook/coding-prompting-for-frontend-aesthetics) · [Provision and manage skills for your organization](https://support.claude.com/en/articles/13119606-provision-and-manage-skills-for-your-organization)

Projects: [impeccable](https://github.com/pbakaus/impeccable) · [taste-skill](https://github.com/Leonxlnx/taste-skill) · [visual-explainer](https://github.com/nicobailon/visual-explainer) · [agent-skills](https://github.com/jdrhyne/agent-skills) · [anthropics/skills](https://github.com/anthropics/skills) · [knowledge-work-plugins](https://github.com/anthropics/knowledge-work-plugins) · [chart-visualization-skills](https://github.com/antvis/chart-visualization-skills) · [design.md](https://github.com/google-labs-code/design.md) · [awesome-design-md](https://github.com/VoltAgent/awesome-design-md) · [html-effectiveness](https://github.com/ThariqS/html-effectiveness) · [skills CLI](https://github.com/vercel-labs/skills)

Research: [Heer and Bostock 2010](https://idl.uw.edu/papers/crowdsourcing-graphical-perception) · [Borkin and others 2015](https://vcg.seas.harvard.edu/publications/20150101-beyond-memorability-visualization-recognition-and-recall) · [Stokes and others 2022](https://www.tableau.com/research/publications/striking-balance-reader-takeaways-and-preferences-when-integrating-text-and) · [Purchase 1997](https://research.monash.edu/en/publications/which-aesthetic-has-the-greatest-effect-on-human-understanding/) · [Holten and others 2011](https://www.lri.fr/~isenberg/publications/papers/Holten_2011_AEP.pdf) · [Vision-guided iterative refinement (Amazon)](https://cdn.amazon.science/e2/87/68ecc1e04ecc9e2e92bcd5fd3750/scipub-approval152129-45356067-visionguided-iterative-refinement-for-frontend-code-generation.pdf) · [FT Visual Vocabulary](https://github.com/Financial-Times/chart-doctor/blob/main/visual-vocabulary/README.md) · [WCAG 2.2.2](https://www.w3.org/WAI/WCAG22/Understanding/pause-stop-hide)
