"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  getBrowserGeoPosition,
  saveGeoOverride,
} from "@/lib/geo/fromBrowser";
import type { GeoContext } from "@/lib/geo/types";
import type { TodaySnapshot } from "@/lib/today/types";
import { SUPPORTED_COUNTRIES } from "@/lib/today/types";
import styles from "@/app/today/today.module.css";

type Props = {
  snapshot: TodaySnapshot;
};

function sourceLabel(source: GeoContext["source"]) {
  if (source === "browser") return "Browser location";
  if (source === "cloudflare") return "Approximate network location";
  if (source === "override") return "Saved location";
  return "Default location";
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
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function applyOverride() {
    const geo: GeoContext = {
      countryCode,
      regionCode: regionCode.trim() || undefined,
      city: city.trim() || undefined,
      source: "override",
      confidence: city.trim() ? "medium" : "low",
    };

    saveGeoOverride(geo);
    router.push(buildTodayUrl(geo));
    setIsChanging(false);
  }

  async function useBrowserLocation() {
    setError(null);
    setIsLocating(true);

    try {
      const position = await getBrowserGeoPosition();
      const geo: GeoContext = {
        countryCode,
        regionCode: regionCode.trim() || undefined,
        latitude: Number(position.coords.latitude.toFixed(5)),
        longitude: Number(position.coords.longitude.toFixed(5)),
        source: "browser",
        confidence: "high",
      };

      saveGeoOverride(geo);
      router.push(buildTodayUrl(geo));
    } catch {
      setError("Location permission was not available.");
    } finally {
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
            {snapshot.location.city}, {snapshot.country.name}
          </p>
          <p className={styles.locationSource}>
            {sourceLabel(snapshot.location.source)}
          </p>
        </div>

        <div className={styles.locationActions}>
          <button
            type="button"
            onClick={() => setIsChanging((value) => !value)}
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
          <label className={styles.field}>
            Country
            <select
              value={countryCode}
              onChange={(event) => setCountryCode(event.target.value as typeof countryCode)}
              className={styles.select}
            >
              {SUPPORTED_COUNTRIES.map((country) => (
                <option key={country.code} value={country.code}>
                  {country.name}
                </option>
              ))}
            </select>
          </label>

          <label className={styles.field}>
            City
            <input
              value={city}
              onChange={(event) => setCity(event.target.value)}
              className={styles.input}
              placeholder="City"
            />
          </label>

          <label className={styles.field}>
            Region
            <input
              value={regionCode}
              onChange={(event) => setRegionCode(event.target.value)}
              className={`${styles.input} ${styles.regionInput}`}
              placeholder="State"
            />
          </label>

          <div className={styles.saveRow}>
            <button
              type="button"
              onClick={applyOverride}
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
    </section>
  );
}
