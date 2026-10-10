// The BH namespace. A one-line stub in the report head collects BH.ready()
// callbacks before this file loads; they are taken over here.
const queued = (window.BH && Array.isArray(window.BH.q)) ? window.BH.q : [];

export const BH = {
  version: __BH_VERSION__,
  direction: __BH_DIRECTION__,
  q: queued,
  ready(fn) { this.q.push(fn); },
};
