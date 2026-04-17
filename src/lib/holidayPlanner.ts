import { addDaysUTC, compareYYYYMMDD, parseYYYYMMDDToUTCDate, toYYYYMMDD_UTC } from "./dateUtils";

export type Holiday = {
  name: string;
  date: string;
};

export type HolidayTag =
  | "Long weekend"
  | "4-day weekend"
  | "Potential 4-day weekend"
  | "Potential 9-day break"
  | "Potential year-end break"
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
  fourDayWeekendCount: number;
  bridgeDayCount: number;
  nineDayBreakCount: number;
  yearEndBreakCount: number;
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

function addDaysYYYYMMDD(date: string, days: number): string {
  return toYYYYMMDD_UTC(addDaysUTC(parseYYYYMMDDToUTCDate(date), days));
}

export function getHolidayTags(date: string, holidayDates: Set<string> = new Set()): HolidayTag[] {
  const day = parseYYYYMMDDToUTCDate(date).getUTCDay();
  const previousDate = addDaysYYYYMMDD(date, -1);
  const nextDate = addDaysYYYYMMDD(date, 1);
  const year = parseYYYYMMDDToUTCDate(date).getUTCFullYear();
  const newYearsDay = `${year + 1}-01-01`;
  const isLateDecember = date >= `${year}-12-24` && date <= `${year}-12-31`;
  const hasNewYearContext = isLateDecember && holidayDates.has(newYearsDay);

  const isFourDayWeekendCluster =
    (day === 1 && holidayDates.has(nextDate)) ||
    (day === 2 && holidayDates.has(previousDate)) ||
    (day === 4 && holidayDates.has(nextDate)) ||
    (day === 5 && holidayDates.has(previousDate));

  if (isFourDayWeekendCluster) {
    return ["4-day weekend", hasNewYearContext ? "Potential year-end break" : "Potential 9-day break"];
  }

  const tags: HolidayTag[] = [];

  if (day === 1 || day === 5) tags.push("Long weekend");
  else if (day === 2 || day === 4) tags.push("Potential 4-day weekend");
  else if (day === 0 || day === 6) tags.push("Weekend holiday");
  else tags.push("Midweek holiday");

  if (hasNewYearContext) tags.push("Potential year-end break");

  return tags;
}

export function planHolidays(
  holidays: Holiday[],
  today: string,
  holidayDateContext: Holiday[] = holidays
): PlannedHoliday[] {
  const holidayDates = new Set(holidayDateContext.map((holiday) => holiday.date));

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
      tags: getHolidayTags(holiday.date, holidayDates),
    };
  });
}

export function splitPastAndUpcoming(holidays: PlannedHoliday[]) {
  return {
    upcoming: holidays.filter((holiday) => !holiday.isPast),
    past: holidays.filter((holiday) => holiday.isPast),
  };
}

function countDateClusters(dates: Set<string>): number {
  let clusters = 0;

  for (const date of Array.from(dates).sort(compareYYYYMMDD)) {
    if (!dates.has(addDaysYYYYMMDD(date, -1))) clusters += 1;
  }

  return clusters;
}

export function deriveHolidaySummary(holidays: PlannedHoliday[]): HolidaySummary {
  const { upcoming } = splitPastAndUpcoming(holidays);
  const longWeekendDates = new Set<string>();
  const fourDayWeekendDates = new Set<string>();
  const bridgeDayDates = new Set<string>();
  const nineDayBreakDates = new Set<string>();
  const yearEndBreakDates = new Set<string>();

  for (const holiday of holidays) {
    if (holiday.tags.includes("Long weekend")) longWeekendDates.add(holiday.date);
    if (holiday.tags.includes("4-day weekend")) fourDayWeekendDates.add(holiday.date);
    if (holiday.tags.includes("Potential 4-day weekend")) bridgeDayDates.add(holiday.date);
    if (holiday.tags.includes("Potential 9-day break")) nineDayBreakDates.add(holiday.date);
    if (holiday.tags.includes("Potential year-end break")) yearEndBreakDates.add(holiday.date);
  }

  return {
    nextHoliday: upcoming[0] ?? null,
    holidaysLeft: new Set(upcoming.map((holiday) => holiday.date)).size,
    longWeekendCount: longWeekendDates.size,
    fourDayWeekendCount: countDateClusters(fourDayWeekendDates),
    bridgeDayCount: bridgeDayDates.size,
    nineDayBreakCount: countDateClusters(nineDayBreakDates),
    yearEndBreakCount: countDateClusters(yearEndBreakDates),
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
