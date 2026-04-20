import type { ForexComparison, ForexSnapshot, SupportedCountry } from "../types";

const ANCHOR_CURRENCIES: ForexComparison["anchor"][] = ["USD", "EUR", "JPY", "GBP", "AUD"];

type FrankfurterResponse = {
  date?: string;
  rates?: Record<string, number>;
};

export async function getForex(country: SupportedCountry): Promise<ForexSnapshot> {
  const anchors = ANCHOR_CURRENCIES.filter((anchor) => anchor !== country.currency);
  const params = new URLSearchParams({
    from: country.currency,
    to: anchors.join(","),
  });
  const response = await fetch(`https://api.frankfurter.app/latest?${params}`, {
    next: { revalidate: 60 * 60 * 6 },
  });

  if (!response.ok) {
    throw new Error(`forex:${response.status}`);
  }

  const data = (await response.json()) as FrankfurterResponse;
  const comparisons = anchors
    .map((anchor) => {
      const rate = data.rates?.[anchor];
      if (typeof rate !== "number" || rate <= 0) return null;

      return {
        anchor,
        localCurrency: country.currency,
        localToAnchorRate: rate,
      };
    })
    .filter((comparison): comparison is ForexComparison => Boolean(comparison));

  return {
    status: comparisons.length > 0 ? "available" : "unavailable",
    localCurrency: country.currency,
    comparisons,
    asOf: data.date ?? null,
  };
}

export function unavailableForex(country: SupportedCountry): ForexSnapshot {
  return {
    status: "unavailable",
    localCurrency: country.currency,
    comparisons: [],
    asOf: null,
  };
}
