"use client";

import { useEffect, useState } from "react";

export default function TimezoneDatalist() {
  const [tzs, setTzs] = useState<string[]>([]);

  useEffect(() => {
    // Browser source of truth
    const list =
      typeof Intl !== "undefined" && (Intl as any).supportedValuesOf
        ? (Intl as any).supportedValuesOf("timeZone")
        : [];

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
      {tzs.map((tz) => (
        <option key={tz} value={tz} />
      ))}
    </datalist>
  );
}
