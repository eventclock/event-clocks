import { headers } from "next/headers";
import type { GeoContext } from "./types";

function firstHeader(headerMap: Headers, names: string[]) {
  for (const name of names) {
    const value = headerMap.get(name);
    if (value) return decodeURIComponent(value).trim();
  }

  return undefined;
}

function parseCoordinate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function geoFromCloudflare(): Promise<GeoContext | null> {
  const headerMap = await headers();
  const countryCode = firstHeader(headerMap, [
    "cf-ipcountry",
    "x-vercel-ip-country",
    "x-country-code",
  ]);

  if (!countryCode || countryCode === "XX") {
    return null;
  }

  const city = firstHeader(headerMap, ["cf-ipcity", "x-vercel-ip-city", "x-city"]);
  const regionCode = firstHeader(headerMap, [
    "cf-region-code",
    "cf-ipregion",
    "x-vercel-ip-country-region",
    "x-region-code",
  ]);
  const timezone = firstHeader(headerMap, [
    "cf-timezone",
    "x-vercel-ip-timezone",
    "x-timezone",
  ]);
  const latitude = parseCoordinate(
    firstHeader(headerMap, ["cf-iplatitude", "x-vercel-ip-latitude", "x-latitude"]),
  );
  const longitude = parseCoordinate(
    firstHeader(headerMap, ["cf-iplongitude", "x-vercel-ip-longitude", "x-longitude"]),
  );

  return {
    countryCode: countryCode.toUpperCase(),
    regionCode,
    city,
    timezone,
    latitude,
    longitude,
    source: "cloudflare",
    confidence: latitude !== undefined && longitude !== undefined ? "medium" : "low",
  };
}
