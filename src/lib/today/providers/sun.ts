import type { SunSnapshot, TodayLocation } from "../types";

type SunriseSunsetResponse = {
  status?: string;
  results?: {
    sunrise?: string;
    sunset?: string;
  };
};

const timeFormatterCache = new Map<string, Intl.DateTimeFormat>();

function getTimeFormatter(timeZone: string) {
  const cached = timeFormatterCache.get(timeZone);
  if (cached) return cached;

  const formatter = new Intl.DateTimeFormat("en", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  });
  timeFormatterCache.set(timeZone, formatter);
  return formatter;
}

export async function getSun(location: TodayLocation, date: string): Promise<SunSnapshot> {
  const params = new URLSearchParams({
    lat: String(location.latitude),
    lng: String(location.longitude),
    date,
    formatted: "0",
  });
  const response = await fetch(`https://api.sunrise-sunset.org/json?${params}`, {
    next: { revalidate: 60 * 60 * 12 },
  });

  if (!response.ok) {
    throw new Error(`sun:${response.status}`);
  }

  const data = (await response.json()) as SunriseSunsetResponse;
  if (data.status !== "OK" || !data.results?.sunrise || !data.results?.sunset) {
    return unavailableSun();
  }

  const formatter = getTimeFormatter(location.timeZone);

  return {
    status: "available",
    sunrise: formatter.format(new Date(data.results.sunrise)),
    sunset: formatter.format(new Date(data.results.sunset)),
  };
}

export function unavailableSun(): SunSnapshot {
  return {
    status: "unavailable",
    sunrise: null,
    sunset: null,
  };
}
