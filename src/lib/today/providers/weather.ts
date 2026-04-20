import type { TodayLocation, WeatherSnapshot } from "../types";

const WEATHER_CODES: Record<number, string> = {
  0: "clear",
  1: "mostly clear",
  2: "partly cloudy",
  3: "cloudy",
  45: "foggy",
  48: "foggy",
  51: "light drizzle",
  53: "drizzle",
  55: "heavy drizzle",
  61: "light rain",
  63: "rain",
  65: "heavy rain",
  71: "light snow",
  73: "snow",
  75: "heavy snow",
  80: "rain showers",
  81: "rain showers",
  82: "heavy rain showers",
  95: "thunderstorms",
};

type OpenMeteoResponse = {
  current?: {
    temperature_2m?: number;
    weather_code?: number;
  };
};

export async function getWeather(location: TodayLocation): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "temperature_2m,weather_code",
    timezone: location.timeZone,
  });

  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`, {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) {
    throw new Error(`weather:${response.status}`);
  }

  const data = (await response.json()) as OpenMeteoResponse;
  const temperatureC = data.current?.temperature_2m ?? null;
  const code = data.current?.weather_code;

  return {
    status: temperatureC === null && code === undefined ? "unavailable" : "available",
    place: location.city,
    temperatureC,
    condition: code === undefined ? null : WEATHER_CODES[code] ?? "conditions reported",
  };
}

export function unavailableWeather(location: TodayLocation): WeatherSnapshot {
  return {
    status: "unavailable",
    place: location.city,
    temperatureC: null,
    condition: null,
  };
}
