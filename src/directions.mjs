// What each art direction is made of: typefaces and one accent. The colour
// tokens are generated from the accent by tools/brand.mjs and checked by
// tests/unit/directions.test.mjs; the layout rules are in
// src/css/directions/structure/<name>.css. Run `npm run directions` after a change.
//
// The Hunt & Hackett look (huntandhackett.com): amber on navy, Playfair Display
// headings over Lato text, the same in every direction.
const SANS = '"Segoe UI", system-ui, -apple-system, "Helvetica Neue", Arial, sans-serif';
const SERIF = 'Georgia, "Times New Roman", Times, serif';

const LATO = ['Lato', 'lato', SANS];
const PLAYFAIR = ['Playfair Display', 'playfairdisplay', SERIF];
const HH = { accent: '#fcaf15', base: '#080630', ground: '#ffffff', text: LATO, display: PLAYFAIR };

export const DIRECTION_DEFS = {
  analytical: { ...HH },
  narrative: { ...HH },
  presentation: { ...HH },
};
