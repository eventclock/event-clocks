import type { GeoContext } from "./types";

export const GEO_OVERRIDE_COOKIE = "eventclocks_geo_override";
export const GEO_OVERRIDE_STORAGE_KEY = "eventclocks:geo-override:v1";

export function getBrowserGeoPosition(): Promise<GeolocationPosition> {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error("Browser geolocation is unavailable."));
      return;
    }

    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      maximumAge: 60 * 60 * 1000,
      timeout: 10_000,
    });
  });
}

export function saveGeoOverride(geo: GeoContext) {
  const saved = JSON.stringify(geo);
  localStorage.setItem(GEO_OVERRIDE_STORAGE_KEY, saved);
  document.cookie = `${GEO_OVERRIDE_COOKIE}=${encodeURIComponent(
    saved,
  )}; Max-Age=31536000; Path=/; SameSite=Lax`;
}
