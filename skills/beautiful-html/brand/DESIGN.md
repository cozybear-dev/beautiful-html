---
version: alpha
name: Neutral
description: The brand-neutral default for beautiful-html reports. Replace this file with your organisation's brand.
colors:
  primary: "#2347d9"
  ink: "#13161d"
  ink-muted: "#4b505a"
  surface: "#f1f3f8"
  ground: "#ffffff"
  good: "#14733f"
  warning: "#8f5600"
  critical: "#bd2f25"
typography:
  display:
    fontFamily: Source Sans 3
    fontWeight: 600
  body:
    fontFamily: Source Sans 3
    fontSize: 1.0625rem
    lineHeight: 1.55
  data:
    fontFamily: Source Sans 3
    fontSize: 0.75rem
rounded:
  sm: 2px
  md: 6px
spacing:
  sm: 8px
  md: 16px
  lg: 32px
---

## Overview

The financial review pages of a well-set annual report: confident, plain and exact. White paper, near-black ink, thin rules that mark where one part ends and the next begins, and one blue used only to point at what matters. The reader came for the numbers and the argument; nothing competes with them.

This is a placeholder. To make it yours, change the colours above, run `node tools/brand.mjs --accent "<your primary colour>"`, keep its output with this file, and rewrite this prose around one specific reference for your brand.

## Colors

One accent, used sparingly.

- **Primary** {colors.primary} marks the one series, bar or path a figure is about, plus links and the rule above a recommendation. It covers less than a tenth of any page.
- **Ink** {colors.ink} carries all text and the rules that open sections.
- **Ink muted** {colors.ink-muted} is for subtitles, notes and axis labels.
- **Surface** {colors.surface} tints a callout and the zones of a diagram.
- **Good, warning, critical** mean status and nothing else, and always appear with a shape and a word.

Chart colours are generated from the primary colour and checked for colour-vision deficiencies. They are not chosen by hand.

## Typography

One family. Headings are semibold and tight; big figures are light; data labels are small with digits that line up. Sizes come from a fixed scale with a clear jump from text to headings.

## Layout

A reading column of about seventy characters, a side column for notes and definitions, and figures that span both. Everything starts on the same left edge. Space separates; rules mark a new section; there are no cards and no shadows.

## Do's and Don'ts

- Do state the finding in every heading and figure title.
- Do highlight one thing per figure.
- Don't use the primary colour for decoration, backgrounds or more than one series.
- Don't add gradients, shadows, rounded cards, icons as bullets, or labels in capitals above headings.
- Don't set a size, colour or gap that is not in the kit.
