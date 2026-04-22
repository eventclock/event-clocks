import { NextResponse } from "next/server";
import {
  findNearestTimeZoneCities,
  searchTimeZoneCities,
} from "@/lib/timezones/citySearch";

export function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 10);
  const latitudeParam = url.searchParams.get("lat");
  const longitudeParam = url.searchParams.get("lon");
  const latitude = latitudeParam === null ? null : Number(latitudeParam);
  const longitude = longitudeParam === null ? null : Number(longitudeParam);
  const country = url.searchParams.get("country") ?? undefined;
  const safeLimit = Number.isFinite(limit) ? limit : 10;
  const hasCoordinates =
    typeof latitude === "number" &&
    typeof longitude === "number" &&
    Number.isFinite(latitude) &&
    Number.isFinite(longitude);
  const results =
    hasCoordinates
      ? findNearestTimeZoneCities(latitude, longitude, safeLimit)
      : searchTimeZoneCities(query, safeLimit, country);

  return NextResponse.json(
    {
      results,
    },
    {
      headers: {
        "Cache-Control": "no-store",
      },
    },
  );
}
