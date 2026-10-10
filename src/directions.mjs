// What each art direction is made of: typefaces and one accent. The colour
// tokens are generated from the accent by tools/brand.mjs and checked by
// tests/unit/directions.test.mjs; the layout rules are in
// src/css/directions/structure/<name>.css. Run `npm run directions` after a change.
const SANS = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", Times, serif';

export const DIRECTION_DEFS = {
  analytical: { accent: '#2347d9', ground: '#ffffff', text: ['Source Sans 3', 'sourcesans3', SANS] },
  narrative: { accent: '#1b4f8f', ground: '#ffffff', text: ['STIX Two Text', 'stixtwotext', SERIF], data: ['Source Sans 3', 'sourcesans3', SANS] },
  presentation: { accent: '#2347d9', ground: '#ffffff', text: ['Atkinson Hyperlegible Next', 'atkinsonhyperlegiblenext', SANS] },
};
