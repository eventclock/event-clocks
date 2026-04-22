import { NextResponse } from "next/server";
import { searchTimeZoneCities } from "@/lib/timezones/citySearch";

export function GET(req: Request) {
  const url = new URL(req.url);
  const query = url.searchParams.get("q") ?? "";
  const limit = Number(url.searchParams.get("limit") ?? 10);

  return NextResponse.json(
    {
      results: searchTimeZoneCities(query, Number.isFinite(limit) ? limit : 10),
    },
    {
      headers: {
        "Cache-Control": "public, max-age=300, s-maxage=86400",
      },
    },
  );
}
