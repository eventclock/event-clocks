import type { OptionalTodaySnapshot, TodayLocation } from "../types";

type AirQualityResponse = {
  current?: {
    european_aqi?: number;
    pm2_5?: number;
  };
};

function describeAqi(aqi: number) {
  if (aqi <= 20) return "Good";
  if (aqi <= 40) return "Fair";
  if (aqi <= 60) return "Moderate";
  if (aqi <= 80) return "Poor";
  if (aqi <= 100) return "Very poor";
  return "Extremely poor";
}

export async function getAirQuality(
  location: TodayLocation,
): Promise<OptionalTodaySnapshot | null> {
  const params = new URLSearchParams({
    latitude: String(location.latitude),
    longitude: String(location.longitude),
    current: "european_aqi,pm2_5",
    timezone: location.timeZone,
  });
  const response = await fetch(`https://air-quality-api.open-meteo.com/v1/air-quality?${params}`, {
    next: { revalidate: 60 * 60 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as AirQualityResponse;
  const aqi = data.current?.european_aqi;
  if (typeof aqi !== "number") return null;

  return {
    status: "available",
    label: "Air Quality",
    value: `${describeAqi(aqi)} (${Math.round(aqi)} EU AQI)`,
    note:
      typeof data.current?.pm2_5 === "number"
        ? `PM2.5 ${Math.round(data.current.pm2_5)} µg/m³ near ${location.city}`
        : `Near ${location.city}`,
  };
}
