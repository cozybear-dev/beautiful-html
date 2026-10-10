# Does the skill make reports better?

Six briefs, each with data that has a real story in it, are run twice through Claude Code: once with nothing installed (`baseline`) and once with the skill installed as a project skill (`skill`). Both arms get the same prompt, the text of `brief.md`. Each run happens in its own temporary folder outside this repository, with user-level settings and plugins left out, so the result does not depend on what else is installed.

```
node evals/make-data.mjs                         # regenerate the synthetic data (deterministic)
node evals/run.mjs --arm baseline --out evals/results/<name>
node evals/run.mjs --arm skill    --out evals/results/<name>
node evals/gallery.mjs evals/results/<name>      # blind side-by-side page, pictures, summary.json
```

`--only 03,06` runs some briefs; `--model` picks the model; `--concurrency` sets how many run at once. A full arm takes about ten minutes and costs about eight US dollars at the time of writing.

## What is measured

- **The checker's findings** on each report, counting only those that apply to any HTML report (overflow, contrast, text size, label collisions, line length, headings, figures without titles, network requests, script errors). Findings that only a beautiful-html report can have, such as a missing kit, are left out so the comparison is like for like.
- **A blind look.** `index.html` shows the two reports for each brief as A and B in a random order. Decide which you would send, then reveal which is which.
- Time and cost per run.

## Results of 10 October 2026

Claude Code 2.1 with Opus 5.5, six briefs.

| Brief | Baseline: errors, warnings | With the skill: errors, warnings | Minutes: baseline, skill |
|---|---|---|---|
| Customer quarterly review | 1, 20 | 0, 0 | 4.0, 3.2 |
| Incident review | 0, 19 | 0, 0 | 6.8, 3.8 |
| Survey results | 0, 10 | 0, 0 | 5.1, 3.9 |
| Experiment readout | 13, 13 | 0, 0 | 4.8, 4.4 |
| Sales pipeline | 6, 18 | 0, 3 | 6.5, 3.8 |
| Security data flows | 1, 18 | 0, 0 | 8.2, 4.5 |
| **All six** | **21, 98** | **0, 3** | **35.4, 23.6** |

Cost was the same for both arms: 7.79 and 7.76 US dollars.

What the baseline got wrong was consistent: text below the minimum size in every report (83 findings), low-contrast text in three, body lines over 80 characters in all six, sideways overflow on a phone in one, and none of the six rendered its own output to look at it. The three remaining warnings with the skill are long paragraphs placed in a comparison block, which the kit sets small.

## What this does and does not show

- It is one run per brief per arm, with one model. It shows the direction and size of the effect, not its variance.
- **Two of the six briefs share their subject with a shipped example**: the customer review with the example now named `quarterly-review`, the incident review with `incident-review`. An agent with the skill had a worked report on the same subject to read. The skill had three examples when these runs were made; it has seven now, and the runs have not been repeated. The other four briefs (survey, experiment, pipeline, data flows) have no such example and are the cleaner test; they went from 20 errors and 59 warnings to 0 and 3.
- The checker measures what can be measured. Whether a report is better designed is a judgement, which is what the blind page is for.
- Reports made with the skill are about 0.7 MB against about 0.04 MB for the baseline, because they embed their fonts and chart code.

`results/2026-10-10/` holds the baseline reports, the content part of each report made with the skill, a picture of each, `summary.json` and the blind page.
