import { getHolidayStatus } from "@/lib/holidays";
import type { HolidaySnapshot, SupportedCountry } from "../types";

export async function getHoliday(
  country: SupportedCountry,
  date: string,
): Promise<HolidaySnapshot> {
  const status = await getHolidayStatus(country.code, date);

  return {
    status: "available",
    isHoliday: Boolean(status.todayHoliday),
    name: status.todayHoliday?.name ?? null,
    nextHoliday: status.nextHoliday
      ? {
          name: status.nextHoliday.name,
          date: status.nextHoliday.date,
          countdownDays: status.nextHoliday.countdownDays,
          startsAtIso: null,
        }
      : null,
  };
}

export function unavailableHoliday(): HolidaySnapshot {
  return {
    status: "unavailable",
    isHoliday: false,
    name: null,
    nextHoliday: null,
  };
}
