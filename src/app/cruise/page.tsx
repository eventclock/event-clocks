import type { Metadata } from "next";
import CruiseTimelineClient from "./CruiseTimelineClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Cruise Plan",
  description:
    "A cruise planning timeline with checklists, personal remarks, calendar view, and options to save or restore backups.",
  alternates: { canonical: "https://www.event-clocks.com/cruise" },
};

export default function CruisePage() {
  return (
    <>
      <WebAppSchema
        name="Cruise Plan"
        url="https://www.event-clocks.com/cruise"
        description="A cruise planning timeline with checklists, personal remarks, calendar view, and options to save or restore backups."
        features={[
          "Build a cruise planning timeline based on your sailing date",
          "Show personalized tasks for first-time, international, flight, or family trips",
          "Track checklist items and add personal remarks to each task",
          "View due dates in both list and calendar formats",
          "Highlight overdue, due soon, and completed tasks",
          "Save and restore cruise plan backups locally"
        ]}
      />
      <CruiseTimelineClient />
    </>
  );
}