// src/app/api/holidays/route.ts
import { NextResponse } from "next/server";
import { fetchPublicHolidays } from "@/lib/holidays";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const country = (url.searchParams.get("country") || "").toUpperCase();
  const yearStr = url.searchParams.get("year") || "";

  const year = Number(yearStr);
  if (!country || !/^[A-Z]{2}$/.test(country)) {
    return NextResponse.json({ error: "country must be a 2-letter code (e.g., US, PH)" }, { status: 400 });
  }
  if (!Number.isFinite(year) || year < 1970 || year > 2100) {
    return NextResponse.json({ error: "year is invalid" }, { status: 400 });
  }

  try {
    const data = await fetchPublicHolidays(country, year);

    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "upstream_failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
