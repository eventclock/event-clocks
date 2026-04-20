import type { GeoContext } from "@/lib/geo";
import { zonedDateTimeLocalToUtc } from "@/lib/tz";
import { getTodayCacheKey, readTodaySnapshot, writeTodaySnapshot } from "./cache";
import { getDailyMantra } from "./mantras";
import { getWeekendCountdown } from "./weekend";
import { getFunFact } from "./funFacts";
import { getAirQuality } from "./providers/airQuality";
import { getEarthquakes } from "./providers/earthquakes";
import { getForex, unavailableForex } from "./providers/forex";
import { getGasPrices } from "./providers/gas";
import { getHoliday, unavailableHoliday } from "./providers/holidays";
import { resolveTodayLocation } from "./providers/location";
import { getMoonPhase } from "./providers/moonPhase";
import { getSun, unavailableSun } from "./providers/sun";
import { getWeather, unavailableWeather } from "./providers/weather";
import type {
  ForexSnapshot,
  HolidaySnapshot,
  OptionalTodaySnapshot,
  SunSnapshot,
  TodayLocation,
  TodaySnapshot,
  WeatherSnapshot,
} from "./types";

type ProviderResult<T> = {
  data: T;
  error: string | null;
};

function getLocationDate(location: TodayLocation) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: location.timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());

  const year = parts.find((part) => part.type === "year")?.value;
  const month = parts.find((part) => part.type === "month")?.value;
  const day = parts.find((part) => part.type === "day")?.value;

  if (!year || !month || !day) {
    return new Date().toISOString().slice(0, 10);
  }

  return `${year}-${month}-${day}`;
}

