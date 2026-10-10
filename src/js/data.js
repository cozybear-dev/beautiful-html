// CSV parsing for data embedded in a report. Pure; no DOM.

const NUMBER = /^-?(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?$/;
const GROUPED = /^-?\d{1,3}(?:,\d{3})+(?:\.\d+)?$/;
const ISO_DATE = /^\d{4}-\d{2}(?:-\d{2})?(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;
const CLOCK = /^\d{1,2}:\d{2}(?::\d{2})?$/;

// Turn one cell of text into a value. Empty cells are null, never zero.
export function inferType(text) {
  const s = text.trim();
  if (s === '') return null;
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (NUMBER.test(s)) return /^-?0\d/.test(s) ? s : Number(s);          // "007" is an identifier
  if (GROUPED.test(s)) return Number(s.replace(/,/g, ''));
  if (ISO_DATE.test(s)) {
    const iso = s.length === 7 ? `${s}-01` : s.replace(' ', 'T');
    const d = new Date(/[T]/.test(iso) && !/(Z|[+-]\d{2}:?\d{2})$/.test(iso) ? `${iso}Z` : iso);
    return Number.isNaN(d.getTime()) ? s : d;
  }
  if (CLOCK.test(s)) {                                                    // a time of day
    const [h, m, sec = 0] = s.split(':').map(Number);
    return h < 24 && m < 60 ? new Date(Date.UTC(1970, 0, 1, h, m, sec)) : s;
  }
  return s;
}

// Parse CSV text (RFC 4180: quoted fields, doubled quotes, line breaks inside
// quotes) into an array of objects keyed by the header row.
export function parseCsv(text, { types = true } = {}) {
  const src = String(text).replace(/^﻿/, '');
  const records = [];
  let field = '', record = [], quoted = false, wasQuoted = false;
  const endField = () => { record.push(wasQuoted ? { q: field } : field); field = ''; wasQuoted = false; };
  const endRecord = () => { endField(); records.push(record); record = []; };
  for (let i = 0; i < src.length; i++) {
    const c = src[i];
    if (quoted) {
      if (c === '"') { if (src[i + 1] === '"') { field += '"'; i++; } else quoted = false; }
      else field += c;
    } else if (c === '"' && field === '') { quoted = true; wasQuoted = true; }
    else if (c === ',') endField();
    else if (c === '\n') endRecord();
    else if (c === '\r') { if (src[i + 1] === '\n') i++; endRecord(); }
    else field += c;
  }
  if (field !== '' || record.length) endRecord();

  const text0 = v => (typeof v === 'object' ? v.q : v);
  const rows = records.filter(r => r.length > 1 || text0(r[0]).trim() !== '');
  if (rows.length < 2) return [];
  const header = rows[0].map(h => text0(h).trim());
  return rows.slice(1).map(r => {
    const row = {};
    header.forEach((name, i) => {
      const raw = r[i] === undefined ? '' : text0(r[i]);
      row[name] = types ? inferType(raw) : raw;
    });
    return row;
  });
}
