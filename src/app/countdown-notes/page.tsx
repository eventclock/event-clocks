import type { Metadata } from "next";
import CountdownNotesClient from "./CountdownNotesClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Countdown Notes",
  description:
    "Create countdown notes for important moments with live timers, pinned items, and options to save or restore backups.",
  alternates: {
    canonical: "https://www.event-clocks.com/countdown-notes",
  },
};

export default function CountdownNotesPage() {
    return (
    <>
      <WebAppSchema
        name="Countdown Notes"
        url="https://www.event-clocks.com/countdown-notes"
        description="Create countdown notes for important moments with live timers, pinned items, and options to save or restore backups."
        features={[
            "Create notes attached to specific dates and times",
            "Live countdown timers for each note",
            "Pin important countdowns to keep them at the top",
            "Highlight expired or past events automatically",
            "Save and restore backups of your countdown list"
        ]}
      />
      <CountdownNotesClient />
    </>
  );
}