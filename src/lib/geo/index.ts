import { cookies } from "next/headers";
import { GEO_OVERRIDE_COOKIE } from "./fromBrowser";
import { geoFromCloudflare } from "./fromCloudflare";
import type { GeoContext, GeoSource, SavedGeoOverride } from "./types";

type ResolveGeoOptions = {
  countryCode?: string;
  regionCode?: string;
  city?: string;
  timezone?: string;
  latitude?: string;
  longitude?: string;
  source?: string;
};

function clean(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function parseCoordinate(value: string | undefined) {
  if (!value) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function validSource(value: string | undefined): GeoSource {
  return value === "browser" ? "browser" : "override";
}

function fromSearchParams(params: ResolveGeoOptions): GeoContext | null {
  const countryCode = clean(params.countryCode)?.toUpperCase();
  const city = clean(params.city);
  const regionCode = clean(params.regionCode);
  const latitude = parseCoordinate(params.latitude);
  const longitude = parseCoordinate(params.longitude);

  if (!countryCode && !city && (latitude === undefined || longitude === undefined)) {
    return null;
  }

  return {
    countryCode,
    regionCode,
    city,
    timezone: clean(params.timezone),
    latitude,
    longitude,
    source: validSource(params.source),
    confidence: latitude !== undefined && longitude !== undefined ? "high" : "medium",
  };
}

async function fromSavedOverride(): Promise<GeoContext | null> {
  const cookieStore = await cookies();
  const encoded = cookieStore.get(GEO_OVERRIDE_COOKIE)?.value;
  if (!encoded) return null;

  try {
    const parsed = JSON.parse(decodeURIComponent(encoded)) as SavedGeoOverride;

    return {
      countryCode: clean(parsed.countryCode)?.toUpperCase(),
      regionCode: clean(parsed.regionCode),
      city: clean(parsed.city),
      timezone: clean(parsed.timezone),
      latitude: typeof parsed.latitude === "number" ? parsed.latitude : undefined,
      longitude: typeof parsed.longitude === "number" ? parsed.longitude : undefined,
      source: parsed.source === "browser" ? "browser" : "override",
      confidence:
        typeof parsed.latitude === "number" && typeof parsed.longitude === "number"
          ? "high"
          : "medium",
    };
  } catch {
    return null;
  }
}

export async function resolveGeoContext(params: ResolveGeoOptions): Promise<GeoContext> {
  const paramOverride = fromSearchParams(params);
  if (paramOverride) return paramOverride;

  const savedOverride = await fromSavedOverride();
  if (savedOverride) return savedOverride;

  const cloudflare = await geoFromCloudflare();
  if (cloudflare) return cloudflare;

  return {
    countryCode: "US",
    city: "Washington, DC",
    timezone: "America/New_York",
    latitude: 38.9072,
    longitude: -77.0369,
    source: "fallback",
    confidence: "low",
  };
}

export type { GeoContext } from "./types";
