# Art directions

A direction is a layout of the one Hunt & Hackett look: its own type scale and layout rules, with the same typefaces, colours and logo. It is carried by the kit file you assemble with, so the same `content.html` can be produced in any direction.

| | `analytical` | `narrative` | `presentation` |
|---|---|---|---|
| Use for | Metrics, reviews, operational reports | Findings read start to end, often for customers | Shown on a screen in a meeting |
| Reference | Review pages of an annual report | A Hunt & Hackett research post | An investor-day screen |
| Standfirst | Light | Italic | Light |
| Body size | 18 px | 18 px | 20 px |
| Layout | Text column plus a side column for notes | Narrower reading column; figures numbered "Figure 1" | Each section fills the screen |
| Navigation | Sticky section list (4+ sections) | Sticky section list (4+ sections) | "3 / 7" badge; arrow and Page keys move between sections |
| Scheme | `light` | `light` | `dark` for a dim room, `light` for a bright one |

## Choosing

- Mostly numbers and charts, scanned for the figures: `analytical`.
- An argument with evidence, read in order: `narrative`.
- Presented live, one point at a time: `presentation`. Write less text per section; each should fit one screen at 1280 by 720.

A direction sets how the page is laid out, not how the report opens: the front page is chosen separately, from the content (see `components.md`).

If a report is emailed first and then presented, write it in `analytical` or `narrative` and produce a `presentation` copy with `tools/rekit.mjs`.

## Setting it

On `<html>` in the content file:

```html
<html lang="en" data-bh-direction="analytical" data-scheme="light">
```

- `data-bh-direction` records the direction; the kit file you assemble with is what applies it.
- `data-scheme` is `light` or `dark`. It never follows the reader's system setting, so they see what you checked. Print always uses light.
- `lang` sets number and date formats: `en-GB` writes "5 Mar", `en` writes "Mar 5".
- `data-bh-motion="off"` makes the report static.

## Switching

```
node <skill>/tools/rekit.mjs report.html --direction presentation --scheme dark --out report-screen.html
```

The content is kept as it is. Run the check on the new file: a longer line or a larger type size can change what fits.

## What you may not change

The type scale, spacing scale and layout grid belong to the direction. A report that needs a different look gets a different direction, not local overrides. The typefaces, colours and logo are the same in all three: see `brand.md`.
