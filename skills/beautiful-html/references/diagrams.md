# Diagrams: how things connect and what flows where

Use a diagram when the point is the **path**: which system calls which, where data goes, where a failure travelled, how a request is handled. If the point is the amounts, use a chart; if it is a list of systems, use a table.

## `BH.flow`

You describe nodes, edges and zones. The kit lays them out, routes the edges, places the labels and handles small screens.

```js
BH.flow('#fig-path', {
  zones: [{ id: 'edge', label: 'Edge' }, { id: 'app', label: 'Application' }, { id: 'data', label: 'Data' }],
  nodes: [
    { id: 'web', label: 'Web and mobile apps', kind: 'person' },
    { id: 'gateway', label: 'API gateway', kind: 'gateway', zone: 'edge' },
    { id: 'checkout', label: 'Checkout service', zone: 'app' },
    { id: 'payments', label: 'Payments service', sub: 'pool of 200 connections', zone: 'app' },
    { id: 'vault', label: 'Token vault', kind: 'store', zone: 'data' },
    { id: 'processor', label: 'Card processor', kind: 'external' },
  ],
  edges: [
    { from: 'web', to: 'gateway', label: 'POST /checkout' },
    { from: 'gateway', to: 'checkout', label: 'routes' },
    { from: 'checkout', to: 'payments', label: 'authorises' },
    { from: 'payments', to: 'vault', label: 'reads token' },
    { from: 'payments', to: 'processor', label: 'charges card', kind: 'async' },
  ],
  highlight: ['web', 'gateway', 'checkout', 'payments'],
  highlightLabel: 'The path that failed',
});
```

### Nodes

| Field | Meaning |
|---|---|
| `id` | Short unique name, used by edges |
| `label` | What the reader sees. Keep it under about 25 characters; long labels wrap |
| `sub` | A second, smaller line: a role, a region, a limit |
| `kind` | Sets the shape, so shape says what a thing is (below). Default `service` |
| `zone` | The id of the zone it belongs to |
| `rank`, `order` | Hints, only when position has meaning: `rank` is the earliest step along the flow the node may take (0 is the first); `order` sorts nodes that share a step |

| `kind` | Shape | Use for |
|---|---|---|
| `service` | Rounded rectangle | An application or service |
| `store` | Cylinder | A database, cache, bucket, index |
| `queue` | Rectangle with dividers | A queue, topic or stream |
| `gateway` | Cut corners | A gateway, load balancer, firewall, proxy |
| `external` | Dashed outline | Something outside your control: a third party, a customer system |
| `person` | Pill | A person, a browser, a client app |

### Edges

| Field | Meaning |
|---|---|
| `from`, `to` | Node ids. The arrow points at `to` |
| `label` | A verb or what moves: "writes order", "TLS 1.3", "email address". Short |
| `kind` | `normal`; `async` (dashed) for queued or background work; `risk` (status colour) for a hop that works but is a problem; `blocked` (status colour, crossed) for one that is denied or failing |
| `volume` | A number; with `flow: true`, busier edges carry more dots |

### Zones

A zone is a named group drawn as a tinted frame: a network segment, a trust boundary, a team, a cloud account. List them in the order the flow passes through them. Use zones only when the grouping means something to the reader.

### The rest

| Option | Meaning |
|---|---|
| `highlight` | The path the figure is about: a list of node ids (edges between consecutive ids are lit too) and/or edges written `'from>to'` |
| `highlightLabel` | What the highlighted path is, for the key |
| `steps` | A walkthrough: `[{ title, text, nodes: [ids], edges: ['from>to'] }]`. Adds Previous, Play and Next above the diagram, and arrow-key control |
| `overview` | The caption shown before the first step |
| `flow: true` | Dots travel along the edges (the highlighted ones, if any) with a Pause button |
| `direction` | `'auto'` (default): left to right when it fits, otherwise top to bottom. `'right'` or `'down'` forces it |

