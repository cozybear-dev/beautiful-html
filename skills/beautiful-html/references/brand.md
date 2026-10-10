# Brand

The kit is Hunt & Hackett's. Its colours, typefaces and logo are built in, so a report needs nothing added to be on brand. `brand/DESIGN.md` describes the look and what it is for; read it once before writing.

## What is built in

- **Navy ink** on white, and the same navy as the page in the dark scheme.
- **Amber as the one accent.** On white it is drawn in a darker shade so lines, bars and links stay legible; on navy it is the brand amber itself.
- **Playfair Display** for headings and big figures, **Lato** for text and data.
- **Square corners**, thin rules, no cards and no shadows.
- **The logo** at the left of the masthead, over a rule in the brand amber.

Leave `<style id="bh-overrides">` empty. Do not paste colour tokens into a report.

## Logo

The template's masthead already asks for the logo; keep that line:

```html
<span class="bh-org"><span class="bh-logo">Hunt &amp; Hackett</span></span>
```

The kit swaps the name for the logo and uses the name as its label. It is shown 48 px high; the wordmark takes the ink of the scheme and the ampersand stays amber. Do not paste the logo's paths into a report, and do not put it anywhere else.

A report written for a customer is still a Hunt & Hackett report: the masthead stays as it is, and the customer is named under "Prepared for".

## Colour in figures

Chart colours come from the kit: a six-colour palette that begins with the accent and stays distinct for colour-blind readers, a seven-step sequential ramp, a diverging pair and three status colours. Do not pick chart colours by eye, and do not add a seventh. The site's steel blue belongs to illustrations and covers, not to data.

## What a report may not change

Typefaces, type sizes, spacing, the layout grid, figure rules, and what the status colours mean. A report that needs a different shape gets a different direction (see `directions.md`), not local overrides.

## Changing the brand itself

This is a change to the kit, made in the repository, not in a report:

- **Colours** are generated, never typed: `node <skill>/tools/brand.mjs --accent "#fcaf15" --base "#080630"` prints the complete token set for light, dark and print, and checks every part of it. `--base` is the brand's dark colour: the ink of the light scheme and the page of the dark one. `--check tokens.css` checks a block written by hand.
- **Typefaces and the logo** are embedded when the kits are built. See "Building a kit" in the repository README.
