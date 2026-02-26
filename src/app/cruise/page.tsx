import type { Metadata } from "next";
import CruiseTimelineClient from "./CruiseTimelineClient";

export const metadata: Metadata = {
  title: "Cruise Plan Timeline | Event Clocks",
  description:
    "A deterministic cruise preparation plan with checklists, personal remarks, and export/import.",
  alternates: { canonical: "https://www.event-clocks.com/cruise" },
};

export default function CruisePage() {
  return <CruiseTimelineClient />;
}