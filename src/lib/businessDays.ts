import { addDaysUTC, compareYYYYMMDD, parseYYYYMMDDToUTCDate, toYYYYMMDD_UTC } from "@/lib/dateUtils";

export type BizDayOptions = {
  excludeWeekends: boolean;

  /**
   * Provide holidays as a Set of "YYYY-MM-DD" strings for a given country+year.
   * This makes range iteration fast.
   */
  holidaySetProvider?: (countryCode: string, year: number) => Set<string>;
};

export type BizRangeResult = {
  startDate: string;
  endDate: string;

  calendarDays: number; // inclusive
  businessDays: number;

  weekendDaysExcluded: number;
  holidayDaysExcluded: number;

  // only holidays that fell within the range (and were excluded)
  holidaysHit: string[];
};

export type AddBizResult = {
  startDate: string;
  addBusinessDays: number;
  resultDate: string;

  daysSkipped: number;
  skippedDates: string[]; // weekends/holidays encountered while moving forward
};

function isWeekendUTC(d: Date): boolean {
  const day = d.getUTCDay(); // 0=Sun ... 6=Sat
  return day === 0 || day === 6;
}

function getHolidaySetForDate(
  countryCode: string,
  d: Date,
  options: BizDayOptions
): Set<string> {
  const year = d.getUTCFullYear();
  return options.holidaySetProvider ? options.holidaySetProvider(countryCode, year) : new Set();
}

export function businessDaysBetweenInclusive(
  startYYYYMMDD: string,
  endYYYYMMDD: string,
  countryCode: string,
  options: BizDayOptions
): BizRangeResult {
  if (compareYYYYMMDD(startYYYYMMDD, endYYYYMMDD) > 0) {
    throw new Error("End date must be the same as or after the start date.");
  }

  const start = parseYYYYMMDDToUTCDate(startYYYYMMDD);
  const end = parseYYYYMMDDToUTCDate(endYYYYMMDD);

  let calendarDays = 0;
  let businessDays = 0;
  let weekendDaysExcluded = 0;
  let holidayDaysExcluded = 0;

  const holidaysHit: string[] = [];

  // Iterate inclusive: start ... end
  for (let cur = start; compareYYYYMMDD(toYYYYMMDD_UTC(cur), endYYYYMMDD) <= 0; cur = addDaysUTC(cur, 1)) {
    calendarDays++;

    const curStr = toYYYYMMDD_UTC(cur);

    const weekend = options.excludeWeekends && isWeekendUTC(cur);
    if (weekend) {
      weekendDaysExcluded++;
      continue;
    }

    const holidaySet = getHolidaySetForDate(countryCode, cur, options);
    const isHoliday = holidaySet.has(curStr);

    if (isHoliday) {
      holidayDaysExcluded++;
      holidaysHit.push(curStr);
      continue;
    }

    businessDays++;
  }

  return {
    startDate: startYYYYMMDD,
    endDate: endYYYYMMDD,
    calendarDays,
    businessDays,
    weekendDaysExcluded,
    holidayDaysExcluded,
    holidaysHit,
  };
}

export function addBusinessDays(
  startYYYYMMDD: string,
  addDays: number,
  countryCode: string,
  options: BizDayOptions
): AddBizResult {
  if (addDays < 0) throw new Error("Add days must be 0 or greater.");

  let cur = parseYYYYMMDDToUTCDate(startYYYYMMDD);

  // addDays=0 => same date
  if (addDays === 0) {
    return {
      startDate: startYYYYMMDD,
      addBusinessDays: 0,
      resultDate: startYYYYMMDD,
      daysSkipped: 0,
      skippedDates: [],
    };
  }

  let added = 0;
  let daysSkipped = 0;
  const skippedDates: string[] = [];

  // Convention: adding N business days moves forward day-by-day and counts eligible days.
  while (added < addDays) {
    cur = addDaysUTC(cur, 1);
    const curStr = toYYYYMMDD_UTC(cur);

    const weekend = options.excludeWeekends && isWeekendUTC(cur);
    if (weekend) {
      daysSkipped++;
      skippedDates.push(curStr);
      continue;
    }

    const holidaySet = getHolidaySetForDate(countryCode, cur, options);
    const isHoliday = holidaySet.has(curStr);
    if (isHoliday) {
      daysSkipped++;
      skippedDates.push(curStr);
      continue;
    }

    added++;
  }

  return {
    startDate: startYYYYMMDD,
    addBusinessDays: addDays,
    resultDate: toYYYYMMDD_UTC(cur),
    daysSkipped,
    skippedDates,
  };
}
