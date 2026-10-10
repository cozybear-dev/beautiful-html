# Motion

The kit moves things for three reasons only. You get all of it by using the kit; you do not write animation.

| Kind | What moves | When |
|---|---|---|
| Entrance | The header settles in. Each figure animates once as it scrolls into view: lines draw, bars grow from the baseline, key figures count up, diagram edges draw in the order of the flow | Once |
| Flow | Dots travel along a diagram's edges, showing direction; more dots where more flows | While the diagram is on screen, with a Pause button |
| Response | Pointing at a diagram node lights what feeds it and what it feeds; a walkthrough moves step by step | When the reader acts |

## What you control

| To | Do |
|---|---|
| Show direction of flow on a diagram | `flow: true` in `BH.flow`; give edges a `volume` to show relative amounts |
| Walk the reader through a diagram | `steps: [{ title, text, nodes, edges }]` in `BH.flow` |
| Make one figure static | `motion: false` in that figure's options |
| Make the whole report static | `data-bh-motion="off"` on `<html>` |
| Present a walkthrough yourself | The returned object has `step(n)`, `play()` and `pause()` |

## What is guaranteed

- A reader who asks for reduced motion gets the final state of every figure, with nothing moving. Walkthroughs still work, because the reader starts them.
- Print and PDF show the final state.
- Nothing is hidden waiting for a script. With scripts off, all text and tables are visible.
- Anything that loops has a Pause button and stops when off screen.

The checker tests each of these. If it reports `motion-under-reduced`, `hidden-content` or `loop-without-pause`, something you added is animating outside the kit: remove it.

## Do not add

Parallax, scroll-jacking, hover effects on every block, decorative loops, bounce, fade-in on every paragraph. Motion that does not show entrance, flow or a response to the reader makes a report look generated and slows the reader down.
