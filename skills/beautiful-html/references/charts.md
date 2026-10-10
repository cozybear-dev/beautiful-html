# Charts

## Pick the form from the question

| The reader asks | Use | Not |
|---|---|---|
| How did it change over time? | `BH.line` | Bars for more than about 12 periods |
| Which is biggest? How do they rank? | `BH.bar` (horizontal, sorted) | A pie |
| What changed between two points? | `BH.dot` with `y2` | Two bars per row |
| How do the parts add up? | `BH.bar` with `mode: 'stacked'` | A pie; more than 5 parts |
| Do these two things move together? | `BH.scatter` | Two lines on two axes |
| How does the same pattern differ by group? | `facet` (small multiples) | Seven lines on one chart |
| What share is it? | `BH.waffle`, or just the number | A gauge |
| Where does volume go between stages? | `BH.sankey` (see `diagrams.md`) | Stacked bars |
| One number? | A key figure, perhaps with `BH.spark` | A chart |

If the reader needs exact values, or to look up one row, use a table.

## Data

Paste data as CSV; never retype numbers into JavaScript.

```html
<script type="text/csv" id="d-churn">
month,segment,churn
2026-01,Enterprise,2.1
2026-01,Mid-market,2.8
</script>
```

`BH.data('#d-churn')` returns rows as objects. Numbers become numbers; `2026-01` and `2026-01-15` become dates; `14:06` becomes a time; an empty cell is missing, never zero. Data is "long": one row per observation, with a column that names the series. Aggregate before embedding: a chart needs tens or hundreds of rows, not the raw export.

## Options shared by every chart

| Option | Meaning |
|---|---|
| `data` | Array of row objects |
| `x`, `y` | Column names: `x` is the category or date, `y` is the value |
| `series` | Column that splits rows into series |
| `highlight` | Series (or, in a single-series bar or dot chart, categories) to draw in colour; the rest are neutral. A name, a list, or a function |
| `unit` | `'%'`, `'€'`, `'ms'`, `'users'`: shown on the top axis label and in value labels |
| `facet` | Column to split into small multiples that share one scale |
| `contextLabel` | Legend text for the neutral series; default "Others" |
| `height` | Pixels; leave it out unless the default is wrong |
| `motion: false` | No entrance animation for this figure |

Without `highlight`, up to six series are coloured. Seven or more is refused: highlight the ones that matter, or use `facet`.

## `BH.line`

```js
BH.line('#fig-churn', { data, x: 'month', y: 'churn', series: 'segment', unit: '%',
  highlight: 'Enterprise', contextLabel: 'Other segments',
  annotations: [{ x: '2026-04', series: 'Enterprise', text: 'Pricing change' }] });
```

- Highlighted series are labelled at their last point with name and value. A legend replaces the labels on narrow screens.
- `annotations`: `{ x, text }` plus `series` (or `y`) marks a point; `{ x, text, event: true }` draws a vertical line for an event. In a single-series chart `{ x, text }` marks the point. One or two per chart.
- The value axis starts at zero when the data is near it. `zero: true` forces it; `yDomain: [lo, hi]` sets it.

## `BH.bar`

```js
BH.bar('#fig-teams', { data, x: 'team', y: 'share', unit: '%', highlight: ['Warehouse Ops', 'Finance'] });
BH.bar('#fig-tickets', { data, x: 'quarter', y: 'tickets', series: 'kind', mode: 'grouped' });
```

- Categories give horizontal bars sorted by value, labelled at the bar end. Dates or periods give vertical bars. `layout: 'horizontal' | 'vertical'` overrides.
- `sort: 'none'` keeps the data's order (use it when the order means something, such as age bands or stages).
- `mode: 'grouped'` (default with `series`) or `'stacked'`. `limit: 10` keeps the top ten.
- Bars always start at zero.

## `BH.dot`

```js
BH.dot('#fig-adoption', { data, x: 'team', y: 'march', y2: 'september', unit: '%', names: { y: 'March', y2: 'September' } });
```

One row per category. With `y2` each row is a dumbbell from the first value (open ring) to the second (filled dot); `names` labels the two in the legend. Without `y2` it is a dot plot; `stem: true` adds a line from zero. With `series`, several dots share a row.

## `BH.scatter`

```js
BH.scatter('#fig-support', { data, x: 'first_response_hours', y: 'csat', label: 'month', trend: true,
  xLabel: 'Median first response', xUnit: 'h', yLabel: 'Satisfaction', unit: '%', highlight: ['Sep 2026'] });
```

`label` names the points; with `highlight` only those are labelled. `trend: true` adds a fitted line. `size` takes a column for bubble area. Always give `xLabel` and `yLabel` in words.

## `BH.spark` and `BH.waffle`

```js
BH.spark('#spark-users', { values: [304, 310, 331, 412, 470, 536] });   // or { data, y: 'active_users' }
BH.waffle('#share', { value: 38, total: 100 });
```

Both draw into an inline `<span>`. A sparkline shows shape only, so put the number beside it.

## `BH.plot`: anything else

```js
BH.plot('#fig-hist', { height: 260, marks: [
  Plot.rectY(rows, Plot.binX({ y: 'count' }, { x: 'days', fill: 'var(--bh-accent)' })),
  Plot.ruleY([0], { stroke: 'var(--bh-ink)' }) ] });
```

Takes an Observable Plot specification and applies the kit's type and palette. Use tokens for colour (`var(--bh-accent)`, `var(--bh-neutral)`, `var(--bh-cat-1)` to `var(--bh-cat-6)`, `var(--bh-seq-1)` to `var(--bh-seq-7)`). Use it for histograms, heatmaps and box plots; for the forms above, the dedicated function is better.

## Rules the kit enforces, and why

| Rule | Reason |
|---|---|
| Bars start at zero | Bar length is the value; a cut axis lies |
| One value axis; no dual axis | Two scales invent a relationship. Use two charts or `BH.scatter` |
| No pie or donut | Angles are read less accurately than lengths |
| At most six coloured series | Beyond that, hues cannot be told apart, least of all by colour-blind readers |
| Direct labels before a legend | The eye should not travel to a key and back |
| Palettes are fixed tokens | They are checked for contrast and for colour-vision deficiencies |

## Before you move on

- Does the title state what the chart shows? Would a reader who saw only the title get the point?
- Is one thing highlighted?
- Are the unit and the period in the subtitle, and the source in the note?
- Would a table or a single number say it better?
