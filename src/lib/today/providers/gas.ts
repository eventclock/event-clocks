import type { OptionalTodaySnapshot, SupportedCountry } from "../types";

type EiaResponse = {
  response?: {
    data?: Array<{
      period?: string;
      value?: number;
    }>;
  };
};

export async function getGasPrices(
  country: SupportedCountry,
): Promise<OptionalTodaySnapshot | null> {
  if (country.code !== "US" || !process.env.EIA_API_KEY) {
    return null;
  }

  const params = new URLSearchParams({
    frequency: "weekly",
    "data[0]": "value",
    "facets[product][]": "EPM0",
    "facets[duoarea][]": "NUS",
    "sort[0][column]": "period",
    "sort[0][direction]": "desc",
    length: "1",
    api_key: process.env.EIA_API_KEY,
  });
  const response = await fetch(`https://api.eia.gov/v2/petroleum/pri/gnd/data/?${params}`, {
    next: { revalidate: 60 * 60 * 24 },
  });

  if (!response.ok) return null;

  const data = (await response.json()) as EiaResponse;
  const latest = data.response?.data?.[0];

  if (typeof latest?.value !== "number") return null;

  return {
    status: "available",
    label: "US Gas Price",
    value: `$${latest.value.toFixed(2)} per gallon`,
    note: latest.period ? `US regular retail average, week of ${latest.period}` : undefined,
  };
}
