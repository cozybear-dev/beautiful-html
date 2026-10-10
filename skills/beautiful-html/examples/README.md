# Examples

Three complete reports, one per art direction. Each is a content file: the part of a report a person or agent writes. Read them for structure and for how figures are called; copy parts, not the whole.

| Example | Direction | Front page | What it shows |
|---|---|---|---|
| `analytical/content.html` | `analytical` | Key figures and a list of facts | A customer quarterly review: key figures with a sparkline, line charts with a highlight and annotations, ranked bars, a dumbbell, grouped bars, a scatter with a trend, small multiples, a table with inline bars and status, a comparison and a timeline |
| `narrative/content.html` | `narrative` | A cover and a byline | A retention review read start to end: side notes, numbered figures, a Sankey, a small flow diagram with moving dots, options compared, a method note |
| `presentation/content.html` | `presentation`, dark | A title screen | An incident review for a meeting: one idea per screen, the impact in key figures on a screen of its own, a split section with a flow diagram and a four-step walkthrough, event notes on a time series |

Each front page is that report's choice, not its direction's: any front page works in any direction. The comment above each `<header>` says why it was chosen.

`preview.png` in each folder is the first screen.

To open one as a report:

```
cat examples/analytical/content.html kit/analytical.kit.html > example.html
```

The examples carry the Hunt & Hackett masthead to show the house look. Their subjects are not Hunt & Hackett work: all names, companies and figures in them are invented.
