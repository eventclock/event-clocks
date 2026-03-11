import type { Metadata } from "next";
import CountdownTasksClient from "./CountdownTasksClient";

export const metadata: Metadata = {
  title:
    "Task Countdown Timer — Track Task Deadlines with Live Countdowns | Event Clocks",
  description:
    "Track tasks with start dates and deadlines using live countdown timers. See when tasks start, when they expire, and how much time remains. Fast, private, and no accounts required.",
  alternates: {
    canonical: "https://www.event-clocks.com/countdown-tasks",
  },
  openGraph: {
    type: "website",
    url: "https://www.event-clocks.com/countdown-tasks",
    title: "Task Countdown Timer — Event Clocks",
    description:
      "Track tasks with live countdown timers. Know when tasks start, expire, or run late.",
    siteName: "Event Clocks",
  },
  twitter: {
    card: "summary",
    title: "Task Countdown Timer — Event Clocks",
    description:
      "Track task deadlines with live countdown timers and delayed status tracking.",
  },
};

export default function CountdownTasksPage() {
  return <CountdownTasksClient />;
}