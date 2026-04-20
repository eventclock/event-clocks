"use client";

import { useEffect, useState } from "react";
import { getTimeZoneMetadata } from "@/lib/timezones/metadata";

export default function TimezoneDatalist() {
  const [tzs, setTzs] = useState<string[]>([]);

  useEffect(() => {
    const intlWithSupportedValues = Intl as typeof Intl & {
      supportedValuesOf?: (key: "timeZone") => string[];
    };

    // Browser source of truth
    const list = intlWithSupportedValues.supportedValuesOf?.("timeZone") ?? [];

    // Make ordering deterministic in the browser
    const sorted = [...list].sort((a: string, b: string) =>
      a.localeCompare(b, "en")
    );

    setTzs(sorted);
  }, []);

  // Render nothing until mounted -> server and first client render match (both empty)
  if (tzs.length === 0) return null;

  return (
    <datalist id="tz-list">
      {tzs.map((tz) => {
        const metadata = getTimeZoneMetadata(tz);

        return (
          <option
            key={tz}
            value={tz}
            label={metadata.displayName}
          />
        );
      })}
    </datalist>
  );
}
