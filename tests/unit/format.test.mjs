import test from 'node:test';
import assert from 'node:assert/strict';
import { formatNumber, formatDate, isYearLike } from '../../src/js/format.js';

test('units and compact notation', () => {
  assert.equal(formatNumber(1234567, { locale: 'en', compact: true }), '1.2M');
  assert.equal(formatNumber(0.5, { locale: 'en', unit: '%' }), '0.5%');
  assert.equal(formatNumber(-3, { locale: 'en' }), '−3');        // true minus sign
  assert.equal(formatNumber(null, { locale: 'en' }), '–');         // missing, not zero
});
test('currency symbols lead, other units follow after a no-break space', () => {
  assert.equal(formatNumber(1200, { locale: 'en', unit: '€' }), '€1,200');
  assert.equal(formatNumber(310, { locale: 'en', unit: 'ms' }), '310 ms');
  assert.equal(formatNumber(-1200, { locale: 'en', unit: '€' }), '−€1,200');
});
test('decimals shrink as numbers grow', () => {
  assert.equal(formatNumber(3.14159, { locale: 'en' }), '3.14');
  assert.equal(formatNumber(31.4159, { locale: 'en' }), '31.4');
  assert.equal(formatNumber(314.159, { locale: 'en' }), '314');
  assert.equal(formatNumber(NaN, { locale: 'en' }), '–');
});
test('dates are formatted for the span they cover', () => {
  const d = new Date(Date.UTC(2026, 2, 5, 14, 6));
  assert.equal(formatDate(d, { locale: 'en', span: 3 * 365 * 864e5 }), '2026');
  assert.equal(formatDate(d, { locale: 'en', span: 200 * 864e5 }), 'Mar 2026');
  assert.equal(formatDate(d, { locale: 'en-GB', span: 20 * 864e5 }), '5 Mar');
  assert.equal(formatDate(d, { locale: 'en', span: 20 * 864e5 }), 'Mar 5');
  assert.equal(formatDate(d, { locale: 'en', span: 3 * 36e5 }), '14:06');
});
test('whole numbers between 1900 and 2100 are recognised as years', () => {
  assert.equal(isYearLike([2019, 2020, 2021]), true);
  assert.equal(isYearLike([2019, 2020.5]), false);
  assert.equal(isYearLike([12, 2020]), false);
});
