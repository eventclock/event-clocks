import type { Metadata } from "next";
import CountdownNotesClient from "./CountdownNotesClient";

export const metadata: Metadata = {
  title: "Countdown Notes | Event Clocks",
  description:
    "Attach notes to moments in time with live countdowns, pin important items, and export or import your list.",
  alternates: {
    canonical: "https://www.event-clocks.com/countdown-notes",
  },
};

export default function CountdownNotesPage() {
  return <CountdownNotesClient />;
}