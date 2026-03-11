import type { Metadata } from "next";
import CountdownTasksClient from "./CountdownTasksClient";

export const metadata: Metadata = {
  title: "Countdown Tasks | Event Clocks",
  description:
    "Track tasks with start and end dates, live countdowns, delayed status, and local export or import.",
  alternates: {
    canonical: "https://www.event-clocks.com/countdown-tasks",
  },
};

export default function CountdownTasksPage() {
  return <CountdownTasksClient />;
}