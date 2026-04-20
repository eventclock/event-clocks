export type GeoSource = "override" | "cloudflare" | "browser" | "fallback";
export type GeoConfidence = "high" | "medium" | "low";

export type GeoContext = {
  countryCode?: string;
  regionCode?: string;
  city?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
  source: GeoSource;
  confidence: GeoConfidence;
};

export type SavedGeoOverride = Omit<GeoContext, "source" | "confidence"> & {
  source?: GeoSource;
};
