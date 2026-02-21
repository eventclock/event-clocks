import type { Metadata } from "next";
import MeetingOverlapClient from "./MeetingOverlapClient";

export const metadata: Metadata = {
  title: "Meeting Overlap Planner | Event Clocks",
  description:
    "Find the best time to meet across multiple time zones with an overlap planner.",
  alternates: {
    canonical: "https://www.event-clocks.com/meeting-overlap",
  },
};

export default function MeetingOverlapPage() {
  return <MeetingOverlapClient />;
}
