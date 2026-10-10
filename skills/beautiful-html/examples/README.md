# Examples

Three complete reports, one per art direction. Each is a content file: the part of a report a person or agent writes. Read them for structure and for how figures are called; copy parts, not the whole.

| Example | Direction | What it shows |
|---|---|---|
| `analytical/content.html` | `analytical` | A customer quarterly review: key figures with a sparkline, line charts with a highlight and annotations, ranked bars, a dumbbell, grouped bars, a scatter with a trend, small multiples, a table with inline bars and status, a comparison and a timeline |
| `narrative/content.html` | `narrative` | A retention review read start to end: side notes, numbered figures, a Sankey, a small flow diagram with moving dots, options compared, a method note |
| `presentation/content.html` | `presentation`, dark | An incident review for a meeting: one idea per screen, a split section with a flow diagram and a four-step walkthrough, event notes on a time series |

`preview.png` in each folder is the first screen.

To open one as a report:

```
cat examples/analytical/content.html kit/analytical.kit.html > example.html
```

The examples carry the Hunt & Hackett masthead to show the house look. Their subjects are not Hunt & Hackett work: all names, companies and figures in them are invented.
