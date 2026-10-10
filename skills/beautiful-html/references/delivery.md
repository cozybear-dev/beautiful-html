# Assemble, check, deliver

## Assemble

A report is your content file followed by a kit file.

| Shell | Command |
|---|---|
| macOS, Linux, Git Bash, WSL | `cat content.html <skill>/kit/analytical.kit.html > report.html` |
| Windows cmd | `copy /b content.html+<skill>\kit\analytical.kit.html report.html` |
| PowerShell | `cmd /c copy /b content.html+<skill>\kit\analytical.kit.html report.html` |

Use the kit that matches `data-bh-direction` in your content file. Keep `content.html` until the report is delivered; assembling again takes a second.

## Check

```
node <skill>/tools/check.mjs report.html            # findings + screenshots in report.check/
node <skill>/tools/check.mjs report.html --pdf      # also writes report.pdf
```

It opens the report in a Chrome, Edge, Chromium or Brave already on the machine, offline, at desktop and phone widths, in print and with reduced motion. Exit code 0 is clean, 1 means errors, 2 means it could not run. If it cannot find a browser, set `BH_BROWSER` to the browser's path.

**Errors must be fixed. Warnings must be read**, and fixed unless you can say why not.

| Finding | Usual cause | Fix |
|---|---|---|
| `network-reference`, `network-request` | A CDN link, remote image or fetch | Embed it or remove it |
| `figure-failed` | A wrong column name or invalid options | The figure shows the reason |
| `console-error` | A mistake in your figure script | Read the message; fix the script |
| `horizontal-overflow` | A wide table, a long unbroken string | Put tables in `bh-table-wrap`; shorten the string |
| `low-contrast` | A colour you set yourself | Use ink tokens |
| `label-overlap` | Too many labels in a chart | Highlight fewer series, shorten labels, or use `facet` |
| `small-text`, `off-scale-size`, `off-token-color` | A size or colour set by hand | Remove it; use the kit's classes |
| `long-lines` | Body text placed in a wide container | Keep text in the text column |
| `figure-no-title`, `figure-no-source` | A missing title or source note | Add them |
| `heading-skip`, `heading-h1` | Heading levels out of order | One `<h1>`, then `<h2>`, then `<h3>` |
| `edge-crossings` | A busy diagram | See `diagrams.md` |
| `missing-kit`, `missing-guide` | The file was rewritten or cut | Assemble again from `content.html` |
| `template-text` | A `{{PLACEHOLDER}}` left in | Fill it in or delete that part |
| `size-warning` | Embedded images or raw data | Compress images; embed aggregated data |

Then **look at the screenshots** in `report.check/`: `desktop-01.png` onward, `phone-01.png` onward, and `print-01.png`. The checker measures; it cannot judge. Look for a first screen that does not answer the question, a figure that makes its point weakly, awkward breaks, and anything that looks crowded or empty.

Fix everything in one pass, assemble, check once more, deliver. If something still remains after the second round, deliver and say what it is.

### Without Node

1. Take a screenshot with the browser itself:
   `"<path to chrome or msedge>" --headless=new --screenshot=report.png --window-size=1440,3000 "file:///<absolute path>/report.html"`
2. Look at it, and at a second one with `--window-size=500,3000`.
3. Go through this list by hand: no remote resources; every figure drew and has a title, unit and source; no text smaller than the kit sets; nothing runs off the right edge at the narrow width; headings in order; one highlighted thing per figure.

## Deliver

| How it is shared | What to send | Note |
|---|---|---|
| Email | `report.html`, about 0.7 to 1 MB | Some mail systems block `.html` attachments. If so, send `report.pdf` or a link to the file on a shared drive |
| Print or PDF | `report.pdf` from `--pdf` | A4 by default; `--paper letter` for US Letter. Print uses the light scheme; motion and controls are removed |
| On a screen | `report.html` in a browser, full screen | `presentation` direction; arrow keys move between sections and step through diagram walkthroughs |
| Shared drive or intranet | `report.html` | It needs no server and no other files |

Tell the reader, in one line, that the file opens in any browser, works offline, and that the data behind each chart is under "Show the data".

**Everything embedded travels with the file.** Data in a `text/csv` block is readable by anyone who opens the source, even if no chart shows it. Embed only what the reader may see, aggregated to the level the report uses.

## Editing a report later

The report is its own source; `content.html` is not needed.

1. Find where the kit starts: `grep -n "BH-KIT" report.html`. Read only the lines above that number.
2. Make targeted edits to text, CSV data or figure calls. Never write the whole file again: the kit would be lost.
3. Run the check.

To change the direction or scheme, or to update an old report to the current kit:

```
node <skill>/tools/rekit.mjs report.html --direction narrative
node <skill>/tools/rekit.mjs report.html --direction presentation --scheme dark --out report-screen.html
```

Without Node, on macOS or Linux: `n=$(grep -n '^<!-- BH-KIT' report.html | cut -d: -f1); head -n $((n-1)) report.html > content.html`, then assemble with the kit you want.

A recipient who does not have this skill can still edit the file: the comment at its top tells their agent where to edit and what to leave alone.
