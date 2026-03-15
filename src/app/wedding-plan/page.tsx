import type { Metadata } from "next";
import WeddingPlanClient from "./WeddingPlanClient";
import WebAppSchema from "@/components/WebAppSchema";

export const metadata: Metadata = {
  title: "Wedding Planner - Timeline & Checklist Tool",
  description:
    "A structured wedding planning timeline with date-sorted tasks, checklists, notes, and a calendar view.",
  alternates: {
    canonical: "https://www.event-clocks.com/wedding-plan",
  },
};

export default function WeddingPlanPage() {
  return (
    <>
      <WebAppSchema
        name="Wedding Planner"
        url="https://www.event-clocks.com/wedding-plan"
        description="A structured wedding planning timeline with date-sorted tasks, checklists, notes, and a calendar view."
        features={[
          "Build a wedding planning timeline based on your wedding date",
          "Add checklist tasks for destination, faith-based, or large-guest weddings",
          "Track progress with expandable task checklists and notes",
          "View tasks in both timeline and calendar formats",
          "Highlight overdue, due soon, and upcoming planning tasks",
          "Save and restore wedding plan backups locally"
        ]}
      />
      <WeddingPlanClient />
    </>
  );
}
