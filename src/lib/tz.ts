// src/lib/tz.ts
type Parts = {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
};

function parseDateTimeLocal(value: string): Parts | null {
  // value like "2026-02-10T23:30"
  if (!value || !value.includes("T")) return null;
  const [datePart, timePart] = value.split("T");
  const [y, m, d] = datePart.split("-").map(Number);
  const [hh, mm] = timePart.split(":").map(Number);
  if (!y || !m || !d || hh === undefined || mm === undefined) return null;

  return { year: y, month: m, day: d, hour: hh, minute: mm, second: 0 };
}

function getFormatter(timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });
}

// Returns offset (ms) such that: localTimeInTZ = utcTime + offset
function getTimeZoneOffsetMs(timeZone: string, dateUtc: Date): number {
  const dtf = getFormatter(timeZone);
  const parts = dtf.formatToParts(dateUtc);

  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);

  const y = get("year");
  const m = get("month");
  const d = get("day");
  const hh = get("hour");
  const mm = get("minute");
  const ss = get("second");

  // This "asUTC" is: what the formatted TZ wall-clock time would be if it were UTC.
  const asUtcMs = Date.UTC(y, m - 1, d, hh, mm, ss);
  return asUtcMs - dateUtc.getTime();
}

/**
 * Convert a datetime-local string interpreted in `fromTimeZone` into a UTC Date.
 * Handles DST by iterating because the offset can change around transitions.
 */
export function zonedDateTimeLocalToUtc(dateTimeLocal: string, fromTimeZone: string): Date | null {
  const p = parseDateTimeLocal(dateTimeLocal);
  if (!p) return null;

  // First guess: treat the wall clock as if it's UTC.
  let utcGuessMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);

  // Iterate twice to stabilize across DST boundaries.
  for (let i = 0; i < 2; i++) {
    const offset = getTimeZoneOffsetMs(fromTimeZone, new Date(utcGuessMs));
    utcGuessMs = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second) - offset;
  }

  return new Date(utcGuessMs);
}

export function formatInTimeZone_old(dateUtc: Date, timeZone: string): string {
  // Friendly output like: 2026-02-10 15:30:00
  const dtf = getFormatter(timeZone);
  const parts = dtf.formatToParts(dateUtc);
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";

  const y = get("year");
  const m = get("month");
  const d = get("day");
  const hh = get("hour");
  const mm = get("minute");
  const ss = get("second");

  return `${y}-${m}-${d} ${hh}:${mm}:${ss}`;
}

export function formatInTimeZone(date: Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(date);
}

export function getLocalTimeZone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

// src/lib/tz.ts
// Add these near the bottom (or export existing offset helper if you prefer)

export function getTimeZoneOffsetMsAtUtc(timeZone: string, dateUtc: Date): number {
  // Reuse your internal offset logic. If you already have getTimeZoneOffsetMs, just export it.
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = dtf.formatToParts(dateUtc);
  const get = (type: string) => Number(parts.find(p => p.type === type)?.value);

  const y = get("year");
  const m = get("month");
  const d = get("day");
  const hh = get("hour");
  const mm = get("minute");
  const ss = get("second");

  const asUtcMs = Date.UTC(y, m - 1, d, hh, mm, ss);
  return asUtcMs - dateUtc.getTime();
}

export function formatUtcOffsetLabel(offsetMs: number): string {
  // offsetMs = localTZ - UTC
  const sign = offsetMs >= 0 ? "+" : "-";
  const abs = Math.abs(offsetMs);

  const totalMinutes = Math.round(abs / 60000);
  const hh = Math.floor(totalMinutes / 60);
  const mm = totalMinutes % 60;

  const pad2 = (n: number) => String(n).padStart(2, "0");
  return `UTC${sign}${pad2(hh)}:${pad2(mm)}`;
}

export function getUtcOffsetLabelAtUtc(timeZone: string, dateUtc: Date): string {
  const offsetMs = getTimeZoneOffsetMsAtUtc(timeZone, dateUtc);
  return formatUtcOffsetLabel(offsetMs);
}
