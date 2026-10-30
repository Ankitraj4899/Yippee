// shared by the Blog List and Article Header blocks

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August',
  'September', 'October', 'November', 'December'];

/**
 * The date of a blog's Published Date page property, without time-zone shifts.
 * @param {string} value e.g. 2026-09-16 or 2026-09-16T00:00:00.000+05:30
 * @returns {{year: number, month: number, day: number}|null}
 */
export function parseDate(value) {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return { year: +match[1], month: +match[2] - 1, day: +match[3] };
  const date = value ? new Date(value) : null;
  if (!date || Number.isNaN(date.getTime())) return null;
  return { year: date.getFullYear(), month: date.getMonth(), day: date.getDate() };
}

/**
 * A blog date as the original shows it: "16 September 2026", or "16 Sep 2026" when short.
 * @param {string} value The Published Date property
 * @param {boolean} [short] Abbreviate the month
 */
export function formatDate(value, short = false) {
  const date = parseDate(value);
  if (!date) return value || '';
  const month = MONTHS[date.month];
  return `${date.day} ${short ? month.slice(0, 3) : month} ${date.year}`;
}

/** Sortable number for a blog date (0 when there is none). */
export function dateValue(value) {
  const date = parseDate(value);
  return date ? Date.UTC(date.year, date.month, date.day) : 0;
}
