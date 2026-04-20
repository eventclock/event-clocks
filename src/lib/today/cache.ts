import type { TodaySnapshot } from "./types";

type CacheRecord = {
  value: TodaySnapshot;
  expiresAt: number;
};

const TODAY_CACHE_TTL_MS = 15 * 60 * 1000;
const TODAY_CACHE_VERSION = "v4";
const globalCache = globalThis as typeof globalThis & {
  __eventClocksTodayCache?: Map<string, CacheRecord>;
};

const memoryCache = globalCache.__eventClocksTodayCache ?? new Map<string, CacheRecord>();
globalCache.__eventClocksTodayCache = memoryCache;

function hasCurrentForexShape(snapshot: TodaySnapshot) {
  return snapshot.forex.comparisons.every((comparison) => {
    return (
      typeof comparison.localToAnchorRate === "number" &&
      Number.isFinite(comparison.localToAnchorRate) &&
      comparison.localToAnchorRate > 0
    );
  });
}

function hasCurrentCountdownShape(snapshot: TodaySnapshot) {
  return (
    "saturdayStartsAtIso" in snapshot.weekend &&
    (!snapshot.holiday.nextHoliday || "startsAtIso" in snapshot.holiday.nextHoliday)
  );
}

function hasCurrentHolidayCopy(snapshot: TodaySnapshot) {
  const staleHolidayNames = ["No public holiday is listed", "Truman Day"];

  const nextHolidayName = snapshot.holiday.nextHoliday?.name ?? "";

  return staleHolidayNames.every((name) => {
    return !snapshot.summary.includes(name) && !nextHolidayName.includes(name);
  });
}

function normalizeCachePart(value: string | undefined) {
  if (!value) return "";

  return value
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

export function getTodayCacheKey({
  countryCode,
  regionCode,
  city,
  date,
}: {
  countryCode: string;
  regionCode?: string;
  city?: string;
  date: string;
}) {
  return `today:${TODAY_CACHE_VERSION}:${normalizeCachePart(countryCode)}:${normalizeCachePart(
    regionCode,
  )}:${normalizeCachePart(city)}:${date}`;
}

export async function readTodaySnapshot(key: string) {
  const cached = memoryCache.get(key);
  if (!cached) return null;

  if (cached.expiresAt <= Date.now()) {
    memoryCache.delete(key);
    return null;
  }

  if (
    !hasCurrentForexShape(cached.value) ||
    !hasCurrentCountdownShape(cached.value) ||
    !hasCurrentHolidayCopy(cached.value)
  ) {
    memoryCache.delete(key);
    return null;
  }

  return cached.value;
}

export async function writeTodaySnapshot(key: string, value: TodaySnapshot) {
  memoryCache.set(key, {
    value,
    expiresAt: Date.now() + TODAY_CACHE_TTL_MS,
  });
}