`BH.flow` returns `{ step(n), play(), pause() }`.

### Reading steps: the diagram follows the text

For a path the reader should follow hop by hop, such as an intrusion or a request, put the diagram in a `bh-split` section and write one block per step:

```html
<section class="bh-section bh-split" data-nav="The path">
  <h2>Five hops from a mailbox to the domain controller</h2>
  <p>What the path is, in a sentence.</p>
  <figure class="bh-figure" data-bh-table="off"> … <div class="bh-plot" id="fig-path"></div> … </figure>
  <div class="bh-step" data-bh-step="1"><h3>Hour 0. A session is stolen</h3><p>What happened, and the evidence for it.</p></div>
  <div class="bh-step" data-bh-step="2"><h3>Hour 2. A colleague opens a document</h3><p>…</p></div>
</section>
```

`data-bh-step="n"` is the step of the diagram's `steps` that the block describes. On a wide screen the kit pins the diagram beside the blocks and shows the step of the one being read; scrolling is the control, and a diagram taller than the window moves inside its frame to keep that step in view. On a phone and on paper the blocks are ordinary text and the diagram keeps its Previous, Play and Next. Put the figure before the blocks, so it comes first where they stack. Give each block two or three sentences: the step's title in the diagram can be short, because the block says the rest. Not in `presentation`: there, use the walkthrough's Play.

## Making a diagram that reads

- **One direction.** The layout makes every edge run with the flow. If you find yourself wanting arrows back, you probably have two diagrams.
- **One highlighted path.** Decide what this figure is about and highlight only that.
- **Verbs on edges.** "reads", "writes", "authorises": a label that says what happens beats a protocol name, unless the protocol is the point (as in a security review).
- **Fewer than about twelve nodes** is comfortable; twenty is the limit, and the kit refuses more. For a larger system, draw an overview of the main parts, then one detail figure per part.
- **Leave out what does not bear on the point.** Logging, monitoring and DNS touch everything; show them only if the report is about them.
- **Use a walkthrough** when order matters: an incident, a request lifecycle, a migration. Each step names the few nodes and edges involved and says what happens in a sentence. The first view is always the whole picture.

## Reading the checker's findings

| Finding | Meaning | Fix |
|---|---|---|
| `edge-crossings` (warning) | Edges cross, which is what most makes a diagram hard to follow | Remove secondary edges, add `order` hints to nodes in the same rank, or split the diagram |
| `node-overlap`, `edge-through-node` (error) | Should not happen; a hint is fighting the layout | Remove `rank` and `order` hints |
| `label-overlap` (warning) | Edge labels collide | Shorten labels or remove the less important ones |
| `figure-failed` (error) | The description is invalid: an unknown node id, a duplicate id, more than twenty nodes | The message names the fault |

## Limits to know

- Two zones that cover the same step of the flow sit side by side, across the flow. If that makes the diagram too wide, give the zones separate steps or split the figure.
- On a phone, a diagram wider than the screen scrolls sideways inside its figure.
- A long chain (six or more steps) is drawn top to bottom even on a wide screen. In a `presentation`, put it in a `bh-split` section so it fits one screen beside its text.
- Two connected nodes never share a step: whatever feeds a node sits at least one step before it, even if a `rank` hint asked otherwise.

## `BH.sankey`: volumes between stages

```js
BH.sankey('#fig-pipeline', { unit: 'deals', highlight: ['Proposal>Lost'],
  links: [{ source: 'Lead', target: 'Qualified', value: 412 }, { source: 'Lead', target: 'Disqualified', value: 596 },
          { source: 'Qualified', target: 'Proposal', value: 268 }, { source: 'Proposal', target: 'Lost', value: 131 }] });
```

Ribbon width is the amount. Use it when the reader should see where volume goes and where it is lost: a funnel, a budget, traffic between tiers. `nodes: [{ id, label }]` renames or orders stages. Links must only move forward; for a loop, use `BH.flow`.
