import type { GeoContext } from "@/lib/geo";
import type { SupportedCountry, TodayLocation } from "../types";
import { getSupportedCountry } from "../types";

type GeocodingResponse = {
  results?: Array<{
    name?: string;
    latitude?: number;
    longitude?: number;
    country_code?: string;
    admin1?: string;
    timezone?: string;
  }>;
};

async function geocodeCity(country: SupportedCountry, city: string) {
  const params = new URLSearchParams({
    name: city,
    count: "1",
    language: "en",
    format: "json",
  });
  const response = await fetch(`https://geocoding-api.open-meteo.com/v1/search?${params}`, {
    next: { revalidate: 60 * 60 * 24 * 30 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as GeocodingResponse;
  const result =
    data.results?.find((item) => item.country_code === country.code) ?? data.results?.[0] ?? null;

  if (
    !result ||
    typeof result.latitude !== "number" ||
    typeof result.longitude !== "number"
  ) {
    return null;
  }

  return {
    city: result.name ?? city,
    regionCode: result.admin1,
    latitude: result.latitude,
    longitude: result.longitude,
    timeZone: result.timezone,
  };
}

export async function resolveTodayLocation(geo: GeoContext): Promise<TodayLocation> {
  const country = getSupportedCountry(geo.countryCode);
  const latitude = geo.latitude;
  const longitude = geo.longitude;

  if (typeof latitude === "number" && typeof longitude === "number") {
    const cacheCity =
      geo.city ??
      `LAT_${latitude.toFixed(2).replace("-", "S")}_LON_${longitude
        .toFixed(2)
        .replace("-", "W")}`;

    return {
      country,
      regionCode: geo.regionCode,
      city: geo.city ?? "Your location",
      cacheCity,
      latitude,
      longitude,
      timeZone: geo.timezone ?? country.timeZone,
      source: geo.source,
      confidence: geo.confidence,
    };
  }

  if (geo.city) {
    const geocoded = await geocodeCity(country, geo.city);
    if (geocoded) {
      return {
        country,
        regionCode: geo.regionCode ?? geocoded.regionCode,
        city: geocoded.city,
        latitude: geocoded.latitude,
        longitude: geocoded.longitude,
        timeZone: geo.timezone ?? geocoded.timeZone ?? country.timeZone,
        source: geo.source,
        confidence: geo.confidence,
      };
    }
  }

  return {
    country,
    regionCode: geo.regionCode,
    city: country.capital,
    latitude: country.latitude,
    longitude: country.longitude,
    timeZone: geo.timezone ?? country.timeZone,
    source: geo.source === "fallback" ? "fallback" : geo.source,
    confidence: geo.source === "fallback" ? "low" : geo.confidence,
  };
}
