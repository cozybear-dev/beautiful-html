---
version: alpha
name: Hunt & Hackett
description: The Hunt & Hackett look for reports, taken from huntandhackett.com. It is built into the kits, logo included, so a report needs no overrides.
colors:
  primary: "#fcaf15"
  primary-drawn: "#bd8100"
  base: "#080630"
  secondary: "#4866a0"
  ink: "#080630"
  ink-muted: "#4d4f5a"
  surface: "#f2f3f8"
  ground: "#ffffff"
  dark: "#1a192f"
  gray: "#8d8d94"
  good: "#14733f"
  warning: "#8f5600"
  critical: "#bd2f25"
typography:
  display:
    fontFamily: Playfair Display
    fontWeight: 400
  body:
    fontFamily: Lato
    fontSize: 1.125rem
    lineHeight: 1.65
  data:
    fontFamily: Lato
    fontSize: 0.75rem
rounded:
  sm: 0px
  md: 0px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
---

## Overview

A Hunt & Hackett research post, set as a report: a regular-weight Playfair Display headline, Lato text in deep navy on white, square corners, and amber as the one colour that points. The dark scheme is the site's hero: the same headline on navy {colors.base} with the amber at full strength. It should read as a security firm that writes carefully, not as a dashboard.

The kits already carry these colours, the typefaces and the logo. Do not paste token overrides into a report; leave `<style id="bh-overrides">` empty. The tokens were generated with `node tools/brand.mjs --accent "#fcaf15" --base "#080630"`.

## Colors

One accent, used sparingly, on navy ink.

- **Primary** {colors.primary} is the brand amber. It is too light to draw with on white, so on a light page lines, bars, links and rules use the darker {colors.primary-drawn}; on the navy dark scheme the amber is used as it is. It marks the one series, bar or path a figure is about and covers less than a tenth of any page. At full strength it appears in two fixed places only: the logo's ampersand and the rule under the masthead.
- **Base** {colors.base} is the navy. It is the ink of the light scheme, the page of the dark scheme, and the band of a cover (`bh-cover`), where the site's own hero is navy with a white headline.
- **Ink muted** {colors.ink-muted} is for subtitles, notes and axis labels.
- **Surface** {colors.surface} tints a callout, a block of code, the zones of a diagram, and the band of a section set apart (`bh-band`).
- **Secondary** {colors.secondary}, the site's steel blue, belongs to illustrations and covers. It is not a data colour.
- **Good, warning, critical** mean status and nothing else, and always appear with a shape and a word. The site's own status colours ({colors.good} aside) are too light for text on white, so the kit's checked ones are used.

Chart colours are generated from the amber and checked for colour-vision deficiencies. They are not chosen by hand.

## Typography

Two families, as on the site. Headings and big figures are Playfair Display at regular weight: size does the work, never bold. Text, labels and data are Lato: regular for reading, bold for emphasis, and light for the standfirst and lead paragraphs, as in the site's intros. Figures are lining everywhere, so a number in a headline matches the same number in a key figure. Body text is 18 px on a 1.65 line.

## Logo

The two-line wordmark with the amber ampersand, as on the site. It is `brand/logo.svg`, built into every kit, and goes once at the left of the masthead through the template's `<span class="bh-logo">Hunt &amp; Hackett</span>`, 48 px high, over a rule in the brand amber. The wordmark is navy on white and white on navy; the ampersand is always {colors.primary}.

## Layout

A reading column of about seventy characters, a side column for notes and definitions, and figures that span both. Everything starts on the same left edge. Space separates; rules mark a new section; corners are square; there are no cards and no shadows. The front page is not fixed: after the headline it holds what the report needs, which may be a byline, findings in words, one figure, or key figures. A page of numbers is right for a review of measures and wrong for most other things.

## Do's and Don'ts

- Do state the finding in every heading and figure title.
- Do highlight one thing per figure, in amber.
- Do use `data-scheme="dark"` when a report is shown on a screen; it is the navy the site opens with.
- Do keep the template's logo line in the masthead; the logo goes nowhere else.
- Don't set headings in bold or in capitals.
- Don't redraw, recolour or resize the logo.
- Don't use amber for body text, backgrounds or more than one series.
- Don't add gradients, shadows, rounded corners, icons as bullets, or the site's organic blob shapes.
- Don't set a size, colour or gap that is not in the kit.
