import test from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv } from '../../src/js/data.js';

test('messy CSV parses without inventing values', () => {
  const text = '﻿month,team,note,value\r\n2026-01,Ops,"Late, then fixed",12.5\r\n2026-02,Ops,,\r\n2026-03,"Sales ""EMEA""",ok,"1,204"\r\n';
  const rows = parseCsv(text);
  assert.equal(rows.length, 3);
  assert.deepEqual(Object.keys(rows[0]), ['month', 'team', 'note', 'value']);       // byte-order mark removed
  assert.equal(rows[0].note, 'Late, then fixed');
  assert.equal(rows[1].value, null);                                                  // empty is missing, never 0
  assert.equal(rows[1].note, null);
  assert.equal(rows[2].team, 'Sales "EMEA"');
  assert.equal(rows[2].value, 1204);
  assert.ok(rows[0].month instanceof Date && rows[0].month.getUTCMonth() === 0);
});
test('types are inferred conservatively', () => {
  const rows = parseCsv('id,when,at,flag,share,code\n007,2026-09-17,14:06,true,45%,A1\n');
  assert.equal(rows[0].id, '007');                    // leading zero: an identifier, not a number
  assert.ok(rows[0].when instanceof Date);
  assert.ok(rows[0].at instanceof Date && rows[0].at.getUTCHours() === 14);
  assert.equal(rows[0].flag, true);
  assert.equal(rows[0].share, '45%');
  assert.equal(rows[0].code, 'A1');
});
test('a quoted field may contain a line break', () => {
  const rows = parseCsv('a,b\n"line one\nline two",2\n');
  assert.equal(rows.length, 1);
  assert.equal(rows[0].a, 'line one\nline two');
});
test('empty input gives no rows', () => {
  assert.deepEqual(parseCsv(''), []);
  assert.deepEqual(parseCsv('a,b\n'), []);
});
