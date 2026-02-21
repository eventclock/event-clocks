/**
 * We intentionally do ALL calculations in UTC to avoid:
 * - local timezone offsets shifting date boundaries
 * - DST weirdness
 *
 * Inputs/outputs are plain "YYYY-MM-DD".
 */

export function parseYYYYMMDDToUTCDate(s: string): Date {
  // Expect "YYYY-MM-DD"
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
  if (!m) throw new Error(`Invalid date format: ${s} (expected YYYY-MM-DD)`);

  const y = parseInt(m[1], 10);
  const mo = parseInt(m[2], 10);
  const d = parseInt(m[3], 10);

  // Date.UTC uses month 0-11
  return new Date(Date.UTC(y, mo - 1, d, 0, 0, 0));
}

export function toYYYYMMDD_UTC(d: Date): string {
  const y = d.getUTCFullYear();
  const m = String(d.getUTCMonth() + 1).padStart(2, "0");
  const day = String(d.getUTCDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function addDaysUTC(d: Date, days: number): Date {
  const copy = new Date(d.getTime());
  copy.setUTCDate(copy.getUTCDate() + days);
  return copy;
}

/** lexicographic compare works for YYYY-MM-DD */
export function compareYYYYMMDD(a: string, b: string): number {
  if (a === b) return 0;
  return a < b ? -1 : 1;
}
