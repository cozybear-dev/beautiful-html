# Brief and story

## The brief

Write these four lines before any HTML. They decide everything else.

| Line | Question | Example |
|---|---|---|
| Reader | Who reads it, and what do they already know? | Customer's COO; knows the product, not our metrics |
| Takeaway | What one sentence should they remember? | Usage rose 38% after onboarding; two teams lag |
| Decision | What will they decide or do with it? | Approve onboarding for two more teams |
| Sharing | Email, print, screen in a meeting? | Emailed first, then shown in the meeting |

The takeaway becomes the `<title>` and the `<h1>`. Write it as a headline: one sentence of about a dozen words, so it sets in two lines. Detail and the second point go in the standfirst. If you cannot write it, you have not finished the analysis: look at the data again, or ask one question.

## Report shapes

Pick the shape the content has. Drop or merge sections that would be empty.

| Report | Front page | Order of sections |
|---|---|---|
| Performance or business review | Key figures | What changed and why → where it is not working → what we propose |
| Incident or problem review | Byline, or key figures for the impact | What happened → how it unfolded (timeline, diagram) → why → what changes |
| Experiment or analysis readout | The figure that gives the answer | How sure we are → where it differs → recommendation |
| Research or technical note | Cover and byline | How it works (diagram, code) → what was tested → what holds and what is open |
| Assessment, audit or board brief | Findings | The evidence for each → options compared → recommendation |
| System or data-flow overview | The diagram | Each zone or path → risks and controls → open items |
| Proposal | Findings, or a byline | The evidence → options compared → cost, timing, next step |

The first screen answers the reader's question. Do not open with background. The front-page column is the usual choice, not a rule: open with whatever this reader needs first, and see "Front page" in `components.md` for the parts.

## Writing

- **Headings and figure titles state findings.** "Enterprise churn halved after April", not "Churn by segment". If a heading works for any report, rewrite it.
- **One claim per figure.** If a figure makes two points, it is two figures.
- **Every number has a unit and a comparison**: against last period, a target, or another group. "536 users, up from 389 in June."
- **A number earns its place by being a measure.** Do not count sections, steps or findings to have something to show large.
- **Say where data comes from** in each figure's source note, with the period.
- **Short sentences, plain words, active voice.** One term for one thing, the same every time.
- **Be straight about what is bad or unknown.** A report that hides a problem loses the reader on the next page.
- **No template chrome.** No label above every heading, no "01 / 02 / 03" unless order matters, no row of adjectives.

## Making it specific to the subject

The kit fixes type, spacing and colour, so reports are consistent. What makes one report unlike another is the content: which figures you choose, what is highlighted, the order of the argument, and one or two touches from the subject itself:

- the subject's own diagram convention: zones for networks, stages for pipelines, a timeline for incidents;
- the unit and precision its readers use.

If removing a touch makes the report no harder to read and no less about its subject, remove it.
