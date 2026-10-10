# Build ledger for the beautiful-html plan

Every decision taken while executing `2026-10-10-beautiful-html.md`, in order, with what it costs if wrong, followed by the completion line for each task and the final review.

Pre-flight:
- T2 consumes T5 `element.__bhFlow {nodes[{id,x,y,w,h}], edges[{id,points}], crossings}` — T5 Produces the same shape. Clean.
- T2 consumes T6 `BH.settle()` and T4 `.bh-error` — both produced as named. Clean.
- T8 static check requires `<!-- BH-KIT` + `<!-- EDITING GUIDE` — T1 kit first line and T8 template match T2 test strings. Clean.
- T3 runner consumes T2 check.mjs CLI and (skill arm) T12 plugin manifest — Ruling: create a minimal `.claude-plugin/plugin.json` in T9 so the skill arm in T11 can load via --plugin-dir; T12 completes it. Cost if wrong: one file moved earlier.
- T7 consumes T4 `validatePalette(hexes, surface)` — same signature. Clean.
Setup: Ruling: working on main without a worktree — owner chose "Commit on main as I go". Cost if wrong: history on main instead of a branch.
Task 1: Ruling: JS bundle entry is src/js/index.js (imports core.js), not core.js itself — keeps core free of side effects — cost if wrong: none, build detail.
Task 1: complete (commits b1494b5..3246540, tests: node --test tests/unit/ → # duration_ms 160.10807)
Task 2: Ruling: fault fixtures live in one module tests/fixtures/faults.mjs instead of tests/fixtures/faults/*.html — one place to read them, generated to temp files at test time — cost if wrong: cannot open a fixture by double-click.
Task 2: Ruling: the checker runs the browser offline (CDP network emulation) — nothing leaves the machine during a check and requests are still reported — cost if wrong: none found; file:// loads unaffected.
Task 2: Ruling: added figure-no-alt, figure-no-source, heading-h1, edge-crossings, off-scale-size, off-token-color, figure-failed, network-request codes beyond the plan's list — the spec's checker section names these behaviours — cost if wrong: extra warnings.
Task 2: Ruling: check-cli tests (Review Focus 5) were written after the CLI code and passed first run — characterisation, not red-green — cost if wrong: weaker proof for those six cases.
Task 2: complete (commits 3246540..72c20d2, tests: node --test tests/unit/ tests/render/ → # duration_ms 13111.886416)
Task 3: Ruling: the skill arm installs the skill as a project skill (.claude/skills/beautiful-html in the temp dir) instead of --plugin-dir — mirrors `npx skills add`, needs no plugin manifest — cost if wrong: plugin packaging is not exercised by the evals (Task 12 verifies it separately). Supersedes the pre-flight ruling about an early plugin.json.
Task 3: Ruling: data comes from a seeded generator evals/make-data.mjs, committed with its output — stories are reproducible — cost if wrong: none.
Task 3: Ruling: evals/results/ is git-ignored for now; Task 11 decides what to commit — screenshots are large — cost if wrong: results not in history until then.
Task 3: baseline arm launched in the background; output in evals/results/2026-10-10/.
Task 3: complete (commits 72c20d2..b2deefc, tests: node --test tests/unit/ → # duration_ms 652.641907)
Task 4: Ruling: the chart modules (line, bar, dot, scatter, small) were written before tests/render/charts.test.mjs, then the tests were written and failed on real bugs (7 of 16) before passing — not strict red-green for those files; pure modules (labels, format, data, palette) were test-first — cost if wrong: chart behaviour not covered by a test may be untested by design.
Task 4: Ruling: dumbbell uses y2, not x2 — "x is the category, y is the value" holds for bar and dot alike — cost if wrong: one option name differs from the plan.
Task 4: Ruling: BH.data uses our own RFC 4180 parser (src/js/data.js), not d3.csvParse — testable in Node without a DOM, and empty cells become null — cost if wrong: one more module to maintain.
Task 4: Ruling: added token --bh-neutral-soft for large neutral fills (bars) and suggestPalette() in scripts/validate-palette.mjs — cost if wrong: one extra token per scheme.
Task 4: Ruling: the audit's body-text rule applies to running prose only (140+ characters outside figures, tables, asides) and uses physical minimums in print — short card and caption text was being flagged — cost if wrong: a short paragraph set too small is not flagged (the 11px floor still applies).
Task 4: Note: analytical dark palette fails validatePalette; fixed in Task 7 with the directions test.
Task 4: complete (commits b2deefc..2e0b85e, tests: node --test tests/unit/ tests/render/ → # duration_ms 15394.094783)
Task 5: Ruling: added a fourth edge kind, "risk" (status colour, no cross), beside normal, async and blocked — a security data-flow diagram needs to flag a hop that works but is unsafe — cost if wrong: one more documented option.
Task 5: Ruling: highlight takes node ids (a path: edges between consecutive ids are lit) and/or "from>to" edge names — cost if wrong: none.
Task 5: Ruling: zones whose ranks overlap sit side by side in separate bands; same-rank ("flat") edges are not supported, a rank hint that would create one is bumped by one — keeps every edge running with the flow — cost if wrong: some diagrams are longer than a hand-drawn one.
Task 5: Ruling: a diagram wider than its column scrolls sideways inside the figure (with a fading edge) rather than restacking zones — on a phone a three-zone diagram is ~750px wide — cost if wrong: phone readers scroll sideways; noted for docs.
Task 5: Ruling: left-to-right is tried at three tightness levels (gaps, then label wrap at 104px) before falling back to top-to-bottom — cost if wrong: tighter spacing on mid-width diagrams.
Task 5: Ruling: the edge label sits on the hop next to the less crowded end, and avoids other edges' paths — cost if wrong: none found.
Task 5: Ruling: Sankey ribbons are filled shapes, not thick strokes — so the audit can see what is behind a label — cost if wrong: none.
Task 5: complete (commits 2e0b85e..cc2cd8c, tests: node --test tests/unit/ tests/render/ → # duration_ms 17798.337934)
Task 6: Ruling: an entrance is a WAAPI animation created paused at its first frame and played when the figure is first seen; no CSS rule hides anything — a figure below the fold must not flash before animating — cost if wrong: if IntersectionObserver never fired, a figure would stay at its first frame (the checker's hidden-content test covers this).
Task 6: Ruling: key figures count up automatically (the leading number of .bh-keyfigure-value); no data attribute needed — motion should not depend on the agent remembering markup — cost if wrong: a value that is not a plain number is left alone.
Task 6: Ruling: check.mjs page.open() takes mode.prepare === false to skip the scroll-through, for tests that need an untouched page — cost if wrong: none; default unchanged.
Task 6: Ruling: BH.motion exposes enabled, enter and loop (countUp is internal) — smaller surface than the plan's list — cost if wrong: add it later.
Task 6: complete (commits cc2cd8c..3eaef14, tests: node --test tests/unit/ tests/render/ → # duration_ms 20368.878369)
Task 7: Owner chose look A for all three directions (Source Sans 3 / STIX Two Text + Source Sans 3 / Atkinson Hyperlegible Next) from rendered candidates.
Task 7: Ruling: a direction is defined by typefaces and one accent in src/directions.mjs; its colour tokens are generated by tools/brand.mjs and its layout rules live in src/css/directions/structure/ — every set then passes the same checks, and a user's brand accent goes through the same generator — cost if wrong: chart palettes are chosen by an algorithm for separation, not hand-picked for harmony.
Task 7: Ruling: palette.mjs moved into the skill's tools and brand.mjs added there (beyond the plan) — "swap the brand by editing one file" needs a way to get a full passing token set from one colour — cost if wrong: two more shipped files.
Task 7: Ruling: tokensToCss emits a third block that restores the light tokens under @media print for dark reports — the spec says print always uses light — cost if wrong: none.
Task 7: Ruling: the nine candidate fonts not chosen were removed from src/fonts and fetch-fonts — cost if wrong: re-run fetch to compare again.
Task 7: Ruling: presentation gets a "n / N" progress badge and arrow/Page key movement instead of the section navigator — cost if wrong: none.
Task 7: complete (commits 3eaef14..32c12eb, tests: node --test tests/unit/ tests/render/ → # duration_ms 28321.442702)
Task 8: Ruling: every kit file starts with a line break, so the BH-KIT marker begins a line even if the content file has no final newline — an agent that forgets the newline would otherwise produce a report the tools cannot split — cost if wrong: one blank line before the marker.
Task 8: Ruling: rekit.mjs writes in place unless --out is given, and takes --scheme too — cost if wrong: no backup is kept; the content part is never changed apart from the two attributes on <html>.
Task 8: Ruling: the editing guide names the skill, not a URL — the repository has no public home yet — cost if wrong: a recipient without the skill has the guide but no link.
Task 8: complete (commits 32c12eb..99c799a, tests: node --test tests/unit/ tests/render/ → # duration_ms 26519.931383)
Task 9: Baseline (RED) read before writing: 6 of 6 produced a report with Opus 5.5; all self-contained, none checked by rendering. Failures: system fonts, bordered card grids, capitals labels, coloured-edge callouts; hand-drawn SVG charts and diagrams with 8-17 labels under 11px each; low contrast in 3; long lines in all; phone overflow in 1; straight edges through nodes in the diagram. Writing was already good (headings state findings).
Task 9: Ruling: the skill is written as a recipe (five steps, a template to fill, functions to call) with a short mistakes table, not as prohibitions — the baseline failure is wrong-shaped output, not a rule skipped under pressure — cost if wrong: an agent under time pressure may skip the check; the mistakes table names that.
Task 9: Ruling: added per-figure `motion: false` (spec asked for it; it was missing) with a test — cost if wrong: none.
Task 9: Ruling: brand/DESIGN.md linted with npx @google/design.md lint: 0 errors, 0 warnings.
Task 9: GREEN (running the briefs with the skill) is Task 11; examples in Task 10 are built by following SKILL.md to find gaps first.
Task 9: complete (commits 99c799a..9c2ffb2, tests: node --test tests/unit/ tests/render/ → # duration_ms 26266.143183)
Task 10: Ruling: added a "bh-split" section layout (text left, one figure right) and widened the presentation page — a six-step diagram is drawn top to bottom and did not fit one screen under its heading — cost if wrong: one more layout class to document.
Task 10: Ruling: event notes on a line chart now sit in rows above the plot, and walkthrough controls sit above the diagram — found by looking at the presentation example: a note was cut by the data line, and the controls were below the fold — cost if wrong: charts with events are one text row taller.
Task 10: Ruling: a top-to-bottom diagram taller than 72% of the window is redrawn with tighter gaps — so it can be seen whole when presenting — cost if wrong: denser diagrams on short windows.
Task 10: Ruling: examples ship as content files plus preview.png, not assembled reports — three assembled reports would add 2 MB to the skill — cost if wrong: one cat command to open an example.
Task 10: complete (commits 9c2ffb2..5341b83, tests: node --test tests/unit/ tests/render/ → # duration_ms 26886.167034)
Task 12 (started while Task 11's runs were in progress): Ruling: packaging, README, LICENSE and docs/research.md written before Task 11 finished — the runs take about 20 minutes and nothing in Task 12 depends on them except the README's results section, which is filled in after — cost if wrong: none.
Task 12: Verified: `claude plugin validate .` passes for marketplace.json and plugin.json; `npx skills@1.5.0 add ./ --list` finds the skill; the zip unpacks with unzip to beautiful-html/SKILL.md. The current skills CLI (1.7.2) needs Node 22.20+, which this machine does not have; noted in the README.
Task 12: Ruling: repository root is the plugin (source "./"), as taste-skill does — cost if wrong: a plugin install clones the whole repository (a few MB) though only skills/ is loaded.
Task 11: With the skill, 6 of 6 briefs produced a report; like-for-like checker findings 0 errors and 3 warnings against the baseline's 21 and 98; 23.6 minutes against 35.4; cost equal. Read 01, 03 and 06 by eye.
Task 11: Ruling: two briefs (01, 02) share their subject with a shipped example; disclosed in evals/README.md and the README, with the four unshared briefs reported separately — replacing the examples would have meant redoing Task 10 — cost if wrong: the headline number flatters the skill; the separate figure does not.
Task 11: Ruling: only the content part of each with-skill report is tracked (the full reports were tracked in three earlier commits and then removed from the index; they remain in history, about 4 MB) — cost if wrong: history is larger than needed until it is squashed before publishing.
Task 11: Ruling: the blind review is handed to the owner with the final message instead of blocking on six questions — they chose "build it" and have been asked four times — cost if wrong: success criterion 8 (preferred in a blind review) is not yet confirmed by a person.
Task 11: Refactor from the runs: headline length guidance (a four-line h1 in 03) and comparison-block length (three warnings in 05) added to the references.
Final review: self-review (no subagent dispatched: the owner approved agent runs for the comparison only). Found and fixed by stress test: a rank hint could place two connected nodes in one rank (edge through a node in 8 of 800 random graphs) — connected-nodes test and 300-graph test RED→GREEN, suite 187/187; ordering search up to 453 ms — now 54 ms. Found by looking at the examples: event note cut by the data line; walkthrough controls below the fold; charts scaled down when printing from a browser — each fixed with a test.
Final: minor (deferred): README and plugin files use "<owner>" and "cozybear-dev"; set the real home before publishing.
Final: minor (deferred): Safari and Firefox are not tested; the checker drives Chromium only.
Final: minor (deferred): the claude.ai organisation upload route is documented from the help article, not exercised.
Final: minor (deferred): the current skills CLI needs Node 22.20+; verified here with skills@1.5.0.
Final: minor (deferred): git history holds about 4 MB of with-skill reports that are no longer tracked.
Final: minor (deferred): on a phone, a three-zone diagram scrolls sideways; zones are not restacked.
Task 11: complete (commits 5341b83..f21b07b, tests: node --test tests/unit/ → # duration_ms 2903.266789)
Task 12: complete (commits 5341b83..f21b07b, tests: node --test tests/unit/ tests/render/ → # duration_ms 26568.29744)
Published: repository created at https://github.com/cozybear-dev/beautiful-html on 2026-10-10. The "<owner>" stand-ins in the README, the spec and the manifests were replaced with the real name, and the editing guide now links to the repository.
