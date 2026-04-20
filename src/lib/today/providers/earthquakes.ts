import type { OptionalTodaySnapshot, TodayLocation } from "../types";

type UsgsFeature = {
  properties?: {
    mag?: number;
    place?: string;
    time?: number;
  };
};

type UsgsResponse = {
  features?: UsgsFeature[];
};

export async function getEarthquakes(
  location: TodayLocation,
  date: string,
): Promise<OptionalTodaySnapshot | null> {
  const params = new URLSearchParams({
    format: "geojson",
    starttime: date,
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    maxradiuskm: "750",
    minmagnitude: "4.5",
    orderby: "time",
  });
  const response = await fetch(`https://earthquake.usgs.gov/fdsnws/event/1/query?${params}`, {
    next: { revalidate: 60 * 30 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as UsgsResponse;
  const quake = data.features?.[0];
  const magnitude = quake?.properties?.mag;

  if (typeof magnitude !== "number") return null;

  return {
    status: "available",
    label: "Earthquake Alerts",
    value: `M${magnitude.toFixed(1)} nearby`,
    note: quake?.properties?.place ?? `Within 750 km of ${location.city}`,
  };
}
