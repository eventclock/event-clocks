import type { WeekendSnapshot } from "./types";

export function getWeekendCountdown(
  date: Date,
  saturdayStartsAtIso: string | null = null,
): WeekendSnapshot {
  const day = date.getUTCDay();
  const daysUntilSaturday = (6 - day + 7) % 7;

  if (day === 0 || day === 6) {
    return { daysUntilSaturday, label: "Enjoy the weekend", saturdayStartsAtIso };
  }

  if (daysUntilSaturday === 1) {
    return { daysUntilSaturday, label: "Weekend starts tomorrow", saturdayStartsAtIso };
  }

  return {
    daysUntilSaturday,
    label: `${daysUntilSaturday} days until Saturday`,
    saturdayStartsAtIso,
  };
}
