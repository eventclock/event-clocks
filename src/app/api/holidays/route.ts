// src/app/api/holidays/route.ts
import { NextResponse } from "next/server";

type CacheEntry = { expiresAt: number; data: any };
const memCache = new Map<string, CacheEntry>();

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

  const key = `${country}:${year}`;
  const now = Date.now();
  const hit = memCache.get(key);
  if (hit && hit.expiresAt > now) {
    return NextResponse.json(hit.data, {
      headers: {
        "Cache-Control": "public, max-age=3600, s-maxage=86400",
      },
    });
  }

  // Nager.Date public holidays
  const upstream = `https://date.nager.at/api/v3/PublicHolidays/${year}/${country}`;
  const r = await fetch(upstream, {
    // Helps Vercel/Next cache upstream too
    next: { revalidate: 86400 },
  });

  if (!r.ok) {
    return NextResponse.json({ error: "upstream_failed", status: r.status }, { status: 502 });
  }

  const raw = await r.json();

  // Normalize: keep only what you need
  const data = (Array.isArray(raw) ? raw : []).map((h: any) => ({
    date: h?.date, // "YYYY-MM-DD"
    name:  h?.name || h?.localName,
    types: h?.types,
  }));

  memCache.set(key, { expiresAt: now + 24 * 60 * 60 * 1000, data });

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, max-age=3600, s-maxage=86400",
    },
  });
}
