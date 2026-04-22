import cityData from "./timezone-cities.generated.json";

export type TimeZoneCity = {
  i: string;
  n: string;
  a: string;
  c: string;
  cn: string;
  l: string;
  t: string;
  p: number;
  lat: number | null;
  lon: number | null;
  s: string[];
};

export type TimeZoneCitySearchResult = {
  id: string;
  label: string;
  name: string;
  adminName: string;
  countryCode: string;
  countryName: string;
  timeZone: string;
  population: number;
};

const cities = (cityData as { cities: TimeZoneCity[] }).cities;

export function normalizeCityQuery(value: string) {
  return value
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function toResult(city: TimeZoneCity): TimeZoneCitySearchResult {
  return {
    id: city.i,
    label: city.l,
    name: city.n,
    adminName: city.a,
    countryCode: city.c,
    countryName: city.cn,
    timeZone: city.t,
    population: city.p,
  };
}

function scoreCity(city: TimeZoneCity, query: string) {
  const normalizedName = normalizeCityQuery(city.n);
  const normalizedLabel = normalizeCityQuery(city.l);
  const exactAlias = city.s.some((alias) => alias === query);
  const startsAlias = city.s.some((alias) => alias.startsWith(query));
  const includesAlias = city.s.some((alias) => alias.includes(query));

  if (normalizedName === query || normalizedLabel === query) return 1200;
  if (normalizedName.startsWith(query) || normalizedLabel.startsWith(query)) return 950;
  if (exactAlias) return 800;
  if (normalizedName.includes(query) || normalizedLabel.includes(query)) return 600;
  if (startsAlias) return 350;
  if (includesAlias) return 150;
  return 0;
}

export function searchTimeZoneCities(query: string, limit = 10) {
  const normalized = normalizeCityQuery(query);
  if (normalized.length < 2) return [];

  return cities
    .map((city) => ({ city, score: scoreCity(city, normalized) }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.city.p !== a.city.p) return b.city.p - a.city.p;
      return a.city.l.localeCompare(b.city.l, "en");
    })
    .slice(0, Math.max(1, Math.min(limit, 20)))
    .map((entry) => toResult(entry.city));
}

export function findTimeZoneCityByLabel(label: string) {
  const normalized = normalizeCityQuery(label);
  if (!normalized) return null;

  const city = cities.find((candidate) => normalizeCityQuery(candidate.l) === normalized);
  return city ? toResult(city) : null;
}
