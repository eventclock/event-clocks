import type { Metadata } from "next";
import MeetingOverlapClient from "./MeetingOverlapClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Meeting Overlap Planner",
  description:
    "Find the best time to meet across multiple time zones with an overlap planner.",
  alternates: {
    canonical: "https://www.event-clocks.com/meeting-overlap",
  },
};

export default function MeetingOverlapPage() {
  return (
    <>
      <WebAppSchema
        name="Meeting Overlap Planner"
        url="https://www.event-clocks.com/meeting-overlap"
        description="Find overlapping meeting times across time zones."
        features={[
            "Find overlapping meeting times across multiple time zones",
            "Compare local times for participants in different regions",
            "Filter results by working hours, weekdays, or holidays",
            "Adjust meeting duration and start-time intervals",
            "Highlight valid overlap windows for scheduling"
        ]}
      />
      <MeetingOverlapClient />
    </>
  );
  return <MeetingOverlapClient />;
}
