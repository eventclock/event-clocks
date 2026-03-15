import type { Metadata } from "next";
import TimeSinceClient from "./TimeSinceClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Time Since Calculator",
  description:
    "Live-updating time since or until a date and time. See years, months, days, hours, minutes, seconds, and totals in a single unit.",
  alternates: {
    canonical: "https://www.event-clocks.com/time-since",
  },
};

export default function TimeSincePage() {
    return (
    <>
      <WebAppSchema
        name="Time Since Calculator"
        url="https://www.event-clocks.com/time-since"
        description="Live-updating time since or until a date and time. See years, months, days, hours, minutes, seconds, and totals in a single unit."
        features={[
            "Calculate live time since or until a date and time",
            "Show years, months, days, hours, minutes, and seconds",
            "Switch totals into a single unit like days, hours, or minutes",
            "Update results every second with pause and resume controls",
            "Handle both past dates and future countdowns"
        ]}
      />
      <TimeSinceClient />
    </>
  );
}