function addDaysToYYYYMMDD(date: string, days: number) {
  const [year, month, day] = date.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

function localDateStartIso(date: string, timeZone: string) {
  return zonedDateTimeLocalToUtc(`${date}T00:00`, timeZone)?.toISOString() ?? null;
}

async function runProvider<T>(
  name: string,
  provider: () => Promise<T>,
  fallback: T,
): Promise<ProviderResult<T>> {
  try {
    return {
      data: await provider(),
      error: null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown error";
    return {
      data: fallback,
      error: `${name}: ${message}`,
    };
  }
}

async function runOptionalProvider(
  name: string,
  provider: () => Promise<OptionalTodaySnapshot | null>,
): Promise<ProviderResult<OptionalTodaySnapshot | null>> {
  return runProvider(name, provider, null);
}

function formatTemperature(value: number) {
  return `${Math.round(value)}°C`;
}

function formatRate(value: number) {
  return new Intl.NumberFormat("en", {
    maximumFractionDigits: value >= 100 ? 2 : 4,
    minimumFractionDigits: value >= 10 ? 2 : 0,
  }).format(value);
}

export function formatTodaySummary(snapshot: {
  location: TodayLocation;
  weather: WeatherSnapshot;
  holiday: HolidaySnapshot;
  forex: ForexSnapshot;
  sun: SunSnapshot;
  weekend: { label: string };
}) {
  const sentences: string[] = [];

  if (snapshot.weather.status === "available") {
    const weatherParts = [
      snapshot.weather.temperatureC === null
        ? null
        : formatTemperature(snapshot.weather.temperatureC),
      snapshot.weather.condition,
    ].filter(Boolean);

    if (weatherParts.length > 0) {
      sentences.push(`${weatherParts.join(" and ")} in ${snapshot.location.city} today.`);
    }
  }

  if (snapshot.holiday.status === "available") {
    sentences.push(
      snapshot.holiday.isHoliday && snapshot.holiday.name
        ? `${snapshot.holiday.name} is listed as a public holiday.`
        : "Today is not a public holiday.",
    );
  }

  if (snapshot.sun.status === "available" && snapshot.sun.sunset) {
    sentences.push(`Sunset is at ${snapshot.sun.sunset}.`);
  }

  const usdComparison = snapshot.forex.comparisons.find(
    (comparison) => comparison.anchor === "USD",
  );
  if (snapshot.forex.status === "available" && usdComparison) {
    sentences.push(
      `1 ${snapshot.forex.localCurrency} is ${formatRate(
        usdComparison.localToAnchorRate,
      )} USD today.`,
    );
  } else if (snapshot.forex.status === "available" && snapshot.forex.comparisons.length > 0) {
    sentences.push("Currency comparisons are available below.");
  }

  sentences.push(
    snapshot.weekend.label.endsWith(".")
      ? snapshot.weekend.label
      : `${snapshot.weekend.label}.`,
  );

  return sentences.join(" ");
}

function funFactSnapshot(location: TodayLocation): OptionalTodaySnapshot | null {
  const fact = getFunFact(location.country.code);
  if (!fact) return null;

  return {
    status: "available",
    label: "Fun Fact",
    value: fact,
  };
}

export async function getTodaySnapshot(geo: GeoContext): Promise<TodaySnapshot> {
  const location = await resolveTodayLocation(geo);
  const date = getLocationDate(location);
  const cacheKey = getTodayCacheKey({
    countryCode: location.country.code,
    regionCode: location.regionCode,
    city: location.cacheCity ?? location.city,
    date,
  });
  const cached = await readTodaySnapshot(cacheKey);

  if (cached) {
    return cached;
  }

  const currentDate = new Date(`${date}T12:00:00.000Z`);
  const [weatherResult, holidayResult, forexResult, sunResult] = await Promise.all([
    runProvider("weather", () => getWeather(location), unavailableWeather(location)),
    runProvider("holidays", () => getHoliday(location.country, date), unavailableHoliday()),
    runProvider("forex", () => getForex(location.country), unavailableForex(location.country)),
    runProvider("sun", () => getSun(location, date), unavailableSun()),
  ]);

  const [airQuality, moonPhase, earthquakes, gas] = await Promise.all([
    runOptionalProvider("airQuality", () => getAirQuality(location)),
    runOptionalProvider("moonPhase", () => getMoonPhase(currentDate)),
    runOptionalProvider("earthquakes", () => getEarthquakes(location, date)),
    runOptionalProvider("gas", () => getGasPrices(location.country)),
  ]);

  const weekendDays = getWeekendCountdown(currentDate).daysUntilSaturday;
  const saturdayOffset = weekendDays === 0 ? 7 : weekendDays;
  const saturdayDate = addDaysToYYYYMMDD(date, saturdayOffset);
  const weekend = getWeekendCountdown(
    currentDate,
    localDateStartIso(saturdayDate, location.timeZone),
  );
  const holiday = holidayResult.data.nextHoliday
    ? {
        ...holidayResult.data,
        nextHoliday: {
          ...holidayResult.data.nextHoliday,
          startsAtIso: localDateStartIso(
            holidayResult.data.nextHoliday.date,
            location.timeZone,
          ),
        },
      }
    : holidayResult.data;
  const mantra = getDailyMantra(currentDate);
  const providerErrors = [
    weatherResult.error,
    holidayResult.error,
    forexResult.error,
    sunResult.error,
    airQuality.error,
    moonPhase.error,
    earthquakes.error,
    gas.error,
  ].filter((error): error is string => Boolean(error));

  const snapshot: TodaySnapshot = {
    cacheKey,
    date,
    generatedAt: new Date().toISOString(),
    country: location.country,
    location,
    weather: weatherResult.data,
    holiday,
    forex: forexResult.data,
    sun: sunResult.data,
    mantra,
    weekend,
    extras: {
      airQuality: airQuality.data,
      moonPhase: moonPhase.data,
      earthquakes: earthquakes.data,
      funFact: funFactSnapshot(location),
      gas: gas.data,
    },
    providerErrors,
    summary: "",
  };

  snapshot.summary = formatTodaySummary(snapshot);
  await writeTodaySnapshot(cacheKey, snapshot);

  return snapshot;
}
