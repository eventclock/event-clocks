import { compareYYYYMMDD, parseYYYYMMDDToUTCDate } from "./dateUtils";

export type Holiday = {
  name: string;
  date: string;
};

export type HolidayTag =
  | "Long weekend"
  | "Potential 4-day weekend"
  | "Weekend holiday"
  | "Midweek holiday";

export type PlannedHoliday = Holiday & {
  weekday: string;
  weekdayShort: string;
  countdownDays: number;
  isPast: boolean;
  tags: HolidayTag[];
};

export type HolidaySummary = {
  nextHoliday: PlannedHoliday | null;
  holidaysLeft: number;
  longWeekendCount: number;
  bridgeDayCount: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEKDAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const WEEKDAYS_SHORT = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export function sortHolidays(holidays: Holiday[]): Holiday[] {
  return [...holidays].sort((a, b) => compareYYYYMMDD(a.date, b.date) || a.name.localeCompare(b.name));
}

export function uniqueHolidays(holidays: Holiday[]): Holiday[] {
  const seen = new Set<string>();
  const unique: Holiday[] = [];

  for (const holiday of holidays) {
    const key = `${holiday.date}:${holiday.name.toLowerCase()}`;
    if (seen.has(key)) continue;

    seen.add(key);
    unique.push(holiday);
  }

  return unique;
}

export function countdownInDays(date: string, today: string): number {
  const target = parseYYYYMMDDToUTCDate(date).getTime();
  const start = parseYYYYMMDDToUTCDate(today).getTime();
  return Math.round((target - start) / DAY_MS);
}

export function getHolidayTags(date: string): HolidayTag[] {
  const day = parseYYYYMMDDToUTCDate(date).getUTCDay();

  if (day === 1 || day === 5) return ["Long weekend"];
  if (day === 2 || day === 4) return ["Potential 4-day weekend"];
  if (day === 0 || day === 6) return ["Weekend holiday"];

  return ["Midweek holiday"];
}

export function planHolidays(holidays: Holiday[], today: string): PlannedHoliday[] {
  return sortHolidays(holidays).map((holiday) => {
    const date = parseYYYYMMDDToUTCDate(holiday.date);
    const weekdayIndex = date.getUTCDay();
    const countdownDays = countdownInDays(holiday.date, today);

    return {
      ...holiday,
      weekday: WEEKDAYS[weekdayIndex],
      weekdayShort: WEEKDAYS_SHORT[weekdayIndex],
      countdownDays,
      isPast: countdownDays < 0,
      tags: getHolidayTags(holiday.date),
    };
  });
}

export function splitPastAndUpcoming(holidays: PlannedHoliday[]) {
  return {
    upcoming: holidays.filter((holiday) => !holiday.isPast),
    past: holidays.filter((holiday) => holiday.isPast),
  };
}

export function deriveHolidaySummary(holidays: PlannedHoliday[]): HolidaySummary {
  const { upcoming } = splitPastAndUpcoming(holidays);
  const longWeekendDates = new Set<string>();
  const bridgeDayDates = new Set<string>();

  for (const holiday of holidays) {
    if (holiday.tags.includes("Long weekend")) longWeekendDates.add(holiday.date);
    if (holiday.tags.includes("Potential 4-day weekend")) bridgeDayDates.add(holiday.date);
  }

  return {
    nextHoliday: upcoming[0] ?? null,
    holidaysLeft: new Set(upcoming.map((holiday) => holiday.date)).size,
    longWeekendCount: longWeekendDates.size,
    bridgeDayCount: bridgeDayDates.size,
  };
}

export function normalizeHoliday(input: unknown): Holiday | null {
  if (!input || typeof input !== "object") return null;

  const candidate = input as Partial<Holiday>;
  const name = typeof candidate.name === "string" ? candidate.name.trim() : "";
  const date = typeof candidate.date === "string" ? candidate.date.trim() : "";

  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return { name, date };
}
