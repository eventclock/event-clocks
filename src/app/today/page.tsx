import type { Metadata } from "next";
import WebAppSchema from "@/components/WebAppSchema";
import { resolveGeoContext } from "@/lib/geo";
import { getTodaySnapshot } from "@/lib/today/getTodaySnapshot";
import TodayClient from "./TodayClient";

const title = "Today in Your Area";
const description =
  "A deterministic daily snapshot with localized weather, public holidays, forex, sunrise, sunset, a mantra, and weekend countdown.";
const url = "https://www.event-clocks.com/today";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title,
  description,
  alternates: {
    canonical: url,
  },
  openGraph: {
    type: "website",
    url,
    title,
    description,
    siteName: "Event Clocks",
  },
  twitter: {
    card: "summary",
    title,
    description,
  },
};

type PageProps = {
  searchParams: Promise<{
    country?: string;
    region?: string;
    city?: string;
    tz?: string;
    lat?: string;
    lon?: string;
    source?: string;
  }>;
};

export default async function TodayPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const geo = await resolveGeoContext({
    countryCode: params.country,
    regionCode: params.region,
    city: params.city,
    timezone: params.tz,
    latitude: params.lat,
    longitude: params.lon,
    source: params.source,
  });
  const snapshot = await getTodaySnapshot(geo);

  return (
    <>
      <WebAppSchema
        name={title}
        url={url}
        description={description}
        features={[
          "Country-first daily summary",
          "Manual country selection",
          "Weather, holiday, forex, sunrise, and sunset facts",
          "Deterministic daily mantra and weekend countdown",
        ]}
      />
      <TodayClient snapshot={snapshot} />
    </>
  );
}
