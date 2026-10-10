# Brand

The kit ships brand-neutral. A brand is a small set of token overrides in the report's `<style id="bh-overrides">` block, plus a logo. Nothing else changes: the layout, type scale and figure rules stay.

## Apply a brand colour

Start from the brand's main colour. The tool turns it into a complete colour system for light and dark and checks every part of it:

```
node <skill>/tools/brand.mjs --accent "#0b6e75"
```

Paste what it prints into `<style id="bh-overrides">` in `content.html`. It writes:

- ink, rule and surface greys tinted slightly toward the accent;
- an accent strong enough to draw lines and bars with, and a darker one for text and links;
- a six-colour chart palette that begins with the accent and stays distinct for colour-blind readers;
- a seven-step sequential ramp, a diverging pair and three status colours;
- the same again for the dark scheme, and light colours for print.

Read any `Note:` it prints. If the brand colour is too light to draw with (a yellow, a pale green), it says which darker shade it used and keeps the original for large fills only.

`--ground "#fbfbf9"` sets a page colour other than white. `--check tokens.css` checks a block you wrote by hand.

Do not pick chart colours by eye, and do not add a seventh. If a brand guide lists secondary colours, they belong in illustrations and covers, not in data.

## Logo

Put the logo in the masthead as inline SVG so the file stays self-contained:

```html
<span class="bh-org"><svg viewBox="0 0 120 24" role="img" aria-label="Northwind">…</svg></span>
```

It is shown 20 px high. Use `fill="currentColor"` for a one-colour mark so it follows the scheme. A bitmap logo must be embedded as a `data:` URI; prefer SVG.

## Typefaces

The typefaces are part of each direction and are embedded in its kit, which is why reports work offline. A brand typeface cannot be added from the report: a kit has to be built with it (see "Building a kit" in the repository README). If the brand face is not available, pick the direction whose face sits closest and let colour and logo carry the brand.

## The brand file

`brand/DESIGN.md` describes the brand in the open DESIGN.md format: tokens in the front matter, and prose that says what the brand is like and how to use it. Keep your organisation's version of this file with the skill, so every report starts from it:

1. Replace the colours and names in the front matter.
2. Run `brand.mjs` with the primary colour and keep its output next to the file.
3. Rewrite the prose: one specific reference, what the accent is for, what never to do.

When a report is for a named customer or business unit, read the brand file first. If there are several brands, keep one file per brand and say in the brief which applies.

## What a brand may not change

Type sizes, spacing, the layout grid, figure rules, and the status colours' meaning. A brand that needs those changed needs its own direction, which is a change to the kit, not to a report.
