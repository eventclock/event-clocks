import type { Metadata } from "next";
import TimeSinceClient from "./TimeSinceClient";

export const metadata: Metadata = {
  title: "Time Since Calculator | Event Clocks",
  description:
    "Live-updating time since (or until) a date/time. See years, months, days, hours, minutes, seconds, and totals in a single unit.",
  alternates: {
    canonical: "https://www.event-clocks.com/time-since",
  },
};

export default function TimeSincePage() {
  return <TimeSinceClient />;
}