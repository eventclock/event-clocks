import type { Metadata } from "next";
import WeddingPlanClient from "./WeddingPlanClient";

export const metadata: Metadata = {
  title: "Wedding Plan | Event Clocks",
  description:
    "A structured wedding planning timeline with date-sorted tasks, checklists, notes, and a calendar view.",
  alternates: {
    canonical: "https://www.event-clocks.com/wedding-plan",
  },
};

export default function WeddingPlanPage() {
  return <WeddingPlanClient />;
}
