import {
  type Holiday,
  planHolidays,
  splitPastAndUpcoming,
  uniqueHolidays,
} from "./holidayPlanner";

type NagerHoliday = {
  date?: unknown;
  name?: unknown;
  localName?: unknown;
  types?: unknown;
};

const cache = new Map<string, { expiresAt: number; data: Holiday[] }>();
const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const HOLIDAY_CACHE_VERSION = "public-only-v2";

function normalizeFetchedHoliday(input: NagerHoliday): Holiday | null {
  const types = Array.isArray(input.types)
    ? input.types.filter((type): type is string => typeof type === "string")
    : [];
  const hasPublicType = types.some((type) => type.toLowerCase() === "public");

  if (!hasPublicType) return null;

  const date = typeof input.date === "string" ? input.date.trim() : "";
  const name =
    typeof input.name === "string" && input.name.trim()
      ? input.name.trim()
      : typeof input.localName === "string"
        ? input.localName.trim()
        : "";

  if (!name || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return null;

  return { date, name };
}

export async function fetchPublicHolidays(countryCode: string, year: number) {
  const country = countryCode.toUpperCase();
  const key = `${HOLIDAY_CACHE_VERSION}:${country}:${year}`;
  const cached = cache.get(key);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.data;
  }

  const response = await fetch(
    `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`,
    { next: { revalidate: 86_400 } },
  );

  if (!response.ok) {
    throw new Error(`holidays:${response.status}`);
  }

  const raw = (await response.json()) as unknown;
  const holidays = uniqueHolidays(
    (Array.isArray(raw) ? raw : [])
      .map((item) => normalizeFetchedHoliday(item as NagerHoliday))
      .filter((item): item is Holiday => Boolean(item)),
  );

  cache.set(key, { data: holidays, expiresAt: Date.now() + ONE_DAY_MS });

  return holidays;
}

export async function getHolidayStatus(countryCode: string, date: string) {
  const year = Number(date.slice(0, 4));
  const holidays = await fetchPublicHolidays(countryCode, year);
  const planned = planHolidays(holidays, date);
  const todayHoliday = planned.find((holiday) => holiday.date === date) ?? null;
  const { upcoming } = splitPastAndUpcoming(planned);
  const nextHoliday = upcoming.find((holiday) => holiday.date !== date) ?? null;

  return {
    holidays,
    todayHoliday,
    nextHoliday,
  };
}
