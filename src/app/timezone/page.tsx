import type { Metadata } from "next";
import TimezoneClient from "./TimezoneClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Timezone Converter",
  description:
    "Compare one date/time across many timezones — DST-aware, with favorites and share links.",
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
        description="Compare one date/time across many timezones — DST-aware, with favorites and share links."
        features={[
          "Convert one date and time across multiple time zones",
          "Automatically account for daylight saving time changes",
          "Compare local times and UTC offsets side by side",
          "Save favorite time zones for faster reuse",
          "Generate share links for timezone comparisons",
        ]}
      />
      <TimezoneClient />
    </>
  );
}
