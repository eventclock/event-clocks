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
  latitude: number | null;
  longitude: number | null;
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
    latitude: city.lat,
    longitude: city.lon,
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

export function searchTimeZoneCities(query: string, limit = 10, countryCode?: string) {
  const normalized = normalizeCityQuery(query);
  if (normalized.length < 2) return [];
  const countries = new Set(
    countryCode
      ?.split(",")
      .map((code) => code.trim().toUpperCase())
      .filter(Boolean) ?? [],
  );

  return cities
    .filter((city) => countries.size === 0 || countries.has(city.c))
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

function toRadians(value: number) {
  return (value * Math.PI) / 180;
}

function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number) {
  const radiusKm = 6371;
  const dLat = toRadians(lat2 - lat1);
  const dLon = toRadians(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) *
      Math.cos(toRadians(lat2)) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  return radiusKm * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function findNearestTimeZoneCities(latitude: number, longitude: number, limit = 1) {
  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return [];
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return [];

  return cities
    .filter((city) => typeof city.lat === "number" && typeof city.lon === "number")
    .map((city) => ({
      city,
      distanceKm: distanceKm(latitude, longitude, city.lat as number, city.lon as number),
    }))
    .sort((a, b) => {
      if (a.distanceKm !== b.distanceKm) return a.distanceKm - b.distanceKm;
      return b.city.p - a.city.p;
    })
    .slice(0, Math.max(1, Math.min(limit, 10)))
    .map((entry) => ({
      ...toResult(entry.city),
      distanceKm: Number(entry.distanceKm.toFixed(1)),
    }));
}
