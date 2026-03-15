import type { Metadata } from "next";
import CountdownTasksClient from "./CountdownTasksClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title:
    "Task Countdown Timer — Track Task Deadlines with Live Countdowns",
  description:
    "Track tasks with start dates and deadlines using live countdown timers. See when tasks start, when they expire, and how much time remains. Fast, private, and no accounts required.",
  alternates: {
    canonical: "https://www.event-clocks.com/countdown-tasks",
  },
  openGraph: {
    type: "website",
    url: "https://www.event-clocks.com/countdown-tasks",
    title: "Task Countdown Timer",
    description:
      "Track tasks with live countdown timers. Know when tasks start, expire, or run late.",
    siteName: "Event Clocks",
  },
  twitter: {
    card: "summary",
    title: "Task Countdown Timer",
    description:
      "Track task deadlines with live countdown timers and delayed status tracking.",
  },
};

export default function CountdownTasksPage() {
    return (
    <>
      <WebAppSchema
        name="Task Countdown Timer"
        url="https://www.event-clocks.com/countdown-tasks"
        description="Track tasks with start dates and deadlines using live countdown timers. See when tasks start, when they expire, and how much time remains. Fast, private, and no accounts required."
        features={[
            "Track tasks with start times and end deadlines",
            "Live countdown timers for upcoming, active, and delayed tasks",
            "Mark tasks as done and record completion timing",
            "Pin important tasks to keep them at the top",
            "Open a detached focus window for a single task",
            "Save and restore task backups locally"
        ]}
      />
      <CountdownTasksClient />
    </>
  );
}