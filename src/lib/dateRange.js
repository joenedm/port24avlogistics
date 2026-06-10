import { format, parseISO, isValid } from 'date-fns';

/**
 * Parse a date string safely (handles YYYY-MM-DD and ISO datetime)
 */
function parseDate(str) {
  if (!str) return null;
  // Handle ISO datetime or date-only strings
  try {
    // For date-only strings like "2026-04-20", parseISO works correctly
    const d = parseISO(str);
    return isValid(d) ? d : null;
  } catch {
    return null;
  }
}

/**
 * Format a single date as "Apr 20, 2026"
 */
export function formatDate(str) {
  const d = parseDate(str);
  if (!d) return '';
  return format(d, 'MMM d, yyyy');
}

/**
 * Format a date range:
 * - Same day: "Apr 20, 2026"
 * - Multi-day: "Apr 20, 2026 – Apr 22, 2026"
 * - Only start: "Apr 20, 2026"
 * - Neither: ''
 */
export function formatDateRange(startStr, endStr) {
  const start = parseDate(startStr);
  const end = parseDate(endStr);

  if (!start && !end) return '';
  if (!start) return formatDate(endStr);
  if (!end) return formatDate(startStr);

  // Same day
  if (start.getTime() === end.getTime()) return format(start, 'MMM d, yyyy');

  return `${format(start, 'MMM d, yyyy')} – ${format(end, 'MMM d, yyyy')}`;
}