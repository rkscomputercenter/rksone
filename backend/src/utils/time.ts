/**
 * Server-side IST time utilities.
 * All time operations use Asia/Kolkata timezone.
 * Never trust client-provided dates.
 */

const TIMEZONE = 'Asia/Kolkata';

/**
 * Returns current time as a Date object (UTC internally, but represents IST wall time)
 */
export function nowIST(): Date {
  return new Date();
}

/**
 * Returns "YYYY-MM-DD" string in IST for a given Date (defaults to now)
 */
export function toISTDateString(date: Date = new Date()): string {
  return date.toLocaleDateString('en-CA', { timeZone: TIMEZONE });
  // en-CA produces YYYY-MM-DD format
}

/**
 * Returns "YYYY-MM" string in IST for a given Date
 */
export function toISTMonthString(date: Date = new Date()): string {
  const d = new Date(date.toLocaleString('en-US', { timeZone: TIMEZONE }));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

/**
 * Returns true if the given Date falls on today in IST
 */
export function isToday(date: Date): boolean {
  return toISTDateString(date) === toISTDateString(new Date());
}

/**
 * Returns the start and end of a given IST date as UTC Date objects
 * (for Prisma queries with gte/lte)
 */
export function getISTDayBounds(dateStr: string): { start: Date; end: Date } {
  // dateStr: YYYY-MM-DD in IST
  const start = new Date(`${dateStr}T00:00:00+05:30`);
  const end = new Date(`${dateStr}T23:59:59.999+05:30`);
  return { start, end };
}

/**
 * Returns start and end of a given IST month as UTC Date objects
 */
export function getISTMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(`${year}-${String(month).padStart(2, '0')}-01T00:00:00+05:30`);
  const lastDay = new Date(year, month, 0).getDate();
  const end = new Date(`${year}-${String(month).padStart(2, '0')}-${lastDay}T23:59:59.999+05:30`);
  return { start, end };
}

/**
 * Format a Date to readable IST string
 */
export function formatIST(date: Date): string {
  return date.toLocaleString('en-IN', {
    timeZone: TIMEZONE,
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}
