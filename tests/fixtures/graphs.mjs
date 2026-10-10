// Graphs for the flow layout tests: ordinary shapes, awkward shapes and invalid input.
const n = (id, extra = {}) => ({ id, label: extra.label || id[0].toUpperCase() + id.slice(1), ...extra });
const e = (from, to, label) => ({ from, to, ...(label ? { label } : {}) });

export const graphs = {
  // Zones that follow each other along the flow.
  threeTier: {
    zones: [{ id: 'edge', label: 'Edge' }, { id: 'app', label: 'Application' }, { id: 'data', label: 'Data' }],
    nodes: [n('cdn', { zone: 'edge', label: 'CDN and WAF' }), n('lb', { zone: 'edge', label: 'Load balancer' }), n('web', { zone: 'app', label: 'Web application' }),
      n('api', { zone: 'app', label: 'API service' }), n('db', { zone: 'data', label: 'Primary database', kind: 'store' }), n('cache', { zone: 'data', label: 'Cache', kind: 'store' })],
    edges: [e('cdn', 'lb', 'HTTPS'), e('lb', 'web', 'HTTPS'), e('lb', 'api', 'HTTPS'), e('web', 'api', 'JWT'), e('api', 'db', 'SQL over TLS'), e('api', 'cache', 'reads')],
  },
  fanOutFanIn: {
    nodes: [n('a'), n('b1'), n('b2'), n('b3'), n('c')],
    edges: [e('a', 'b1'), e('a', 'b2'), e('a', 'b3'), e('b1', 'c'), e('b2', 'c'), e('b3', 'c')],
  },
  // Two zones side by side over the same ranks, joined by a cross edge, then a shared node.
  crossZone: {
    zones: [{ id: 'za', label: 'Region A' }, { id: 'zb', label: 'Region B' }],
    nodes: [n('a1', { zone: 'za' }), n('a2', { zone: 'za' }), n('b1', { zone: 'zb' }), n('b2', { zone: 'zb' }), n('x', { label: 'Shared ledger' })],
    edges: [e('a1', 'a2'), e('b1', 'b2'), e('a1', 'b2', 'replicates'), e('a2', 'x'), e('b2', 'x')],
  },
  // One edge skips two ranks and must pass the nodes in between.
  longEdges: {
    nodes: [n('a'), n('b'), n('c'), n('d'), n('e'), n('f')],
    edges: [e('a', 'b'), e('b', 'c'), e('c', 'd'), e('a', 'd', 'bypass'), e('a', 'e'), e('e', 'f'), e('f', 'd')],
  },
  hinted: {
    nodes: [n('a'), n('b'), n('c'), n('d'), n('audit', { rank: 3, label: 'Audit log' })],
    edges: [e('a', 'b'), e('b', 'c'), e('c', 'd'), e('a', 'audit', 'events')],
  },
  dense: {
    zones: [{ id: 'app', label: 'Application' }, { id: 'data', label: 'Data' }],
    nodes: [n('client'), n('gateway', { kind: 'gateway' }), n('auth', { zone: 'app' }), n('orders', { zone: 'app' }), n('billing', { zone: 'app' }), n('search', { zone: 'app' }),
      n('queue', { zone: 'app', kind: 'queue' }), n('worker', { zone: 'app' }), n('ordersdb', { zone: 'data', kind: 'store' }), n('billingdb', { zone: 'data', kind: 'store' }),
      n('index', { zone: 'data', kind: 'store' }), n('mail', { kind: 'external', label: 'Email provider' })],
    edges: [e('client', 'gateway'), e('gateway', 'auth'), e('gateway', 'orders'), e('gateway', 'billing'), e('gateway', 'search'), e('orders', 'ordersdb'), e('orders', 'queue'),
      e('billing', 'billingdb'), e('billing', 'queue'), e('search', 'index'), e('queue', 'worker'), e('worker', 'ordersdb'), e('worker', 'index'), e('worker', 'mail'),
      e('auth', 'orders'), e('auth', 'billing'), e('orders', 'billing'), e('billing', 'mail')],
  },
  cycle: {
    nodes: [n('a'), n('b'), n('c'), n('d')],
    edges: [e('a', 'b'), e('b', 'c'), e('c', 'a', 'retry'), e('c', 'd')],
  },
  twoIslands: {
    nodes: [n('a'), n('b'), n('c'), n('d')],
    edges: [e('a', 'b'), e('c', 'd')],
  },
  // A long label and a node with a sublabel.
  longLabels: {
    nodes: [n('a', { label: 'Customer identity and access management platform (CIAM)' }), n('b', { label: 'API', sub: 'eu-central-1, three zones' }), n('c', { label: 'DB' })],
    edges: [e('a', 'b', 'OIDC tokens, refreshed hourly'), e('b', 'c')],
  },
};

export const invalid = {
  duplicateId: { nodes: [n('a'), n('a')], edges: [] },
  danglingEdge: { nodes: [n('a'), n('b')], edges: [e('a', 'zz')] },
  selfLoop: { nodes: [n('a'), n('b')], edges: [e('a', 'a')] },
  twentyOne: { nodes: Array.from({ length: 21 }, (_, i) => n(`n${i}`)), edges: [] },
  unknownZone: { zones: [{ id: 'z', label: 'Z' }], nodes: [n('a', { zone: 'nope' })], edges: [] },
  unknownKind: { nodes: [n('a', { kind: 'server' })], edges: [] },
  empty: { nodes: [], edges: [] },
};
