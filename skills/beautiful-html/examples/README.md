# Examples

Eight complete reports. Each is a content file: the part of a report a person or agent writes. Read the one closest to the report you are making, for its structure and for how its figures are called; copy parts, not the whole.

| Example | Kind of report | Direction | Front page | What it shows |
|---|---|---|---|---|
| `incident-report/content.html` | An incident report for a customer | `narrative` | A cover and a byline | A diagram that follows the text as it is read (`bh-step`), the incident from start to end on a timeline drawn to scale, intervals by system drawn with `BH.plot`, key figures in a section, log lines in a code block, indicators as terms, a status table, numbered recommendations, a dated plan |
| `incident-debrief/content.html` | The same incident, for a meeting | `presentation`, dark | A title screen | Key figures on a screen of their own, a split screen with the path and a five-step walkthrough, the timeline of the incident, a statement that fills a screen, numbered controls, one decision |
| `threat-landscape/content.html` | A published data story | `analytical`, dark | The figure | A chart in the header in place of a standfirst, small multiples, ranked bars, a heatmap, a scatter with a trend line, a Sankey on a band, a closing statement |
| `service-review/content.html` | A customer's quarterly service review | `analytical` | Key figures and a list of facts | Key figures with a sparkline, a line chart with a highlight and an event note, two figures side by side, stacked bars, a heatmap of hour by weekday, a dumbbell, a table with inline bars and status, a timeline, options compared |
| `network-review/content.html` | A network and data-flow review | `analytical` | The diagram | An eleven-node diagram in four zones with three flagged routes, hover tracing and travelling dots; a table of every flow; an inline waffle; a dumbbell; numbered changes |
| `board-brief/content.html` | A decision brief for a board | `analytical` | Findings in words | Three numbered findings, one before-and-after chart, options compared, one recommendation. Short on purpose |
| `investment-proposal/content.html` | A budget proposal for an executive committee | `presentation`, light | A cover as the title screen | A statement screen, a dumbbell of today against target, a scatter with three points named, stacked bars by year, a dated plan, options and a decision on a band |
| `research-note/content.html` | A technical note that is sent out | `narrative` | A cover and a byline | A flow diagram with zones, a flagged path and a three-step walkthrough; a code block with the lines that matter marked; a quotation; a status table; open claims compared; a method note |

Each front page is that report's choice, not its direction's: any front page works in any direction. The comment above each `<header>` says why it was chosen. Only one of the eight opens on key figures, because only one is a review of measures.

`preview.png` in each folder is the first screen.

A content file is half a report: opened in a browser by itself it shows only a note saying so. To see an example as a report, join it to the kit of its direction and open the result:

```
cat examples/board-brief/content.html kit/analytical.kit.html > example.html
```

In a clone of the repository, `npm run examples` does this for all eight and writes them to `dist/examples/`.

The examples carry the Hunt & Hackett masthead to show the house look. Six of them tell one invented story: Meridian Freight, its incident of September 2026 and what followed. `threat-landscape` is an invented publication. `research-note` summarises a post Hunt & Hackett published and names its authors. Everything else, every name, organisation and figure, is invented.
