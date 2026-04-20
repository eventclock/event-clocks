export type CountryCode =
  | "US"
  | "PH"
  | "GB"
  | "CA"
  | "AU"
  | "NZ"
  | "SG"
  | "JP"
  | "IN"
  | "DE"
  | "FR"
  | "ES"
  | "IT"
  | "BR"
  | "MX";

export type Availability = "available" | "unavailable";

export type SupportedCountry = {
  code: CountryCode;
  name: string;
  adjective: string;
  currency: string;
  capital: string;
  latitude: number;
  longitude: number;
  timeZone: string;
};

export type TodayLocation = {
  country: SupportedCountry;
  regionCode?: string;
  city: string;
  cacheCity?: string;
  latitude: number;
  longitude: number;
  timeZone: string;
  source: "override" | "cloudflare" | "browser" | "fallback";
  confidence: "high" | "medium" | "low";
};

export type WeatherSnapshot = {
  status: Availability;
  place: string;
  temperatureC: number | null;
  condition: string | null;
};

export type HolidaySnapshot = {
  status: Availability;
  isHoliday: boolean;
  name: string | null;
  nextHoliday: {
    name: string;
    date: string;
    countdownDays: number;
    startsAtIso: string | null;
  } | null;
};

export type ForexComparison = {
  anchor: "USD" | "EUR" | "JPY" | "GBP" | "AUD";
  localCurrency: string;
  localToAnchorRate: number;
};

export type ForexSnapshot = {
  status: Availability;
  localCurrency: string;
  comparisons: ForexComparison[];
  asOf: string | null;
};

export type SunSnapshot = {
  status: Availability;
  sunrise: string | null;
  sunset: string | null;
};

export type OptionalTodaySnapshot = {
  status: Availability;
  label: string;
  value: string;
  note?: string;
};

export type WeekendSnapshot = {
  daysUntilSaturday: number;
  label: string;
  saturdayStartsAtIso: string | null;
};

export type TodaySnapshot = {
  cacheKey: string;
  date: string;
  generatedAt: string;
  country: SupportedCountry;
  location: TodayLocation;
  summary: string;
  weather: WeatherSnapshot;
  holiday: HolidaySnapshot;
  forex: ForexSnapshot;
  sun: SunSnapshot;
  mantra: string;
  weekend: WeekendSnapshot;
  extras: {
    airQuality: OptionalTodaySnapshot | null;
    moonPhase: OptionalTodaySnapshot | null;
    earthquakes: OptionalTodaySnapshot | null;
    funFact: OptionalTodaySnapshot | null;
    gas: OptionalTodaySnapshot | null;
  };
  providerErrors: string[];
};

export const SUPPORTED_COUNTRIES: SupportedCountry[] = [
  {
    code: "US",
    name: "United States",
    adjective: "American",
    currency: "USD",
    capital: "Washington, DC",
    latitude: 38.9072,
    longitude: -77.0369,
    timeZone: "America/New_York",
  },
  {
    code: "PH",
    name: "Philippines",
    adjective: "Philippine",
    currency: "PHP",
    capital: "Manila",
    latitude: 14.5995,
    longitude: 120.9842,
    timeZone: "Asia/Manila",
  },
  {
    code: "GB",
    name: "United Kingdom",
    adjective: "UK",
    currency: "GBP",
    capital: "London",
    latitude: 51.5072,
    longitude: -0.1276,
    timeZone: "Europe/London",
  },
  {
    code: "CA",
    name: "Canada",
    adjective: "Canadian",
    currency: "CAD",
    capital: "Ottawa",
    latitude: 45.4215,
    longitude: -75.6972,
    timeZone: "America/Toronto",
  },
  {
    code: "AU",
    name: "Australia",
    adjective: "Australian",
    currency: "AUD",
    capital: "Canberra",
    latitude: -35.2809,
    longitude: 149.13,
    timeZone: "Australia/Sydney",
  },
  {
    code: "NZ",
    name: "New Zealand",
    adjective: "New Zealand",
    currency: "NZD",
    capital: "Wellington",
    latitude: -41.2865,
    longitude: 174.7762,
    timeZone: "Pacific/Auckland",
  },
  {
    code: "SG",
    name: "Singapore",
    adjective: "Singapore",
    currency: "SGD",
    capital: "Singapore",
    latitude: 1.3521,
    longitude: 103.8198,
    timeZone: "Asia/Singapore",
  },
  {
    code: "JP",
    name: "Japan",
    adjective: "Japanese",
    currency: "JPY",
    capital: "Tokyo",
    latitude: 35.6762,
    longitude: 139.6503,
    timeZone: "Asia/Tokyo",
  },
  {
    code: "IN",
    name: "India",
    adjective: "Indian",
    currency: "INR",
    capital: "New Delhi",
    latitude: 28.6139,
    longitude: 77.209,
    timeZone: "Asia/Kolkata",
  },
  {
    code: "DE",
    name: "Germany",
    adjective: "German",
    currency: "EUR",
    capital: "Berlin",
    latitude: 52.52,
    longitude: 13.405,
    timeZone: "Europe/Berlin",
  },
  {
    code: "FR",
    name: "France",
    adjective: "French",
    currency: "EUR",
    capital: "Paris",
    latitude: 48.8566,
    longitude: 2.3522,
    timeZone: "Europe/Paris",
  },
  {
    code: "ES",
    name: "Spain",
    adjective: "Spanish",
    currency: "EUR",
    capital: "Madrid",
    latitude: 40.4168,
    longitude: -3.7038,
    timeZone: "Europe/Madrid",
  },
  {
    code: "IT",
    name: "Italy",
    adjective: "Italian",
    currency: "EUR",
    capital: "Rome",
    latitude: 41.9028,
    longitude: 12.4964,
    timeZone: "Europe/Rome",
  },
  {
    code: "BR",
    name: "Brazil",
    adjective: "Brazilian",
    currency: "BRL",
    capital: "Brasilia",
    latitude: -15.7939,
    longitude: -47.8828,
    timeZone: "America/Sao_Paulo",
  },
  {
    code: "MX",
    name: "Mexico",
    adjective: "Mexican",
    currency: "MXN",
    capital: "Mexico City",
    latitude: 19.4326,
    longitude: -99.1332,
    timeZone: "America/Mexico_City",
  },
];

export function getSupportedCountry(code: string | undefined | null) {
  const normalized = code?.toUpperCase();
  return (
    SUPPORTED_COUNTRIES.find((country) => country.code === normalized) ??
    SUPPORTED_COUNTRIES[0]
  );
}
