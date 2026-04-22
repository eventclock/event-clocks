"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  getBrowserGeoPosition,
  saveGeoOverride,
} from "@/lib/geo/fromBrowser";
import type { GeoContext } from "@/lib/geo/types";
import type { TodaySnapshot } from "@/lib/today/types";
import { SUPPORTED_COUNTRIES, type CountryCode } from "@/lib/today/types";
import styles from "@/app/today/today.module.css";

type Props = {
  snapshot: TodaySnapshot;
};

type CitySuggestion = {
  id: string;
  label: string;
  name: string;
  adminName: string;
  countryCode: string;
  countryName: string;
  timeZone: string;
  population: number;
  latitude: number | null;
  longitude: number | null;
};

const SUPPORTED_COUNTRY_CODES = new Set<string>(
  SUPPORTED_COUNTRIES.map((country) => country.code),
);

function sourceLabel(source: GeoContext["source"]) {
  if (source === "browser") return "Browser location";
  if (source === "cloudflare") return "Approximate network location";
  if (source === "override") return "Saved location";
  return "Default location";
}

function displayLocationName(snapshot: TodaySnapshot) {
  const city = snapshot.location.city.trim();
  const countryName = snapshot.country.name.trim();
  if (!city) return countryName;
  if (city.toLowerCase().endsWith(countryName.toLowerCase())) return city;
  return `${city}, ${countryName}`;
}

function buildTodayUrl(geo: GeoContext) {
  const params = new URLSearchParams();
  if (geo.countryCode) params.set("country", geo.countryCode);
  if (geo.regionCode) params.set("region", geo.regionCode);
  if (geo.city) params.set("city", geo.city);
  if (geo.timezone) params.set("tz", geo.timezone);
  if (typeof geo.latitude === "number") params.set("lat", String(geo.latitude));
  if (typeof geo.longitude === "number") params.set("lon", String(geo.longitude));
  params.set("source", geo.source);

  return `/today?${params.toString()}`;
}

