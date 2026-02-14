import MeetingOverlapClient from "./MeetingOverlapClient";

export const metadata = {
  title: "Meeting Overlap Planner | Event Clocks",
  description:
    "Find the best time to meet across multiple time zones with an overlap planner.",
};

export default function MeetingOverlapPage() {
  return <MeetingOverlapClient />;
}
