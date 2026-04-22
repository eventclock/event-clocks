import type { Metadata } from "next";
import TimezoneClient from "./TimezoneClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Timezone Converter",
  description:
    "Compare one date/time across timezones, cities, and places with DST-aware results and share links.",
  alternates: {
    canonical: "https://www.event-clocks.com/timezone",
  },
};

export default function TimezonePage() {
  return (
    <>
      <WebAppSchema
        name="Timezone Converter"
        url="https://www.event-clocks.com/timezone"
        description="Compare one date/time across timezones, cities, and places with DST-aware results and share links."
        features={[
          "Convert one date and time across multiple timezones, cities, and places",
          "Automatically account for daylight saving time changes",
          "Compare local times and UTC offsets side by side",
          "Show country and timezone context for supported IANA time zones",
          "Generate share links for timezone comparisons",
        ]}
      />
      <TimezoneClient />
    </>
  );
}
