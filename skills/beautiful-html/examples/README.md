# Examples

Seven complete reports. Each is a content file: the part of a report a person or agent writes. Read the one closest to the report you are making, for its structure and for how its figures are called; copy parts, not the whole.

| Example | Kind of report | Direction | Front page | What it shows |
|---|---|---|---|---|
| `research-note/content.html` | A technical note that is sent out | `narrative` | A cover and a byline | A flow diagram with zones, a flagged path and a three-step walkthrough; a code block with the lines that matter marked; a quotation; a status table; open claims compared; a method note |
| `board-brief/content.html` | An assessment for a board | `analytical` | Findings in words | Three numbered findings, a before-and-after chart, options compared, one recommendation. Short on purpose |
| `threat-landscape/content.html` | A trend, told with data | `analytical` | The figure | A chart in the header in place of a standfirst, an event note, small multiples on one scale, a Sankey, a closing statement on a band |
| `quarterly-review/content.html` | A customer's quarterly review | `analytical` | Key figures and a list of facts | Key figures with a sparkline, line charts with a highlight and annotations, ranked bars, a dumbbell, grouped bars, a scatter with a trend, small multiples, a table with inline bars and status, a comparison and a timeline |
| `retention-review/content.html` | An argument with a recommendation | `narrative` | A cover and a byline | Side notes, numbered figures, a Sankey, a small flow diagram with moving dots, options compared, a method note |
| `attack-path/content.html` | An incident debrief for a meeting | `presentation`, dark | A title screen | A split screen with an attack path across four network zones and a five-step walkthrough, one highlighted bar, numbered controls to close |
| `incident-review/content.html` | An outage review for a meeting | `presentation`, dark | A title screen | The impact in key figures on a screen of its own, a split section with a flow diagram and a four-step walkthrough, event notes on a time series |

Each front page is that report's choice, not its direction's: any front page works in any direction. The comment above each `<header>` says why it was chosen. Only one of the seven opens on key figures, because only one is about measures.

`preview.png` in each folder is the first screen.

A content file is half a report: opened in a browser by itself it shows only a note saying so. To see an example as a report, join it to the kit of its direction and open the result:

```
cat examples/board-brief/content.html kit/analytical.kit.html > example.html
```

In a clone of the repository, `npm run examples` does this for all seven and writes them to `dist/examples/`.

The examples carry the Hunt & Hackett masthead to show the house look. `research-note` summarises a post Hunt & Hackett published and names its authors. The subjects of the other six are not Hunt & Hackett work: all names, companies and figures in them are invented.
