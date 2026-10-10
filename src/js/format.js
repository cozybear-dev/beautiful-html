// Number and date formatting. Pure; uses only Intl.

const MINUS = '−', DASH = '–', NBSP = ' ';
const CURRENCY = /^[€$£¥₹]/;

// formatNumber(1234567, { compact: true }) → "1.2M"; missing values become an
// en dash, never zero. Units: "%" hugs the number, currency symbols lead, any
// other unit follows after a no-break space.
export function formatNumber(value, { unit = '', locale = 'en', compact = false, digits } = {}) {
  if (value === null || value === undefined || value === '' || Number.isNaN(Number(value))) return DASH;
  const n = Number(value);
  const abs = Math.abs(n);
  const max = digits ?? (compact ? 1 : abs >= 100 ? 0 : abs >= 10 ? 1 : 2);
  const body = new Intl.NumberFormat(locale, compact ? { notation: 'compact', maximumFractionDigits: max } : { maximumFractionDigits: max }).format(abs);
  const sign = n < 0 && Number(abs.toFixed(max)) !== 0 ? MINUS : '';
  if (!unit) return sign + body;
  if (unit === '%') return `${sign}${body}%`;
  if (CURRENCY.test(unit)) return `${sign}${unit}${body}`;
  return `${sign}${body}${NBSP}${unit}`;
}

const DAY = 864e5;
// Format a date for an axis or label that covers `span` milliseconds in total.
export function formatDate(value, { locale = 'en', span = 365 * DAY } = {}) {
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return DASH;
  const opts = span > 730 * DAY ? { year: 'numeric' }
    : span > 60 * DAY ? { month: 'short', year: 'numeric' }
      : span > 2 * DAY ? { day: 'numeric', month: 'short' }
        : { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' };
  return new Intl.DateTimeFormat(locale, { ...opts, timeZone: 'UTC' }).format(d);
}

// Whole numbers that look like years should not get a thousands separator.
export function isYearLike(values) {
  const v = values.filter(x => x !== null && x !== undefined);
  return v.length > 0 && v.every(x => Number.isInteger(x) && x >= 1900 && x <= 2100);
}
