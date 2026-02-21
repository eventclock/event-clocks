import type { Metadata } from "next";
import TimezoneClient from "./TimezoneClient";

export const metadata: Metadata = {
  title: "Timezone Converter | Event Clocks",
  description:
    "Compare one date/time across many timezones — DST-aware, with favorites and share links.",
  alternates: {
    canonical: "https://www.event-clocks.com/timezone",
  },
};

export default function TimezonePage() {
  return <TimezoneClient />;
}