export default function TodayLocationControls({ snapshot }: Props) {
  const router = useRouter();
  const [isChanging, setIsChanging] = useState(false);
  const [countryCode, setCountryCode] = useState(snapshot.country.code);
  const [city, setCity] = useState(snapshot.location.city);
  const [regionCode, setRegionCode] = useState(snapshot.location.regionCode ?? "");
  const [timezone, setTimezone] = useState(snapshot.location.timeZone);
  const [latitude, setLatitude] = useState<number | undefined>(snapshot.location.latitude);
  const [longitude, setLongitude] = useState<number | undefined>(snapshot.location.longitude);
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [isCityFocused, setIsCityFocused] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locatingMessage, setLocatingMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const latestCityQueryRef = useRef("");

  const canSaveSelectedLocation =
    Boolean(city.trim()) &&
    Boolean(timezone) &&
    SUPPORTED_COUNTRY_CODES.has(countryCode) &&
    typeof latitude === "number" &&
    typeof longitude === "number";

  function toggleChangeLocation() {
    setIsChanging((current) => {
      const next = !current;
      if (next) {
        setCityQuery("");
        setCitySuggestions([]);
        setError(null);
      }
      return next;
    });
  }

  useEffect(() => {
    const query = cityQuery.trim();
    const normalized = query.toLowerCase();
    if (!isCityFocused || query.length < 2) {
      latestCityQueryRef.current = "";
      setCitySuggestions([]);
      return;
    }

    latestCityQueryRef.current = normalized;
    const controller = new AbortController();
    const timeout = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/timezone-cities?q=${encodeURIComponent(query)}`, {
          cache: "no-store",
          signal: controller.signal,
        });
        if (!response.ok) return;
        const data = (await response.json()) as { results?: CitySuggestion[] };
        if (latestCityQueryRef.current === normalized) {
          setCitySuggestions(Array.isArray(data.results) ? data.results : []);
        }
      } catch {
        if (!controller.signal.aborted) setCitySuggestions([]);
      }
    }, 180);

    return () => {
      window.clearTimeout(timeout);
      controller.abort();
    };
  }, [cityQuery, isCityFocused]);

  function applyCitySuggestion(suggestion: CitySuggestion) {
    if (!SUPPORTED_COUNTRY_CODES.has(suggestion.countryCode)) {
      setError("Today is not available for that country yet.");
      return;
    }

    setCountryCode(suggestion.countryCode as CountryCode);
    setCity(suggestion.label);
    setCityQuery(suggestion.label);
    setRegionCode(suggestion.adminName);
    setTimezone(suggestion.timeZone);
    setLatitude(suggestion.latitude ?? undefined);
    setLongitude(suggestion.longitude ?? undefined);
    setCitySuggestions([]);
    setIsCityFocused(false);
  }

  function applyOverride() {
    if (!canSaveSelectedLocation) {
      setError("Choose a city from the list before saving.");
      return;
    }

    const geo: GeoContext = {
      countryCode,
      regionCode: regionCode.trim() || undefined,
      city: city.trim() || undefined,
      timezone: timezone || undefined,
      latitude,
      longitude,
      source: "override",
      confidence: typeof latitude === "number" && typeof longitude === "number" ? "high" : "medium",
    };

    saveGeoOverride(geo);
    router.push(buildTodayUrl(geo));
    setIsChanging(false);
  }

  function describeGeoError(errorValue: unknown) {
    if (
      typeof GeolocationPositionError !== "undefined" &&
      errorValue instanceof GeolocationPositionError
    ) {
      if (errorValue.code === errorValue.PERMISSION_DENIED) {
        return "Location permission is blocked. Allow location access in your browser settings, then try again.";
      }
      if (errorValue.code === errorValue.POSITION_UNAVAILABLE) {
        return "Your browser could not determine your current location.";
      }
      if (errorValue.code === errorValue.TIMEOUT) {
        return "Location lookup timed out. Try again or search for your city instead.";
      }
    }

    return "We could not identify a nearby city from your browser location.";
  }

  async function useBrowserLocation() {
    setError(null);
    setLocatingMessage("Waiting for browser location permission...");
    setIsLocating(true);

    try {
      if (typeof window === "undefined" || !window.isSecureContext) {
        throw new Error("insecure-context");
      }

      if (!navigator.geolocation) {
        throw new Error("geolocation-unavailable");
      }

      const position = await getBrowserGeoPosition();
      setLocatingMessage("Finding the nearest city...");
      const browserLatitude = Number(position.coords.latitude.toFixed(5));
      const browserLongitude = Number(position.coords.longitude.toFixed(5));
      const browserTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const params = new URLSearchParams({
        lat: String(browserLatitude),
        lon: String(browserLongitude),
        limit: "1",
      });
      const response = await fetch(`/api/timezone-cities?${params}`, {
        cache: "no-store",
      });
      if (!response.ok) throw new Error("nearest-city");
      const data = (await response.json()) as { results?: CitySuggestion[] };
      const nearest = data.results?.[0];
      if (!nearest) throw new Error("nearest-city");
      const supportedNearest = SUPPORTED_COUNTRIES.some(
        (country) => country.code === nearest.countryCode,
      );
      if (!supportedNearest) throw new Error("unsupported-country");

      const geo: GeoContext = {
        countryCode: nearest.countryCode,
        regionCode: nearest.adminName,
        city: nearest.label,
        timezone: nearest.timeZone || browserTimeZone,
        latitude: browserLatitude,
        longitude: browserLongitude,
        source: "browser",
        confidence: "high",
      };

      saveGeoOverride(geo);
      setLocatingMessage("Loading your local snapshot...");
      router.push(buildTodayUrl(geo));
    } catch (caughtError) {
      const message =
        caughtError instanceof Error && caughtError.message === "insecure-context"
          ? "Browser location only works on HTTPS or localhost."
          : caughtError instanceof Error && caughtError.message === "geolocation-unavailable"
            ? "This browser does not support location lookup."
            : describeGeoError(caughtError);
      setError(message);
    } finally {
      setLocatingMessage(null);
      setIsLocating(false);
    }
  }

  return (
    <section className={styles.locationShell}>
      <div className={styles.locationTop}>
        <div>
          <p className={styles.locationLabel}>
            Detected location
          </p>
          <p className={styles.locationName}>
            {displayLocationName(snapshot)}
          </p>
          <p className={styles.locationSource}>
            {sourceLabel(snapshot.location.source)}
          </p>
        </div>

        <div className={styles.locationActions}>
          <button
            type="button"
            onClick={toggleChangeLocation}
            className={styles.controlButton}
          >
            Change location
          </button>
          <button
            type="button"
            onClick={useBrowserLocation}
            disabled={isLocating}
            className={styles.controlButtonPrimary}
          >
            {isLocating ? "Locating..." : "Use my location"}
          </button>
        </div>
      </div>

      {isChanging && (
        <div className={styles.locationForm}>
          <label className={`${styles.field} ${styles.cityField}`}>
            City or place
            <span className={styles.citySearchWrap}>
              <input
                autoFocus
                value={cityQuery}
                onChange={(event) => {
                  const value = event.target.value;
                  setCity("");
                  setCityQuery(value);
                  setLatitude(undefined);
                  setLongitude(undefined);
                  setTimezone("");
                  setError(null);
                }}
                onFocus={() => {
                  setIsCityFocused(true);
                }}
                onBlur={() => {
                  window.setTimeout(() => {
                    setIsCityFocused(false);
                    setCitySuggestions([]);
                  }, 120);
                }}
                className={styles.input}
                placeholder="Search city or place"
              />
              {isCityFocused && citySuggestions.length > 0 && (
                <span className={styles.citySuggestions}>
                  {citySuggestions.map((suggestion) => (
                    <button
                      key={suggestion.id}
                      type="button"
                      className={styles.citySuggestion}
                      onMouseDown={(event) => event.preventDefault()}
                      onClick={() => applyCitySuggestion(suggestion)}
                    >
                      <span>{suggestion.label}</span>
                      <span>{suggestion.timeZone}</span>
                    </button>
                  ))}
                </span>
              )}
            </span>
          </label>

          {city && (
            <p className={styles.selectedCity}>
              Selected: {city}
            </p>
          )}

          <div className={styles.saveRow}>
            <button
              type="button"
              onClick={applyOverride}
              disabled={!canSaveSelectedLocation}
              className={styles.saveButton}
            >
              Save location
            </button>
          </div>
        </div>
      )}

      {error && (
        <p className={styles.locationError}>
          {error}
        </p>
      )}

      {locatingMessage && (
        <p className={styles.locationStatus}>
          {locatingMessage}
        </p>
      )}
    </section>
  );
}
